import { z } from 'zod'

// File size constants
export const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB
export const MIN_FILE_SIZE = 1 // 1 byte

// Supported file types (MIME types)
export const SUPPORTED_FILE_TYPES = [
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  
  // Images
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/bmp',
  'image/svg+xml',
  
  // Videos
  'video/mp4',
  'video/avi',
  'video/mov',
  'video/wmv',
  'video/webm',
  
  // Audio
  'audio/mp3',
  'audio/wav',
  'audio/ogg',
  'audio/m4a',
  
  // Archives
  'application/zip',
  'application/x-rar-compressed',
  'application/x-7z-compressed',
] as const

// Attachment title validation schema
export const attachmentTitleSchema = z
  .string()
  .min(1, 'Title is required')
  .min(3, 'Title must be at least 3 characters')
  .max(100, 'Title must not exceed 100 characters')
  .regex(/^[a-zA-Z0-9\s\-_\.()]+$/, 'Title contains invalid characters')

// File validation schema
export const fileSchema = z
  .instanceof(File)
  .refine((file) => file.size > MIN_FILE_SIZE, 'File is required')
  .refine((file) => file.size <= MAX_FILE_SIZE, 'File size must not exceed 100MB')
  .refine(
    (file) => SUPPORTED_FILE_TYPES.includes(file.type as any),
    'File type is not supported'
  )

// Owner ID validation schema
export const ownerIdSchema = z
  .number()
  .int('Owner ID must be an integer')
  .positive('Owner ID must be positive')

// Complete attachment upload validation schema
export const attachmentUploadSchema = z.object({
  title: attachmentTitleSchema,
  file: fileSchema,
  ownerId: ownerIdSchema,
})

// Attachment update validation schema
export const attachmentUpdateSchema = z.object({
  id: z.number().int().positive(),
  title: attachmentTitleSchema,
  ownerId: ownerIdSchema.optional(),
})

// Attachment delete validation schema
export const attachmentDeleteSchema = z.object({
  id: z.number().int().positive(),
  ownerId: ownerIdSchema.optional(),
})

// Type exports
export type AttachmentUploadInput = z.infer<typeof attachmentUploadSchema>
export type AttachmentUpdateInput = z.infer<typeof attachmentUpdateSchema>
export type AttachmentDeleteInput = z.infer<typeof attachmentDeleteSchema>

// Validation helper functions
export function validateAttachmentTitle(title: string) {
  try {
    attachmentTitleSchema.parse(title)
    return { success: true, error: null }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message }
    }
    return { success: false, error: 'Validation failed' }
  }
}

export function validateFile(file: File) {
  try {
    fileSchema.parse(file)
    return { success: true, error: null }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message }
    }
    return { success: false, error: 'File validation failed' }
  }
}

export function validateAttachmentUpload(data: unknown) {
  try {
    const result = attachmentUploadSchema.parse(data)
    return { success: true, data: result, error: null }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, data: null, error: error.errors[0].message }
    }
    return { success: false, data: null, error: 'Validation failed' }
  }
}

// File type helper functions
export function getFileTypeCategory(mimeType: string): 'document' | 'image' | 'video' | 'audio' | 'archive' | 'other' {
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType.startsWith('video/')) return 'video'
  if (mimeType.startsWith('audio/')) return 'audio'
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('7z')) return 'archive'
  if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('sheet') || mimeType.includes('presentation') || mimeType.startsWith('text/')) return 'document'
  return 'other'
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}