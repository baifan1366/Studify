'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { File as MegaFile } from 'megajs';

// Types
interface MegaImageProps {
  megaUrl: string;
  alt?: string;
  className?: string;
  onLoad?: () => void;
  onError?: (error: Error) => void;
}

interface UseMegaFileReturn {
  blobUrl: string | null;
  loading: boolean;
  error: Error | null;
  progress: number;
}

// Custom hook for fetching MEGA files
export function useMegaFile(megaUrl: string): UseMegaFileReturn {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [progress, setProgress] = useState<number>(0);

  useEffect(() => {
    // Clean up previous blob URL
    if (blobUrl) {
      URL.revokeObjectURL(blobUrl);
      setBlobUrl(null);
    }

    if (!megaUrl) {
      setLoading(false);
      setError(null);
      setProgress(0);
      return;
    }

    let isMounted = true;
    let currentBlobUrl: string | null = null;

    const fetchMegaFile = async () => {
      try {
        setLoading(true);
        setError(null);
        setProgress(0);

        // Parse MEGA URL and create file instance
        const megaFile = MegaFile.fromURL(megaUrl);
        
        // Load file metadata
        await new Promise<void>((resolve, reject) => {
          megaFile.loadAttributes((error) => {
            if (error) {
              reject(new Error(`Failed to load MEGA file attributes: ${error.message}`));
            } else {
              resolve();
            }
          });
        });

        if (!isMounted) return;

        // Download file with progress tracking
        const chunks: Buffer[] = [];
        let totalSize = megaFile.size || 0;
        let downloadedSize = 0;

        const downloadStream = megaFile.download({});
        
        downloadStream.on('data', (chunk: Buffer) => {
          if (!isMounted) return;
          
          chunks.push(chunk);
          downloadedSize += chunk.length;
          
          if (totalSize > 0) {
            const progressPercent = Math.round((downloadedSize / totalSize) * 100);
            setProgress(progressPercent);
          }
        });

        downloadStream.on('end', () => {
          if (!isMounted) return;
          
          try {
            // Combine all chunks into a single buffer
            const fileBuffer = Buffer.concat(chunks);
            
            // Create blob from buffer
            const blob = new Blob([fileBuffer], {
              type: getContentTypeFromExtension(megaFile.name || '')
            });
            
            // Create blob URL
            currentBlobUrl = URL.createObjectURL(blob);
            setBlobUrl(currentBlobUrl);
            setProgress(100);
            setLoading(false);
          } catch (err) {
            if (isMounted) {
              setError(new Error(`Failed to create blob: ${err instanceof Error ? err.message : 'Unknown error'}`));
              setLoading(false);
            }
          }
        });

        downloadStream.on('error', (err: Error) => {
          if (isMounted) {
            setError(new Error(`Download failed: ${err.message}`));
            setLoading(false);
          }
        });

      } catch (err) {
        if (isMounted) {
          setError(new Error(`Failed to fetch MEGA file: ${err instanceof Error ? err.message : 'Unknown error'}`));
          setLoading(false);
        }
      }
    };

    fetchMegaFile();

    // Cleanup function
    return () => {
      isMounted = false;
      if (currentBlobUrl) {
        URL.revokeObjectURL(currentBlobUrl);
      }
    };
  }, [megaUrl]);

  // Cleanup blob URL when component unmounts
  useEffect(() => {
    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [blobUrl]);

  return { blobUrl, loading, error, progress };
}

// Helper function to determine content type from file extension
function getContentTypeFromExtension(filename: string): string {
  const extension = filename.toLowerCase().split('.').pop();
  
  const mimeTypes: Record<string, string> = {
    // Images
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'svg': 'image/svg+xml',
    'bmp': 'image/bmp',
    'ico': 'image/x-icon',
    // Videos
    'mp4': 'video/mp4',
    'webm': 'video/webm',
    'ogg': 'video/ogg',
    'avi': 'video/x-msvideo',
    'mov': 'video/quicktime',
    // Audio
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    // Documents
    'pdf': 'application/pdf',
    'txt': 'text/plain',
    'json': 'application/json',
  };
  
  return mimeTypes[extension || ''] || 'application/octet-stream';
}

// Main MegaImage component
export default function MegaImage({ 
  megaUrl, 
  alt = 'MEGA Image', 
  className = '',
  onLoad,
  onError 
}: MegaImageProps) {
  const t = useTranslations('MegaBlobImage');
  const { blobUrl, loading, error, progress } = useMegaFile(megaUrl);

  // Handle error callback
  useEffect(() => {
    if (error && onError) {
      onError(error);
    }
  }, [error, onError]);

  // Handle load callback
  useEffect(() => {
    if (blobUrl && onLoad) {
      onLoad();
    }
  }, [blobUrl, onLoad]);

  if (error) {
    return (
      <div className={`flex flex-col items-center justify-center p-4 border border-red-200 dark:border-red-800 rounded-lg bg-red-50 dark:bg-red-900/20 ${className}`}>
        <svg 
          className="w-12 h-12 text-red-400 dark:text-red-500 mb-2" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
          />
        </svg>
        <p className="text-red-600 dark:text-red-400 text-sm text-center">
          {t('failed_to_load')}
        </p>
        <p className="text-red-500 dark:text-red-400 text-xs text-center mt-1">
          {error.message}
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`flex flex-col items-center justify-center p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50 ${className}`}>
        <div className="relative w-12 h-12 mb-3">
          <div className="absolute inset-0 border-4 border-gray-200 dark:border-gray-700 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-blue-500 dark:border-blue-400 rounded-full border-t-transparent animate-spin"></div>
        </div>
        <p className="text-gray-600 dark:text-gray-300 text-sm text-center mb-2">
          {t('loading')}
        </p>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-1">
          <div 
            className="bg-blue-500 dark:bg-blue-400 h-2 rounded-full transition-all duration-300" 
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        <p className="text-gray-500 dark:text-gray-400 text-xs text-center">
          {progress}%
        </p>
      </div>
    );
  }

  if (!blobUrl) {
    return (
      <div className={`flex flex-col items-center justify-center p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50 ${className}`}>
        <svg 
          className="w-12 h-12 text-gray-400 dark:text-gray-500 mb-2" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" 
          />
        </svg>
        <p className="text-gray-500 dark:text-gray-400 text-sm text-center">
          {t('no_image')}
        </p>
      </div>
    );
  }

  return (
    <img
      src={blobUrl}
      alt={alt}
      className={className}
      onLoad={() => {
        if (onLoad) {
          onLoad();
        }
      }}
      onError={(e) => {
        // Silently handle image rendering errors
        console.warn('Image failed to render from blob URL:', megaUrl);
        
        // Call error callback if provided
        if (onError) {
          onError(new Error('Failed to display image'));
        }
        
        // Prevent error from bubbling up
        e.preventDefault();
      }}
    />
  );
}