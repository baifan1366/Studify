/**
 * Utility function to detect file type from filename
 * Used for auto-detecting attachment types during upload
 */

export type FileType = 'pdf' | 'video' | 'image' | 'office' | 'text' | 'other'

export function detectFileTypeFromName(filename: string): FileType {
  const nameLower = filename.toLowerCase()
  
  // PDF files
  if (nameLower.endsWith('.pdf')) {
    return 'pdf'
  }
  
  // Video files
  if (nameLower.match(/\.(mp4|webm|ogg|avi|mov|wmv|flv|m4v|mkv|3gp|f4v)$/)) {
    return 'video'
  }
  
  // Office documents
  if (nameLower.match(/\.(doc|docx|xls|xlsx|ppt|pptx)$/)) {
    return 'office'
  }
  
  // Image files
  if (nameLower.match(/\.(jpg|jpeg|png|webp|gif|bmp|svg|tiff|ico|heic|heif)$/)) {
    return 'image'
  }
  
  // Text files
  if (nameLower.match(/\.(txt|md|json|xml|csv|log|rtf|yaml|yml|ini|cfg|conf)$/)) {
    return 'text'
  }
  
  // Default to 'other' for unknown types
  return 'other'
}

export function detectFileTypeFromMimeType(mimeType: string): FileType {
  const typeLower = mimeType.toLowerCase()
  
  // PDF files
  if (typeLower === 'application/pdf') {
    return 'pdf'
  }
  
  // Video files
  if (typeLower.startsWith('video/')) {
    return 'video'
  }
  
  // Image files
  if (typeLower.startsWith('image/')) {
    return 'image'
  }
  
  // Office documents
  if (typeLower.includes('officedocument') || 
      typeLower.includes('msword') || 
      typeLower.includes('ms-excel') || 
      typeLower.includes('ms-powerpoint') ||
      typeLower === 'application/vnd.ms-excel' ||
      typeLower === 'application/vnd.ms-powerpoint') {
    return 'office'
  }
  
  // Text files
  if (typeLower.startsWith('text/') || 
      typeLower === 'application/json' ||
      typeLower === 'application/xml') {
    return 'text'
  }
  
  return 'other'
}

/**
 * Detect file type using both filename and MIME type
 * Prioritizes filename extension over MIME type for accuracy
 */
export function detectFileType(filename: string, mimeType?: string): FileType {
  // First try filename detection (more reliable)
  const typeFromName = detectFileTypeFromName(filename)
  
  // If filename detection gives 'other' and we have MIME type, try MIME detection
  if (typeFromName === 'other' && mimeType) {
    return detectFileTypeFromMimeType(mimeType)
  }
  
  return typeFromName
}
