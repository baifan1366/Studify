import { NextResponse } from "next/server";
import { createServerClient } from "@/utils/supabase/server";
import { authorize } from "@/utils/auth/server-guard";

// 智能嵌入补全API - 为缺失的嵌入进行补充生成
export async function POST(req: Request) {
  try {
    // 只允许管理员执行
    const authResult = await authorize('admin');
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const client = await createServerClient();
    
    // 1. 查找缺失嵌入的记录
    const { data: incompleteEmbeddings, error } = await client
      .from("video_embeddings")
      .select("*")
      .or("has_e5_embedding.eq.false,has_bge_embedding.eq.false")
      .eq("status", "completed")
      .limit(50); // 批量处理50个

    if (error || !incompleteEmbeddings?.length) {
      return NextResponse.json({ 
        message: "No incomplete embeddings found",
        count: 0 
      });
    }

    let processedCount = 0;
    const results = [];

    // 2. 为每个记录补全缺失的嵌入
    for (const embedding of incompleteEmbeddings) {
      try {
        const missingTypes = [];
        if (!embedding.has_e5_embedding) missingTypes.push('e5');
        if (!embedding.has_bge_embedding) missingTypes.push('bge');

        // 生成缺失的嵌入
        const embeddingResult = await generateMissingEmbeddings(
          embedding.content_text, 
          missingTypes
        );

        // 更新数据库
        const updateData: any = {};
        if (embeddingResult.e5_embedding) {
          updateData.embedding_e5_small = embeddingResult.e5_embedding;
          updateData.has_e5_embedding = true;
        }
        if (embeddingResult.bge_embedding) {
          updateData.embedding_bge_m3 = embeddingResult.bge_embedding;
          updateData.has_bge_embedding = true;
        }

        await client
          .from("video_embeddings")
          .update(updateData)
          .eq("id", embedding.id);

        processedCount++;
        results.push({
          id: embedding.id,
          attachment_id: embedding.attachment_id,
          completed: missingTypes,
          success: true
        });

      } catch (error: any) {
        results.push({
          id: embedding.id,
          error: error.message,
          success: false
        });
      }
    }

    return NextResponse.json({
      message: `Backfill completed`,
      processed: processedCount,
      total: incompleteEmbeddings.length,
      results
    });

  } catch (error: any) {
    console.error('Backfill embeddings error:', error);
    return NextResponse.json({
      error: "Internal server error",
      details: error.message
    }, { status: 500 });
  }
}

async function generateMissingEmbeddings(text: string, missingTypes: string[]) {
  const results: any = {};
  
  for (const type of missingTypes) {
    const apiConfig = type === 'e5' ? {
      url: process.env.E5_HG_EMBEDDING_SERVER_API_URL,
      name: 'E5-Small'
    } : {
      url: process.env.BGE_HG_EMBEDDING_SERVER_API_URL,
      name: 'BGE-M3'
    };

    if (!apiConfig.url) continue;

    try {
      const response = await fetch(`${apiConfig.url}/embed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: text }),
      });

      if (response.ok) {
        const result = await response.json();
        const embedding = result.embedding || result.data?.[0]?.embedding;
        
        if (embedding) {
          if (type === 'e5') results.e5_embedding = embedding;
          if (type === 'bge') results.bge_embedding = embedding;
        }
      }
    } catch (error) {
      console.error(`Failed to generate ${type} embedding:`, error);
    }
  }

  return results;
}
