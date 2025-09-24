// components/admin/ai/admin-ai-management.tsx

'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { 
  useAIContentGeneration, 
  useAIGenerationAction,
  useEmbeddingQueue,
  useEmbeddingQueueAction,
  useAIRecommendations,
  useRecommendationAction,
  useAIModeration,
  useModerationAction
} from '@/hooks/admin/use-admin-ai';
import { 
  Brain, 
  Cpu, 
  Database, 
  Zap, 
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw,
  Trash2,
  Play,
  Pause,
  Settings,
  BarChart3,
  TrendingUp,
  Shield
} from 'lucide-react';
import { toast } from 'sonner';
import { useFormat } from '@/hooks/use-format';
import { useTranslations } from 'next-intl';

export function AdminAIManagement() {
  const t = useTranslations('AdminAIManagement');
  const { formatRelativeTime } = useFormat();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [selectedTab, setSelectedTab] = useState('overview');
  const [embeddingFilters, setEmbeddingFilters] = useState({ status: 'all', limit: 50, offset: 0 });
  const [moderationFilters, setModerationFilters] = useState({ days: 7, status: 'all', limit: 50 });

  // Handle hash-based navigation with Next.js router
  useEffect(() => {
    // Get hash from current URL (client-side only)
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.slice(1); // Remove # symbol
      const validTabs = ['overview', 'embeddings', 'recommendations', 'moderation'];
      
      if (hash && validTabs.includes(hash)) {
        setSelectedTab(hash);
      } else if (!hash) {
        setSelectedTab('overview');
      }
    }
  }, [pathname]); // Re-run when pathname changes

  // Handle tab change and update URL hash using Next.js router
  const handleTabChange = (value: string) => {
    setSelectedTab(value);
    
    // Build new URL with hash
    const currentSearch = searchParams.toString();
    const searchString = currentSearch ? `?${currentSearch}` : '';
    const newUrl = value === 'overview' 
      ? pathname + searchString
      : pathname + searchString + '#' + value;
    
    // Use Next.js router for navigation
    router.push(newUrl, { scroll: false });
  };

  // Hooks
  const { data: contentGeneration, isLoading: generationLoading } = useAIContentGeneration(30);
  const { data: embeddingQueue, isLoading: queueLoading } = useEmbeddingQueue(embeddingFilters);
  const { data: recommendations, isLoading: recLoading } = useAIRecommendations(30);
  const { data: moderation, isLoading: modLoading } = useAIModeration(moderationFilters);

  const generationAction = useAIGenerationAction();
  const embeddingAction = useEmbeddingQueueAction();
  const recommendationAction = useRecommendationAction();
  const moderationAction = useModerationAction();

  const handleEmbeddingAction = async (action: string, items?: number[]) => {
    try {
      await embeddingAction.mutateAsync({ action, items });
      toast.success(t('embedding_action_success', { action }));
    } catch (error: any) {
      toast.error(error.message || t('embedding_action_failed', { action }));
    }
  };

  const handleRecommendationAction = async (action: string, data?: any) => {
    try {
      await recommendationAction.mutateAsync({ action, ...data });
      toast.success(t('recommendation_action_success', { action }));
    } catch (error: any) {
      toast.error(error.message || t('recommendation_action_failed', { action }));
    }
  };

  const handleModerationAction = async (action: string, data?: any) => {
    try {
      await moderationAction.mutateAsync({ action, ...data });
      toast.success(t('moderation_action_success', { action }));
    } catch (error: any) {
      toast.error(error.message || t('moderation_action_failed', { action }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {t('page_title')}
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            {t('page_subtitle')}
          </p>
        </div>
        <Button>
          <Settings className="h-4 w-4 mr-2" />
          {t('ai_settings')}
        </Button>
      </div>

      <Tabs value={selectedTab} onValueChange={handleTabChange}>
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="overview">{t('overview')}</TabsTrigger>
          <TabsTrigger value="embeddings">{t('embeddings')}</TabsTrigger>
          <TabsTrigger value="recommendations">{t('recommendations')}</TabsTrigger>
          <TabsTrigger value="moderation">{t('moderation')}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Overview Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="bg-transparent p-2">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('ai_generations')}</CardTitle>
                <Brain className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {contentGeneration?.data?.overview?.aiRunsTotal || 0}
                </div>
                <p className="text-xs text-muted-foreground">{t('last_30_days')}</p>
              </CardContent>
            </Card>

            <Card className="bg-transparent p-2">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('queue_items')}</CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {embeddingQueue?.data?.stats?.total || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  {t('pending_count', { count: embeddingQueue?.data?.stats?.queued || 0 })}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-transparent p-2">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('recommendations')}</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {recommendations?.data?.overview?.activeRecommendations || 0}
                </div>
                <p className="text-xs text-muted-foreground">{t('active_users')}</p>
              </CardContent>
            </Card>

            <Card className="bg-transparent p-2">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('flagged_content')}</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {moderation?.data?.overview?.flaggedContent || 0}
                </div>
                <p className="text-xs text-muted-foreground">{t('needs_review')}</p>
              </CardContent>
            </Card>
          </div>

          {/* System Performance */}
          <Card className="bg-transparent p-2">
            <CardHeader>
              <CardTitle>{t('ai_system_performance')}</CardTitle>
              <CardDescription>{t('recent_processing_metrics')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <div className="text-sm font-medium">{t('video_processing')}</div>
                  <div className="text-2xl font-bold">
                    {Math.round((contentGeneration?.data?.overview?.avgVideoProcessingTimeMs || 0) / 1000)}s
                  </div>
                  <div className="text-xs text-muted-foreground">{t('average_time')}</div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium">{t('search_performance')}</div>
                  <div className="text-2xl font-bold">
                    {Math.round(recommendations?.data?.overview?.avgSearchProcessingTime || 0)}ms
                  </div>
                  <div className="text-xs text-muted-foreground">{t('average_response')}</div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium">{t('coverage')}</div>
                  <div className="text-2xl font-bold">
                    {recommendations?.data?.overview?.recommendationCoverage || 0}%
                  </div>
                  <div className="text-xs text-muted-foreground">{t('user_coverage')}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="embeddings" className="space-y-6">
          {/* Embedding Queue Controls */}
          <Card className="bg-transparent p-2">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Database className="h-5 w-5 mr-2" />
                {t('embedding_queue_management')}
              </CardTitle>
              <CardDescription>
                {t('monitor_embedding_queue')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 mb-4">
                <Button 
                  size="sm" 
                  onClick={() => handleEmbeddingAction('retry_failed')}
                  disabled={embeddingAction.isPending}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  {t('retry_failed')}
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleEmbeddingAction('clear_completed')}
                  disabled={embeddingAction.isPending}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t('clear_completed')}
                </Button>
                <Select 
                  value={embeddingFilters.status} 
                  onValueChange={(value) => setEmbeddingFilters(prev => ({ ...prev, status: value }))}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('all_status')}</SelectItem>
                    <SelectItem value="queued">{t('queued')}</SelectItem>
                    <SelectItem value="processing">{t('processing')}</SelectItem>
                    <SelectItem value="completed">{t('completed')}</SelectItem>
                    <SelectItem value="failed">{t('failed')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Queue Statistics */}
              <div className="grid gap-4 md:grid-cols-5 mb-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {embeddingQueue?.data?.stats?.queued || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">{t('queued')}</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">
                    {embeddingQueue?.data?.stats?.processing || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">{t('processing')}</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {embeddingQueue?.data?.stats?.completed || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">{t('completed')}</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {embeddingQueue?.data?.stats?.failed || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">{t('failed')}</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {Math.round((embeddingQueue?.data?.stats?.avgProcessingTimeMs || 0) / 1000)}s
                  </div>
                  <div className="text-xs text-muted-foreground">{t('avg_time')}</div>
                </div>
              </div>

              {/* Queue Items Table */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('content_type')}</TableHead>
                    <TableHead>{t('status')}</TableHead>
                    <TableHead>{t('priority')}</TableHead>
                    <TableHead>{t('retry_count')}</TableHead>
                    <TableHead>{t('created')}</TableHead>
                    <TableHead>{t('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {embeddingQueue?.data?.items?.slice(0, 10).map((item: any) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Badge variant="outline">{item.content_type}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            item.status === 'completed' ? 'default' :
                            item.status === 'failed' ? 'destructive' :
                            item.status === 'processing' ? 'secondary' : 'outline'
                          }
                        >
                          {item.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{item.priority}</TableCell>
                      <TableCell>{item.retry_count}</TableCell>
                      <TableCell>
                        {formatRelativeTime(item.created_at)}
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost">
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-6">
          {/* Recommendation System */}
          <Card className="bg-transparent p-2">
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="h-5 w-5 mr-2" />
                {t('recommendation_system')}
              </CardTitle>
              <CardDescription>
                {t('monitor_ai_recommendations')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 mb-4">
                <Button 
                  size="sm"
                  onClick={() => handleRecommendationAction('refresh_recommendations')}
                  disabled={recommendationAction.isPending}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  {t('refresh_all')}
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleRecommendationAction('optimize_search_performance')}
                  disabled={recommendationAction.isPending}
                >
                  <Zap className="h-4 w-4 mr-2" />
                  {t('optimize_performance')}
                </Button>
              </div>

              {/* Recommendation Metrics */}
              <div className="grid gap-4 md:grid-cols-3 mb-6">
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {recommendations?.data?.overview?.totalSearches || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">{t('total_searches')}</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {Math.round(recommendations?.data?.overview?.avgSearchResultsCount || 0)}
                  </div>
                  <div className="text-xs text-muted-foreground">{t('avg_results')}</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {recommendations?.data?.overview?.recommendationCoverage || 0}%
                  </div>
                  <div className="text-xs text-muted-foreground">{t('user_coverage')}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="moderation" className="space-y-6">
          {/* AI Moderation */}
          <Card className="bg-transparent p-2">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="h-5 w-5 mr-2" />
                {t('ai_content_moderation')}
              </CardTitle>
              <CardDescription>
                {t('automated_content_moderation')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 mb-4">
                <Button 
                  size="sm"
                  onClick={() => handleModerationAction('auto_moderate', { enabled: true, contentType: 'post' })}
                  disabled={moderationAction.isPending}
                >
                  <Play className="h-4 w-4 mr-2" />
                  {t('enable_auto_moderation')}
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleModerationAction('train_model')}
                  disabled={moderationAction.isPending}
                >
                  <Brain className="h-4 w-4 mr-2" />
                  {t('retrain_model')}
                </Button>
                <Select 
                  value={moderationFilters.status} 
                  onValueChange={(value) => setModerationFilters(prev => ({ ...prev, status: value }))}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('all_reports')}</SelectItem>
                    <SelectItem value="open">{t('open')}</SelectItem>
                    <SelectItem value="reviewing">{t('reviewing')}</SelectItem>
                    <SelectItem value="resolved">{t('resolved')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Moderation Stats */}
              <div className="grid gap-4 md:grid-cols-4 mb-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {moderation?.data?.overview?.totalReports || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">{t('total_reports')}</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {moderation?.data?.overview?.openReports || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">{t('open_reports')}</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {moderation?.data?.overview?.flaggedContent || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">{t('flagged_content')}</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-600">
                    {moderation?.data?.overview?.bannedUsers || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">{t('banned_users')}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
