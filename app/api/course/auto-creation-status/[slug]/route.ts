import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/utils/auth/server-guard';
import { createAdminClient } from '@/utils/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const authResult = await authorize('tutor');
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const { slug } = await params;
    const supabase = await createAdminClient();

    // Get course details
    const { data: course, error: courseError } = await supabase
      .from('course')
      .select('title, slug')
      .eq('slug', slug)
      .eq('is_deleted', false)
      .single();

    if (courseError || !course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    const classroomName = `${course.title} - Classroom`;
    const communityName = `${course.title} - Group`;
    const classroomSlug = `${course.slug}-classroom`;
    const communitySlug = `${course.slug}-group`;

    console.log('[AutoCreationStatus] Checking existence for:', { 
      classroomName, 
      communityName, 
      classroomSlug, 
      communitySlug 
    });

    // Check classroom existence
    const { data: classroom } = await supabase
      .from('classroom')
      .select('id, name, slug')
      .eq('name', classroomName)
      .eq('slug', classroomSlug)
      .maybeSingle();

    // Check community existence  
    const { data: community } = await supabase
      .from('community_group')
      .select('id, name, slug')
      .eq('name', communityName)
      .eq('slug', communitySlug)
      .eq('is_deleted', false)
      .maybeSingle();

    const result = {
      hasClassroom: !!classroom,
      hasCommunity: !!community,
      classroomName: classroom?.name,
      communityName: community?.name,
      classroomSlug: classroom?.slug,
      communitySlug: community?.slug,
    };

    console.log('[AutoCreationStatus] Result:', result);

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error checking auto-creation status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
