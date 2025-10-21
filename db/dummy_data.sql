-- =========================
-- QUIZ SUBJECT AND GRADE DUMMY DATA
-- =========================
-- Initialize subjects data
INSERT INTO community_quiz_subject (code, translations) VALUES
('math', '{"en":"Mathematics","zh":"数学"}'),
('science', '{"en":"Science","zh":"科学"}'),
('english', '{"en":"English","zh":"英语"}'),
('history', '{"en":"History","zh":"历史"}'),
('geography', '{"en":"Geography","zh":"地理"}'),
('physics', '{"en":"Physics","zh":"物理"}'),
('chemistry', '{"en":"Chemistry","zh":"化学"}'),
('biology', '{"en":"Biology","zh":"生物"}'),
('computer_science', '{"en":"Computer Science","zh":"计算机科学"}'),
('art', '{"en":"Art","zh":"美术"}'),
('others', '{"en":"Others","zh":"其他"}')
ON CONFLICT (code) DO NOTHING;

-- Initialize grades data
INSERT INTO community_quiz_grade (code, translations) VALUES
('grade_1', '{"en":"Grade 1","zh":"一年级"}'),
('grade_2', '{"en":"Grade 2","zh":"二年级"}'),
('grade_3', '{"en":"Grade 3","zh":"三年级"}'),
('grade_4', '{"en":"Grade 4","zh":"四年级"}'),
('grade_5', '{"en":"Grade 5","zh":"五年级"}'),
('grade_6', '{"en":"Grade 6","zh":"六年级"}'),
('form_1', '{"en":"Form 1","zh":"中一"}'),
('form_2', '{"en":"Form 2","zh":"中二"}'),
('form_3', '{"en":"Form 3","zh":"中三"}'),
('form_4', '{"en":"Form 4","zh":"中四"}'),
('form_5', '{"en":"Form 5","zh":"中五"}'),
('university', '{"en":"University","zh":"大学"}'),
('adult', '{"en":"Adult Education","zh":"成人教育"}')
ON CONFLICT (code) DO NOTHING;

-- =========================
-- COMMUNITY ACHIEVEMENT DUMMY DATA
-- =========================
-- Initialize community achievements data
INSERT INTO "public"."community_achievement" ("id", "public_id", "code", "name", "description", "rule", "is_deleted", "created_at", "updated_at", "deleted_at") VALUES 
('15', 'd100e1b3-cb8c-476d-a79a-efa9901479b7', 'POST_1', 'First Post', 'Publish your first post in the community.', '{"min": 1, "type": "post_count"}', 'false', '2025-09-15 09:41:47.741747+00', '2025-09-15 09:41:47.741747+00', null), 
('16', '5c083b90-68d9-40c8-96c1-1c6764be9d9d', 'TOPIC_STARTER', 'Active Commenter', 'Start a discussion in 3 different study groups.', '{"min": 3, "type": "distinct_group_post_count"}', 'false', '2025-09-15 09:41:47.741747+00', '2025-09-15 09:41:47.741747+00', null), 
('17', 'ac61d5ba-c708-47f5-9500-d7b4358b09f9', 'INFLUENCER', 'Influencer', 'A post you made received over 10 comments.', '{"min": 10, "type": "comment_counts"}', 'false', '2025-09-15 09:41:47.741747+00', '2025-09-15 09:41:47.741747+00', null), 
('18', 'bc5cedde-5f30-49ea-ad40-38fa9bac0d3d', 'POST_10', 'Rising Contributor', 'Post at least 10 posts', '{"min": 10, "type": "post_count"}', 'false', '2025-09-15 09:41:47.741747+00', '2025-09-15 09:41:47.741747+00', null), 
('19', '62c5aa0f-5dc8-4f12-a51a-a276ad17dd19', 'REACTION_50', 'Expressive User', 'Give at least 50 reactions in community posts', '{"min": 50, "type": "reaction_count"}', 'false', '2025-09-15 09:41:47.741747+00', '2025-09-15 09:41:47.741747+00', null), 
('20', '11966bc7-a12b-4c6b-942c-19fa7969dcce', 'HEART_5', 'Heart Giver', 'Give 5 ❤️ reactions', '{"min": 5, "type": "reaction_count", "emoji": "❤️"}', 'false', '2025-09-15 09:41:47.741747+00', '2025-09-15 09:41:47.741747+00', null), 
('24', 'bac4b819-346a-4f06-aee2-5cd41cfebe2c', 'COURSE_1', 'First Course', 'Complete your first course', '{"type": "course_completion", "points": 100, "target": 1}', 'false', '2025-09-23 11:44:08.606002+00', '2025-09-23 11:44:08.606002+00', null), 
('27', '7635aef6-a6a5-4903-807b-0f6abc05b256', 'QUESTION_50', 'Quiz Expert', 'Complete 50 Quiz Questions', '{"type": "quiz_completion", "points": 300, "target": 50}', 'false', '2025-09-23 11:44:08.606002+00', '2025-09-23 11:44:08.606002+00', null), 
('28', '007f2f6e-6722-4bbe-b968-1e67deedcd85', 'POINT_EXCHANGE_COURSE_1', 'Point Master', 'Exchange a course with your points', '{"type": "point_redemption", "points": 50, "target": 1}', 'false', '2025-09-23 11:44:08.606002+00', '2025-09-23 11:44:08.606002+00', null);
