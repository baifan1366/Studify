"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { 
  BarChart3, 
  FileText, 
  TrendingUp, 
  AlertTriangle,
  Users,
  Activity,
  Calendar,
  RefreshCw,
  Download,
  Eye,
  Clock,
  Ban,
  BookOpen,
  MessageSquare
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

import ContentReportsList from "./content-reports-list";
import EngagementStats from "./engagement-stats";
import ContentPreviewDialog from "./content-preview-dialog";
import CreateBanDialog from "./create-ban-dialog";

import { 
  useContentReports, 
  useTrendingContent,
  ContentItem 
} from "@/hooks/admin/use-admin-content-reports";
import { useFormat } from "@/hooks/use-format";

export default function ContentReports() {
  const t = useTranslations('ContentReports');
  const { formatNumber, formatDate } = useFormat();
  const { toast } = useToast();

  // Dialog states
  const [selectedContent, setSelectedContent] = useState<ContentItem | undefined>();
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [banContent, setBanContent] = useState<ContentItem | undefined>();

  // Active tab state
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch overview data
  const { 
    data: overviewData, 
    isLoading: isLoadingOverview,
    refetch: refetchOverview 
  } = useContentReports({ 
    limit: 5,
    sort_by: 'created_at',
    sort_order: 'desc'
  });

  // Fetch trending content
  const { 
    data: trendingData, 
    isLoading: isLoadingTrending 
  } = useTrendingContent('week');

  const handleSelectContent = (content: ContentItem) => {
    setSelectedContent(content);
    setPreviewDialogOpen(true);
  };

  const handleCreateBan = (content: ContentItem) => {
    setBanContent(content);
    setBanDialogOpen(true);
  };

  const handleViewUser = (userId: string) => {
    // Implement user navigation
    toast({
      title: t('view_user'),
      description: `Navigating to user ${userId}...`,
    });
  };

  const handleRefreshData = async () => {
    try {
      await refetchOverview();
      toast({
        title: t('refresh_data'),
        description: t('last_updated', { time: formatDate(new Date()) }),
      });
    } catch (error) {
      toast({
        title: t('error_loading_overview'),
        description: 'Failed to refresh data',
        variant: 'destructive',
      });
    }
  };

  const handleExportData = () => {
    toast({
      title: t('export_data'),
      description: 'Export functionality will be implemented soon.',
    });
  };

  const handleBanSuccess = () => {
    // Refresh data after successful ban creation
    refetchOverview();
    setBanDialogOpen(false);
    setBanContent(undefined);
  };

  // Calculate overview stats
  const totalContent = overviewData?.total || 0;
  const totalReports = overviewData?.data.reduce((sum, item) => sum + (item.report_count || 0), 0) || 0;
  const pendingReviews = overviewData?.data.filter(item => item.status === 'pending').length || 0;
  const bannedContent = overviewData?.data.filter(item => item.status === 'ban').length || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {t('page_title')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {t('page_description')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshData}
            disabled={isLoadingOverview}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoadingOverview ? 'animate-spin' : ''}`} />
            {t('refresh_data')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportData}
          >
            <Download className="w-4 h-4 mr-2" />
            {t('export_data')}
          </Button>
        </div>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">
            <BarChart3 className="w-4 h-4 mr-2" />
            {t('content_overview')}
          </TabsTrigger>
          <TabsTrigger value="content-list">
            <FileText className="w-4 h-4 mr-2" />
            {t('content_reports')}
          </TabsTrigger>
          <TabsTrigger value="engagement">
            <TrendingUp className="w-4 h-4 mr-2" />
            {t('engagement_stats')}
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Overview Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-transparent p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {t('total_content')}
                  </p>
                  {isLoadingOverview ? (
                    <Skeleton className="w-16 h-8 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {formatNumber(totalContent)}
                    </p>
                  )}
                </div>
                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                  <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </Card>

            <Card className="bg-transparent p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {t('total_reports')}
                  </p>
                  {isLoadingOverview ? (
                    <Skeleton className="w-16 h-8 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {formatNumber(totalReports)}
                    </p>
                  )}
                </div>
                <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
                  <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
              </div>
            </Card>

            <Card className="bg-transparent p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {t('pending_reviews')}
                  </p>
                  {isLoadingOverview ? (
                    <Skeleton className="w-16 h-8 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {formatNumber(pendingReviews)}
                    </p>
                  )}
                </div>
                <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                  <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                </div>
              </div>
            </Card>

            <Card className="bg-transparent p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {t('banned_content')}
                  </p>
                  {isLoadingOverview ? (
                    <Skeleton className="w-16 h-8 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {formatNumber(bannedContent)}
                    </p>
                  )}
                </div>
                <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                  <Ban className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                </div>
              </div>
            </Card>
          </div>

          {/* Recent Activity and Trending Content */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Activity */}
            <Card className="bg-transparent p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {t('recent_activity')}
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveTab('content-list')}
                >
                  <Eye className="w-3 h-3 mr-1" />
                  {t('view_all_content')}
                </Button>
              </div>
              
              {isLoadingOverview ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="w-8 h-8 rounded" />
                      <div className="flex-1 space-y-1">
                        <Skeleton className="w-3/4 h-4" />
                        <Skeleton className="w-1/2 h-3" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : overviewData?.data.length === 0 ? (
                <p className="text-gray-600 dark:text-gray-400 text-center py-4">
                  {t('no_data_available')}
                </p>
              ) : (
                <div className="space-y-3">
                  {overviewData?.data.slice(0, 5).map((content) => (
                    <div
                      key={`${content.type}-${content.id}`}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 
                               dark:hover:bg-gray-800 cursor-pointer transition-colors"
                      onClick={() => handleSelectContent(content)}
                    >
                      <div className={`p-1 rounded ${
                        content.type === 'course' 
                          ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400'
                          : content.type === 'post'
                          ? 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400'
                          : 'bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-400'
                      }`}>
                        {content.type === 'course' ? (
                          <BookOpen className="w-4 h-4" />
                        ) : content.type === 'post' ? (
                          <FileText className="w-4 h-4" />
                        ) : (
                          <MessageSquare className="w-4 h-4" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {content.title || 'Untitled'}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span>{content.author_profile?.full_name || 'Unknown'}</span>
                          <span>•</span>
                          <span>{formatDate(content.created_at)}</span>
                          {content.report_count && content.report_count > 0 && (
                            <>
                              <span>•</span>
                              <Badge variant="secondary" className="bg-red-100 text-red-800 text-xs">
                                {content.report_count} reports
                              </Badge>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Trending Content */}
            <Card className="bg-transparent p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {t('trending_content')}
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveTab('engagement')}
                >
                  <TrendingUp className="w-3 h-3 mr-1" />
                  {t('view_engagement_stats')}
                </Button>
              </div>
              
              {isLoadingTrending ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="w-8 h-8 rounded" />
                      <div className="flex-1 space-y-1">
                        <Skeleton className="w-3/4 h-4" />
                        <Skeleton className="w-1/2 h-3" />
                      </div>
                      <Skeleton className="w-12 h-6" />
                    </div>
                  ))}
                </div>
              ) : trendingData?.trending_posts.length === 0 ? (
                <p className="text-gray-600 dark:text-gray-400 text-center py-4">
                  {t('no_data_available')}
                </p>
              ) : (
                <div className="space-y-3">
                  {trendingData?.trending_posts.slice(0, 5).map((content) => (
                    <div
                      key={`${content.type}-${content.id}`}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 
                               dark:hover:bg-gray-800 cursor-pointer transition-colors"
                      onClick={() => handleSelectContent(content)}
                    >
                      <div className="p-1 rounded bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400">
                        <TrendingUp className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {content.title || 'Untitled'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {content.author_profile?.full_name || 'Unknown'}
                        </p>
                      </div>
                      <div className="text-sm font-medium text-green-600 dark:text-green-400">
                        {formatNumber((content.comment_count || 0) + (content.reaction_count || 0))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </TabsContent>

        {/* Content List Tab */}
        <TabsContent value="content-list">
          <ContentReportsList
            onSelectContent={handleSelectContent}
            onCreateBan={handleCreateBan}
          />
        </TabsContent>

        {/* Engagement Tab */}
        <TabsContent value="engagement">
          <EngagementStats
            onSelectContent={handleSelectContent}
            onSelectUser={handleViewUser}
          />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <ContentPreviewDialog
        content={selectedContent}
        isOpen={previewDialogOpen}
        onClose={() => {
          setPreviewDialogOpen(false);
          setSelectedContent(undefined);
        }}
        onCreateBan={handleCreateBan}
        onViewUser={handleViewUser}
      />

      <CreateBanDialog
        content={banContent}
        isOpen={banDialogOpen}
        onClose={() => {
          setBanDialogOpen(false);
          setBanContent(undefined);
        }}
        onSuccess={handleBanSuccess}
      />
    </div>
  );
}