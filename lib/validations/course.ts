import { z } from "zod";

export const courseSchema = (t: (key: string) => string) =>
  z.object({
    title: z
      .string()
      .min(1, { message: t("title_min_length") })
      .max(100, { message: t("title_max_length") }),

    description: z
      .string()
      .min(1, { message: t("description_required") })
      .max(500, { message: t("description_max_length") }),

    slug: z
      .string()
      .min(1, { message: t("slug_required") })
      .max(100, { message: t("slug_max_length") }),

    video_intro_url: z
      .string()
      .url({ message: t("url_invalid") })
      .optional()
      .or(z.literal("")),

    requirements: z.array(z.string()).optional(),
    learning_objectives: z.array(z.string()).optional(),
    category: z.string().optional(),
    language: z.string().optional(),
    certificate_template: z.string().optional(),

    visibility: z.enum(["public", "private", "unlisted"]).optional(),

    price_cents: z
      .number()
      .min(0, { message: t("price_min") })
      .max(1_000_000, { message: t("price_max") })
      .optional(),

    currency: z.string().optional(),
    tags: z.array(z.string()).optional(),
    auto_create_classroom: z.boolean().optional(),
    auto_create_community: z.boolean().optional(),

    thumbnail_url: z
      .string()
      .url({ message: t("url_invalid") })
      .optional()
      .or(z.literal("")),

    level: z.enum(["beginner", "intermediate", "advanced"]).optional(),

    total_lessons: z
      .number()
      .min(1, { message: t("total_lessons_min") })
      .max(1_000_000, { message: t("total_lessons_max") })
      .optional(),

    total_duration_minutes: z
      .number()
      .min(1, { message: t("total_duration_min") })
      .max(1_000_000, { message: t("total_duration_max") })
      .optional(),

    average_rating: z.number().optional(),
    total_students: z.number().optional(),
    is_free: z.boolean().optional(),
  });

export type CourseFormValues = z.infer<ReturnType<typeof courseSchema>>;
