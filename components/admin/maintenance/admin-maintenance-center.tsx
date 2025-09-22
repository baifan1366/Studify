// components/admin/maintenance/admin-maintenance-center.tsx

'use client';

import { useState } from 'react';
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
  const [selectedTab, setSelectedTab] = useState('health');
  const [queueType, setQueueType] = useState('all');
  const [cachePattern, setCachePattern] = useState('*');
  const [featureFlagCategory, setFeatureFlagCategory] = useState('');

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
      toast.success(`Health action "${action}" completed successfully`);
    } catch (error: any) {
      toast.error(error.message || `Failed to perform health action`);
    }
  };

  const handleQueueAction = async (action: string, queueName?: string, items?: string[]) => {
    try {
      await queueAction.mutateAsync({ action, queueName, items });
      toast.success(`Queue action "${action}" completed successfully`);
    } catch (error: any) {
      toast.error(error.message || `Failed to perform queue action`);
    }
  };

  const handleCacheAction = async (action: string, data?: any) => {
    try {
      await cacheAction.mutateAsync({ action, ...data });
      toast.success(`Cache action "${action}" completed successfully`);
    } catch (error: any) {
      toast.error(error.message || `Failed to perform cache action`);
    }
  };

  const handleFeatureFlagToggle = async (flagKey: string, enabled: boolean) => {
    try {
      await flagAction.mutateAsync({ action: 'toggle_flag', flagKey, enabled });
      toast.success(`Feature flag "${flagKey}" ${enabled ? 'enabled' : 'disabled'}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to toggle feature flag');
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

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
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
                System Health Overview
                <Badge 
                  className={`ml-2 ${
                    systemHealth?.data?.overall === 'healthy' ? 'bg-green-100 text-green-800' :
                    systemHealth?.data?.overall === 'degraded' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}
                >
                  {systemHealth?.data?.overall || 'Unknown'}
                </Badge>
              </CardTitle>
              <CardDescription>
                Current system status and service health metrics
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
                          Response Time: {info.responseTime ? `${info.responseTime}ms` : 'N/A'}
                        </div>
                        {info.error && (
                          <div className="text-xs text-red-600">
                            Error: {info.error}
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
                    <CardTitle className="text-sm">Performance Metrics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold">
                          {Math.round(systemHealth.data.performance.apiResponseTime)}ms
                        </div>
                        <div className="text-xs text-muted-foreground">API Response</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold">
                          {Math.round(systemHealth.data.performance.systemLoad)}%
                        </div>
                        <div className="text-xs text-muted-foreground">System Load</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold">
                          {Math.round(systemHealth.data.performance.memoryUsage?.used || 0)}%
                        </div>
                        <div className="text-xs text-muted-foreground">Memory Used</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold">
                          {Math.round(systemHealth.data.performance.cpuUsage)}%
                        </div>
                        <div className="text-xs text-muted-foreground">CPU Usage</div>
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
                  Force Health Check
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleHealthAction('clear_cache', { service: 'redis' })}
                  disabled={healthAction.isPending}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear Redis Cache
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
                Queue Monitor
              </CardTitle>
              <CardDescription>
                Monitor and manage system processing queues
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-4">
                <Select value={queueType} onValueChange={setQueueType}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Queues</SelectItem>
                    <SelectItem value="database">Database Queues</SelectItem>
                    <SelectItem value="processing">Processing Queues</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex gap-2">
                  <Button 
                    size="sm"
                    onClick={() => handleQueueAction('retry_failed', 'video_processing')}
                    disabled={queueAction.isPending}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Retry Failed
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleQueueAction('purge_completed', 'video_processing')}
                    disabled={queueAction.isPending}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Purge Completed
                  </Button>
                </div>
              </div>

              {/* QStash Queues */}
              {queueMonitor?.data?.qstash?.queues && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium mb-2">QStash Queues</h4>
                  <div className="grid gap-2 md:grid-cols-3">
                    {queueMonitor.data.qstash.queues.map((queue: any) => (
                      <Card key={queue.name} className="border">
                        <CardContent className="p-3">
                          <div className="text-sm font-medium">{queue.name}</div>
                          <div className="text-xs text-muted-foreground">
                            Parallelism: {queue.details?.parallelism || 'N/A'}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Lag: {queue.details?.lag || 0}
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
                  <h4 className="text-sm font-medium">Database Queues</h4>
                  
                  {/* Video Processing */}
                  {queueMonitor.data.database.videoProcessing && (
                    <Card className="border">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Video Processing Queue</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid gap-2 md:grid-cols-5 mb-3">
                          <div className="text-center">
                            <div className="text-lg font-bold text-blue-600">
                              {queueMonitor.data.database.videoProcessing.stats.pending}
                            </div>
                            <div className="text-xs">Pending</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold text-yellow-600">
                              {queueMonitor.data.database.videoProcessing.stats.processing}
                            </div>
                            <div className="text-xs">Processing</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold text-green-600">
                              {queueMonitor.data.database.videoProcessing.stats.completed}
                            </div>
                            <div className="text-xs">Completed</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold text-red-600">
                              {queueMonitor.data.database.videoProcessing.stats.failed}
                            </div>
                            <div className="text-xs">Failed</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold">
                              {Math.round(queueMonitor.data.database.videoProcessing.avgProcessingTime / 1000)}s
                            </div>
                            <div className="text-xs">Avg Time</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Embedding Queue */}
                  {queueMonitor.data.database.embedding && (
                    <Card className="border">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Embedding Queue</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid gap-2 md:grid-cols-4 mb-3">
                          <div className="text-center">
                            <div className="text-lg font-bold text-blue-600">
                              {queueMonitor.data.database.embedding.stats.queued}
                            </div>
                            <div className="text-xs">Queued</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold text-yellow-600">
                              {queueMonitor.data.database.embedding.stats.processing}
                            </div>
                            <div className="text-xs">Processing</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold text-green-600">
                              {queueMonitor.data.database.embedding.stats.completed}
                            </div>
                            <div className="text-xs">Completed</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold text-red-600">
                              {queueMonitor.data.database.embedding.stats.failed}
                            </div>
                            <div className="text-xs">Failed</div>
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
                Cache Management
              </CardTitle>
              <CardDescription>
                Monitor and manage Redis cache
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-4">
                <Input
                  placeholder="Cache key pattern (e.g., user:*, session:*)"
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
                    Clear All
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleCacheAction('optimize_cache')}
                    disabled={cacheAction.isPending}
                  >
                    <Zap className="h-4 w-4 mr-2" />
                    Optimize
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
                      <div className="text-xs text-muted-foreground">Total Keys</div>
                    </CardContent>
                  </Card>
                  <Card className="border">
                    <CardContent className="p-3">
                      <div className="text-2xl font-bold">
                        {Math.round(cacheData.data.statistics.hitRate || 0)}%
                      </div>
                      <div className="text-xs text-muted-foreground">Hit Rate</div>
                    </CardContent>
                  </Card>
                  <Card className="border">
                    <CardContent className="p-3">
                      <div className="text-2xl font-bold">
                        {cacheData.data.memory?.used || 'N/A'}
                      </div>
                      <div className="text-xs text-muted-foreground">Memory Used</div>
                    </CardContent>
                  </Card>
                  <Card className="border">
                    <CardContent className="p-3">
                      <div className="text-2xl font-bold">
                        {cacheData.data.statistics.connectedClients || 0}
                      </div>
                      <div className="text-xs text-muted-foreground">Connections</div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Cache Keys Table */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Key</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>TTL</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Actions</TableHead>
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
                Feature Flags
              </CardTitle>
              <CardDescription>
                Control feature rollouts and system toggles
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-4">
                <Select value={featureFlagCategory} onValueChange={setFeatureFlagCategory}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Categories</SelectItem>
                    <SelectItem value="core">Core</SelectItem>
                    <SelectItem value="ai">AI Features</SelectItem>
                    <SelectItem value="classroom">Classroom</SelectItem>
                    <SelectItem value="community">Community</SelectItem>
                    <SelectItem value="commerce">Commerce</SelectItem>
                  </SelectContent>
                </Select>

                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => flagAction.mutateAsync({ action: 'reset_to_defaults' })}
                  disabled={flagAction.isPending}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reset to Defaults
                </Button>
              </div>

              {/* Feature Flags Table */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Feature</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Environment</TableHead>
                    <TableHead>Actions</TableHead>
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
                            {feature.enabled ? 'Enabled' : 'Disabled'}
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
