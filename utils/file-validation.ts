export function validateFiles(
  files: File[],
  options?: {
    maxVideoSizeMB?: number;
    maxOtherSizeMB?: number;
  }
) {
  const maxVideoSize = (options?.maxVideoSizeMB ?? 30) * 1024 * 1024; // 30MB
  const maxOtherSize = (options?.maxOtherSizeMB ?? 10) * 1024 * 1024; // 10MB

  for (const file of files) {
    if (file.type.startsWith("video/")) {
      if (file.size > maxVideoSize) {
        return {
          valid: false,
          error: `Video file "${file.name}" exceeds ${
            options?.maxVideoSizeMB ?? 30
          }MB limit.`,
        };
      }
    } else {
      if (file.size > maxOtherSize) {
        return {
          valid: false,
          error: `File "${file.name}" exceeds ${
            options?.maxOtherSizeMB ?? 10
          }MB limit.`,
        };
      }
    }
  }

  return { valid: true, error: null };
}
