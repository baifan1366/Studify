import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { authorize } from "@/utils/auth/server-guard";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const supabase = await createClient();

    // 获取邀请token信息
    const { data: inviteToken, error: tokenErr } = await supabase
      .from("community_quiz_invite_token")
      .select(`
        id,
        quiz_id,
        permission_type,
        expires_at,
        max_uses,
        current_uses,
        is_active,
        community_quiz!inner(
          slug,
          title,
          description,
          author_id
        )
      `)
      .eq("token", token)
      .eq("is_active", true)
      .maybeSingle();

    if (tokenErr || !inviteToken) {
      return NextResponse.json({ error: "Invalid or expired invite link" }, { status: 404 });
    }

    // 检查是否过期
    if (inviteToken.expires_at && new Date(inviteToken.expires_at) < new Date()) {
      return NextResponse.json({ error: "Invite link has expired" }, { status: 410 });
    }

    // 检查使用次数限制
    if (inviteToken.max_uses && inviteToken.current_uses >= inviteToken.max_uses) {
      return NextResponse.json({ error: "Invite link has reached maximum uses" }, { status: 410 });
    }

    // 返回邀请信息；如果用户已登录，附带其当前权限与是否会升级
    const quiz = Array.isArray(inviteToken.community_quiz) 
      ? inviteToken.community_quiz[0] 
      : inviteToken.community_quiz;

    // 尝试读取当前用户（若未登录则跳过）
    let me = null as null | { id: string };
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id) me = { id: user.id };
    } catch {}

    let current_permission: 'view'|'attempt'|'edit'|null = null;
    let will_upgrade = false;
    let upgrade_to: 'view'|'attempt'|'edit'|null = null;
    if (me) {
      const { data: perms } = await supabase
        .from("community_quiz_permission")
        .select("permission_type")
        .eq("quiz_id", inviteToken.quiz_id)
        .eq("user_id", me.id);

      const order: Record<'view'|'attempt'|'edit', number> = { view: 1, attempt: 2, edit: 3 };
      if (perms && perms.length > 0) {
        for (const p of perms) {
          const t = p.permission_type as 'view'|'attempt'|'edit';
          if (!current_permission || order[t] > order[current_permission]) current_permission = t;
        }
      }

      const invitedType = inviteToken.permission_type as 'view'|'attempt'|'edit';
      const currentOrder = current_permission ? order[current_permission] : 0;
      will_upgrade = order[invitedType] > currentOrder;
      upgrade_to = will_upgrade ? invitedType : (current_permission ?? invitedType);
    }

    return NextResponse.json({
      quiz: {
        slug: quiz.slug,
        title: quiz.title,
        description: quiz.description
      },
      permission_type: inviteToken.permission_type,
      expires_at: inviteToken.expires_at,
      me: {
        is_authenticated: !!me,
        current_permission,
        will_upgrade,
        upgrade_to,
      }
    });

  } catch (err: any) {
    console.error("Get invite info error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const auth = await authorize(["student", "tutor"]);
    if (auth instanceof NextResponse) return auth;
    const { sub: userId } = auth;

    const supabase = await createClient();

    // 获取邀请token信息
    const { data: inviteToken, error: tokenErr } = await supabase
      .from("community_quiz_invite_token")
      .select(`
        id,
        quiz_id,
        permission_type,
        expires_at,
        max_uses,
        current_uses,
        is_active,
        created_by,
        community_quiz!inner(
          slug,
          title,
          author_id
        )
      `)
      .eq("token", token)
      .eq("is_active", true)
      .maybeSingle();

    if (tokenErr || !inviteToken) {
      return NextResponse.json({ error: "Invalid or expired invite link" }, { status: 404 });
    }

    // 检查是否过期
    if (inviteToken.expires_at && new Date(inviteToken.expires_at) < new Date()) {
      return NextResponse.json({ error: "Invite link has expired" }, { status: 410 });
    }

    // 检查使用次数限制
    if (inviteToken.max_uses && inviteToken.current_uses >= inviteToken.max_uses) {
      return NextResponse.json({ error: "Invite link has reached maximum uses" }, { status: 410 });
    }

    // 读取该用户对该测验的所有权限（可能存在历史冗余）
    const { data: existingPerms, error: existingErr } = await supabase
      .from("community_quiz_permission")
      .select("id, permission_type")
      .eq("quiz_id", inviteToken.quiz_id)
      .eq("user_id", userId);

    if (existingErr) {
      return NextResponse.json({ error: existingErr.message }, { status: 500 });
    }

    // 权限等级：edit > attempt > view
    const order: Record<'view' | 'attempt' | 'edit', number> = { view: 1, attempt: 2, edit: 3 };
    const invitedType = inviteToken.permission_type as 'view' | 'attempt' | 'edit';

    // 先求出“已有权限”的最高等级（不包含此次邀请）
    let existingHighest: 'view'|'attempt'|'edit'|null = null;
    if (existingPerms && existingPerms.length > 0) {
      for (const row of existingPerms) {
        const t = row.permission_type as 'view'|'attempt'|'edit';
        if (!existingHighest || order[t] > order[existingHighest]) existingHighest = t;
      }
    }

    // 计算应当赋予的最高权限：max(existingHighest, invitedType)
    let bestType: 'view' | 'attempt' | 'edit' = existingHighest && order[existingHighest] > order[invitedType]
      ? existingHighest
      : invitedType;
    let keepId: number | null = null;
    const hadAny = !!(existingPerms && existingPerms.length > 0);
    if (existingPerms && existingPerms.length > 0) {
      // 保留第一条记录，后续清理冗余
      keepId = existingPerms[0].id as unknown as number;

      // 删除其余冗余记录
      const redundantIds = existingPerms.filter(r => r.id !== keepId).map(r => r.id);
      if (redundantIds.length > 0) {
        await supabase
          .from("community_quiz_permission")
          .delete()
          .in("id", redundantIds);
      }

      // 更新保留记录的权限类型（如果需要提升）
      const { error: updatePermErr } = await supabase
        .from("community_quiz_permission")
        .update({ permission_type: bestType, granted_by: inviteToken.created_by })
        .eq("id", keepId);

      if (updatePermErr) {
        return NextResponse.json({ error: updatePermErr.message }, { status: 500 });
      }
    } else {
      // 不存在任何权限时新增一条记录
      const { error: insertErr } = await supabase
        .from("community_quiz_permission")
        .insert({
          quiz_id: inviteToken.quiz_id,
          user_id: userId,
          permission_type: bestType,
          granted_by: inviteToken.created_by
        });
      if (insertErr) {
        return NextResponse.json({ error: insertErr.message }, { status: 500 });
      }
    }

    // 仅在授予新权限或发生升级时才增加使用次数
    const prevOrder = existingHighest ? order[existingHighest] : 0;
    const newOrder = order[bestType];
    const isUpgrade = !hadAny || newOrder > prevOrder;
    if (isUpgrade) {
      const { error: updateErr } = await supabase
        .from("community_quiz_invite_token")
        .update({ current_uses: inviteToken.current_uses + 1 })
        .eq("id", inviteToken.id);
      if (updateErr) {
        console.warn("Failed to update token usage count:", updateErr);
      }
    }

    const quiz = Array.isArray(inviteToken.community_quiz) 
      ? inviteToken.community_quiz[0] 
      : inviteToken.community_quiz;

    return NextResponse.json({
      message: "Successfully granted access to quiz",
      quiz_slug: quiz.slug,
      permission_type: bestType,
      upgraded: isUpgrade
    });

  } catch (err: any) {
    console.error("Accept invite error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
