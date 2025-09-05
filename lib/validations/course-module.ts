import { z } from "zod";
import { getTranslations } from "next-intl/server";

export async function courseModuleSchema() {
  const t = await getTranslations("CourseModuleSchema");

  return z.object({
    courseId: z.string().min(1, { message: t("course_id_required") }),
    title: z.string().min(1, { message: t("title_required") }).max(100, { message: t("title_max_length") }),
    description: z.string().min(1, { message: t("description_required") }).max(500, { message: t("description_max_length") }).optional(),
    position: z.number().min(1, { message: t("position_min") }).max(100, { message: t("position_max") }),
    is_published: z.boolean().optional(),
    estimated_duration_minutes: z.number().min(1, { message: t("duration_min") }).max(1440, { message: t("duration_max") }).optional(),
  });
}