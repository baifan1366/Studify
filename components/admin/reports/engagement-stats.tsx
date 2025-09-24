"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { 
  TrendingUp, 
  MessageCircle, 
  Heart, 
  Crown, 
  FileText, 
  BookOpen,
  User,
  Calendar,
  Activity,
  Award,
  BarChart3
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { useEngagementStats, ContentItem } from "@/hooks/admin/use-admin-content-reports";
import { useFormat } from "@/hooks/use-format";

interface EngagementStatsProps {
  onSelectContent?: (content: ContentItem) => void;
  onSelectUser?: (userId: string) => void;
}

export default function EngagementStats({ 
  onSelectContent, 
  onSelectUser 
}: EngagementStatsProps) {
  const t = useTranslations('EngagementStats');
  const { formatNumber, formatRelativeTime } = useFormat();

  const [timePeriod, setTimePeriod] = useState('week');

  const { 
    data: statsData, 
    isLoading, 
    isError 
  } = useEngagementStats(timePeriod);

  const getContentIcon = (type: string) => {
    switch (type) {
      case 'course':
        return <BookOpen className="w-4 h-4" />;
      case 'post':
        return <FileText className="w-4 h-4" />;
      case 'comment':
        return <MessageCircle className="w-4 h-4" />;
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

  const truncateText = (text: string, maxLength: number = 60) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  if (isError) {
    return (
      <Card className="bg-transparent p-6">
        <div className="text-center">
          <BarChart3 className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            {t('error_loading_stats')}
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {t('error_stats_message')}
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Time Period Filter */}
      <Card className="bg-transparent p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
              {t('engagement_statistics')}
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              {t('engagement_description')}
            </p>
          </div>

          <Select value={timePeriod} onValueChange={setTimePeriod}>
            <SelectTrigger className="w-[140px]">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">{t('today')}</SelectItem>
              <SelectItem value="week">{t('this_week')}</SelectItem>
              <SelectItem value="month">{t('this_month')}</SelectItem>
              <SelectItem value="year">{t('this_year')}</SelectItem>
              <SelectItem value="all">{t('all_time')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Stats Tabs */}
      <Card className="bg-transparent p-6">
        <Tabs defaultValue="most-commented" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="most-commented">
              <MessageCircle className="w-4 h-4 mr-2" />
              {t('most_commented')}
            </TabsTrigger>
            <TabsTrigger value="most-reacted">
              <Heart className="w-4 h-4 mr-2" />
              {t('most_reacted')}
            </TabsTrigger>
            <TabsTrigger value="top-creators">
              <Crown className="w-4 h-4 mr-2" />
              {t('top_creators')}
            </TabsTrigger>
          </TabsList>

          {/* Most Commented Content */}
          <TabsContent value="most-commented" className="mt-6">
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-start gap-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <Skeleton className="w-8 h-8 rounded" />
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <Skeleton className="w-16 h-5" />
                        <Skeleton className="w-20 h-5" />
                      </div>
                      <Skeleton className="w-full h-4" />
                      <Skeleton className="w-3/4 h-4" />
                    </div>
                    <Skeleton className="w-12 h-6" />
                  </div>
                ))}
              </div>
            ) : statsData?.most_commented.length === 0 ? (
              <div className="text-center py-8">
                <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">
                  {t('no_commented_content')}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {statsData?.most_commented.map((content, index) => (
                  <div
                    key={`${content.type}-${content.id}`}
                    className="flex items-start gap-4 p-4 border border-gray-200 dark:border-gray-700 
                             rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => onSelectContent?.(content)}
                  >
                    {/* Rank */}
                    <div className="flex items-center justify-center w-8 h-8 rounded-full 
                                  bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 
                                  font-semibold text-sm">
                      {index + 1}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="secondary" className={getContentTypeColor(content.type)}>
                          {getContentIcon(content.type)}
                          <span className="ml-1">{t(content.type)}</span>
                        </Badge>
                        
                        {content.status && (
                          <Badge variant="outline" className="text-xs">
                            {t(`status_${content.status}`)}
                          </Badge>
                        )}
                      </div>

                      <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
                        {content.title || truncateText(content.content || content.body || '')}
                      </h4>

                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {t('by')} {content.author_profile?.full_name || t('unknown_user')} • 
                        {formatRelativeTime(content.created_at)}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                      <MessageCircle className="w-4 h-4" />
                      <span className="font-semibold">
                        {formatNumber(content.comment_count || 0)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Most Reacted Content */}
          <TabsContent value="most-reacted" className="mt-6">
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-start gap-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <Skeleton className="w-8 h-8 rounded" />
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <Skeleton className="w-16 h-5" />
                        <Skeleton className="w-20 h-5" />
                      </div>
                      <Skeleton className="w-full h-4" />
                      <Skeleton className="w-3/4 h-4" />
                    </div>
                    <Skeleton className="w-12 h-6" />
                  </div>
                ))}
              </div>
            ) : statsData?.most_reacted.length === 0 ? (
              <div className="text-center py-8">
                <Heart className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">
                  {t('no_reacted_content')}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {statsData?.most_reacted.map((content, index) => (
                  <div
                    key={`${content.type}-${content.id}`}
                    className="flex items-start gap-4 p-4 border border-gray-200 dark:border-gray-700 
                             rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => onSelectContent?.(content)}
                  >
                    {/* Rank */}
                    <div className="flex items-center justify-center w-8 h-8 rounded-full 
                                  bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 
                                  font-semibold text-sm">
                      {index + 1}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="secondary" className={getContentTypeColor(content.type)}>
                          {getContentIcon(content.type)}
                          <span className="ml-1">{t(content.type)}</span>
                        </Badge>
                        
                        {content.status && (
                          <Badge variant="outline" className="text-xs">
                            {t(`status_${content.status}`)}
                          </Badge>
                        )}
                      </div>

                      <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
                        {content.title || truncateText(content.content || content.body || '')}
                      </h4>

                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {t('by')} {content.author_profile?.full_name || t('unknown_user')} • 
                        {formatRelativeTime(content.created_at)}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 text-red-600 dark:text-red-400">
                      <Heart className="w-4 h-4" />
                      <span className="font-semibold">
                        {formatNumber(content.reaction_count || 0)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Top Creators */}
          <TabsContent value="top-creators" className="mt-6">
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <Skeleton className="w-8 h-8 rounded" />
                    <Skeleton className="w-10 h-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="w-32 h-5" />
                      <Skeleton className="w-full h-4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : statsData?.top_creators.length === 0 ? (
              <div className="text-center py-8">
                <Crown className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">
                  {t('no_creators_data')}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {statsData?.top_creators.map((creator, index) => (
                  <div
                    key={creator.user_id}
                    className="flex items-center gap-4 p-4 border border-gray-200 dark:border-gray-700 
                             rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => onSelectUser?.(creator.user_id)}
                  >
                    {/* Rank */}
                    <div className="flex items-center justify-center w-8 h-8 rounded-full 
                                  bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 
                                  font-semibold text-sm">
                      {index + 1}
                    </div>

                    {/* Avatar */}
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={creator.avatar_url} />
                      <AvatarFallback>
                        {creator.full_name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
                        {creator.full_name || t('unknown_user')}
                      </h4>
                      
                      <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
                        <div className="flex items-center gap-1">
                          <BookOpen className="w-3 h-3" />
                          <span>{formatNumber(creator.courses_count)} {t('courses')}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          <span>{formatNumber(creator.posts_count)} {t('posts')}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MessageCircle className="w-3 h-3" />
                          <span>{formatNumber(creator.comments_count)} {t('comments')}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                      <Activity className="w-4 h-4" />
                      <span className="font-semibold">
                        {formatNumber(creator.total_content)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
