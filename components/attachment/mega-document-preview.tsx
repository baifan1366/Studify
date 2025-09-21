'use client';

import { DocumentPreview } from '@/components/ui/document-preview';
import { useTranslations } from 'next-intl';
import { useState, useEffect, useRef } from 'react';

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
  const [key, setKey] = useState(0)
  const mountedRef = useRef(true)
  
  // Reset DocumentPreview when attachmentId changes to prevent controller conflicts
  useEffect(() => {
    if (mountedRef.current) {
      setKey(prev => prev + 1)
    }
  }, [attachmentId])

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])
  
  // Debug logging for development
  if (process.env.NODE_ENV === 'development') {
    console.log('🔧 MegaDocumentPreview: Rendering with attachmentId:', attachmentId, 'key:', key)
  }

  // Use key prop to force DocumentPreview remount and prevent controller reuse
  return (
    <DocumentPreview
      key={`${attachmentId}-${key}`}
      fileId={attachmentId.toString()}
      className={className}
      showControls={showControls}
      onDownload={() => handleDownload(attachmentId)}
    />
  )
}
