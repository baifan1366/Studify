import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/server";
import { authorize } from "@/utils/auth/server-guard";

interface ShareTarget {
  type: "direct" | "group";
  id: number;
}

interface SharePostRequest {
  postId: string;
  targets: ShareTarget[];
}

export async function POST(request: NextRequest) {
  try {
    // 验证用户权限
    const authResult = await authorize(['student', 'tutor']);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    
    const userUuid = authResult.sub;
    const supabase = await createAdminClient();
    // 获取当前登录用户的 profile.id（数值型，用于 direct/group 消息与成员表）
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', userUuid)
      .single();
    if (profileError || !profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }
    const profileId = profile.id as number;
    const body: SharePostRequest = await request.json();
    const { postId, targets } = body;

    // 验证输入
    if (!postId || !targets || targets.length === 0) {
      return NextResponse.json(
        { error: "Missing postId or targets" },
        { status: 400 }
      );
    }

    // 验证帖子是否存在（优先按 public_id 匹配，回退按 id 匹配；再回退到旧表名）并获取 slug 信息
    const isNumericId = /^\d+$/.test(postId);
    let post: { id: number; public_id: string; slug?: string; group?: { slug?: string }[] | { slug?: string } | null } | null = null;

    // Try community_post by appropriate key
    if (isNumericId) {
      const { data } = await supabase
        .from('community_post')
        .select('id, public_id, slug, group:community_group ( slug )')
        .eq('id', parseInt(postId, 10))
        .neq('is_deleted', true)
        .maybeSingle();
      post = data as any;
    } else {
      const { data } = await supabase
        .from('community_post')
        .select('id, public_id, slug, group:community_group ( slug )')
        .eq('public_id', postId)
        .neq('is_deleted', true)
        .maybeSingle();
      post = data as any;
    }

    // Fallback: try community_posts (legacy plural) if not found
    if (!post) {
      if (isNumericId) {
        const { data } = await supabase
          .from('community_posts')
          .select('id, public_id, slug')
          .eq('id', parseInt(postId, 10))
          .neq('is_deleted', true)
          .maybeSingle();
        post = data as any;
      } else {
        const { data } = await supabase
          .from('community_posts')
          .select('id, public_id, slug')
          .eq('public_id', postId)
          .neq('is_deleted', true)
          .maybeSingle();
        post = data as any;
      }
    }

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // 组装 slug 内容（优先使用 slug|groupSlug 格式）
    const groupSlug = (Array.isArray(post.group) ? post.group[0]?.slug : (post.group as any)?.slug) || '';
    const postSlug = post.slug || '';
    const shareContent = groupSlug && postSlug ? `${groupSlug}|${postSlug}` : (post.public_id || String(post.id));
    
    console.log('Share content debug:', {
      postId,
      groupSlug,
      postSlug,
      shareContent,
      post
    });

    const results = [];
    const errors = [];

    // 处理每个分享目标
    for (const target of targets) {
      try {
        if (target.type === "direct") {
          // 分享到私聊：优先使用存储过程；失败时回退到手动查询/创建对话
          let conversationId: number | null = null;

          try {
            const { data: conversationIdResult, error: convError } = await supabase
              .rpc('create_or_get_conversation', {
                user1_id: profileId,
                user2_id: target.id,
              });
            if (!convError && conversationIdResult) {
              conversationId = conversationIdResult as number;
            }
          } catch (_) {
            // ignore and fallback
          }

          // Fallback: 直接查找/创建 direct_conversations（与 conversations API 保持一致字段）
          if (!conversationId) {
            // 先查找
            const { data: existingConv } = await supabase
              .from('direct_conversations')
              .select('id')
              .or(
                `and(participant1_id.eq.${profileId},participant2_id.eq.${target.id}),and(participant1_id.eq.${target.id},participant2_id.eq.${profileId})`
              )
              .eq('is_deleted', false)
              .maybeSingle();

            if (existingConv) {
              conversationId = existingConv.id;
            } else {
              // 创建新对话（按小到大排）
              const p1 = Math.min(profileId, target.id);
              const p2 = Math.max(profileId, target.id);
              const { data: createdConv, error: createConvError } = await supabase
                .from('direct_conversations')
                .insert({ participant1_id: p1, participant2_id: p2 })
                .select('id')
                .single();
              if (createConvError || !createdConv) {
                errors.push(`Failed to create conversation with user ${target.id}`);
                continue;
              }
              conversationId = createdConv.id;
            }
          }

          // 插入分享消息到 direct_messages
          const { data: message, error: messageError } = await supabase
            .from("direct_messages")
            .insert({
              conversation_id: conversationId,
              sender_id: profileId,
              content: shareContent,
              message_type: "share_post",
            })
            .select("id")
            .single();

          if (messageError) {
            errors.push(`Failed to share to user ${target.id}: ${messageError.message}`);
          } else {
            results.push({
              type: "direct",
              target_id: target.id,
              message_id: message.id,
            });
          }

        } else if (target.type === "group") {
          // 分享到群聊
          // 验证用户是否是群成员
          const { data: membership } = await supabase
            .from("group_conversation_members")
            .select("id")
            .eq("conversation_id", target.id)
            .eq("user_id", profileId)
            .single();

          if (!membership) {
            errors.push(`You are not a member of group ${target.id}`);
            continue;
          }

          // 插入分享消息到 group_messages
          const { data: message, error: messageError } = await supabase
            .from("group_messages")
            .insert({
              conversation_id: target.id,
              sender_id: profileId,
              content: shareContent,
              message_type: "share_post",
            })
            .select("id")
            .single();

          if (messageError) {
            errors.push(`Failed to share to group ${target.id}: ${messageError.message}`);
          } else {
            results.push({
              type: "group",
              target_id: target.id,
              message_id: message.id,
            });
          }
        }
      } catch (error) {
        console.error(`Error sharing to ${target.type} ${target.id}:`, error);
        errors.push(`Failed to share to ${target.type} ${target.id}`);
      }
    }

    // 返回结果
    return NextResponse.json({
      success: true,
      shared_count: results.length,
      results,
      errors: errors.length > 0 ? errors : undefined,
    });

  } catch (error) {
    console.error("Share post error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
