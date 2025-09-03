"use server";

import { createServerClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { encodedRedirect } from "@/utils/redirect";
import { cookies } from "next/headers";
import { authorize } from "@/utils/auth/server-guard";
import { NextResponse } from "next/server";
import { Post } from "@/interface/community/post-interface";

export const signInAction = async (formData: FormData) => {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const locale = formData.get("locale") as string;

  const client = await createServerClient();
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.log("[signInAction] sign-in failed:", { email, error });
    return encodedRedirect("error", `/${locale}/sign-in`, error.message);
  }
  console.log("[signInAction] sign-in success:", {
    email,
    userId: data.user?.id,
    hasSession: Boolean(data.session),
  });
  return redirect(`/${locale}/home`);
};

export const signUpStudent = signUp.bind(null, "student");
export const signUpTutor = signUp.bind(null, "tutor");

async function signUp(role: "student" | "tutor", formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const fullName = formData.get("fullName") as string;
  const locale = formData.get("locale") as string;

  const client = await createServerClient();

  const url = process.env.VERCEL_URL
    ? `${process.env.VERCEL_URL}/${locale}/home`
    : `http://localhost:3000/${locale}/home`;

  const { error } = await client.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, role },
    },
  });

  if (error) {
    const redirectUrl =
      role === "tutor" ? `/${locale}/sign-up-tutor` : `/${locale}/sign-up`;
    return encodedRedirect("error", redirectUrl, error.message);
  }

  return redirect(`/${locale}/home`);
}

export const signOutAction = async () => {
  const client = await createServerClient();
  await client.auth.signOut();

  const cookieStore = await cookies();
  const locale = cookieStore.get("next-intl-locale")?.value || "en";
  return redirect(`/${locale}/sign-in`);
};

export async function getPostDetailsForPage(groupSlug: string, postSlug: string): Promise<Post | null> {
  const authResult = await authorize('student');
  if (authResult instanceof NextResponse) {
    // Not authorized, return null or throw an error
    return null;
  }

  const supabaseClient = await createServerClient();

  // 1. Get user profile
  const { data: profile } = await supabaseClient
    .from('profiles')
    .select('id')
    .eq('user_id', authResult.sub)
    .single();

  if (!profile) {
    return null;
  }

  // 2. Get group
  const { data: group } = await supabaseClient
    .from('community_group')
    .select('id, visibility')
    .eq('slug', groupSlug)
    .eq('is_deleted', false)
    .single();

  if (!group) {
    return null;
  }

  // 3. Check access for private groups
  if (group.visibility === 'private') {
    const { data: membership } = await supabaseClient
      .from('community_group_member')
      .select('id')
      .eq('group_id', group.id)
      .eq('user_id', profile.id)
      .eq('is_deleted', false)
      .single();

    if (!membership) {
      // Access denied for private group
      return null;
    }
  }

  // 4. Get post
  const { data: post } = await supabaseClient
    .from('community_post')
    .select(`*,
      author:profiles ( display_name, avatar_url ),
      group:community_group ( name, slug, visibility ),
      comments:community_comment ( *,
        author:profiles ( display_name, avatar_url )
      ),
      reactions:community_reaction ( emoji, user_id )
    `)
    .eq('group_id', group.id)
    .eq('slug', postSlug)
    .eq('is_deleted', false)
    .single();

  if (!post) {
    return null;
  }

  // Process reactions and return
  const reactions = post.reactions.reduce((acc: Record<string, number>, reaction: { emoji: string }) => {
    acc[reaction.emoji] = (acc[reaction.emoji] || 0) + 1;
    return acc;
  }, {});

  return {
    ...post,
    comments_count: post.comments.length,
    reactions,
  };
}
