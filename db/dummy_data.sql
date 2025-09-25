-- =========================
-- QUIZ SUBJECT AND GRADE DUMMY DATA
-- =========================
-- Insert sample data for subjects
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
('art', '{"en":"Art","zh":"美术"}')
('others', '{"en":"Others","zh":"其他"}')
ON CONFLICT (code) DO NOTHING;

-- Insert sample data for grades
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