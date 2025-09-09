'use client'

import { useState } from 'react'
import { UploadAttachment } from './upload-attachment'
import { AttachmentList } from './attachment-list'

interface StoragePageProps {
  ownerId: number
}

export function StoragePage({ ownerId }: StoragePageProps) {
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const handleUploadSuccess = () => {
    // Trigger refresh of attachment list
    setRefreshTrigger(prev => prev + 1)
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Course Storage</h1>
        <p className="text-muted-foreground">
          Upload and manage your course attachments with MEGA cloud storage
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Upload Section */}
        <div className="flex justify-center">
          <UploadAttachment 
            ownerId={ownerId} 
            onUploadSuccess={handleUploadSuccess}
          />
        </div>

        {/* Attachments List Section */}
        <div className="lg:col-span-1">
          <AttachmentList refreshTrigger={refreshTrigger} />
        </div>
      </div>
    </div>
  )
}

// Export individual components as well
export { UploadAttachment } from './upload-attachment'
export { AttachmentList } from './attachment-list'
export { PreviewAttachment } from './preview-attachment'
