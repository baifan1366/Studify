'use client'

import { useState, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  Search,
  X,
  Calendar,
  FileType,
  SortAsc,
  SortDesc,
  Filter,
  RotateCcw
} from 'lucide-react'
import { CourseAttachment } from '@/interface/courses/attachment-interface'
import type { FilterState } from './storage-page-layout'

interface StorageFiltersProps {
  filters: FilterState
  onFilterChange: (filters: Partial<FilterState>) => void
  attachments: CourseAttachment[]
}

export function StorageFilters({ filters, onFilterChange, attachments }: StorageFiltersProps) {
  const t = useTranslations('StoragePage')

  // Get unique file types from attachments
  const fileTypes = useMemo(() => {
    const types = Array.from(new Set(attachments.map(att => att.type)))
    return types.sort()
  }, [attachments])

  // Get file type counts
  const fileTypeCounts = useMemo(() => {
    return attachments.reduce((acc, att) => {
      acc[att.type] = (acc[att.type] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  }, [attachments])

  const handleSearchChange = (value: string) => {
    onFilterChange({ search: value })
  }

  const handleFileTypeChange = (value: string) => {
    onFilterChange({ fileType: value })
  }

  const handleDateRangeChange = (value: string) => {
    onFilterChange({ dateRange: value })
  }

  const handleSortByChange = (value: string) => {
    onFilterChange({ sortBy: value as FilterState['sortBy'] })
  }

  const handleSortOrderChange = (value: string) => {
    onFilterChange({ sortOrder: value as FilterState['sortOrder'] })
  }

  const handleClearFilters = () => {
    onFilterChange({
      search: '',
      fileType: 'all',
      dateRange: 'all',
      sortBy: 'date',
      sortOrder: 'desc'
    })
  }

  const hasActiveFilters = filters.search || filters.fileType !== 'all' || filters.dateRange !== 'all'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold text-foreground">{t('filters_title')}</h3>
        </div>
        {hasActiveFilters && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearFilters}
            className="gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            {t('clear_filters')}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Search */}
        <div className="space-y-2">
          <Label htmlFor="search" className="text-sm font-medium">
            {t('search_files')}
          </Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="search"
              type="text"
              placeholder={t('search_placeholder')}
              value={filters.search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10 bg-background border-border"
            />
            {filters.search && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSearchChange('')}
                className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2 p-0 hover:bg-muted"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>

        {/* File Type */}
        <div className="space-y-2">
          <Label htmlFor="file-type" className="text-sm font-medium">
            {t('file_type')}
          </Label>
          <Select value={filters.fileType} onValueChange={handleFileTypeChange}>
            <SelectTrigger className="bg-background border-border">
              <SelectValue placeholder={t('select_file_type')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                <div className="flex items-center justify-between w-full">
                  <span>{t('all_types')}</span>
                  <Badge variant="secondary" className="ml-2">
                    {attachments.length}
                  </Badge>
                </div>
              </SelectItem>
              {fileTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  <div className="flex items-center justify-between w-full">
                    <span className="capitalize">{type}</span>
                    <Badge variant="secondary" className="ml-2">
                      {fileTypeCounts[type]}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Date Range */}
        <div className="space-y-2">
          <Label htmlFor="date-range" className="text-sm font-medium">
            {t('upload_date')}
          </Label>
          <Select value={filters.dateRange} onValueChange={handleDateRangeChange}>
            <SelectTrigger className="bg-background border-border">
              <SelectValue placeholder={t('select_date_range')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('all_time')}</SelectItem>
              <SelectItem value="today">{t('today')}</SelectItem>
              <SelectItem value="week">{t('this_week')}</SelectItem>
              <SelectItem value="month">{t('this_month')}</SelectItem>
              <SelectItem value="year">{t('this_year')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Sort Options */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">{t('sort_by')}</Label>
          <div className="flex gap-2">
            <Select value={filters.sortBy} onValueChange={handleSortByChange}>
              <SelectTrigger className="flex-1 bg-background border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">{t('name')}</SelectItem>
                <SelectItem value="date">{t('date')}</SelectItem>
                <SelectItem value="size">{t('size')}</SelectItem>
                <SelectItem value="type">{t('type')}</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSortOrderChange(filters.sortOrder === 'asc' ? 'desc' : 'asc')}
              className="px-3"
            >
              {filters.sortOrder === 'asc' ? (
                <SortAsc className="h-4 w-4" />
              ) : (
                <SortDesc className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Active Filters */}
      {hasActiveFilters && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">{t('active_filters')}</Label>
          <div className="flex flex-wrap gap-2">
            {filters.search && (
              <Badge variant="secondary" className="gap-1">
                <Search className="h-3 w-3" />
                {t('search')}: "{filters.search}"
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSearchChange('')}
                  className="h-4 w-4 p-0 hover:bg-transparent"
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}
            {filters.fileType !== 'all' && (
              <Badge variant="secondary" className="gap-1">
                <FileType className="h-3 w-3" />
                {t('type')}: {filters.fileType}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleFileTypeChange('all')}
                  className="h-4 w-4 p-0 hover:bg-transparent"
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}
            {filters.dateRange !== 'all' && (
              <Badge variant="secondary" className="gap-1">
                <Calendar className="h-3 w-3" />
                {t('date')}: {t(filters.dateRange)}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDateRangeChange('all')}
                  className="h-4 w-4 p-0 hover:bg-transparent"
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* Filter Summary */}
      <div className="text-sm text-muted-foreground">
        {t('filter_summary', {
          showing: attachments.length,
          total: attachments.length
        })}
      </div>
    </div>
  )
}
