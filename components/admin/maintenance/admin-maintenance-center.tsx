// components/admin/maintenance/admin-maintenance-center.tsx

'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { 
  useSystemHealth,
  useSystemHealthAction,
  useQueueMonitor,
  useQueueAction,
  useCacheManagement,
  useCacheAction,
  useFeatureFlags,
  useFeatureFlagAction
} from '@/hooks/admin/use-admin-maintenance';
import { 
  Activity, 
  Database, 
  HardDrive, 
  Server, 
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw,
  Trash2,
  Play,
  Pause,
  Settings,
  BarChart3,
  Zap,
  Flag,
  Terminal,
  Monitor,
  Cpu
} from 'lucide-react';
import { toast } from 'sonner';
import { useFormat } from '@/hooks/use-format';
import { useTranslations } from 'next-intl';

export function AdminMaintenanceCenter() {
  const t = useTranslations('AdminMaintenanceCenter');
  const { formatRelativeTime } = useFormat();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [selectedTab, setSelectedTab] = useState('health');
  const [queueType, setQueueType] = useState('all');
  const [cachePattern, setCachePattern] = useState('*');
  const [featureFlagCategory, setFeatureFlagCategory] = useState('');

  // Handle hash-based navigation with Next.js router
  useEffect(() => {
    // Get hash from current URL (client-side only)
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.slice(1); // Remove # symbol
      const validTabs = ['health', 'queues', 'cache', 'features'];
      
      if (hash && validTabs.includes(hash)) {
        setSelectedTab(hash);
      } else if (!hash) {
        setSelectedTab('health');
      }
    }
  }, [pathname]); // Re-run when pathname changes

  // Handle tab change and update URL hash using Next.js router
  const handleTabChange = (value: string) => {
    setSelectedTab(value);
    
    // Build new URL with hash
    const currentSearch = searchParams.toString();
    const searchString = currentSearch ? `?${currentSearch}` : '';
    const newUrl = value === 'health' 
      ? pathname + searchString
      : pathname + searchString + '#' + value;
    
    // Use Next.js router for navigation
    router.push(newUrl, { scroll: false });
  };

  // Hooks
  const { data: systemHealth, isLoading: healthLoading } = useSystemHealth();
  const { data: queueMonitor, isLoading: queueLoading } = useQueueMonitor(queueType);
  const { data: cacheData, isLoading: cacheLoading } = useCacheManagement({ pattern: cachePattern, limit: 100 });
  const { data: featureFlags, isLoading: flagsLoading } = useFeatureFlags({ category: featureFlagCategory });

  const healthAction = useSystemHealthAction();
  const queueAction = useQueueAction();
  const cacheAction = useCacheAction();
  const flagAction = useFeatureFlagAction();

  const handleHealthAction = async (action: string, data?: any) => {
    try {
      await healthAction.mutateAsync({ action, ...data });
      toast.success(t('health_action_success', { action }));
    } catch (error: any) {
      toast.error(error.message || t('health_action_failed'));
    }
  };

  const handleQueueAction = async (action: string, queueName?: string, items?: string[]) => {
    try {
      await queueAction.mutateAsync({ action, queueName, items });
      toast.success(t('queue_action_success', { action }));
    } catch (error: any) {
      toast.error(error.message || t('queue_action_failed'));
    }
  };

  const handleCacheAction = async (action: string, data?: any) => {
    try {
      await cacheAction.mutateAsync({ action, ...data });
      toast.success(t('cache_action_success', { action }));
    } catch (error: any) {
      toast.error(error.message || t('cache_action_failed'));
    }
  };

  const handleFeatureFlagToggle = async (flagKey: string, enabled: boolean) => {
    try {
      await flagAction.mutateAsync({ action: 'toggle_flag', flagKey, enabled });
      toast.success(t('feature_flag_toggled', { flagKey, status: enabled ? t('enabled') : t('disabled') }));
    } catch (error: any) {
      toast.error(error.message || t('failed_to_toggle_feature_flag'));
    }
  };

  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600';
      case 'degraded': return 'text-yellow-600';
      case 'unhealthy': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getHealthStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'degraded': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'unhealthy': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default: return <Clock className="h-4 w-4 text-gray-600" />;
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
        <Button onClick={() => handleHealthAction('force_health_check')}>
          <RefreshCw className="h-4 w-4 mr-2" />
          {t('refresh_all')}
        </Button>
      </div>

      <Tabs value={selectedTab} onValueChange={handleTabChange}>
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="health">{t('system_health')}</TabsTrigger>
          <TabsTrigger value="queues">{t('queue_monitor')}</TabsTrigger>
          <TabsTrigger value="cache">{t('cache_management')}</TabsTrigger>
          <TabsTrigger value="features">{t('feature_flags')}</TabsTrigger>
        </TabsList>

        <TabsContent value="health" className="space-y-6">
          {/* System Health Overview */}
          <Card className="bg-transparent p-2">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Activity className="h-5 w-5 mr-2" />
                {t('system_health_overview')}
                <Badge 
                  className={`ml-2 ${
                    systemHealth?.data?.overall === 'healthy' ? 'bg-green-100 text-green-800' :
                    systemHealth?.data?.overall === 'degraded' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}
                >
                  {systemHealth?.data?.overall ? t(systemHealth.data.overall) : t('unknown')}
                </Badge>
              </CardTitle>
              <CardDescription>
                {t('current_system_status')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Service Status Grid */}
              <div className="grid gap-4 md:grid-cols-3 mb-6">
                {systemHealth?.data?.services && Object.entries(systemHealth.data.services).map(([service, info]: [string, any]) => (
                  <Card key={service} className="border">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center text-sm">
                        {getHealthStatusIcon(info.status)}
                        <span className="ml-2 capitalize">{service}</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">
                          {t('response_time')}: {info.responseTime ? `${info.responseTime}ms` : t('n_a')}
                        </div>
                        {info.error && (
                          <div className="text-xs text-red-600">
                            {t('error')}: {info.error}
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground">
                          {t('last_check')}: {formatRelativeTime(info.lastCheck)}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Performance Metrics */}
              {systemHealth?.data?.performance && (
                <Card className="border">
                  <CardHeader>
                    <CardTitle className="text-sm">{t('performance_metrics')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold">
                          {Math.round(systemHealth.data.performance.apiResponseTime)}ms
                        </div>
                        <div className="text-xs text-muted-foreground">{t('api_response')}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold">
                          {Math.round(systemHealth.data.performance.systemLoad)}%
                        </div>
                        <div className="text-xs text-muted-foreground">{t('system_load')}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold">
                          {Math.round(systemHealth.data.performance.memoryUsage?.used || 0)}%
                        </div>
                        <div className="text-xs text-muted-foreground">{t('memory_used')}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold">
                          {Math.round(systemHealth.data.performance.cpuUsage)}%
                        </div>
                        <div className="text-xs text-muted-foreground">{t('cpu_usage')}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Health Actions */}
              <div className="flex flex-wrap gap-2 mt-4">
                <Button 
                  size="sm" 
                  onClick={() => handleHealthAction('force_health_check')}
                  disabled={healthAction.isPending}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  {t('force_health_check')}
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleHealthAction('clear_cache', { service: 'redis' })}
                  disabled={healthAction.isPending}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t('clear_redis_cache')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="queues" className="space-y-6">
          {/* Queue Monitor */}
          <Card className="bg-transparent p-2">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Database className="h-5 w-5 mr-2" />
                {t('queue_monitor')}
              </CardTitle>
              <CardDescription>
                {t('monitor_system_queues')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-4">
                <Select value={queueType} onValueChange={setQueueType}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('all_queues')}</SelectItem>
                    <SelectItem value="database">{t('database_queues')}</SelectItem>
                    <SelectItem value="processing">{t('processing_queues')}</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex gap-2">
                  <Button 
                    size="sm"
                    onClick={() => handleQueueAction('retry_failed', 'video_processing')}
                    disabled={queueAction.isPending}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    {t('retry_failed')}
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleQueueAction('purge_completed', 'video_processing')}
                    disabled={queueAction.isPending}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {t('purge_completed')}
                  </Button>
                </div>
              </div>

              {/* QStash Queues */}
              {queueMonitor?.data?.qstash?.queues && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium mb-2">{t('qstash_queues')}</h4>
                  <div className="grid gap-2 md:grid-cols-3">
                    {queueMonitor.data.qstash.queues.map((queue: any) => (
                      <Card key={queue.name} className="border">
                        <CardContent className="p-3">
                          <div className="text-sm font-medium">{queue.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {t('parallelism')}: {queue.details?.parallelism || t('n_a')}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {t('lag')}: {queue.details?.lag || 0}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Database Queues */}
              {queueMonitor?.data?.database && (
                <div className="space-y-4">
                  <h4 className="text-sm font-medium">{t('database_queues')}</h4>
                  
                  {/* Video Processing */}
                  {queueMonitor.data.database.videoProcessing && (
                    <Card className="border">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">{t('video_processing_queue')}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid gap-2 md:grid-cols-5 mb-3">
                          <div className="text-center">
                            <div className="text-lg font-bold text-blue-600">
                              {queueMonitor.data.database.videoProcessing.stats.pending}
                            </div>
                            <div className="text-xs">{t('pending')}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold text-yellow-600">
                              {queueMonitor.data.database.videoProcessing.stats.processing}
                            </div>
                            <div className="text-xs">{t('processing')}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold text-green-600">
                              {queueMonitor.data.database.videoProcessing.stats.completed}
                            </div>
                            <div className="text-xs">{t('completed')}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold text-red-600">
                              {queueMonitor.data.database.videoProcessing.stats.failed}
                            </div>
                            <div className="text-xs">{t('failed')}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold">
                              {Math.round(queueMonitor.data.database.videoProcessing.avgProcessingTime / 1000)}s
                            </div>
                            <div className="text-xs">{t('avg_time')}</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Embedding Queue */}
                  {queueMonitor.data.database.embedding && (
                    <Card className="border">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">{t('embedding_queue')}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid gap-2 md:grid-cols-4 mb-3">
                          <div className="text-center">
                            <div className="text-lg font-bold text-blue-600">
                              {queueMonitor.data.database.embedding.stats.queued}
                            </div>
                            <div className="text-xs">{t('queued')}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold text-yellow-600">
                              {queueMonitor.data.database.embedding.stats.processing}
                            </div>
                            <div className="text-xs">{t('processing')}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold text-green-600">
                              {queueMonitor.data.database.embedding.stats.completed}
                            </div>
                            <div className="text-xs">{t('completed')}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold text-red-600">
                              {queueMonitor.data.database.embedding.stats.failed}
                            </div>
                            <div className="text-xs">{t('failed')}</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cache" className="space-y-6">
          {/* Cache Management */}
          <Card className="bg-transparent p-2">
            <CardHeader>
              <CardTitle className="flex items-center">
                <HardDrive className="h-5 w-5 mr-2" />
                {t('cache_management')}
              </CardTitle>
              <CardDescription>
                {t('monitor_redis_cache')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-4">
                <Input
                  placeholder={t('cache_key_pattern_placeholder')}
                  value={cachePattern}
                  onChange={(e) => setCachePattern(e.target.value)}
                  className="w-64"
                />
                <div className="flex gap-2">
                  <Button 
                    size="sm"
                    onClick={() => handleCacheAction('flush_db')}
                    disabled={cacheAction.isPending}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {t('clear_all')}
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleCacheAction('optimize_cache')}
                    disabled={cacheAction.isPending}
                  >
                    <Zap className="h-4 w-4 mr-2" />
                    {t('optimize')}
                  </Button>
                </div>
              </div>

              {/* Cache Statistics */}
              {cacheData?.data?.statistics && (
                <div className="grid gap-4 md:grid-cols-4 mb-6">
                  <Card className="border">
                    <CardContent className="p-3">
                      <div className="text-2xl font-bold">
                        {cacheData.data.statistics.totalKeys || 0}
                      </div>
                      <div className="text-xs text-muted-foreground">{t('total_keys')}</div>
                    </CardContent>
                  </Card>
                  <Card className="border">
                    <CardContent className="p-3">
                      <div className="text-2xl font-bold">
                        {Math.round(cacheData.data.statistics.hitRate || 0)}%
                      </div>
                      <div className="text-xs text-muted-foreground">{t('hit_rate')}</div>
                    </CardContent>
                  </Card>
                  <Card className="border">
                    <CardContent className="p-3">
                      <div className="text-2xl font-bold">
                        {cacheData.data.memory?.used || t('n_a')}
                      </div>
                      <div className="text-xs text-muted-foreground">{t('memory_used')}</div>
                    </CardContent>
                  </Card>
                  <Card className="border">
                    <CardContent className="p-3">
                      <div className="text-2xl font-bold">
                        {cacheData.data.statistics.connectedClients || 0}
                      </div>
                      <div className="text-xs text-muted-foreground">{t('connections')}</div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Cache Keys Table */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('key')}</TableHead>
                    <TableHead>{t('type')}</TableHead>
                    <TableHead>{t('ttl')}</TableHead>
                    <TableHead>{t('size')}</TableHead>
                    <TableHead>{t('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cacheData?.data?.keys?.slice(0, 10).map((key: any) => (
                    <TableRow key={key.key}>
                      <TableCell className="font-mono text-sm">{key.key}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{key.type}</Badge>
                      </TableCell>
                      <TableCell>{key.ttl}</TableCell>
                      <TableCell>{key.size}</TableCell>
                      <TableCell>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => handleCacheAction('delete_keys', { keys: [key.key] })}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="features" className="space-y-6">
          {/* Feature Flags */}
          <Card className="bg-transparent p-2">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Flag className="h-5 w-5 mr-2" />
                {t('feature_flags')}
              </CardTitle>
              <CardDescription>
                {t('control_feature_rollouts')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-4">
                <Select value={featureFlagCategory} onValueChange={setFeatureFlagCategory}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder={t('all_categories')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">{t('all_categories')}</SelectItem>
                    <SelectItem value="core">{t('core')}</SelectItem>
                    <SelectItem value="ai">{t('ai_features')}</SelectItem>
                    <SelectItem value="classroom">{t('classroom')}</SelectItem>
                    <SelectItem value="community">{t('community')}</SelectItem>
                    <SelectItem value="commerce">{t('commerce')}</SelectItem>
                  </SelectContent>
                </Select>

                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => flagAction.mutateAsync({ action: 'reset_to_defaults' })}
                  disabled={flagAction.isPending}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  {t('reset_to_defaults')}
                </Button>
              </div>

              {/* Feature Flags Table */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('feature')}</TableHead>
                    <TableHead>{t('category')}</TableHead>
                    <TableHead>{t('status')}</TableHead>
                    <TableHead>{t('environment')}</TableHead>
                    <TableHead>{t('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {featureFlags?.data?.features && Object.entries(featureFlags.data.features).map(([key, feature]: [string, any]) => (
                    <TableRow key={key}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{feature.name}</div>
                          <div className="text-sm text-muted-foreground">{feature.description}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{feature.category}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={feature.enabled && feature.isAvailable}
                            disabled={!feature.isAvailable || flagAction.isPending}
                            onCheckedChange={(enabled) => handleFeatureFlagToggle(key, enabled)}
                          />
                          <span className={feature.enabled ? 'text-green-600' : 'text-gray-600'}>
                            {feature.enabled ? t('enabled') : t('disabled')}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={feature.isAvailable ? 'default' : 'secondary'}
                        >
                          {feature.currentEnvironment}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost">
                          <Settings className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
