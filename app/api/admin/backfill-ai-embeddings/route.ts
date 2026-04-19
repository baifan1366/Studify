import { NextResponse } from "next/server";
import { createServerClient } from "@/utils/supabase/server";
import { authorize } from "@/utils/auth/server-guard";

// 批量回填 AI 活动内容的 embeddings
export async function POST(req: Request) {
  try {
    // 只允许 admin、student、tutor 执行
    const authResult = await authorize(['student', 'tutor', 'admin']);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const client = await createServerClient();
    const body = await req.json();
    
    // 解析参数
    const contentTypes = body.content_types || [
      'ai_quick_qa_session',
      'mistake_book',
      'course_note',
      'ai_workflow_template'
    ];
    const userId = body.user_id || null;
    const batchSize = body.batch_size || 50;

    console.log('🔄 [Backfill AI Embeddings] Starting backfill:', {
      content_types: contentTypes,
      user_id: userId,
      batch_size: batchSize
    });

    const queuedCounts: Record<string, number> = {};

    // 处理每种 content_type
    for (const contentType of contentTypes) {
      try {
        const count = await backfillContentType(
          client,
          contentType,
          userId,
          batchSize
        );
        queuedCounts[contentType] = count;
        console.log(`✅ [Backfill AI Embeddings] ${contentType}: ${count} records queued`);
      } catch (error: any) {
        console.error(`❌ [Backfill AI Embeddings] Error processing ${contentType}:`, error);
        queuedCounts[contentType] = 0;
      }
    }

    return NextResponse.json({
      success: true,
      queued: queuedCounts
    });

  } catch (error: any) {
    console.error('❌ [Backfill AI Embeddings] Error:', error);
    return NextResponse.json({
      success: false,
      error: "Internal server error",
      details: error.message
    }, { status: 500 });
  }
}

async function backfillContentType(
  client: any,
  contentType: string,
  userId: number | null,
  batchSize: number
): Promise<number> {
  // 映射 content_type 到表名和优先级
  const typeConfig: Record<string, { table: string; priority: number }> = {
    'ai_quick_qa_session': { table: 'ai_quick_qa_sessions', priority: 6 },
    'mistake_book': { table: 'mistake_book', priority: 2 },
    'course_note': { table: 'course_notes', priority: 4 },
    'ai_workflow_template': { table: 'ai_workflow_templates', priority: 2 }
  };

  const config = typeConfig[contentType];
  if (!config) {
    throw new Error(`Unknown content type: ${contentType}`);
  }

  console.log(`🔍 [Backfill AI Embeddings] Processing ${contentType} from table ${config.table}`);

  // 直接使用查询方法
  return await backfillContentTypeFallback(client, contentType, config, userId, batchSize);
}

async function backfillContentTypeFallback(
  client: any,
  contentType: string,
  config: { table: string; priority: number },
  userId: number | null,
  batchSize: number
): Promise<number> {
  // 1. 查找已有 embedding 的 content_id
  const { data: existingEmbeddings } = await client
    .from('embeddings')
    .select('content_id')
    .eq('content_type', contentType)
    .eq('has_e5_embedding', true)
    .eq('status', 'completed');

  const existingIds = new Set((existingEmbeddings || []).map((e: any) => e.content_id));

  // 2. 查询需要回填的记录
  let query = client
    .from(config.table)
    .select('id')
    .order('created_at', { ascending: false })
    .limit(batchSize * 2); // 多查一些，因为要过滤

  if (userId !== null) {
    query = query.eq('user_id', userId);
  }

  const { data: records, error: queryError } = await query;

  if (queryError || !records) {
    console.error(`❌ [Backfill AI Embeddings] Query error for ${contentType}:`, queryError);
    return 0;
  }

  // 3. 过滤掉已有 embedding 的记录
  const recordsToProcess = records
    .filter((r: any) => !existingIds.has(r.id))
    .slice(0, batchSize);

  console.log(`📊 [Backfill AI Embeddings] ${contentType}: Found ${recordsToProcess.length} records to process`);

  // 4. 逐个调用 queue_for_embedding
  let queuedCount = 0;
  for (const record of recordsToProcess) {
    try {
      const { error: queueError } = await client.rpc('queue_for_embedding', {
        p_content_type: contentType,
        p_content_id: record.id,
        p_priority: config.priority
      });

      if (!queueError) {
        queuedCount++;
      } else {
        console.warn(`⚠️ [Backfill AI Embeddings] Failed to queue ${contentType} id ${record.id}:`, queueError);
      }
    } catch (error) {
      console.warn(`⚠️ [Backfill AI Embeddings] Exception queuing ${contentType} id ${record.id}:`, error);
    }
  }

  return queuedCount;
}
