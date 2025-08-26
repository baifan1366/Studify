ALTER TABLE core.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses.enrollment ENABLE ROW LEVEL SECURITY;
ALTER TABLE classroom.live_session ENABLE ROW LEVEL SECURITY;
ALTER TABLE classroom.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment.submission ENABLE ROW LEVEL SECURITY;
ALTER TABLE community.post ENABLE ROW LEVEL SECURITY;
ALTER TABLE community.comment ENABLE ROW LEVEL SECURITY;

create policy "profiles_self_read" on core.profiles
  for select using (auth.uid() = user_id or exists (
    select 1 from core.parent_student ps
     where ps.parent_id = auth.uid() and ps.student_id = core.profiles.user_id
  ));
create policy "profiles_self_update" on core.profiles
  for update using (auth.uid() = user_id);

create policy "enroll_read_by_member" on courses.enrollment
  for select using (auth.uid() = user_id or exists (
    select 1 from courses.course c where c.id = courses.enrollment.course_id and c.owner_id = auth.uid()
  ));

create policy "live_visible_to_host_and_enrolled" on classroom.live_session
  for select using (
    host_id = auth.uid() or exists (
      select 1 from courses.enrollment e
      where e.course_id = classroom.live_session.course_id and e.user_id = auth.uid()
    )
  );

-- 用户只能查看自己的 profile
CREATE POLICY select_own_profile ON core.profiles
  FOR SELECT
  USING (auth.uid() = user_id);

-- 用户只能修改自己的 profile
CREATE POLICY update_own_profile ON core.profiles
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Admin 可以查看/修改全部 profile
CREATE POLICY admin_all_profiles ON core.profiles
  FOR ALL
  USING (EXISTS (SELECT 1 FROM core.profiles p WHERE p.user_id = auth.uid() AND p.role = 'admin'));

-- 学生只能查看/加入自己相关的 enrollment
CREATE POLICY student_enrollment ON courses.enrollment
  FOR SELECT USING (auth.uid() = user_id);

-- 老师可查看自己授课的 enrollment
CREATE POLICY tutor_enrollment ON courses.enrollment
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM courses.course c
      WHERE c.id = course_id AND c.owner_id = auth.uid()
    )
  );

-- Admin 全部访问
CREATE POLICY admin_enrollment ON courses.enrollment
  FOR ALL
  USING (EXISTS (SELECT 1 FROM core.profiles p WHERE p.user_id = auth.uid() AND p.role = 'admin'));

-- 只有相关学生/家长/老师可访问
CREATE POLICY session_access ON classroom.live_session
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM courses.enrollment e
      WHERE e.course_id = classroom.live_session.course_id
      AND (e.user_id = auth.uid())
    )
    OR host_id = auth.uid()
  );

-- 学生只能更新自己的考勤记录
CREATE POLICY student_attendance ON classroom.attendance
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 老师/管理员可查看所有考勤
CREATE POLICY tutor_admin_attendance ON classroom.attendance
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM courses.course c
      WHERE c.id = classroom.attendance.session_id AND c.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM core.profiles p WHERE p.user_id = auth.uid() AND p.role = 'admin')
  );

-- 学生只能查看/新增自己的提交
CREATE POLICY student_submission ON assessment.submission
  FOR SELECT USING (user_id = auth.uid());

-- 老师可查看/评分自己授课课程下的提交
CREATE POLICY tutor_submission ON assessment.submission
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM courses.course c
      JOIN assessment.quiz q ON q.course_id = c.id
      WHERE q.id = assessment.submission.assignment_id
      AND c.owner_id = auth.uid()
    )
  );

-- 用户可管理自己发的帖子
CREATE POLICY own_post_policy ON community.post
  FOR ALL
  USING (author_id = auth.uid());

-- 用户可管理自己发的评论
CREATE POLICY own_comment_policy ON community.comment
  FOR ALL
  USING (author_id = auth.uid());

-- 管理员可管理所有帖子与评论
CREATE POLICY admin_post_comment_policy ON community.post
  FOR ALL
  USING (EXISTS (SELECT 1 FROM core.profiles p WHERE p.user_id = auth.uid() AND p.role = 'admin'));
CREATE POLICY admin_comment_policy ON community.comment
  FOR ALL
  USING (EXISTS (SELECT 1 FROM core.profiles p WHERE p.user_id = auth.uid() AND p.role = 'admin'));