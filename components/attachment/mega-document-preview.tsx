'use client';

import { useEffect, useState } from 'react';
import { File as MegaFile } from 'megajs';
import { DocumentPreview } from '@/components/ui/document-preview';
import { Button } from '@/components/ui/button';
import { Download, FileText, AlertCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';

// Types
interface MegaDocumentPreviewProps {
  megaUrl: string;
  attachmentId?: number;
  className?: string;
  showControls?: boolean;
  onError?: (error: Error) => void;
}

interface UseMegaBlobReturn {
  blobUrl: string | null;
  loading: boolean;
  error: Error | null;
  progress: number;
  fileType: string | null;
}

// Custom hook for fetching MEGA files and creating blob URLs
export function useMegaBlob(megaUrl: string): UseMegaBlobReturn {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [fileType, setFileType] = useState<string | null>(null);

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
      setFileType(null);
      return;
    }

    let isMounted = true;
    let currentBlobUrl: string | null = null;

    const fetchMegaFile = async () => {
      try {
        setLoading(true);
        setError(null);
        setProgress(0);

        console.log('🔄 MegaBlob: Starting fetch for URL:', megaUrl);

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

        // Set file type from name
        const fileName = megaFile.name || '';
        setFileType(detectFileTypeFromName(fileName));
        console.log('📄 MegaBlob: File detected -', fileName, 'Type:', detectFileTypeFromName(fileName));

        // Check file size limit (50MB for documents)
        const maxSizeBytes = 50 * 1024 * 1024; // 50MB
        if (megaFile.size && megaFile.size > maxSizeBytes) {
          throw new Error(`File too large (${(megaFile.size / (1024 * 1024)).toFixed(1)}MB). Maximum size is 50MB.`);
        }

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
            console.log('✅ MegaBlob: Download completed, creating blob...');
            
            // Combine all chunks into a single buffer
            const fileBuffer = Buffer.concat(chunks);
            
            // Create blob from buffer
            const blob = new Blob([fileBuffer], {
              type: getContentTypeFromExtension(fileName)
            });
            
            // Create blob URL
            currentBlobUrl = URL.createObjectURL(blob);
            setBlobUrl(currentBlobUrl);
            setProgress(100);
            setLoading(false);
            
            console.log('🎯 MegaBlob: Blob URL created successfully');
          } catch (err) {
            if (isMounted) {
              console.error('❌ MegaBlob: Failed to create blob:', err);
              setError(new Error(`Failed to create blob: ${err instanceof Error ? err.message : 'Unknown error'}`));
              setLoading(false);
            }
          }
        });

        downloadStream.on('error', (err: Error) => {
          if (isMounted) {
            console.error('❌ MegaBlob: Download error:', err);
            setError(new Error(`Download failed: ${err.message}`));
            setLoading(false);
          }
        });

      } catch (err) {
        if (isMounted) {
          console.error('❌ MegaBlob: Fetch error:', err);
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

  return { blobUrl, loading, error, progress, fileType };
}

// Helper function to detect file type from filename
function detectFileTypeFromName(filename: string): string {
  const extension = filename.toLowerCase().split('.').pop();
  
  if (!extension) return 'other';
  
  // PDF files
  if (extension === 'pdf') return 'pdf';
  
  // Office documents
  if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(extension)) return 'office';
  
  // Text files
  if (['txt', 'md', 'json', 'xml', 'csv', 'log', 'rtf'].includes(extension)) return 'text';
  
  // Image files
  if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'svg'].includes(extension)) return 'image';
  
  // Video files
  if (['mp4', 'webm', 'ogg', 'avi', 'mov', 'wmv', 'flv', 'm4v'].includes(extension)) return 'video';
  
  return 'other';
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
    'xml': 'application/xml',
    'csv': 'text/csv',
    // Office documents
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xls': 'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'ppt': 'application/vnd.ms-powerpoint',
    'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  };
  
  return mimeTypes[extension || ''] || 'application/octet-stream';
}

// Main MegaDocumentPreview component
export default function MegaDocumentPreview({ 
  megaUrl, 
  attachmentId,
  className = '',
  showControls = true,
  onError 
}: MegaDocumentPreviewProps) {
  const t = useTranslations('DocumentPreview');
  
  // For documents (PDF, text, office), skip blob loading and use QStash directly
  const detectedFileType = detectFileTypeFromName(megaUrl.split('/').pop() || '');
  const shouldSkipBlobLoading = attachmentId && ['pdf', 'text', 'office'].includes(detectedFileType);
  
  const { blobUrl, loading, error, progress, fileType } = shouldSkipBlobLoading 
    ? { blobUrl: null, loading: false, error: null, progress: 0, fileType: detectedFileType }
    : useMegaBlob(megaUrl);

  // Handle error callback
  useEffect(() => {
    if (error && onError) {
      onError(error);
    }
  }, [error, onError]);

  const handleDownload = () => {
    try {
      if (blobUrl) {
        // Use blob URL for download
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = megaUrl.split('/').pop() || 'document';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        // Fallback to opening MEGA URL
        window.open(megaUrl, '_blank');
      }
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  if (error) {
    return (
      <div className={`flex flex-col items-center justify-center p-8 border border-red-200 rounded-lg bg-red-50 ${className}`}>
        <AlertCircle className="w-16 h-16 text-red-400 mb-4" />
        <p className="text-red-600 font-medium text-center mb-2">
          Failed to load document from MEGA
        </p>
        <p className="text-red-500 text-sm text-center mb-4">
          {error.message}
        </p>
        <div className="flex gap-2">
          <Button onClick={handleDownload} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Download Original
          </Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`flex flex-col items-center justify-center p-8 border border-gray-200 rounded-lg bg-gray-50 ${className}`}>
        <div className="relative w-16 h-16 mb-4">
          <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-orange-500 rounded-full border-t-transparent animate-spin"></div>
        </div>
        <p className="text-gray-600 font-medium text-center mb-2">
          Loading document from MEGA...
        </p>
        <p className="text-gray-500 text-sm text-center mb-3">
          {fileType && `Detected: ${fileType.toUpperCase()} file`}
        </p>
        <div className="w-full max-w-xs bg-gray-200 rounded-full h-2 mb-2">
          <div 
            className="bg-orange-500 h-2 rounded-full transition-all duration-300" 
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        <p className="text-gray-500 text-xs text-center">
          {progress}% complete
        </p>
      </div>
    );
  }

  // For QStash-enabled documents, always show DocumentPreview (even without blobUrl)
  if (!blobUrl && !shouldSkipBlobLoading) {
    return (
      <div className={`flex flex-col items-center justify-center p-8 border border-gray-200 rounded-lg bg-gray-50 ${className}`}>
        <FileText className="w-16 h-16 text-gray-400 mb-4" />
        <p className="text-gray-500 text-center mb-4">
          No document to display
        </p>
        <Button onClick={handleDownload} variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Download from MEGA
        </Button>
      </div>
    );
  }

  // Use DocumentPreview with QStash processing for documents, blob URL for others
  return (
    <DocumentPreview
      url={shouldSkipBlobLoading ? megaUrl : (blobUrl || megaUrl)} // Use original MEGA URL for QStash processing, fallback to megaUrl
      fileType={fileType as any}
      attachmentId={attachmentId}
      className={className}
      showControls={showControls}
      onDownload={handleDownload}
      enableAsyncProcessing={true} // Always enable QStash for MEGA files
    />
  );
}
