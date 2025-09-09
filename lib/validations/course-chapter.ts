import { z } from "zod";

// Validation schema for creating course chapters
export const courseChapterSchema = z.object({
  title: z.string().min(1, "Title is required").max(255, "Title must be less than 255 characters"),
  description: z.string().optional(),
  start_time_sec: z.number().int().min(0, "Start time must be a positive number").optional(),
  end_time_sec: z.number().int().min(0, "End time must be a positive number").optional(),
  order_index: z.number().int().min(1, "Order index must be at least 1").default(1),
});

// Validation schema for updating course chapters (all fields optional)
export const courseChapterUpdateSchema = z.object({
  title: z.string().min(1, "Title is required").max(255, "Title must be less than 255 characters").optional(),
  description: z.string().optional(),
  start_time_sec: z.number().int().min(0, "Start time must be a positive number").optional(),
  end_time_sec: z.number().int().min(0, "End time must be a positive number").optional(),
  order_index: z.number().int().min(1, "Order index must be at least 1").optional(),
});

// Type inference from schemas
export type CourseChapterInput = z.infer<typeof courseChapterSchema>;
export type CourseChapterUpdateInput = z.infer<typeof courseChapterUpdateSchema>;