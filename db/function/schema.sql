-- 自动更新学生进度：提交作业后触发
CREATE OR REPLACE FUNCTION trg_update_progress()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE progress
  SET completed = TRUE, completed_at = NOW()
  WHERE student_id = NEW.student_id AND assignment_id = NEW.assignment_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_submit_assignment
AFTER INSERT ON assessment.submission
FOR EACH ROW EXECUTE FUNCTION trg_update_progress();


-- 自动增加积分：每日打卡后触发
CREATE OR REPLACE FUNCTION trg_add_points()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE core.profile SET points = points + 10 WHERE id = NEW.student_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_checkin
AFTER INSERT ON core.checkins
FOR EACH ROW EXECUTE FUNCTION trg_add_points();


-- 自动更新排行榜：参加竞赛后触发
CREATE OR REPLACE FUNCTION trg_update_leaderboard()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE leaderboard
  SET total_score = total_score + NEW.score
  WHERE student_id = NEW.student_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_challenge_result
AFTER INSERT ON gamification.challenge_results
FOR EACH ROW EXECUTE FUNCTION trg_update_leaderboard();


-- 自动写入操作日志：所有关键表插入时触发
CREATE OR REPLACE FUNCTION trg_log_activity()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO activity_logs(user_id, action, ref_table, ref_id, created_at)
  VALUES (COALESCE(NEW.student_id, NEW.user_id), TG_OP, TG_TABLE_NAME, NEW.id, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 日志触发器示例
CREATE TRIGGER log_submission
AFTER INSERT ON assessment.submission
FOR EACH ROW EXECUTE FUNCTION trg_log_activity();

CREATE TRIGGER log_checkin
AFTER INSERT ON core.checkins
FOR EACH ROW EXECUTE FUNCTION trg_log_activity();

CREATE TRIGGER log_challenge_result
AFTER INSERT ON gamification.challenge_results
FOR EACH ROW EXECUTE FUNCTION trg_log_activity();

-- 审核通过自动上架课程
CREATE OR REPLACE FUNCTION trg_publish_course()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' THEN
    UPDATE courses SET published = TRUE WHERE id = NEW.course_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_course_review
AFTER UPDATE ON courses.reviews
FOR EACH ROW EXECUTE FUNCTION trg_publish_course();


-- 用户被封禁后自动下架相关内容
CREATE OR REPLACE FUNCTION trg_ban_user_content()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_banned = TRUE THEN
    UPDATE posts SET visible = FALSE WHERE user_id = NEW.id;
    UPDATE comments SET visible = FALSE WHERE user_id = NEW.id;
    UPDATE courses SET published = FALSE WHERE tutor_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_user_ban
AFTER UPDATE ON core.profiles
FOR EACH ROW EXECUTE FUNCTION trg_ban_user_content();


-- 举报通过后自动隐藏内容
CREATE OR REPLACE FUNCTION trg_hide_reported_content()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' THEN
    IF NEW.target_table = 'posts' THEN
      UPDATE posts SET visible = FALSE WHERE id = NEW.target_id;
    ELSIF NEW.target_table = 'comments' THEN
      UPDATE comments SET visible = FALSE WHERE id = NEW.target_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_report_review
AFTER UPDATE ON moderation.report
FOR EACH ROW EXECUTE FUNCTION trg_hide_reported_content();

-- 学生签到自动更新出勤率
CREATE OR REPLACE FUNCTION trg_update_attendance()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE attendance
  SET attended = TRUE, attended_at = NOW()
  WHERE student_id = NEW.student_id AND course_id = NEW.course_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_attendance_checkin
AFTER INSERT ON core.checkins
FOR EACH ROW EXECUTE FUNCTION trg_update_attendance();

-- 作业提交后自动生成学习报告记录
CREATE OR REPLACE FUNCTION trg_generate_learning_report()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO learning_reports(student_id, generated_at, status)
  VALUES (NEW.student_id, NOW(), 'pending');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_submission_generate_report
AFTER INSERT ON assessment.submission
FOR EACH ROW EXECUTE FUNCTION trg_generate_learning_report();

-- 当积分达到阈值自动解锁成就
CREATE OR REPLACE FUNCTION trg_unlock_achievement()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.points >= 100 THEN
    INSERT INTO achievements(student_id, achievement_type, unlocked_at)
    VALUES (NEW.id, '100_points', NOW())
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_points_update
AFTER UPDATE ON core.profiles
FOR EACH ROW EXECUTE FUNCTION trg_unlock_achievement();

-- 学生报名课程
CREATE OR REPLACE FUNCTION enroll_course(p_student_id INT, p_course_id INT)
RETURNS VOID AS $$
BEGIN
  INSERT INTO enrollments(student_id, course_id, enrolled_at)
  VALUES (p_student_id, p_course_id, NOW())
  ON CONFLICT (student_id, course_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- 学生提交作业 -> 自动更新完成度
CREATE OR REPLACE FUNCTION submit_assignment(p_student_id INT, p_assignment_id INT, p_content TEXT)
RETURNS VOID AS $$
BEGIN
  INSERT INTO assessment.submission(student_id, assignment_id, content, submitted_at)
  VALUES (p_student_id, p_assignment_id, p_content, NOW());

  -- 更新学生完成度
  UPDATE progress
  SET completed = TRUE, completed_at = NOW()
  WHERE student_id = p_student_id AND assignment_id = p_assignment_id;
END;
$$ LANGUAGE plpgsql;

-- 学习打卡 -> 自动加积分、成就
CREATE OR REPLACE FUNCTION daily_checkin(p_student_id INT)
RETURNS VOID AS $$
DECLARE
  v_exists BOOLEAN;
BEGIN
  -- 检查今天是否已打卡
  SELECT TRUE INTO v_exists
  FROM core.checkins
  WHERE user_id = p_student_id AND DATE(checked_at) = CURRENT_DATE;

  IF NOT FOUND THEN
    -- 插入打卡记录
    INSERT INTO core.checkins(user_id, checked_at)
    VALUES (p_student_id, NOW());

    -- 增加积分
    UPDATE core.profiles SET points = points + 10 WHERE id = p_student_id;

    -- TODO: 成就系统逻辑
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 参加竞赛 -> 更新排名
CREATE OR REPLACE FUNCTION participate_challenge(p_student_id INT, p_challenge_id INT, p_score INT)
RETURNS VOID AS $$
BEGIN
  INSERT INTO gamification.challenge_results(user_id, challenge_id, score, attempted_at)
  VALUES (p_student_id, p_challenge_id, p_score, NOW())
  ON CONFLICT (user_id, challenge_id)
  DO UPDATE SET score = GREATEST(EXCLUDED.score, gamification.challenge_results.score);

  -- 更新排行榜
  UPDATE leaderboard
  SET total_score = total_score + p_score
  WHERE user_id = p_student_id;
END;
$$ LANGUAGE plpgsql;

-- 老师布置作业
CREATE OR REPLACE FUNCTION create_assignment(p_tutor_id INT, p_course_id INT, p_title TEXT, p_due_date TIMESTAMP)
RETURNS VOID AS $$
BEGIN
  INSERT INTO assignments(course_id, tutor_id, title, due_date, created_at)
  VALUES (p_course_id, p_tutor_id, p_title, p_due_date, NOW());
END;
$$ LANGUAGE plpgsql;

-- 老师开设课程
CREATE OR REPLACE FUNCTION create_course(p_tutor_id INT, p_title TEXT, p_description TEXT)
RETURNS INT AS $$
DECLARE
  v_course_id INT;
BEGIN
  INSERT INTO courses(tutor_id, title, description, created_at)
  VALUES (p_tutor_id, p_title, p_description, NOW())
  RETURNING id INTO v_course_id;

  RETURN v_course_id;
END;
$$ LANGUAGE plpgsql;

-- 老师批改作业
CREATE OR REPLACE FUNCTION grade_submission(p_submission_id INT, p_score INT, p_feedback TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE assessment.submission
  SET score = p_score, feedback = p_feedback, graded_at = NOW()
  WHERE id = p_submission_id;

  -- 同时更新学生进度
  UPDATE progress
  SET score = p_score, completed = TRUE, completed_at = NOW()
  WHERE assignment_id = (SELECT assignment_id FROM assessment.submission WHERE id = p_submission_id)
    AND student_id = (SELECT student_id FROM assessment.submission WHERE id = p_submission_id);
END;
$$ LANGUAGE plpgsql;

-- 家长查看孩子学习报告
CREATE OR REPLACE FUNCTION get_child_report(p_parent_id INT, p_student_id INT)
RETURNS TABLE(course_id INT, progress NUMERIC, score NUMERIC) AS $$
BEGIN
  RETURN QUERY
  SELECT e.course_id, COALESCE(AVG(pr.score),0) AS progress, COALESCE(AVG(pr.score),0) AS score
  FROM enrollments e
  LEFT JOIN progress pr ON pr.student_id = e.student_id AND pr.course_id = e.course_id
  WHERE e.student_id = p_student_id AND EXISTS (
    SELECT 1 FROM parent_student ps WHERE ps.parent_id = p_parent_id AND ps.student_id = p_student_id
  )
  GROUP BY e.course_id;
END;
$$ LANGUAGE plpgsql;

-- 家长监控课堂参与情况
CREATE OR REPLACE FUNCTION monitor_classroom(p_parent_id INT, p_student_id INT)
RETURNS TABLE(session_id INT, joined_at TIMESTAMP, left_at TIMESTAMP) AS $$
BEGIN
  RETURN QUERY
  SELECT cs.id, cl.joined_at, cl.left_at
  FROM classroom_sessions cs
  JOIN classroom_logs cl ON cl.session_id = cs.id
  WHERE cl.student_id = p_student_id
    AND EXISTS (SELECT 1 FROM parent_student ps WHERE ps.parent_id = p_parent_id AND ps.student_id = p_student_id);
END;
$$ LANGUAGE plpgsql;

-- 家长查看孩子出勤
CREATE OR REPLACE FUNCTION get_child_attendance(p_parent_id INT, p_student_id INT)
RETURNS TABLE(course_id INT, attended INT, total INT) AS $$
BEGIN
  RETURN QUERY
  SELECT c.id, COUNT(a.id) FILTER (WHERE a.present = TRUE) AS attended, COUNT(a.id) AS total
  FROM courses c
  JOIN attendance a ON a.course_id = c.id AND a.student_id = p_student_id
  WHERE EXISTS (SELECT 1 FROM parent_student ps WHERE ps.parent_id = p_parent_id AND ps.student_id = p_student_id)
  GROUP BY c.id;
END;
$$ LANGUAGE plpgsql;

-- 管理员封禁用户
CREATE OR REPLACE FUNCTION ban_user(p_admin_id INT, p_user_id INT, p_reason TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE core.profiles
  SET status = 'banned', banned_reason = p_reason, banned_at = NOW()
  WHERE id = p_user_id;

  INSERT INTO admin_logs(admin_id, action, target_user_id, reason, created_at)
  VALUES (p_admin_id, 'BAN_USER', p_user_id, p_reason, NOW());
END;
$$ LANGUAGE plpgsql;

-- 管理员审核课程
CREATE OR REPLACE FUNCTION review_course(p_admin_id INT, p_course_id INT, p_status TEXT, p_feedback TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE courses
  SET review_status = p_status, review_feedback = p_feedback, reviewed_at = NOW()
  WHERE id = p_course_id;

  INSERT INTO admin_logs(admin_id, action, target_course_id, reason, created_at)
  VALUES (p_admin_id, 'REVIEW_COURSE', p_course_id, p_feedback, NOW());
END;
$$ LANGUAGE plpgsql;

-- 管理员统计系统活跃度
CREATE OR REPLACE FUNCTION system_statistics()
RETURNS TABLE(total_users INT, active_today INT, total_courses INT, total_submissions INT) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM core.profiles),
    (SELECT COUNT(*) FROM core.profiles WHERE last_login::date = CURRENT_DATE),
    (SELECT COUNT(*) FROM courses),
    (SELECT COUNT(*) FROM assessment.submission);
END;
$$ LANGUAGE plpgsql;