"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { 
  Search, 
  Filter, 
  SortAsc, 
  SortDesc,
  FileText,
  MessageSquare,
  BookOpen,
  AlertTriangle,
  Eye,
  Ban,
  Calendar,
  User,
  TrendingUp,
  MessageCircle,
  Heart,
  Clock
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Pagination, 
  PaginationContent, 
  PaginationEllipsis, 
  PaginationItem, 
  PaginationLink, 
  PaginationNext, 
  PaginationPrevious 
} from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

import { 
  useContentReports, 
  ContentReportsFilters, 
  ContentItem 
} from "@/hooks/admin/use-admin-content-reports";

type SortByOption = NonNullable<ContentReportsFilters['sort_by']>;
import { useFormat } from "@/hooks/use-format";

interface ContentReportsListProps {
  onSelectContent?: (content: ContentItem) => void;
  onCreateBan?: (content: ContentItem) => void;
}

export default function ContentReportsList({ 
  onSelectContent, 
  onCreateBan 
}: ContentReportsListProps) {
  const t = useTranslations('ContentReportsList');
  const { formatRelativeTime, formatNumber } = useFormat();
  const { toast } = useToast();

  // Filter and pagination state
  const [filters, setFilters] = useState<ContentReportsFilters>({
    content_type: 'all',
    time_period: 'all',
    has_reports: undefined,
    search: '',
    sort_by: 'created_at',
    sort_order: 'desc',
    page: 1,
    limit: 20,
  });

  const [searchInput, setSearchInput] = useState('');

  // Debounced search
  const debouncedSearch = useMemo(() => {
    const timer = setTimeout(() => {
      setFilters(prev => ({ ...prev, search: searchInput, page: 1 }));
    }, 500);

    return () => clearTimeout(timer);
  }, [searchInput]);

  // Fetch content reports
  const { 
    data: reportsData, 
    isLoading, 
    isError, 
    error 
  } = useContentReports(filters);

  const handleFilterChange = (key: keyof ContentReportsFilters, value: any) => {
    setFilters(prev => ({ 
      ...prev, 
      [key]: value, 
      page: 1 // Reset to first page when filters change
    }));
  };

  const handleSort = (sortBy: SortByOption) => {
    const newOrder = filters.sort_by === sortBy && filters.sort_order === 'desc' 
      ? 'asc' 
      : 'desc';
    
    setFilters(prev => ({ 
      ...prev, 
      sort_by: sortBy, 
      sort_order: newOrder 
    }));
  };

  const getContentIcon = (type: string) => {
    switch (type) {
      case 'course':
        return <BookOpen className="w-4 h-4" />;
      case 'post':
        return <FileText className="w-4 h-4" />;
      case 'comment':
        return <MessageSquare className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const getContentTypeColor = (type: string) => {
    switch (type) {
      case 'course':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'post':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'comment':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'inactive':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      case 'ban':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const truncateText = (text: string, maxLength: number = 100) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  if (isError) {
    return (
      <Card className="bg-transparent p-6">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            {t('error_loading')}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {error?.message || t('error_message')}
          </p>
          <Button onClick={() => window.location.reload()}>
            {t('retry')}
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters and Search */}
      <Card className="bg-transparent p-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder={t('search_placeholder')}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            {/* Content Type Filter */}
            <Select
              value={filters.content_type}
              onValueChange={(value) => handleFilterChange('content_type', value)}
            >
              <SelectTrigger className="w-[140px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('all_types')}</SelectItem>
                <SelectItem value="course">{t('courses')}</SelectItem>
                <SelectItem value="post">{t('posts')}</SelectItem>
                <SelectItem value="comment">{t('comments')}</SelectItem>
              </SelectContent>
            </Select>

            {/* Time Period Filter */}
            <Select
              value={filters.time_period}
              onValueChange={(value) => handleFilterChange('time_period', value)}
            >
              <SelectTrigger className="w-[120px]">
                <Calendar className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('all_time')}</SelectItem>
                <SelectItem value="today">{t('today')}</SelectItem>
                <SelectItem value="week">{t('this_week')}</SelectItem>
                <SelectItem value="month">{t('this_month')}</SelectItem>
                <SelectItem value="year">{t('this_year')}</SelectItem>
              </SelectContent>
            </Select>

            {/* Reports Filter */}
            <Select
              value={filters.has_reports === undefined ? 'all' : filters.has_reports ? 'yes' : 'no'}
              onValueChange={(value) => 
                handleFilterChange('has_reports', value === 'all' ? undefined : value === 'yes')
              }
            >
              <SelectTrigger className="w-[140px]">
                <AlertTriangle className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('all_reports')}</SelectItem>
                <SelectItem value="yes">{t('has_reports')}</SelectItem>
                <SelectItem value="no">{t('no_reports')}</SelectItem>
              </SelectContent>
            </Select>

            {/* Sort Options */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  {filters.sort_order === 'asc' ? (
                    <SortAsc className="w-4 h-4 mr-2" />
                  ) : (
                    <SortDesc className="w-4 h-4 mr-2" />
                  )}
                  {t('sort')}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleSort('created_at')}>
                  <Clock className="w-4 h-4 mr-2" />
                  {t('sort_by_date')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSort('report_count')}>
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  {t('sort_by_reports')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSort('engagement')}>
                  <TrendingUp className="w-4 h-4 mr-2" />
                  {t('sort_by_engagement')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSort('author')}>
                  <User className="w-4 h-4 mr-2" />
                  {t('sort_by_author')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </Card>

      {/* Results */}
      <Card className="bg-transparent p-6">
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex items-start gap-4">
                  <Skeleton className="w-10 h-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Skeleton className="w-20 h-5" />
                      <Skeleton className="w-16 h-5" />
                    </div>
                    <Skeleton className="w-full h-4" />
                    <Skeleton className="w-3/4 h-4" />
                    <div className="flex items-center gap-4">
                      <Skeleton className="w-20 h-4" />
                      <Skeleton className="w-20 h-4" />
                      <Skeleton className="w-20 h-4" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : reportsData?.data.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              {t('no_content_found')}
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {t('no_content_message')}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {reportsData?.data.map((content) => (
              <div
                key={`${content.type}-${content.id}`}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 
                         hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => onSelectContent?.(content)}
              >
                <div className="flex items-start gap-4">
                  {/* Author Avatar */}
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={content.author_profile?.avatar_url} />
                    <AvatarFallback>
                      {content.author_profile?.full_name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    {/* Header */}
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <Badge variant="secondary" className={getContentTypeColor(content.type)}>
                        {getContentIcon(content.type)}
                        <span className="ml-1">{t(content.type)}</span>
                      </Badge>
                      
                      {content.status && (
                        <Badge variant="secondary" className={getStatusColor(content.status)}>
                          {t(`status_${content.status}`)}
                        </Badge>
                      )}

                      {content.report_count && content.report_count > 0 && (
                        <Badge variant="secondary" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          {formatNumber(content.report_count)} {t('reports')}
                        </Badge>
                      )}
                    </div>

                    {/* Content Title/Preview */}
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
                      {content.title || truncateText(content.content || content.body || '', 80)}
                    </h4>

                    {/* Author and Date */}
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                      {t('by')} {content.author_profile?.full_name || t('unknown_user')} • 
                      {formatRelativeTime(content.created_at)}
                    </p>

                    {/* Engagement Stats */}
                    <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                      {content.comment_count !== undefined && (
                        <div className="flex items-center gap-1">
                          <MessageCircle className="w-3 h-3" />
                          <span>{formatNumber(content.comment_count)}</span>
                        </div>
                      )}
                      
                      {content.reaction_count !== undefined && (
                        <div className="flex items-center gap-1">
                          <Heart className="w-3 h-3" />
                          <span>{formatNumber(content.reaction_count)}</span>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectContent?.(content);
                        }}
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        {t('view_details')}
                      </Button>

                      {content.report_count && content.report_count > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onCreateBan?.(content);
                          }}
                          className="text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 
                                   dark:border-red-800 dark:hover:bg-red-950"
                        >
                          <Ban className="w-3 h-3 mr-1" />
                          {t('create_ban')}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {reportsData && reportsData.total > reportsData.limit && (
          <div className="mt-6">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    onClick={() => handleFilterChange('page', Math.max(1, filters.page! - 1))}
                    className={filters.page === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  />
                </PaginationItem>
                
                {[...Array(Math.ceil(reportsData.total / reportsData.limit))].map((_, i) => {
                  const pageNum = i + 1;
                  if (
                    pageNum === 1 || 
                    pageNum === Math.ceil(reportsData.total / reportsData.limit) ||
                    (pageNum >= filters.page! - 2 && pageNum <= filters.page! + 2)
                  ) {
                    return (
                      <PaginationItem key={pageNum}>
                        <PaginationLink
                          onClick={() => handleFilterChange('page', pageNum)}
                          isActive={pageNum === filters.page}
                          className="cursor-pointer"
                        >
                          {pageNum}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  } else if (
                    pageNum === filters.page! - 3 || 
                    pageNum === filters.page! + 3
                  ) {
                    return (
                      <PaginationItem key={pageNum}>
                        <PaginationEllipsis />
                      </PaginationItem>
                    );
                  }
                  return null;
                })}

                <PaginationItem>
                  <PaginationNext 
                    onClick={() => handleFilterChange('page', 
                      Math.min(Math.ceil(reportsData.total / reportsData.limit), filters.page! + 1)
                    )}
                    className={
                      filters.page === Math.ceil(reportsData.total / reportsData.limit) 
                        ? 'pointer-events-none opacity-50' 
                        : 'cursor-pointer'
                    }
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>

            <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-4">
              {t('showing_results', {
                from: ((filters.page! - 1) * reportsData.limit) + 1,
                to: Math.min(filters.page! * reportsData.limit, reportsData.total),
                total: formatNumber(reportsData.total)
              })}
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
