type SupabaseLike = {
  from: (table: string) => any;
};

export async function resolveVideoAttachmentId(
  supabase: SupabaseLike,
  lessonAttachments: unknown
): Promise<number | undefined> {
  if (!Array.isArray(lessonAttachments)) return undefined;

  const attachmentIds = lessonAttachments
    .map(Number)
    .filter((id) => Number.isInteger(id) && id > 0);

  if (attachmentIds.length === 0) return undefined;

  const { data, error } = await supabase
    .from('course_attachments')
    .select('id')
    .in('id', attachmentIds)
    .eq('type', 'video')
    .eq('is_deleted', false)
    .limit(1);

  if (error) {
    throw new Error(`Failed to resolve video attachment: ${error.message}`);
  }

  return data?.[0]?.id;
}
