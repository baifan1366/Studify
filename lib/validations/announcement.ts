import { z } from "zod";

export const announcementSchema = (t: (key: string) => string) =>
  z.object({
    created_by: z.number().min(1, { message: t("created_by_required") }),
    title: z.string().min(1, { message: t("title_required") }),
    message: z.string().min(1, { message: t("message_required") }),
    image_url: z.string().optional(),
    edep_link: z.string().optional(),
    status: z.enum(["draft", "scheduled", "sent", "failed"]),
    scheduled_at: z.string().optional(),
    sent_at: z.string().optional(),
    onesignal_id: z.string().optional(),
    onesignal_response: z.string().optional(),
    is_deleted: z.boolean().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    deleted_at: z.string().optional(),
  });

export type AnnouncementFormValues = z.infer<ReturnType<typeof announcementSchema>>;
