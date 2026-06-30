import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/utils/auth/server-guard';
import { createServerClient } from '@/utils/supabase/server';

export async function GET() {
  const auth = await authorize(['student', 'tutor']);
  if (auth instanceof NextResponse) return auth;

  const profileId = auth.user.profile?.id;
  if (!profileId) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from('course_certificate')
    .select('public_id, completion_percentage, final_score, issued_at, certificate_url, course:course(public_id,title,thumbnail_url)')
    .eq('user_id', profileId)
    .eq('is_deleted', false)
    .order('issued_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ certificates: data || [] });
}

export async function PATCH(request: NextRequest) {
  const auth = await authorize(['student', 'tutor']);
  if (auth instanceof NextResponse) return auth;

  const profileId = auth.user.profile?.id;
  if (!profileId) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

  const { certificateId, clear } = await request.json();
  const supabase = await createServerClient();

  if (clear) {
    const { error } = await supabase.from('profiles').update({ community_title: null }).eq('id', profileId);
    return error
      ? NextResponse.json({ error: error.message }, { status: 500 })
      : NextResponse.json({ success: true, title: null });
  }

  const { data: certificate } = await supabase
    .from('course_certificate')
    .select('course:course(title)')
    .eq('public_id', certificateId)
    .eq('user_id', profileId)
    .eq('is_deleted', false)
    .maybeSingle();

  const relation = certificate?.course as unknown as { title?: string } | null;
  if (!relation?.title) {
    return NextResponse.json({ error: 'Earned certificate not found' }, { status: 404 });
  }

  const title = `Certified · ${relation.title}`.slice(0, 120);
  const { error } = await supabase.from('profiles').update({ community_title: title }).eq('id', profileId);
  return error
    ? NextResponse.json({ error: error.message }, { status: 500 })
    : NextResponse.json({ success: true, title });
}
