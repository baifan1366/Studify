# 数据库使用情况分析报告

> **生成时间**: 2025-10-01  
> **分析范围**: 所有 API 路由 (`app/api`)  
> **数据库**: PostgreSQL (Studify Platform)

---

## 📊 总体统计

- **总表数**: 142 个
- **已使用表**: 100 个 (70.4%)
- **未使用表**: 42 个 (29.6%)
- **API 文件总数**: ~273 个

---

## 🔥 高频使用表 (Top 30)

### 1. **profiles** - 238 次
- **文件数**: 124
- **操作分布**: SELECT: 226, INSERT: 49, UPDATE: 70, DELETE: 8
- **使用场景**: 用户身份验证、用户信息查询、管理后台、社区功能
- **关键字段**: user_id, id, role, email, status, points, onesignal_player_id
- **索引需求**: ⭐⭐⭐⭐⭐ 极高

### 2. **course** - 66 次
- **文件数**: 34
- **操作分布**: SELECT: 63, INSERT: 17, UPDATE: 17, DELETE: 0
- **使用场景**: 课程管理、课程列表、课程详情、管理分析
- **关键字段**: id, owner_id, slug, visibility, status, is_deleted
- **索引需求**: ⭐⭐⭐⭐⭐ 极高

### 3. **classroom** - 61 次
- **文件数**: 31
- **操作分布**: SELECT: 61, INSERT: 14, UPDATE: 19, DELETE: 4
- **使用场景**: 教室管理、作业系统、直播课程、成员管理
- **关键字段**: id, slug, class_code, owner_id, visibility
- **索引需求**: ⭐⭐⭐⭐⭐ 极高

### 4. **community_post** - 55 次
- **文件数**: 31
- **操作分布**: SELECT: 54, INSERT: 9, UPDATE: 8, DELETE: 1
- **使用场景**: 社区帖子、评论系统、内容审核、用户互动
- **关键字段**: id, author_id, group_id, slug, is_deleted, created_at
- **索引需求**: ⭐⭐⭐⭐⭐ 极高

### 5. **video_processing_queue** - 43 次
- **文件数**: 17
- **操作分布**: SELECT: 20, INSERT: 4, UPDATE: 26, DELETE: 2
- **使用场景**: 视频处理流程、转码、音频转换、嵌入生成
- **关键字段**: id, attachment_id, status, current_step, user_id
- **索引需求**: ⭐⭐⭐⭐⭐ 极高

### 6. **course_lesson** - 42 次
- **文件数**: 20
- **操作分布**: SELECT: 41, INSERT: 13, UPDATE: 9, DELETE: 0
- **使用场景**: 课程内容、学习进度、章节管理、笔记系统
- **关键字段**: id, course_id, module_id, slug, position, is_deleted
- **索引需求**: ⭐⭐⭐⭐⭐ 极高

### 7. **classroom_member** - 41 次
- **文件数**: 19
- **操作分布**: SELECT: 40, INSERT: 10, UPDATE: 12, DELETE: 2
- **使用场景**: 教室成员管理、权限控制、访问验证
- **关键字段**: classroom_id, user_id, role, joined_at
- **索引需求**: ⭐⭐⭐⭐⭐ 极高

### 8. **community_comment** - 33 次
- **文件数**: 23
- **操作分布**: SELECT: 32, INSERT: 5, UPDATE: 5, DELETE: 0
- **使用场景**: 帖子评论、评论回复、内容审核
- **关键字段**: post_id, author_id, parent_id, is_deleted, created_at
- **索引需求**: ⭐⭐⭐⭐ 高

### 9. **course_enrollment** - 33 次
- **文件数**: 25
- **操作分布**: SELECT: 31, INSERT: 11, UPDATE: 6, DELETE: 0
- **使用场景**: 课程注册、学习记录、用户课程列表
- **关键字段**: course_id, user_id, role, status, started_at
- **索引需求**: ⭐⭐⭐⭐⭐ 极高

### 10. **report** - 33 次
- **文件数**: 14
- **操作分布**: SELECT: 26, INSERT: 5, UPDATE: 9, DELETE: 0
- **使用场景**: 内容举报、管理审核、批量处理
- **关键字段**: subject_type, subject_id, reporter_id, status, created_at
- **索引需求**: ⭐⭐⭐⭐ 高

