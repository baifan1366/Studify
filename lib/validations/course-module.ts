import { z } from 'zod';

export const courseModuleSchema = z.object({
  courseId: z.string().min(1, 'Course selection is required'),
  title: z.string().min(1, 'Title is required').max(100, 'Title must be less than 100 characters'),
  position: z.number().min(1, 'Position must be at least 1').max(100, 'Position must be less than 100')
})