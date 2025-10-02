/**
 * Supabase Client Configuration
 * 
 * 包含：
 * 1. 客户端实时功能 (Client-side Realtime)
 * 2. 服务端单例客户端 (Server-side Singleton)
 * 3. 连接池优化和健康检查
 */

import { createClient } from '@supabase/supabase-js';

// ============================================
// 1. 客户端实时功能 (Client-side)
// ============================================

// 创建Supabase客户端，用于前端实时功能
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    realtime: {
      // 配置实时功能
      params: {
        eventsPerSecond: 10,
      },
    },
  }
);

// ============================================
// 2. 服务端单例客户端 (Server-side Singleton)
// ============================================

/**
 * 防止在开发环境的热重载中重复创建客户端
 * 
 * 解决问题：
 * - 每个 API 路由都创建新的客户端实例导致连接耗尽
 * - 使用单例模式和连接池优化来减少数据库连接数
 */
const globalForSupabase = globalThis as unknown as {
  supabaseAdmin: ReturnType<typeof createClient> | undefined;
  supabaseServerAnon: ReturnType<typeof createClient> | undefined;
};

/**
 * 管理员客户端单例 - 用于服务端操作
 * 使用 Service Role Key，绕过 RLS
 * 
 * 注意：只在服务端使用，不要在客户端暴露
 */
export const supabaseAdmin = 
  globalForSupabase.supabaseAdmin ??
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

/**
 * 匿名客户端单例 - 用于服务端公开数据访问
 * 使用 Anon Key，遵守 RLS
 */
export const supabaseServerAnon =
  globalForSupabase.supabaseServerAnon ??
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

// 在非生产环境保存到 global 以防止热重载时重复创建
if (process.env.NODE_ENV !== 'production') {
  globalForSupabase.supabaseAdmin = supabaseAdmin;
  globalForSupabase.supabaseServerAnon = supabaseServerAnon;
}

// ============================================
// 3. 工具函数 (Utility Functions)
// ============================================

/**
 * 批量查询优化
 * 
 * 使用场景：需要并行执行多个查询时
 * 
 * @example
 * const results = await batchQuery([
 *   supabaseAdmin.from('users').select('*'),
 *   supabaseAdmin.from('posts').select('*'),
 * ]);
 */
export async function batchQuery<T>(
  queries: Array<Promise<T>>
): Promise<Array<{ data: T | null; error: Error | null }>> {
  const results = await Promise.allSettled(queries);
  
  return results.map((result) => {
    if (result.status === 'fulfilled') {
      return { data: result.value, error: null };
    } else {
      return { data: null, error: result.reason };
    }
  });
}

/**
 * 连接健康检查
 * 用于监控和诊断
 * 
 * @returns 健康状态和时间戳
 */
export async function checkConnection() {
  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .limit(1);
    
    if (error) throw error;
    
    return {
      healthy: true,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('❌ Supabase connection check failed:', error);
    return {
      healthy: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    };
  }
}

// ============================================
// 4. 实时订阅功能 (Realtime Subscriptions)
// ============================================

/**
 * 订阅课程聊天频道
 * @param classroomId 课程ID
 * @param callback 新消息回调函数
 */
export function subscribeToClassroomChat(classroomId: string, callback: (payload: any) => void) {
  return supabase
    .channel(`classroom-chat-${classroomId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `classroom_id=eq.${classroomId}`,
      },
      callback
    )
    .subscribe();
}

/**
 * 订阅课程帖子频道
 * @param classroomId 课程ID
 * @param callback 新帖子回调函数
 */
export function subscribeToClassroomPosts(classroomId: string, callback: (payload: any) => void) {
  return supabase
    .channel(`classroom-posts-${classroomId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'posts',
        filter: `classroom_id=eq.${classroomId}`,
      },
      callback
    )
    .subscribe();
}

/**
 * 订阅课程帖子评论频道
 * @param postId 帖子ID
 * @param callback 新评论回调函数
 */
export function subscribeToPostComments(postId: string, callback: (payload: any) => void) {
  return supabase
    .channel(`post-comments-${postId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'post_comments',
        filter: `post_id=eq.${postId}`,
      },
      callback
    )
    .subscribe();
}

/**
 * 订阅课程作业频道
 * @param classroomId 课程ID
 * @param callback 新作业回调函数
 */
export function subscribeToClassroomAssignments(classroomId: string, callback: (payload: any) => void) {
  return supabase
    .channel(`classroom-assignments-${classroomId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'assignments',
        filter: `classroom_id=eq.${classroomId}`,
      },
      callback
    )
    .subscribe();
}