//dialog
//import ai chatbot
//provide sample ai prompt according lesson.title and lesson.description
//write ai rules:
//-must provide the quiz question according lesson info
//-question must have question_text, question_type, options, correct_answer, explanation,points, position, difficulty
//proceed the ai respond using mapping
//and showing the input for tutor to review and edit or remove it
//only once tutor accept and click Create
//will call the use-quiz.ts and create all quiz question for the selected lesson

// id bigserial PRIMARY KEY,
// public_id uuid NOT NULL DEFAULT uuid_generate_v4(),
// lesson_id bigint NOT NULL REFERENCES course_lesson(id) ON DELETE CASCADE,
// question_text text NOT NULL,
// question_type text NOT NULL CHECK (question_type IN ('multiple_choice', 'true_false', 'short_answer', 'essay', 'fill_blank')),
// options jsonb, -- For multiple choice: ["Option A", "Option B", "Option C", "Option D"]
// correct_answer jsonb NOT NULL, -- For multiple choice: "A", for true/false: true/false, for text: "correct answer"
// explanation text,
// points int DEFAULT 1,
// difficulty int CHECK (difficulty BETWEEN 1 AND 5) DEFAULT 1,
// position int DEFAULT 1,
// is_deleted boolean NOT NULL DEFAULT false,
// created_at timestamptz NOT NULL DEFAULT now(),
// updated_at timestamptz NOT NULL DEFAULT now(),
// deleted_at timestamptz