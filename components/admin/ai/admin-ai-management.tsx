// components/admin/ai/admin-ai-management.tsx

'use client';

import { useState } from 'react';
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
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

export function AdminAIManagement() {
  const [selectedTab, setSelectedTab] = useState('overview');
  const [embeddingFilters, setEmbeddingFilters] = useState({ status: 'all', limit: 50, offset: 0 });
  const [moderationFilters, setModerationFilters] = useState({ days: 7, status: 'all', limit: 50 });

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
      toast.success(`Embedding ${action} completed successfully`);
    } catch (error: any) {
      toast.error(error.message || `Failed to ${action} embeddings`);
    }
  };

  const handleRecommendationAction = async (action: string, data?: any) => {
    try {
      await recommendationAction.mutateAsync({ action, ...data });
      toast.success(`Recommendation ${action} completed successfully`);
    } catch (error: any) {
      toast.error(error.message || `Failed to ${action} recommendations`);
    }
  };

  const handleModerationAction = async (action: string, data?: any) => {
    try {
      await moderationAction.mutateAsync({ action, ...data });
      toast.success(`Moderation ${action} completed successfully`);
    } catch (error: any) {
      toast.error(error.message || `Failed to ${action} moderation`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            AI Content Management
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Monitor and manage AI-powered features across your platform
          </p>
        </div>
        <Button>
          <Settings className="h-4 w-4 mr-2" />
          AI Settings
        </Button>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="embeddings">Embeddings</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
          <TabsTrigger value="moderation">Moderation</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Overview Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="bg-transparent p-2">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">AI Generations</CardTitle>
                <Brain className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {contentGeneration?.data?.overview?.aiRunsTotal || 0}
                </div>
                <p className="text-xs text-muted-foreground">Last 30 days</p>
              </CardContent>
            </Card>

            <Card className="bg-transparent p-2">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Queue Items</CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {embeddingQueue?.data?.stats?.total || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  {embeddingQueue?.data?.stats?.queued || 0} pending
                </p>
              </CardContent>
            </Card>

            <Card className="bg-transparent p-2">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Recommendations</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {recommendations?.data?.overview?.activeRecommendations || 0}
                </div>
                <p className="text-xs text-muted-foreground">Active users</p>
              </CardContent>
            </Card>

            <Card className="bg-transparent p-2">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Flagged Content</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {moderation?.data?.overview?.flaggedContent || 0}
                </div>
                <p className="text-xs text-muted-foreground">Needs review</p>
              </CardContent>
            </Card>
          </div>

          {/* System Performance */}
          <Card className="bg-transparent p-2">
            <CardHeader>
              <CardTitle>AI System Performance</CardTitle>
              <CardDescription>Recent processing metrics and health status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <div className="text-sm font-medium">Video Processing</div>
                  <div className="text-2xl font-bold">
                    {Math.round((contentGeneration?.data?.overview?.avgVideoProcessingTimeMs || 0) / 1000)}s
                  </div>
                  <div className="text-xs text-muted-foreground">Average time</div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium">Search Performance</div>
                  <div className="text-2xl font-bold">
                    {Math.round(recommendations?.data?.overview?.avgSearchProcessingTime || 0)}ms
                  </div>
                  <div className="text-xs text-muted-foreground">Average response</div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium">Coverage</div>
                  <div className="text-2xl font-bold">
                    {recommendations?.data?.overview?.recommendationCoverage || 0}%
                  </div>
                  <div className="text-xs text-muted-foreground">User coverage</div>
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
                Embedding Queue Management
              </CardTitle>
              <CardDescription>
                Monitor and manage the AI embedding generation queue
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
                  Retry Failed
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleEmbeddingAction('clear_completed')}
                  disabled={embeddingAction.isPending}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear Completed
                </Button>
                <Select 
                  value={embeddingFilters.status} 
                  onValueChange={(value) => setEmbeddingFilters(prev => ({ ...prev, status: value }))}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="queued">Queued</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Queue Statistics */}
              <div className="grid gap-4 md:grid-cols-5 mb-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {embeddingQueue?.data?.stats?.queued || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Queued</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">
                    {embeddingQueue?.data?.stats?.processing || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Processing</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {embeddingQueue?.data?.stats?.completed || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Completed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {embeddingQueue?.data?.stats?.failed || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Failed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {Math.round((embeddingQueue?.data?.stats?.avgProcessingTimeMs || 0) / 1000)}s
                  </div>
                  <div className="text-xs text-muted-foreground">Avg Time</div>
                </div>
              </div>

              {/* Queue Items Table */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Content Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Retry Count</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
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
                        {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
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
                Recommendation System
              </CardTitle>
              <CardDescription>
                Monitor and optimize AI-powered recommendations
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
                  Refresh All
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleRecommendationAction('optimize_search_performance')}
                  disabled={recommendationAction.isPending}
                >
                  <Zap className="h-4 w-4 mr-2" />
                  Optimize Performance
                </Button>
              </div>

              {/* Recommendation Metrics */}
              <div className="grid gap-4 md:grid-cols-3 mb-6">
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {recommendations?.data?.overview?.totalSearches || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Total Searches</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {Math.round(recommendations?.data?.overview?.avgSearchResultsCount || 0)}
                  </div>
                  <div className="text-xs text-muted-foreground">Avg Results</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {recommendations?.data?.overview?.recommendationCoverage || 0}%
                  </div>
                  <div className="text-xs text-muted-foreground">User Coverage</div>
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
                AI Content Moderation
              </CardTitle>
              <CardDescription>
                Automated content moderation and flagging system
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
                  Enable Auto-Moderation
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleModerationAction('train_model')}
                  disabled={moderationAction.isPending}
                >
                  <Brain className="h-4 w-4 mr-2" />
                  Retrain Model
                </Button>
                <Select 
                  value={moderationFilters.status} 
                  onValueChange={(value) => setModerationFilters(prev => ({ ...prev, status: value }))}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Reports</SelectItem>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="reviewing">Reviewing</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Moderation Stats */}
              <div className="grid gap-4 md:grid-cols-4 mb-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {moderation?.data?.overview?.totalReports || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Total Reports</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {moderation?.data?.overview?.openReports || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Open Reports</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {moderation?.data?.overview?.flaggedContent || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Flagged Content</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-600">
                    {moderation?.data?.overview?.bannedUsers || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Banned Users</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
