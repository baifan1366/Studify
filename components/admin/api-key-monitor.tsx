'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  RefreshCw, 
  TrendingUp,
  Key,
  Activity,
  AlertCircle
} from 'lucide-react';

// Types
interface KeyStatus {
  name: string;
  isActive: boolean;
  errorCount: number;
  cooldownUntil?: Date;
  lastError?: Date;
  rateLimit: number;
}

interface KeyUsage {
  keyName: string;
  requestCount: number;
  lastUsed: Date;
}

interface ApiKeyStats {
  keys: KeyStatus[];
  usage: KeyUsage[];
}

export function ApiKeyMonitor() {
  const [stats, setStats] = useState<ApiKeyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // 获取API key状态
  const fetchKeyStats = async () => {
    try {
      const response = await fetch('/api/admin/api-keys/status');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch API key stats:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // 重置特定key
  const resetKey = async (keyName: string) => {
    try {
      const response = await fetch('/api/admin/api-keys/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyName }),
      });
      
      if (response.ok) {
        await fetchKeyStats(); // 刷新数据
      }
    } catch (error) {
      console.error('Failed to reset key:', error);
    }
  };

  // 手动刷新
  const handleRefresh = () => {
    setRefreshing(true);
    fetchKeyStats();
  };

  useEffect(() => {
    fetchKeyStats();
    // 每30秒自动刷新
    const interval = setInterval(fetchKeyStats, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            API Keys Monitor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading API key status...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            API Keys Monitor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-500">
            Failed to load API key statistics
          </div>
        </CardContent>
      </Card>
    );
  }

  // 计算统计数据
  const totalKeys = stats.keys.length;
  const activeKeys = stats.keys.filter(k => k.isActive).length;
  const keysInCooldown = stats.keys.filter(k => k.cooldownUntil && new Date(k.cooldownUntil) > new Date()).length;
  const keysWithErrors = stats.keys.filter(k => k.errorCount > 0).length;
  const totalRequests = stats.usage.reduce((sum, u) => sum + u.requestCount, 0);

  // 按rate limit分组
  const keysByRateLimit = stats.keys.reduce((acc, key) => {
    const limit = key.rateLimit;
    if (!acc[limit]) acc[limit] = [];
    acc[limit].push(key);
    return acc;
  }, {} as Record<number, KeyStatus[]>);

  return (
    <div className="space-y-6">
      {/* 概览统计 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Keys</p>
                <p className="text-2xl font-bold">{totalKeys}</p>
              </div>
              <Key className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Keys</p>
                <p className="text-2xl font-bold text-green-600">{activeKeys}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">In Cooldown</p>
                <p className="text-2xl font-bold text-orange-600">{keysInCooldown}</p>
              </div>
              <Clock className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Requests</p>
                <p className="text-2xl font-bold">{totalRequests.toLocaleString()}</p>
              </div>
              <Activity className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 主控制面板 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                API Keys Status
              </CardTitle>
              <CardDescription>
                Real-time monitoring of your {totalKeys} OpenRouter API keys
              </CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Rate Limit 分组显示 */}
          <div className="space-y-6">
            {Object.entries(keysByRateLimit)
              .sort(([a], [b]) => parseInt(b) - parseInt(a))
              .map(([rateLimit, keys]) => (
                <div key={rateLimit} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold">
                      {rateLimit} RPM Keys
                    </h3>
                    <Badge variant="secondary">
                      {keys.length} keys
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {keys.map((key) => {
                      const usage = stats.usage.find(u => u.keyName === key.name);
                      const isInCooldown = key.cooldownUntil && new Date(key.cooldownUntil) > new Date();
                      const usagePercentage = usage ? Math.min((usage.requestCount / key.rateLimit) * 100, 100) : 0;

                      return (
                        <Card key={key.name} className={`relative ${
                          !key.isActive ? 'bg-red-50 border-red-200' :
                          isInCooldown ? 'bg-orange-50 border-orange-200' :
                          key.errorCount > 5 ? 'bg-yellow-50 border-yellow-200' :
                          'bg-green-50 border-green-200'
                        }`}>
                          <CardContent className="p-4">
                            <div className="space-y-3">
                              {/* Key名称和状态 */}
                              <div className="flex items-center justify-between">
                                <h4 className="font-medium text-sm">{key.name}</h4>
                                {!key.isActive ? (
                                  <Badge variant="destructive" className="text-xs">
                                    <AlertCircle className="h-3 w-3 mr-1" />
                                    Inactive
                                  </Badge>
                                ) : isInCooldown ? (
                                  <Badge variant="secondary" className="text-xs bg-orange-100">
                                    <Clock className="h-3 w-3 mr-1" />
                                    Cooldown
                                  </Badge>
                                ) : (
                                  <Badge className="text-xs bg-green-100 text-green-700">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Active
                                  </Badge>
                                )}
                              </div>

                              {/* 使用率进度条 */}
                              {usage && (
                                <div className="space-y-1">
                                  <div className="flex justify-between text-xs text-gray-600">
                                    <span>Usage</span>
                                    <span>{usage.requestCount}/{key.rateLimit}</span>
                                  </div>
                                  <Progress 
                                    value={usagePercentage} 
                                    className="h-2"
                                  />
                                </div>
                              )}

                              {/* 错误统计 */}
                              {key.errorCount > 0 && (
                                <div className="flex items-center gap-1 text-xs text-red-600">
                                  <AlertTriangle className="h-3 w-3" />
                                  {key.errorCount} errors
                                </div>
                              )}

                              {/* 最后使用时间 */}
                              {usage?.lastUsed && (
                                <div className="text-xs text-gray-500">
                                  Last used: {new Date(usage.lastUsed).toLocaleTimeString()}
                                </div>
                              )}

                              {/* 冷却时间 */}
                              {isInCooldown && key.cooldownUntil && (
                                <div className="text-xs text-orange-600">
                                  Cooldown until: {new Date(key.cooldownUntil).toLocaleTimeString()}
                                </div>
                              )}

                              {/* 重置按钮 */}
                              {(key.errorCount > 0 || !key.isActive) && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="w-full text-xs"
                                  onClick={() => resetKey(key.name)}
                                >
                                  <RefreshCw className="h-3 w-3 mr-1" />
                                  Reset
                                </Button>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* 使用量趋势 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Usage Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stats.usage
              .sort((a, b) => b.requestCount - a.requestCount)
              .slice(0, 10) // 显示前10个
              .map((usage) => {
                const key = stats.keys.find(k => k.name === usage.keyName);
                const percentage = key ? (usage.requestCount / key.rateLimit) * 100 : 0;
                
                return (
                  <div key={usage.keyName} className="flex items-center gap-3">
                    <div className="w-20 text-sm font-medium">{usage.keyName}</div>
                    <div className="flex-1">
                      <Progress value={Math.min(percentage, 100)} className="h-2" />
                    </div>
                    <div className="w-24 text-sm text-gray-600 text-right">
                      {usage.requestCount}/{key?.rateLimit || 0}
                    </div>
                    <div className="w-16 text-sm text-gray-500 text-right">
                      {percentage.toFixed(1)}%
                    </div>
                  </div>
                );
              })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
