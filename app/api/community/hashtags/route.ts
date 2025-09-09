import { createServerClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");

  if (!query) {
    return NextResponse.json(
      { error: 'Query parameter "q" is required' },
      { status: 400 }
    );
  }

  const supabaseClient = await createServerClient();

  const { data: hashtag, error: hashtagError } = await supabaseClient
    .from("hashtags")
    .select("name")
    .ilike("name", `%${query}%`)
    .limit(10);

  if (hashtagError) {
    console.error("Error searching hashtags:", hashtagError);
    return NextResponse.json(
      { error: "Failed to search hashtags" },
      { status: 500 }
    );
  }

  const names = hashtag.map((item: { name: string }) => item.name); // ✅ 给类型

  return NextResponse.json(names);
}

export async function POST(request: NextRequest) {
  const { tag } = await request.json();
  if (!tag) {
    return NextResponse.json(
      { error: 'Body field "tag" is required' },
      { status: 400 }
    );
  }

  const supabaseClient = await createServerClient();

  const { data: hashtag, error: hashtagError } = await supabaseClient
    .from("hashtags")
    .insert([{ name: tag }])
    .select()
    .single();

  if (hashtagError) {
    console.error("Error creating hashtag:", hashtagError);
    return NextResponse.json(
      { error: "Failed to create hashtag" },
      { status: 500 }
    );
  }

  return NextResponse.json(hashtag);
}
