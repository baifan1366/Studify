'use client'

import { useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  HardDrive,
  FileText,
  Image,
  Video,
  Music,
  Archive,
  File,
  Loader2,
  TrendingUp,
  Calendar,
  BarChart3
} from 'lucide-react'
import { CourseAttachment } from '@/interface/courses/attachment-interface'

interface StorageStatsProps {
  attachments: CourseAttachment[]
  filteredCount: number
  isLoading: boolean
}

export function StorageStats({ attachments, filteredCount, isLoading }: StorageStatsProps) {
  const t = useTranslations('StoragePage')

  const stats = useMemo(() => {
    if (!attachments.length) {
      return {
        totalFiles: 0,
        totalSize: 0,
        typeBreakdown: {},
        sizeBreakdown: {},
        recentUploads: 0,
        largestFile: null,
        averageSize: 0
      }
    }

    const totalSize = attachments.reduce((sum, att) => sum + (att.size || 0), 0)
    const typeBreakdown = attachments.reduce((acc, att) => {
      acc[att.type] = (acc[att.type] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const sizeBreakdown = attachments.reduce((acc, att) => {
      const size = att.size || 0
      acc[att.type] = (acc[att.type] || 0) + size
      return acc
    }, {} as Record<string, number>)

    // Recent uploads (last 7 days)
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    const recentUploads = attachments.filter(att => 
      new Date(att.created_at) > weekAgo
    ).length

    // Largest file
    const largestFile = attachments.reduce((largest, att) => 
      (!largest || (att.size || 0) > (largest.size || 0)) ? att : largest
    , attachments[0])

    const averageSize = totalSize / attachments.length

    return {
      totalFiles: attachments.length,
      totalSize,
      typeBreakdown,
      sizeBreakdown,
      recentUploads,
      largestFile,
      averageSize
    }
  }, [attachments])

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'document':
        return <FileText className="h-4 w-4" />
      case 'image':
        return <Image className="h-4 w-4" />
      case 'video':
        return <Video className="h-4 w-4" />
      case 'audio':
        return <Music className="h-4 w-4" />
      case 'archive':
        return <Archive className="h-4 w-4" />
      default:
        return <File className="h-4 w-4" />
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'document':
        return 'text-orange-600 dark:text-orange-400'
      case 'image':
        return 'text-green-600 dark:text-green-400'
      case 'video':
        return 'text-blue-600 dark:text-blue-400'
      case 'audio':
        return 'text-purple-600 dark:text-purple-400'
      case 'archive':
        return 'text-yellow-600 dark:text-yellow-400'
      default:
        return 'text-gray-600 dark:text-gray-400'
    }
  }

  // Calculate storage usage percentage (assuming 1GB limit for demo)
  const STORAGE_LIMIT = 1024 * 1024 * 1024 // 1GB in bytes
  const usagePercentage = (stats.totalSize / STORAGE_LIMIT) * 100

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 bg-muted rounded w-20" />
              <div className="h-4 w-4 bg-muted rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded w-16 mb-1" />
              <div className="h-3 bg-muted rounded w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Main Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Files */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('total_files')}</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalFiles}</div>
            <p className="text-xs text-muted-foreground">
              {filteredCount !== stats.totalFiles && (
                <>
                  {filteredCount} {t('filtered')}
                </>
              )}
            </p>
          </CardContent>
        </Card>

        {/* Total Storage */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('storage_used')}</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatFileSize(stats.totalSize)}</div>
            <div className="space-y-2 mt-2">
              <Progress value={Math.min(usagePercentage, 100)} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {usagePercentage.toFixed(1)}% {t('of')} {formatFileSize(STORAGE_LIMIT)}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Recent Uploads */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('recent_uploads')}</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.recentUploads}</div>
            <p className="text-xs text-muted-foreground">
              {t('last_7_days')}
            </p>
          </CardContent>
        </Card>

        {/* Average File Size */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('average_size')}</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatFileSize(stats.averageSize)}
            </div>
            <p className="text-xs text-muted-foreground">
              {t('per_file')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* File Type Breakdown */}
      {Object.keys(stats.typeBreakdown).length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* File Types by Count */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('file_types')}</CardTitle>
              <CardDescription>{t('breakdown_by_count')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(stats.typeBreakdown)
                .sort(([,a], [,b]) => b - a)
                .map(([type, count]) => {
                  const percentage = (count / stats.totalFiles) * 100
                  return (
                    <div key={type} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={getTypeColor(type)}>
                            {getTypeIcon(type)}
                          </span>
                          <span className="text-sm font-medium capitalize">{type}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">{count}</span>
                          <Badge variant="secondary" className="text-xs">
                            {percentage.toFixed(1)}%
                          </Badge>
                        </div>
                      </div>
                      <Progress value={percentage} className="h-1" />
                    </div>
                  )
                })}
            </CardContent>
          </Card>

          {/* File Types by Size */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('storage_breakdown')}</CardTitle>
              <CardDescription>{t('breakdown_by_size')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(stats.sizeBreakdown)
                .sort(([,a], [,b]) => b - a)
                .map(([type, totalSize]) => {
                  const percentage = (totalSize / stats.totalSize) * 100
                  return (
                    <div key={type} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={getTypeColor(type)}>
                            {getTypeIcon(type)}
                          </span>
                          <span className="text-sm font-medium capitalize">{type}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">
                            {formatFileSize(totalSize)}
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            {percentage.toFixed(1)}%
                          </Badge>
                        </div>
                      </div>
                      <Progress value={percentage} className="h-1" />
                    </div>
                  )
                })}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Additional Info */}
      {stats.largestFile && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('largest_file')}</CardTitle>
            <CardDescription>{t('largest_file_description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className={getTypeColor(stats.largestFile.type)}>
                  {getTypeIcon(stats.largestFile.type)}
                </span>
                <div>
                  <p className="font-medium">{stats.largestFile.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatFileSize(stats.largestFile.size || 0)}
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="capitalize">
                {stats.largestFile.type}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
