import { z } from "zod";

export const courseLessonSchema = (t: (key: string) => string) =>
  z.object({
    courseId: z
      .string()
      .min(1, { message: t("course_id_required") }),

    moduleId: z
      .string()
      .min(1, { message: t("module_id_required") }),

    title: z
      .string()
      .min(1, { message: t("title_required") })
      .max(100, { message: t("title_max_length") }),

    kind: z.enum(
      ["video", "live", "document", "quiz", "assignment", "whiteboard"],
      { message: t("kind_required") }
    ),

    content_url: z
      .string()
      .url({ message: t("url_invalid") })
      .optional(),

    duration_sec: z
      .number()
      .min(0, { message: t("duration_min") })
      .max(86400, { message: t("duration_max") })
      .optional(),
  });

export type CourseLessonFormValues = z.infer<ReturnType<typeof courseLessonSchema>>;
