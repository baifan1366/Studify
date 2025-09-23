'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  HardDrive, 
  Upload, 
  RefreshCw, 
  Grid3X3, 
  List, 
  Search,
  Filter,
  Settings
} from 'lucide-react'
import { useAttachments } from '@/hooks/course/use-attachments'
import { StorageStats } from '@/components/tutor/storage/storage-stats'
import { StorageFilters } from '@/components/tutor/storage/storage-filters'
import { StorageFileList } from '@/components/tutor/storage/storage-file-list'
import { StorageUploadZone } from '@/components/tutor/storage/storage-upload-zone'
import { StorageBulkActions } from '@/components/tutor/storage/storage-bulk-actions'
import { useUser } from '@/hooks/profile/use-user'

export type ViewMode = 'grid' | 'list'
export type SortBy = 'name' | 'date' | 'size' | 'type'
export type SortOrder = 'asc' | 'desc'

export interface FilterState {
  search: string
  fileType: string
  dateRange: string
  sortBy: SortBy
  sortOrder: SortOrder
}

interface StoragePageLayoutProps {
  ownerId: number
}

export function StoragePageLayout() {
  const t = useTranslations('StoragePage')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [showFilters, setShowFilters] = useState(false)
  const [showUploadZone, setShowUploadZone] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<number[]>([])
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    fileType: 'all',
    dateRange: 'all',
    sortBy: 'date',
    sortOrder: 'desc'
  })
  const { data: user } = useUser()
  const ownerId = user?.id || 0
  // Hooks
  const { data: attachments = [], isLoading, refetch } = useAttachments(ownerId as number)

  // Filter and sort attachments
  const filteredAttachments = attachments
    .filter(attachment => {
      // Search filter
      if (filters.search && !attachment.title.toLowerCase().includes(filters.search.toLowerCase())) {
        return false
      }
      
      // File type filter
      if (filters.fileType !== 'all' && attachment.type !== filters.fileType) {
        return false
      }
      
      // Date range filter
      if (filters.dateRange !== 'all') {
        const now = new Date()
        const attachmentDate = new Date(attachment.created_at)
        const daysDiff = Math.floor((now.getTime() - attachmentDate.getTime()) / (1000 * 60 * 60 * 24))
        
        switch (filters.dateRange) {
          case 'today':
            if (daysDiff > 0) return false
            break
          case 'week':
            if (daysDiff > 7) return false
            break
          case 'month':
            if (daysDiff > 30) return false
            break
          case 'year':
            if (daysDiff > 365) return false
            break
        }
      }
      
      return true
    })
    .sort((a, b) => {
      let comparison = 0
      
      switch (filters.sortBy) {
        case 'name':
          comparison = a.title.localeCompare(b.title)
          break
        case 'date':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          break
        case 'size':
          comparison = (a.size || 0) - (b.size || 0)
          break
        case 'type':
          comparison = a.type.localeCompare(b.type)
          break
      }
      
      return filters.sortOrder === 'asc' ? comparison : -comparison
    })

  const handleRefresh = () => {
    refetch()
    setSelectedFiles([])
  }

  const handleFilterChange = (newFilters: Partial<FilterState>) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
    setSelectedFiles([])
  }

  const handleFileSelect = (fileId: number, selected: boolean) => {
    setSelectedFiles(prev => 
      selected 
        ? [...prev, fileId]
        : prev.filter(id => id !== fileId)
    )
  }

  const handleSelectAll = (selected: boolean) => {
    setSelectedFiles(selected ? filteredAttachments.map(f => f.id) : [])
  }

  const handleUploadSuccess = () => {
    refetch()
    setShowUploadZone(false)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-1">
              <h1 className="flex items-center gap-3 text-2xl font-bold text-foreground lg:text-3xl">
                <HardDrive className="h-7 w-7 lg:h-8 lg:w-8" />
                {t('title')}
              </h1>
              <p className="text-sm text-muted-foreground lg:text-base">
                {t('description')}
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowUploadZone(!showUploadZone)}
                className="gap-2"
              >
                <Upload className="h-4 w-4" />
                {t('upload')}
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isLoading}
                className="gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                {t('refresh')}
              </Button>
              
              <div className="flex rounded-md border border-border">
                <Button
                  variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="rounded-r-none border-r border-border"
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="rounded-l-none"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="gap-2"
              >
                <Filter className="h-4 w-4" />
                {t('filters')}
                {(filters.search || filters.fileType !== 'all' || filters.dateRange !== 'all') && (
                  <Badge variant="secondary" className="ml-1 h-4 px-1 text-xs">
                    {[
                      filters.search && 'search',
                      filters.fileType !== 'all' && 'type',
                      filters.dateRange !== 'all' && 'date'
                    ].filter(Boolean).length}
                  </Badge>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="space-y-6">
          {/* Storage Stats */}
          <StorageStats 
            attachments={attachments}
            filteredCount={filteredAttachments.length}
            isLoading={isLoading}
          />

          {/* Upload Zone */}
          {showUploadZone && (
            <Card className="border-dashed border-2 border-primary/20 bg-primary/5">
              <CardContent className="p-6">
                <StorageUploadZone 
                  ownerId={ownerId as number}
                  onUploadSuccess={handleUploadSuccess}
                  onClose={() => setShowUploadZone(false)}
                />
              </CardContent>
            </Card>
          )}

          {/* Filters */}
          {showFilters && (
            <Card className="bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50">
              <CardContent className="p-6">
                <StorageFilters
                  filters={filters}
                  onFilterChange={handleFilterChange}
                  attachments={attachments}
                />
              </CardContent>
            </Card>
          )}

          {/* Bulk Actions */}
          {selectedFiles.length > 0 && (
            <Card className="border-primary bg-primary/5">
              <CardContent className="p-4">
                <StorageBulkActions
                  selectedFiles={selectedFiles}
                  attachments={filteredAttachments}
                  ownerId={ownerId as number}
                  onSelectionChange={setSelectedFiles}
                  onSuccess={handleRefresh}
                />
              </CardContent>
            </Card>
          )}

          {/* File List */}
          <Card className="min-h-[400px]">
            <CardHeader>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-foreground">
                    {t('files_title')}
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">
                    {t('files_description', { 
                      count: filteredAttachments.length,
                      total: attachments.length 
                    })}
                  </CardDescription>
                </div>
                
                {filteredAttachments.length > 0 && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={selectedFiles.length === filteredAttachments.length && filteredAttachments.length > 0}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="rounded border-border bg-background"
                    />
                    <span>{t('select_all')}</span>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <StorageFileList
                attachments={filteredAttachments}
                viewMode={viewMode}
                selectedFiles={selectedFiles}
                onFileSelect={handleFileSelect}
                ownerId={ownerId as number}
                isLoading={isLoading}
                onRefresh={handleRefresh}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
