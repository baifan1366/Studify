'use server';

import { NextResponse } from 'next/server';
import { supabase } from '@/utils/supabase/server';

export async function GET() {
  try {
    const client = await supabase();
    const { data: { user } } = await client.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await client
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const { data: enrollments, error: enrollmentsError } = await client
      .from('course_enrollment')
      .select('course_id')
      .eq('user_id', profile.id);

    if (enrollmentsError) {
      return NextResponse.json({ error: enrollmentsError.message }, { status: 500 });
    }

    const courseIds = enrollments.map((e) => e.course_id);

    const { data: courses, error: coursesError } = await client
      .from('course')
      .select('*')
      .in('id', courseIds)
      .eq('is_deleted', false);

    if (coursesError) {
      return NextResponse.json({ error: coursesError.message }, { status: 500 });
    }
    
    // Fetch progress for each course
    const coursesWithProgress = await Promise.all(courses.map(async (course) => {
      const { data: lessons } = await client
        .from('course_lesson')
        .select('id')
        .eq('course_id', course.id)
        .eq('is_deleted', false);

      const lessonIds = lessons?.map(l => l.id) ?? [];

      const { data: completedLessons } = await client
        .from('course_progress')
        .select('lesson_id')
        .eq('user_id', profile.id)
        .in('lesson_id', lessonIds)
        .eq('state', 'completed');

      const progress = lessonIds.length > 0 ? ((completedLessons?.length ?? 0) / lessonIds.length) * 100 : 0;

      return {
        ...course,
        progress: Math.round(progress),
      };
    }));

    return NextResponse.json({ data: coursesWithProgress });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Internal error' }, { status: 500 });
  }
}
