import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * Upload file to specified Supabase Storage bucket
 * @param bucketPath - The bucket and folder path (e.g., 'classroom-attachment/public' or 'classroom-attachment/private')
 * @param fileName - The file name (leave empty string to auto-generate)
 * @param file - The file to upload
 * @returns Upload result with file path
 */
export async function uploadFileToBucket(bucketPath: string, fileName: string, file: File) {
  // Parse bucket name and folder path
  const pathParts = bucketPath.split('/');
  const bucketName = pathParts[0];
  const folderPath = pathParts.slice(1).join('/');
  
  // Generate file name if not provided
  const finalFileName = fileName || `${Date.now()}-${file.name}`;
  const fullPath = folderPath ? `${folderPath}/${finalFileName}` : finalFileName;
  
  // Upload file to Supabase Storage
  const { data, error } = await supabase.storage
    .from(bucketName)
    .upload(fullPath, file, {
      cacheControl: '3600',
      upsert: false, // Don't overwrite existing files
    });

  if (error) {
    throw new Error(`File upload failed: ${error.message}`);
  }

  return {
    path: data.path,
    fullPath: data.fullPath,
    bucketName,
    fileName: finalFileName,
    size: file.size,
    type: file.type,
  };
}

/**
 * Get public URL for files in public buckets
 * Anyone can directly access these URLs
 * @param bucket - The bucket name
 * @param path - The file path within the bucket
 * @returns Public URL
 */
export function getPublicFileUrl(bucket: string, path: string): string {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Get temporary signed URL for files in private buckets
 * Generates a temporary downloadable link with expiration
 * @param bucket - The bucket name
 * @param path - The file path within the bucket
 * @param expireSeconds - URL expiration time in seconds (default: 60)
 * @returns Signed URL with expiration
 */
export async function getPrivateFileUrl(bucket: string, path: string, expireSeconds: number = 60): Promise<string> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expireSeconds);

  if (error) {
    throw new Error(`Failed to create signed URL: ${error.message}`);
  }

  return data.signedUrl; // Temporary downloadable link
}

/**
 * Helper function to upload to public classroom attachments
 * @param fileName - The file name (leave empty to auto-generate)
 * @param file - The file to upload
 */
export async function uploadToPublicClassroom(fileName: string, file: File) {
  return uploadFileToBucket('classroom-attachment/public', fileName, file);
}

/**
 * Helper function to upload to private classroom attachments
 * @param fileName - The file name (leave empty to auto-generate)
 * @param file - The file to upload
 */
export async function uploadToPrivateClassroom(fileName: string, file: File) {
  return uploadFileToBucket('classroom-attachment/private', fileName, file);
}

/**
 * Get file URL based on bucket type (auto-detects public vs private)
 * @param bucketPath - Full bucket path (e.g., 'classroom-attachment/public/file.pdf')
 * @param expireSeconds - For private files, expiration time in seconds
 * @returns File URL (public or signed)
 */
export async function getFileUrl(bucketPath: string, expireSeconds: number = 3600): Promise<string> {
  const pathParts = bucketPath.split('/');
  const bucketName = pathParts[0];
  const filePath = pathParts.slice(1).join('/');
  
  // Check if it's a public or private bucket based on path
  if (bucketPath.includes('/public/')) {
    return getPublicFileUrl(bucketName, filePath);
  } else {
    return getPrivateFileUrl(bucketName, filePath, expireSeconds);
  }
}

/**
 * Delete file from Supabase Storage
 * @param bucketPath - Full bucket path to the file
 */
export async function deleteFileFromBucket(bucketPath: string) {
  const pathParts = bucketPath.split('/');
  const bucketName = pathParts[0];
  const filePath = pathParts.slice(1).join('/');
  
  const { data, error } = await supabase.storage
    .from(bucketName)
    .remove([filePath]);

  if (error) {
    throw new Error(`File deletion failed: ${error.message}`);
  }

  return data;
}

/**
 * Get file metadata from Supabase Storage
 * @param bucketPath - Full bucket path to the file
 */
export async function getFileMetadata(bucketPath: string) {
  const pathParts = bucketPath.split('/');
  const bucketName = pathParts[0];
  const filePath = pathParts.slice(1).join('/');
  
  const { data, error } = await supabase.storage
    .from(bucketName)
    .list(filePath.split('/').slice(0, -1).join('/'), {
      search: filePath.split('/').pop()
    });

  if (error) {
    throw new Error(`Failed to get file metadata: ${error.message}`);
  }

  return data?.[0] || null;
}
