import { z } from "zod";

export const courseModuleSchema = (t: (key: string) => string) =>
  z.object({
    courseId: z
      .string()
      .min(1, { message: t("course_id_required") }),

    title: z
      .string()
      .min(1, { message: t("title_required") })
      .max(100, { message: t("title_max_length") }),

    position: z
      .number()
      .min(1, { message: t("position_min") })
      .max(100, { message: t("position_max") }),
  });

export type CourseModuleFormValues = z.infer<ReturnType<typeof courseModuleSchema>>;
