import { NextResponse } from "next/server";
import { createServerClient } from "@/utils/supabase/server";

export async function GET() {
  try {
    const client = await createServerClient();

    const { data, error } = await client
      .from("video_embeddings")
      .select("*")
      .eq("is_deleted", false)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Internal error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const client = await createServerClient();

    if (!body.attachment_id) {
      return NextResponse.json({ error: "attachment_id is required" }, { status: 422 });
    }

    const payload = {
      attachment_id: body.attachment_id as number,
      content_type: body.content_type as string,
      embedding: body.embedding as number[],
      content_text: body.content_text as string,
      chunk_type: body.chunk_type ?? null,
      hierarchy_level: body.hierarchy_level ?? null,
      parent_chunk_id: body.parent_chunk_id ?? null,
      section_title: body.section_title ?? null,
      semantic_density: body.semantic_density ?? null,
      key_terms: body.key_terms ?? null,
      sentence_count: body.sentence_count ?? null,
      word_count: body.word_count ?? null,
      has_code_block: body.has_code_block ?? null,
      has_table: body.has_table ?? null,
      has_list: body.has_list ?? null,
      chunk_language: body.chunk_language ?? null,
      embedding_model: body.embedding_model ?? null,
      language: body.language ?? null,
      token_count: body.token_count ?? null,
      status: body.status ?? null,
      error_message: body.error_message ?? null,
      retry_count: body.retry_count ?? null,
      is_deleted: body.is_deleted ?? null,
      created_at: body.created_at ?? null,
      updated_at: body.updated_at ?? null,
      deleted_at: body.deleted_at ?? null,
    };

    if (!payload.attachment_id) {
      return NextResponse.json({ error: "attachment_id is required" }, { status: 422 });
    }

    const { data, error } = await client
      .from("video_embeddings")
      .insert([payload])
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Internal error" }, { status: 500 });
  }
}
