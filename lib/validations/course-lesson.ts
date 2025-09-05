import { z } from "zod";
import { getTranslations } from "next-intl/server";

export async function courseLessonSchema() {
  const t = await getTranslations("CourseLessonSchema");

  return z.object({
    courseId: z.string().min(1, { message: t("course_id_required") }),
    moduleId: z.string().min(1, { message: t("module_id_required") }),
    title: z.string().min(1, { message: t("title_required") }).max(100, { message: t("title_max_length") }),
    slug: z.string().min(1, { message: t("slug_required") }).max(100, { message: t("slug_max_length") }),
    position: z.number().min(1, { message: t("position_min") }).max(100, { message: t("position_max") }),
    description: z.string().min(1, { message: t("description_required") }).max(500, { message: t("description_max_length") }),
    is_preview: z.boolean().optional(),
    is_published: z.boolean().optional(),
    transcript: z.string().optional(),
    attachments: z.array(z.string()).optional(),
    kind: z.enum(["video", "live", "document", "quiz", "assignment", "whiteboard"], { message: t("kind_required") }),
    content_url: z.string().url({ message: t("url_invalid") }).optional(),
    duration_sec: z.number().min(0, { message: t("duration_min") }).max(86400, { message: t("duration_max") }).optional(),
    video_url: z.string().url({ message: t("url_invalid") }).optional(),
    thumbnail_url: z.string().url({ message: t("url_invalid") }).optional(),
  });
}