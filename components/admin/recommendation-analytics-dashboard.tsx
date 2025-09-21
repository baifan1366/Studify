'use client';

import { useState } from 'react';
import { 
  useRecommendationAnalytics, 
  useRecommendationComparison, 
  useEmbeddingModelMetrics 
} from '@/hooks/recommendations/use-recommendation-analytics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Brain, 
  Target, 
  TrendingUp, 
  Clock, 
  Users, 
  BarChart3,
  Activity,
  Zap
} from 'lucide-react';

export default function RecommendationAnalyticsDashboard() {
  const [timeframe, setTimeframe] = useState<'24h' | '7d' | '30d'>('7d');
  
  const { data: analytics, isLoading: analyticsLoading } = useRecommendationAnalytics();
  const { data: comparison, isLoading: comparisonLoading } = useRecommendationComparison(timeframe);
  const { data: modelMetrics, isLoading: metricsLoading } = useEmbeddingModelMetrics();

  if (analyticsLoading || comparisonLoading || metricsLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            🧠 Recommendation Analytics
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Monitor embedding-powered recommendation performance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={timeframe === '24h' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimeframe('24h')}
          >
            24h
          </Button>
          <Button
            variant={timeframe === '7d' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimeframe('7d')}
          >
            7d
          </Button>
          <Button
            variant={timeframe === '30d' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimeframe('30d')}
          >
            30d
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Recommendations"
          value={analytics?.total_recommendations || 0}
          icon={<Target className="h-5 w-5" />}
          color="blue"
        />
        <MetricCard
          title="AI-Powered"
          value={analytics?.embedding_powered || 0}
          subtitle={`${Math.round(((analytics?.embedding_powered || 0) / (analytics?.total_recommendations || 1)) * 100)}% of total`}
          icon={<Brain className="h-5 w-5" />}
          color="purple"
        />
        <MetricCard
          title="Click Rate Improvement"
          value={`+${comparison?.improvement_percentage?.click_rate || 0}%`}
          subtitle="vs traditional only"
          icon={<TrendingUp className="h-5 w-5" />}
          color="green"
        />
        <MetricCard
          title="Avg Processing Time"
          value={`${analytics?.performance_metrics?.query_time_ms || 0}ms`}
          subtitle="end-to-end"
          icon={<Clock className="h-5 w-5" />}
          color="orange"
        />
      </div>

      <Tabs defaultValue="performance" className="space-y-4">
        <TabsList>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="models">Model Metrics</TabsTrigger>
          <TabsTrigger value="similarity">Similarity Analysis</TabsTrigger>
          <TabsTrigger value="insights">User Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Recommendation Comparison */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Recommendation Performance Comparison
                </CardTitle>
              </CardHeader>
              <CardContent>
                {comparison && (
                  <div className="space-y-4">
                    <ComparisonRow
                      label="Traditional Only"
                      clickRate={comparison.traditional_recommendations.click_rate}
                      enrollmentRate={comparison.traditional_recommendations.enrollment_rate}
                      count={comparison.traditional_recommendations.count}
                      color="blue"
                    />
                    <ComparisonRow
                      label="Embedding Only"
                      clickRate={comparison.embedding_recommendations.click_rate}
                      enrollmentRate={comparison.embedding_recommendations.enrollment_rate}
                      count={comparison.embedding_recommendations.count}
                      color="purple"
                    />
                    <ComparisonRow
                      label="Hybrid (Current)"
                      clickRate={comparison.hybrid_recommendations.click_rate}
                      enrollmentRate={comparison.hybrid_recommendations.enrollment_rate}
                      count={comparison.hybrid_recommendations.count}
                      color="green"
                      isHighlighted
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Score Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Score Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                {analytics && (
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Average Total Score</span>
                        <span className="font-semibold">{analytics.average_scores.total}/100</span>
                      </div>
                      <Progress value={analytics.average_scores.total} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Traditional Component</span>
                        <span className="font-semibold">{analytics.average_scores.traditional}/60</span>
                      </div>
                      <Progress 
                        value={(analytics.average_scores.traditional / 60) * 100} 
                        className="h-2" 
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>AI Component</span>
                        <span className="font-semibold">{analytics.average_scores.embedding}/40</span>
                      </div>
                      <Progress 
                        value={(analytics.average_scores.embedding / 40) * 100} 
                        className="h-2" 
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="models" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {modelMetrics && (
              <>
                <ModelMetricCard
                  title="E5-Small (384d)"
                  similarity={modelMetrics.e5_small.avg_similarity}
                  processingTime={modelMetrics.e5_small.processing_time_ms}
                  usageCount={modelMetrics.e5_small.usage_count}
                  description="Fast, lightweight model"
                />
                <ModelMetricCard
                  title="BGE-M3 (1024d)"
                  similarity={modelMetrics.bge_m3.avg_similarity}
                  processingTime={modelMetrics.bge_m3.processing_time_ms}
                  usageCount={modelMetrics.bge_m3.usage_count}
                  description="High accuracy model"
                />
                <ModelMetricCard
                  title="Hybrid (Weighted)"
                  similarity={modelMetrics.hybrid.avg_combined_similarity}
                  processingTime={modelMetrics.hybrid.processing_time_ms}
                  usageCount={modelMetrics.hybrid.usage_count}
                  description="Best of both models"
                  isHighlighted
                />
              </>
            )}
          </div>
        </TabsContent>

        <TabsContent value="similarity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Similarity Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              {analytics && (
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {analytics.embedding_distribution.high_similarity}
                    </div>
                    <div className="text-sm text-gray-600">High Similarity</div>
                    <div className="text-xs text-gray-500">&gt;80%</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">
                      {analytics.embedding_distribution.medium_similarity}
                    </div>
                    <div className="text-sm text-gray-600">Medium Similarity</div>
                    <div className="text-xs text-gray-500">50-80%</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {analytics.embedding_distribution.low_similarity}
                    </div>
                    <div className="text-sm text-gray-600">Low Similarity</div>
                    <div className="text-xs text-gray-500">&lt;50%</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top AI-Generated Reasons</CardTitle>
            </CardHeader>
            <CardContent>
              {analytics?.top_embedding_reasons && (
                <div className="space-y-2">
                  {analytics.top_embedding_reasons.map((reason, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Badge variant="outline">{index + 1}</Badge>
                      <span className="text-sm">{reason}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Helper Components
function MetricCard({ 
  title, 
  value, 
  subtitle, 
  icon, 
  color 
}: { 
  title: string; 
  value: string | number; 
  subtitle?: string; 
  icon: React.ReactNode; 
  color: string; 
}) {
  const colorClasses = {
    blue: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20',
    purple: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20',
    green: 'text-green-600 bg-green-50 dark:bg-green-900/20',
    orange: 'text-orange-600 bg-orange-50 dark:bg-orange-900/20',
  }[color];

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${colorClasses}`}>
            {icon}
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {title}
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {value}
            </p>
            {subtitle && (
              <p className="text-xs text-gray-500">
                {subtitle}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ComparisonRow({ 
  label, 
  clickRate, 
  enrollmentRate, 
  count, 
  color, 
  isHighlighted 
}: { 
  label: string; 
  clickRate: number; 
  enrollmentRate: number; 
  count: number; 
  color: string; 
  isHighlighted?: boolean; 
}) {
  return (
    <div className={`p-3 rounded-lg ${isHighlighted ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' : 'bg-gray-50 dark:bg-gray-800'}`}>
      <div className="flex justify-between items-center mb-2">
        <span className="font-medium">{label}</span>
        <span className="text-sm text-gray-600">{count} recs</span>
      </div>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-gray-600">Click Rate: </span>
          <span className="font-semibold">{(clickRate * 100).toFixed(1)}%</span>
        </div>
        <div>
          <span className="text-gray-600">Enrollment: </span>
          <span className="font-semibold">{(enrollmentRate * 100).toFixed(1)}%</span>
        </div>
      </div>
    </div>
  );
}

function ModelMetricCard({ 
  title, 
  similarity, 
  processingTime, 
  usageCount, 
  description, 
  isHighlighted 
}: { 
  title: string; 
  similarity: number; 
  processingTime: number; 
  usageCount: number; 
  description: string; 
  isHighlighted?: boolean; 
}) {
  return (
    <Card className={isHighlighted ? 'border-purple-200 dark:border-purple-800' : ''}>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Zap className="h-4 w-4" />
          {title}
        </CardTitle>
        <p className="text-xs text-gray-600">{description}</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Avg Similarity</span>
              <span className="font-semibold">{(similarity * 100).toFixed(1)}%</span>
            </div>
            <Progress value={similarity * 100} className="h-2" />
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-gray-600">Speed: </span>
              <span className="font-semibold">{processingTime}ms</span>
            </div>
            <div>
              <span className="text-gray-600">Usage: </span>
              <span className="font-semibold">{usageCount}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-64" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded" />
        ))}
      </div>
      <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded" />
    </div>
  );
}
