"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { 
  X, 
  FileText, 
  MessageSquare, 
  BookOpen, 
  User, 
  Calendar, 
  AlertTriangle,
  Eye,
  MessageCircle,
  Heart,
  Flag,
  ExternalLink,
  Clock,
  Star,
  TrendingUp
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";

import { 
  useContentDetails, 
  useContentReportsList, 
  ContentItem, 
  ReportInfo 
} from "@/hooks/admin/use-admin-content-reports";
import { useFormat } from "@/hooks/use-format";

interface ContentPreviewDialogProps {
  content?: ContentItem;
  isOpen: boolean;
  onClose: () => void;
  onCreateBan?: (content: ContentItem) => void;
  onViewUser?: (userId: string) => void;
}

export default function ContentPreviewDialog({
  content,
  isOpen,
  onClose,
  onCreateBan,
  onViewUser
}: ContentPreviewDialogProps) {
  const t = useTranslations('ContentPreviewDialog');
  const { formatRelativeTime, formatNumber } = useFormat();

  const [activeTab, setActiveTab] = useState('content');

  // Fetch detailed content information
  const { 
    data: detailedContent, 
    isLoading: isLoadingDetails 
  } = useContentDetails(
    content?.type || 'post', 
    content?.id || 0
  );

  // Fetch reports for this content
  const { 
    data: reports, 
    isLoading: isLoadingReports 
  } = useContentReportsList(
    content?.type || 'post', 
    content?.id || 0
  );

  const getContentIcon = (type: string) => {
    switch (type) {
      case 'course':
        return <BookOpen className="w-5 h-5" />;
      case 'post':
        return <FileText className="w-5 h-5" />;
      case 'comment':
        return <MessageSquare className="w-5 h-5" />;
      default:
        return <FileText className="w-5 h-5" />;
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

  const displayContent = detailedContent || content;

  if (!content) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${getContentTypeColor(content.type)}`}>
                {getContentIcon(content.type)}
              </div>
              <div>
                <DialogTitle className="text-xl font-semibold">
                  {t('content_preview')}
                </DialogTitle>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {t('viewing_content_type', { type: t(content.type) })}
                </p>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="px-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="content">
                <Eye className="w-4 h-4 mr-2" />
                {t('content')}
              </TabsTrigger>
              <TabsTrigger value="engagement">
                <TrendingUp className="w-4 h-4 mr-2" />
                {t('engagement')}
              </TabsTrigger>
              <TabsTrigger value="reports">
                <Flag className="w-4 h-4 mr-2" />
                {t('reports')} {reports && reports.length > 0 && `(${reports.length})`}
              </TabsTrigger>
            </TabsList>

            <ScrollArea className="h-[calc(90vh-200px)] mt-6">
              {/* Content Tab */}
              <TabsContent value="content" className="space-y-6">
                {isLoadingDetails ? (
                  <div className="space-y-4">
                    <Skeleton className="w-full h-8" />
                    <Skeleton className="w-full h-4" />
                    <Skeleton className="w-3/4 h-4" />
                    <Skeleton className="w-full h-32" />
                  </div>
                ) : (
                  <>
                    {/* Content Header */}
                    <Card className="bg-transparent p-4">
                      <div className="flex items-start gap-4">
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={displayContent?.author_profile?.avatar_url} />
                          <AvatarFallback>
                            {displayContent?.author_profile?.full_name?.charAt(0) || 'U'}
                          </AvatarFallback>
                        </Avatar>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <Badge variant="secondary" className={getContentTypeColor(content.type)}>
                              {getContentIcon(content.type)}
                              <span className="ml-1">{t(content.type)}</span>
                            </Badge>
                            
                            {displayContent?.status && (
                              <Badge variant="secondary" className={getStatusColor(displayContent.status)}>
                                {t(`status_${displayContent.status}`)}
                              </Badge>
                            )}
                          </div>

                          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                            {displayContent?.title || t('untitled_content')}
                          </h3>

                          <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-4">
                            <div className="flex items-center gap-1">
                              <User className="w-4 h-4" />
                              <span>{displayContent?.author_profile?.full_name || t('unknown_user')}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              <span>{formatRelativeTime(displayContent?.created_at || '')}</span>
                            </div>
                            {displayContent?.updated_at && displayContent.updated_at !== displayContent.created_at && (
                              <div className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                <span>{t('updated')} {formatRelativeTime(displayContent.updated_at)}</span>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4 text-sm text-gray-500">
                              {displayContent?.comment_count !== undefined && (
                                <div className="flex items-center gap-1">
                                  <MessageCircle className="w-4 h-4" />
                                  <span>{formatNumber(displayContent.comment_count)} {t('comments')}</span>
                                </div>
                              )}
                              
                              {displayContent?.reaction_count !== undefined && (
                                <div className="flex items-center gap-1">
                                  <Heart className="w-4 h-4" />
                                  <span>{formatNumber(displayContent.reaction_count)} {t('reactions')}</span>
                                </div>
                              )}

                              {displayContent?.report_count && displayContent.report_count > 0 && (
                                <div className="flex items-center gap-1 text-red-600 dark:text-red-400">
                                  <AlertTriangle className="w-4 h-4" />
                                  <span>{formatNumber(displayContent.report_count)} {t('reports')}</span>
                                </div>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onViewUser?.(displayContent?.author_id?.toString() || displayContent?.user_id?.toString() || '')}
                              >
                                <User className="w-3 h-3 mr-1" />
                                {t('view_user')}
                              </Button>

                              {displayContent?.report_count && displayContent.report_count > 0 && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => onCreateBan?.(displayContent)}
                                  className="text-red-600 border-red-200 hover:bg-red-50"
                                >
                                  <AlertTriangle className="w-3 h-3 mr-1" />
                                  {t('create_ban')}
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>

                    {/* Content Body */}
                    <Card className="bg-transparent p-4">
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
                        {t('content_body')}
                      </h4>
                      <div className="prose prose-sm max-w-none dark:prose-invert">
                        <div className="whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                          {displayContent?.content || displayContent?.body || t('no_content_available')}
                        </div>
                      </div>
                    </Card>
                  </>
                )}
              </TabsContent>

              {/* Engagement Tab */}
              <TabsContent value="engagement" className="space-y-6">
                <Card className="bg-transparent p-4">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">
                    {t('engagement_metrics')}
                  </h4>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                      <Eye className="w-6 h-6 text-blue-600 dark:text-blue-400 mx-auto mb-2" />
                      <div className="text-lg font-semibold text-blue-900 dark:text-blue-100">
                        {formatNumber(displayContent?.comment_count || 0)}
                      </div>
                      <div className="text-xs text-blue-600 dark:text-blue-400">
                        {t('comments')}
                      </div>
                    </div>

                    <div className="text-center p-3 bg-red-50 dark:bg-red-950 rounded-lg">
                      <Heart className="w-6 h-6 text-red-600 dark:text-red-400 mx-auto mb-2" />
                      <div className="text-lg font-semibold text-red-900 dark:text-red-100">
                        {formatNumber(displayContent?.reaction_count || 0)}
                      </div>
                      <div className="text-xs text-red-600 dark:text-red-400">
                        {t('reactions')}
                      </div>
                    </div>

                    <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
                      <Flag className="w-6 h-6 text-yellow-600 dark:text-yellow-400 mx-auto mb-2" />
                      <div className="text-lg font-semibold text-yellow-900 dark:text-yellow-100">
                        {formatNumber(displayContent?.report_count || 0)}
                      </div>
                      <div className="text-xs text-yellow-600 dark:text-yellow-400">
                        {t('reports')}
                      </div>
                    </div>

                    <div className="text-center p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                      <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400 mx-auto mb-2" />
                      <div className="text-lg font-semibold text-green-900 dark:text-green-100">
                        {formatNumber((displayContent?.comment_count || 0) + (displayContent?.reaction_count || 0))}
                      </div>
                      <div className="text-xs text-green-600 dark:text-green-400">
                        {t('total_engagement')}
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Reactions Breakdown */}
                {displayContent?.reactions && Object.keys(displayContent.reactions).length > 0 && (
                  <Card className="bg-transparent p-4">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">
                      {t('reactions_breakdown')}
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(displayContent.reactions).map(([emoji, count]) => (
                        <Badge key={emoji} variant="secondary" className="text-sm">
                          <span className="mr-1">{emoji}</span>
                          <span>{formatNumber(count)}</span>
                        </Badge>
                      ))}
                    </div>
                  </Card>
                )}
              </TabsContent>

              {/* Reports Tab */}
              <TabsContent value="reports" className="space-y-6">
                {isLoadingReports ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <Card key={i} className="bg-transparent p-4">
                        <div className="flex items-start gap-3">
                          <Skeleton className="w-8 h-8 rounded-full" />
                          <div className="flex-1 space-y-2">
                            <Skeleton className="w-32 h-4" />
                            <Skeleton className="w-full h-4" />
                            <Skeleton className="w-24 h-3" />
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : reports && reports.length > 0 ? (
                  <div className="space-y-4">
                    {reports.map((report) => (
                      <Card key={report.id} className="bg-transparent p-4">
                        <div className="flex items-start gap-3">
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={report.reporter_profile?.avatar_url} />
                            <AvatarFallback className="text-xs">
                              {report.reporter_profile?.full_name?.charAt(0) || 'U'}
                            </AvatarFallback>
                          </Avatar>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {report.reporter_profile?.full_name || t('anonymous_user')}
                              </span>
                              <span className="text-xs text-gray-500">
                                {formatRelativeTime(report.created_at)}
                              </span>
                            </div>

                            <div className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                              <span className="font-medium">{t('reason')}:</span> {report.reason}
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card className="bg-transparent p-8">
                    <div className="text-center">
                      <Flag className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                        {t('no_reports')}
                      </h4>
                      <p className="text-gray-600 dark:text-gray-400">
                        {t('no_reports_message')}
                      </p>
                    </div>
                  </Card>
                )}
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
