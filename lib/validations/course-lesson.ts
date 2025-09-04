import { z } from 'zod';

export const courseLessonSchema = z.object({
  courseId: z.string().min(1, 'Course selection is required'),
  moduleId: z.string().min(1, 'Module selection is required'),
  title: z.string().min(1, 'Title is required').max(100, 'Title must be less than 100 characters'),
  kind: z.enum(['video', 'live', 'document', 'quiz', 'assignment', 'whiteboard']),
  contentUrl: z.string().url('Please enter a valid URL'),
  duration: z.number().min(0, 'Duration must be 0 or greater')
})