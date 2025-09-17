import { NextResponse } from "next/server";
import { createServerClient } from "@/utils/supabase/server";
import { authorize } from "@/utils/auth/server-guard";

// 嵌入向量质量分析API
export async function GET(req: Request) {
  try {
    const authResult = await authorize('admin');
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const client = await createServerClient();
    
    // 1. 统计嵌入完整性
    const { data: completenessStats } = await client
      .from("video_embeddings")
      .select(`
        has_e5_embedding,
        has_bge_embedding,
        status,
        created_at
      `);

    // 2. 计算质量指标
    const analytics = {
      total_embeddings: completenessStats?.length || 0,
      dual_embeddings: completenessStats?.filter(e => e.has_e5_embedding && e.has_bge_embedding).length || 0,
      e5_only: completenessStats?.filter(e => e.has_e5_embedding && !e.has_bge_embedding).length || 0,
      bge_only: completenessStats?.filter(e => !e.has_e5_embedding && e.has_bge_embedding).length || 0,
      incomplete: completenessStats?.filter(e => !e.has_e5_embedding && !e.has_bge_embedding).length || 0,
      completion_rate: 0,
      dual_coverage: 0,
      recent_success_rate: 0
    };

    if (analytics.total_embeddings > 0) {
      analytics.completion_rate = ((analytics.dual_embeddings + analytics.e5_only + analytics.bge_only) / analytics.total_embeddings) * 100;
      analytics.dual_coverage = (analytics.dual_embeddings / analytics.total_embeddings) * 100;
      
      // 最近24小时成功率
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const recentEmbeddings = completenessStats?.filter(e => e.created_at > yesterday) || [];
      const recentSuccess = recentEmbeddings.filter(e => e.has_e5_embedding || e.has_bge_embedding).length;
      analytics.recent_success_rate = recentEmbeddings.length > 0 ? (recentSuccess / recentEmbeddings.length) * 100 : 0;
    }

    // 3. 服务器健康状况检查
    const serverHealth = await checkEmbeddingServersHealth();

    // 4. 推荐操作
    const recommendations = generateRecommendations(analytics, serverHealth);

    return NextResponse.json({
      analytics,
      server_health: serverHealth,
      recommendations,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Embedding analytics error:', error);
    return NextResponse.json({
      error: "Internal server error",
      details: error.message
    }, { status: 500 });
  }
}

async function checkEmbeddingServersHealth() {
  const servers = [
    { name: 'E5-Small', url: process.env.E5_HG_EMBEDDING_SERVER_API_URL },
    { name: 'BGE-M3', url: process.env.BGE_HG_EMBEDDING_SERVER_API_URL }
  ];

  const healthChecks = await Promise.allSettled(
    servers.map(async (server) => {
      if (!server.url) return { ...server, status: 'not_configured' };
      
      try {
        const response = await fetch(`${server.url}/healthz`, { 
          method: 'GET',
          signal: AbortSignal.timeout(5000) // 5秒超时
        });
        
        return {
          ...server,
          status: response.ok ? 'healthy' : 'unhealthy',
          response_time: Date.now(),
          details: response.ok ? await response.json() : null
        };
      } catch (error) {
        return {
          ...server,
          status: 'unreachable',
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    })
  );

  return healthChecks.map((result, index) => 
    result.status === 'fulfilled' ? result.value : { 
      ...servers[index], 
      status: 'error', 
      error: result.reason 
    }
  );
}

function generateRecommendations(analytics: any, serverHealth: any[]) {
  const recommendations = [];

  // 基于完整性的建议
  if (analytics.dual_coverage < 80) {
    recommendations.push({
      type: 'quality',
      priority: 'high',
      message: `双向量覆盖率仅${analytics.dual_coverage.toFixed(1)}%，建议运行补全任务`,
      action: 'run_backfill'
    });
  }

  if (analytics.incomplete > 0) {
    recommendations.push({
      type: 'data_integrity',
      priority: 'medium',
      message: `发现${analytics.incomplete}个完全缺失嵌入的记录`,
      action: 'investigate_failures'
    });
  }

  // 基于服务器健康的建议
  const unhealthyServers = serverHealth.filter(s => s.status !== 'healthy');
  if (unhealthyServers.length > 0) {
    recommendations.push({
      type: 'infrastructure',
      priority: 'high',
      message: `${unhealthyServers.map(s => s.name).join(', ')} 服务器状态异常`,
      action: 'check_servers'
    });
  }

  // 基于成功率的建议
  if (analytics.recent_success_rate < 90) {
    recommendations.push({
      type: 'performance',
      priority: 'medium',
      message: `最近24小时成功率为${analytics.recent_success_rate.toFixed(1)}%，低于预期`,
      action: 'monitor_closely'
    });
  }

  return recommendations;
}
