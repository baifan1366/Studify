-- Create test posts related to user's AI activity keywords
-- Keywords: reading, skills, learn, computer, chinese, language

-- Post 1: About reading skills
INSERT INTO community_post (title, body, author_id, is_deleted)
VALUES (
  'How to Improve Your Reading Skills',
  'Reading is a fundamental skill that can be improved with practice. Here are some tips to enhance your reading comprehension and speed...',
  1, -- Replace with actual author_id
  false
);

-- Post 2: About learning Chinese
INSERT INTO community_post (title, body, author_id, is_deleted)
VALUES (
  'Learning Chinese Language: A Beginner''s Guide',
  'Chinese is one of the most spoken languages in the world. This guide will help you start learning Chinese language basics, including pronunciation, characters, and grammar...',
  1, -- Replace with actual author_id
  false
);

-- Post 3: About computer skills
INSERT INTO community_post (title, body, author_id, is_deleted)
VALUES (
  'Essential Computer Skills for Students',
  'In today''s digital age, computer skills are essential. Learn about hardware, software, and how to use computers effectively for learning...',
  1, -- Replace with actual author_id
  false
);

-- Post 4: About learning motivation
INSERT INTO community_post (title, body, author_id, is_deleted)
VALUES (
  'How to Stay Motivated While Learning',
  'Maintaining focus and motivation is crucial for effective learning. Here are strategies to keep yourself motivated and develop autonomous learning skills...',
  1, -- Replace with actual author_id
  false
);

-- Post 5: About language learning
INSERT INTO community_post (title, body, author_id, is_deleted)
VALUES (
  'The Science of Language Learning',
  'Understanding how we learn languages can help improve your language learning skills. This post explores the cognitive processes behind language acquisition...',
  1, -- Replace with actual author_id
  false
);

-- After creating posts, generate embeddings for them
-- You'll need to run the embedding backfill API:
-- POST /api/embeddings/backfill?content_type=post