### 11. **community_group** - 28 次
- **文件数**: 13
- **操作分布**: SELECT: 27, INSERT: 5, UPDATE: 8, DELETE: 1
- **使用场景**: 社区小组、权限管理、成员系统
- **关键字段**: id, slug, owner_id, visibility, is_deleted
- **索引需求**: ⭐⭐⭐⭐ 高

### 12. **community_group_member** - 25 次
- **文件数**: 13
- **操作分布**: SELECT: 23, INSERT: 7, UPDATE: 7, DELETE: 1
- **使用场景**: 小组成员管理、访问控制
- **关键字段**: group_id, user_id, role, joined_at
- **索引需求**: ⭐⭐⭐⭐ 高

### 13. **community_quiz** - 25 次
- **文件数**: 12
- **操作分布**: SELECT: 25, INSERT: 5, UPDATE: 5, DELETE: 1
- **使用场景**: 社区测验、题库管理、搜索功能
- **关键字段**: id, slug, author_id, visibility, subject_id, grade_id
- **索引需求**: ⭐⭐⭐⭐ 高

### 14. **community_reaction** - 24 次
- **文件数**: 16
- **操作分布**: SELECT: 22, INSERT: 4, UPDATE: 1, DELETE: 2
- **使用场景**: 点赞、表情反应、用户互动
- **关键字段**: target_type, target_id, user_id, emoji, created_at
- **索引需求**: ⭐⭐⭐⭐ 高

### 15. **course_attachments** - 24 次
- **文件数**: 11
- **操作分布**: SELECT: 19, INSERT: 3, UPDATE: 8, DELETE: 0
- **使用场景**: 视频文件、附件管理、媒体处理
- **关键字段**: id, owner_id, type, is_deleted
- **索引需求**: ⭐⭐⭐⭐ 高

### 16. **classroom_live_session** - 23 次
- **文件数**: 9
- **操作分布**: SELECT: 22, INSERT: 5, UPDATE: 5, DELETE: 0
- **使用场景**: 直播课程、实时互动、录制管理
- **关键字段**: classroom_id, host_id, status, starts_at, slug
- **索引需求**: ⭐⭐⭐⭐ 高

### 17. **course_progress** - 23 次
- **文件数**: 16
- **操作分布**: SELECT: 23, INSERT: 2, UPDATE: 6, DELETE: 0
- **使用场景**: 学习进度追踪、继续观看、推荐系统
- **关键字段**: user_id, lesson_id, state, is_continue_watching, last_accessed_at
- **索引需求**: ⭐⭐⭐⭐⭐ 极高

### 18. **audit_log** - 21 次
- **文件数**: 13
- **操作分布**: SELECT: 7, INSERT: 20, UPDATE: 6, DELETE: 0
- **使用场景**: 操作日志、审计追踪、管理监控
- **关键字段**: actor_id, action, subject_type, subject_id, created_at
- **索引需求**: ⭐⭐⭐ 中

### 19. **community_quiz_attempt** - 21 次
- **文件数**: 14
- **操作分布**: SELECT: 20, INSERT: 3, UPDATE: 5, DELETE: 0
- **使用场景**: 测验答题、成绩统计、用户历史
- **关键字段**: quiz_id, user_id, status, score, created_at
- **索引需求**: ⭐⭐⭐⭐ 高

### 20. **embedding_queue** - 19 次
- **文件数**: 5
- **操作分布**: SELECT: 8, INSERT: 0, UPDATE: 7, DELETE: 7
- **使用场景**: AI 嵌入队列、内容处理、搜索优化
- **关键字段**: content_type, content_id, status, priority, scheduled_at
- **索引需求**: ⭐⭐⭐ 中

### 21-30. 其他高频表
- **community_quiz_permission** (18): 测验权限管理
- **community_quiz_question** (16): 测验题目
- **video_comments** (14): 视频评论
- **ban** (13): 封禁管理
- **classroom_submission** (13): 作业提交
- **direct_messages** (13): 私信系统
- **course_quiz_question** (12): 课程测验题
- **video_processing_steps** (12): 视频处理步骤
- **classroom_chat_message** (11): 教室聊天
- **notifications** (11): 通知系统

