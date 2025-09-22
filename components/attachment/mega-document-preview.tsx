'use client';

import { DocumentPreview } from '@/components/ui/document-preview';
import { useTranslations } from 'next-intl';

// Types
interface MegaDocumentPreviewProps {
  attachmentId: number; // Now required - we always work with attachment IDs
  className?: string;
  showControls?: boolean;
  onError?: (error: Error) => void;
}

// Helper function for downloading files
const handleDownload = (attachmentId: number) => {
  // This will trigger the browser download via the attachment API
  const downloadUrl = `/api/attachments/${attachmentId}/download`
  window.open(downloadUrl, '_blank')
}


// Main MegaDocumentPreview component with proper state management
export default function MegaDocumentPreview({ 
  attachmentId,
  className = '',
  showControls = true,
  onError 
}: MegaDocumentPreviewProps) {
  const t = useTranslations('DocumentPreview')
  // Debug logging for development
  if (process.env.NODE_ENV === 'development') {
    console.log('🔧 MegaDocumentPreview: Rendering with attachmentId:', attachmentId)
  }

  return (
    <DocumentPreview
      key={attachmentId} // Simple key based on attachmentId
      fileId={attachmentId.toString()}
      className={className}
      showControls={showControls}
      onDownload={() => handleDownload(attachmentId)}
    />
  )
}
