import React from 'react';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import LiveClassroom from '@/components/classroom/live-session/live-classroom';
import { getTranslations } from 'next-intl/server';
import { createClient } from '@/utils/supabase/server';

export async function generateMetadata({ params }: { params: Promise<{ slug: string; sessionSlug: string }> }): Promise<Metadata> {
  const { slug, sessionSlug } = await params;
  const t = await getTranslations('LiveSessionRoom');

  return {
    title: t('metadata_title'),
    description: t('metadata_description'),
    keywords: t('metadata_keywords').split(','),
    openGraph: {
      title: t('og_title'),
      description: t('og_description'),
      type: 'website',
    },
  };
}

export default async function Page({ params }: { params: Promise<{ slug: string; sessionSlug: string }> }) {
  const { slug, sessionSlug } = await params;
  
  // Get authenticated user
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    redirect('/auth/login');
  }

  // Get user's profile to get profile.id
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, display_name, full_name')
    .eq('user_id', user.id)
    .single();

  if (profileError || !profile) {
    console.error('Profile not found:', profileError);
    redirect('/auth/login');
  }

  // Get classroom to find classroom_id
  const { data: classroom, error: classroomError } = await supabase
    .from('classroom')
    .select('id, name')
    .eq('slug', slug)
    .single();

  if (classroomError || !classroom) {
    console.error('Classroom not found:', classroomError);
    redirect('/classroom');
  }

  // Get user's role in this classroom
  const { data: member, error: memberError } = await supabase
    .from('classroom_member')
    .select('role')
    .eq('classroom_id', classroom.id)
    .eq('user_id', profile.id)
    .single();

  if (memberError || !member) {
    console.error('Not a member of this classroom:', memberError);
    redirect('/classroom');
  }

  const userRole = member.role as 'student' | 'tutor' | 'owner';
  const participantName = profile.display_name || profile.full_name || 'User';

  return (
    <LiveClassroom 
      classroomSlug={slug} 
      sessionId={sessionSlug} 
      participantName={participantName} 
      userRole={userRole} 
    />
  );
}