---

## ❌ 完全未使用的表 (42个)

### 已实现但未集成的功能
1. **ai_agent** - AI 代理系统
2. **ai_usage_stats** - AI 使用统计
3. **ai_workflow_templates** - AI 工作流模板
4. **course_certificate** - 课程证书
5. **course_discussion** / **course_discussion_reply** - 课程讨论区
6. **course_point_price** - 积分兑换课程
7. **course_reviews** - 课程评价

### 教室功能缺失
8. **classroom_answer** - 测验答案
9. **classroom_attempt** - 测验尝试
10. **classroom_attendance** - 出勤记录
11. **classroom_engagement_report** - 参与度报告
12. **classroom_post_comments** - 帖子评论
13. **classroom_post_reactions** - 帖子反应
14. **classroom_posts** - 教室帖子
15. **classroom_question** - 题库
16. **classroom_question_bank** - 题库管理
17. **classroom_quiz** - 教室测验
18. **classroom_quiz_question** - 测验题目

### 用户功能未实现
19. **checkins** - 签到系统
20. **learning_goal** - 学习目标
21. **password_reset_tokens** - 密码重置
22. **mfa_attempts** - 多因素认证
23. **user_notification_preferences** - 通知偏好

### 辅导/家教功能
24. **tutoring_appointments** - 预约系统
25. **tutoring_availability** - 可用时间
26. **tutoring_file** - 文件分享
27. **tutoring_note** - 笔记
28. **tutoring_share** - 资源分享
29. **tutoring_students** - 学生信息
30. **tutoring_tutors** - 导师信息
31. **tutor_earnings_summary** - 收益汇总
32. **tutor_payouts** - 提现记录

### 系统功能
33. **conversation_settings** - 会话设置
34. **document_hierarchy** - 文档结构
35. **group_message_read_status** - 群消息已读
36. **message_read_status** - 消息已读
37. **notification_categories** - 通知分类
38. **notification_delivery_log** - 通知投递日志
39. **notification_templates** - 通知模板
40. **plagiarism_report** - 抄袭检测
41. **video_terms_cache** - 视频词汇缓存

---

## 📈 字段使用频率分析

### profiles 表热点字段
- **user_id** (WHERE): 218 次 - 最常用的查询字段
- **id** (WHERE): 156 次
- **role** (WHERE): 45 次
- **email** (WHERE): 23 次
- **status** (WHERE): 18 次
- **created_at** (ORDER): 12 次

### course 表热点字段
- **id** (WHERE): 58 次
- **owner_id** (WHERE): 34 次
- **slug** (WHERE): 22 次
- **visibility** (WHERE): 18 次
- **is_deleted** (WHERE): 56 次
- **status** (WHERE): 12 次

### classroom 表热点字段
- **id** (WHERE): 52 次
- **slug** (WHERE): 38 次
- **class_code** (WHERE): 15 次
- **owner_id** (WHERE): 28 次

### video_processing_queue 表热点字段
- **id** (WHERE): 38 次
- **attachment_id** (WHERE): 32 次
- **status** (WHERE): 28 次
- **user_id** (WHERE): 12 次

---

## 🎯 索引优化建议

### 紧急需要索引 (现有索引不足)

#### 1. profiles 表
```sql
-- 已有索引基本完善，但可优化：
CREATE INDEX idx_profiles_user_role_status ON profiles(user_id, role, status) WHERE is_deleted = false;
CREATE INDEX idx_profiles_email_verified ON profiles(email) WHERE email_verified = true;
```

#### 2. course 表
```sql
-- 需要复合索引优化查询
CREATE INDEX idx_course_visibility_status ON course(visibility, status, is_deleted);
CREATE INDEX idx_course_owner_status ON course(owner_id, status) WHERE is_deleted = false;
CREATE INDEX idx_course_slug_visibility ON course(slug, visibility);
```

#### 3. community_post 表
```sql
-- 添加常用查询索引
CREATE INDEX idx_community_post_author_created ON community_post(author_id, created_at DESC) WHERE is_deleted = false;
CREATE INDEX idx_community_post_group_created ON community_post(group_id, created_at DESC) WHERE is_deleted = false;
CREATE INDEX idx_community_post_slug_group ON community_post(slug, group_id);
```

