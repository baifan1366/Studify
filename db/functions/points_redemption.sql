-- =========================
-- 积分兑换课程存储过程
-- =========================

-- 积分兑换课程的存储过程
CREATE OR REPLACE FUNCTION redeem_course_with_points(
    p_user_id bigint,
    p_course_id bigint
) RETURNS jsonb AS $$
DECLARE
    v_user_points int;
    v_course_point_price int;
    v_course_info jsonb;
    v_enrollment_exists boolean;
    v_redemption_id bigint;
    v_result jsonb;
BEGIN
    -- 检查用户是否存在且积分数
    SELECT points INTO v_user_points 
    FROM profiles 
    WHERE id = p_user_id AND is_deleted = false;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'User not found');
    END IF;

    -- 检查课程是否存在且获取积分价格
    SELECT 
        jsonb_build_object(
            'id', c.id,
            'title', c.title,
            'price_cents', c.price_cents,
            'thumbnail_url', c.thumbnail_url
        ),
        COALESCE(cpp.point_price, 0)
    INTO v_course_info, v_course_point_price
    FROM course c
    LEFT JOIN course_point_price cpp ON cpp.course_id = c.id AND cpp.is_active = true
    WHERE c.id = p_course_id AND c.is_deleted = false;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'Course not found');
    END IF;

    -- 检查课程是否设置了积分价格
    IF v_course_point_price = 0 THEN
        RETURN jsonb_build_object('error', 'This course is not available for point redemption');
    END IF;

    -- 检查用户积分是否足够
    IF v_user_points < v_course_point_price THEN
        RETURN jsonb_build_object(
            'error', 'Insufficient points',
            'required', v_course_point_price,
            'available', v_user_points
        );
    END IF;

    -- 检查用户是否已经注册了这门课程
    SELECT EXISTS(
        SELECT 1 FROM course_enrollment 
        WHERE course_id = p_course_id AND user_id = p_user_id
    ) INTO v_enrollment_exists;

    IF v_enrollment_exists THEN
        RETURN jsonb_build_object('error', 'Already enrolled in this course');
    END IF;

    -- 开始事务操作
    -- 1. 扣除用户积分
    UPDATE profiles 
    SET points = points - v_course_point_price,
        updated_at = now()
    WHERE id = p_user_id;

    -- 2. 创建积分兑换记录
    INSERT INTO point_redemption (
        user_id,
        course_id,
        points_spent,
        original_price_cents,
        status,
        redemption_date,
        completion_date
    ) VALUES (
        p_user_id,
        p_course_id,
        v_course_point_price,
        (v_course_info->>'price_cents')::int,
        'completed',
        now(),
        now()
    ) RETURNING id INTO v_redemption_id;

    -- 3. 添加积分消费记录
    INSERT INTO community_points_ledger (
        user_id,
        points,
        reason,
        ref
    ) VALUES (
        p_user_id,
        -v_course_point_price,
        'Course redemption',
        jsonb_build_object(
            'type', 'course_redemption',
            'course_id', p_course_id,
            'redemption_id', v_redemption_id
        )
    );

    -- 4. 自动注册课程
    INSERT INTO course_enrollment (
        course_id,
        user_id,
        role,
        status,
        started_at
    ) VALUES (
        p_course_id,
        p_user_id,
        'student',
        'active',
        now()
    );

    -- 5. 检查是否解锁"积分达人"成就
    PERFORM check_and_unlock_achievement(p_user_id, 'point_spender');

    -- 返回成功结果
    v_result := jsonb_build_object(
        'success', true,
        'redemption_id', v_redemption_id,
        'points_spent', v_course_point_price,
        'remaining_points', v_user_points - v_course_point_price,
        'course', v_course_info
    );

    RETURN v_result;

EXCEPTION
    WHEN OTHERS THEN
        -- 回滚会自动发生
        RETURN jsonb_build_object(
            'error', 'Transaction failed: ' || SQLERRM
        );
END;
$$ LANGUAGE plpgsql;

-- 检查并解锁成就的辅助函数
CREATE OR REPLACE FUNCTION check_and_unlock_achievement(
    p_user_id bigint,
    p_achievement_code text
) RETURNS void AS $$
DECLARE
    v_achievement_id bigint;
    v_already_unlocked boolean;
    v_points_reward int;
BEGIN
    -- 获取成就信息
    SELECT id, (rule->>'points')::int 
    INTO v_achievement_id, v_points_reward
    FROM community_achievement 
    WHERE code = p_achievement_code AND is_deleted = false;

    IF NOT FOUND THEN
        RETURN;
    END IF;

    -- 检查用户是否已经解锁这个成就
    SELECT unlocked INTO v_already_unlocked
    FROM community_user_achievement
    WHERE user_id = p_user_id AND achievement_id = v_achievement_id;

    IF v_already_unlocked THEN
        RETURN;
    END IF;

    -- 解锁成就
    INSERT INTO community_user_achievement (
        user_id,
        achievement_id,
        current_value,
        unlocked,
        unlocked_at
    ) VALUES (
        p_user_id,
        v_achievement_id,
        1,
        true,
        now()
    ) ON CONFLICT (user_id, achievement_id) 
    DO UPDATE SET 
        unlocked = true,
        unlocked_at = now(),
        current_value = EXCLUDED.current_value;

    -- 给用户增加积分奖励
    IF v_points_reward > 0 THEN
        UPDATE profiles 
        SET points = points + v_points_reward
        WHERE id = p_user_id;

        -- 记录积分获得
        INSERT INTO community_points_ledger (
            user_id,
            points,
            reason,
            ref
        ) VALUES (
            p_user_id,
            v_points_reward,
            'Achievement unlocked: ' || p_achievement_code,
            jsonb_build_object(
                'type', 'achievement_reward',
                'achievement_code', p_achievement_code
            )
        );
    END IF;

END;
$$ LANGUAGE plpgsql;