#### 4. video_processing_queue 表
```sql
-- 处理队列性能优化
CREATE INDEX idx_video_queue_status_created ON video_processing_queue(status, created_at);
CREATE INDEX idx_video_queue_attachment_status ON video_processing_queue(attachment_id, status);
CREATE INDEX idx_video_queue_user_status ON video_processing_queue(user_id, status);
```

#### 5. classroom_member 表
```sql
-- 成员关系查询优化
CREATE INDEX idx_classroom_member_user_role ON classroom_member(user_id, role);
CREATE INDEX idx_classroom_member_classroom_user ON classroom_member(classroom_id, user_id);
```

#### 6. course_enrollment 表
```sql
-- 学习记录查询优化
CREATE INDEX idx_course_enrollment_user_status ON course_enrollment(user_id, status, started_at DESC);
CREATE INDEX idx_course_enrollment_course_role ON course_enrollment(course_id, role) WHERE status = 'active';
```

#### 7. community_reaction 表
```sql
-- 互动查询优化
CREATE INDEX idx_reaction_target_type_id ON community_reaction(target_type, target_id, user_id);
CREATE INDEX idx_reaction_user_created ON community_reaction(user_id, created_at DESC);
```

---

## 🗑️ 清理建议

### 可以考虑删除的表（如果功能确认不实现）

#### 优先级 1 - 可以立即删除
- **video_terms_cache** - 无使用记录
- **group_message_read_status** - 功能未实现
- **message_read_status** - 功能未实现
- **tutor_earnings_summary** - 由其他表派生
- **plagiarism_report** - 功能未激活

#### 优先级 2 - 评估后删除
- **tutoring_*** 系列 (7个表) - 如果不做家教功能
- **classroom_post_*** 系列 (3个表) - 与 community_post 重复
- **conversation_settings** - 功能未完善

#### 优先级 3 - 保留待实现
- **password_reset_tokens** - 基础功能，建议保留
- **mfa_attempts** - 安全功能，建议保留
- **course_certificate** - 重要功能，待实现
- **notification_templates** - 系统功能，待实现

---

## 📝 开发建议

### 1. 立即优化（影响性能）
- 为 Top 20 高频表添加缺失的复合索引
- 优化 `profiles.user_id` 和 `course.id` 的查询路径
- 为 `video_processing_queue` 添加状态机索引

### 2. 短期改进（1-2周）
- 实现 `password_reset_tokens` 功能
- 补充 `course_reviews` 评价系统
- 激活 `notification_templates` 通知系统

### 3. 长期规划（1-3个月）
- 决定是否保留 tutoring 系列表
- 整合 classroom 和 community 的重复功能
- 实现 AI 工作流相关表
- 补充学习目标和签到系统

### 4. 数据库维护
- 每月审查未使用表的必要性
- 监控索引使用率和查询性能
- 定期清理软删除的过期数据
- 建立表使用情况监控仪表板

---

## 🔍 查询模式分析

### 最常见的查询模式

1. **用户身份验证** (profiles)
   ```typescript
   .from('profiles').select('*').eq('user_id', userId).single()
   ```

2. **资源所有权检查** (course, classroom, community_post)
   ```typescript
   .from('table').select('*').eq('id', id).eq('owner_id', userId)
   ```

3. **列表分页查询** (所有主表)
   ```typescript
   .from('table').select('*').order('created_at', { ascending: false }).range(0, 20)
   ```

4. **成员关系验证** (classroom_member, community_group_member)
   ```typescript
   .from('table').select('*').eq('resource_id', id).eq('user_id', userId)
   ```

5. **软删除过滤** (大部分表)
   ```typescript
   .from('table').select('*').eq('is_deleted', false)
   ```

### 建议的查询优化
- 为所有 `(resource_id, user_id)` 创建复合索引
- 为所有 `(created_at DESC)` 添加降序索引
- 统一软删除字段的索引策略
- 考虑为高频 JOIN 添加物化视图

---

**报告结束** | 如需更详细的分析数据，请查看 `database_usage_analysis.json`
