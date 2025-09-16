// app/api/admin/courses/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/utils/auth/server-guard';
import { createAdminClient } from '@/utils/supabase/server';

// GET /api/admin/courses - List all courses with filtering and pagination
export async function GET(request: NextRequest) {
  const authResult = await authorize('admin');
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status'); // Filter by status
    const category = searchParams.get('category'); // Filter by category
    const search = searchParams.get('search'); // Search by title/description
    const owner_id = searchParams.get('owner_id'); // Filter by owner
    const offset = (page - 1) * limit;

    const supabase = await createAdminClient();

    // Build query
    let query = supabase
      .from('course')
      .select(`
        id,
        public_id,
        title,
        description,
        slug,
        category,
        visibility,
        status,
        price_cents,
        currency,
        level,
        total_lessons,
        total_duration_minutes,
        total_students,
        average_rating,
        is_free,
        thumbnail_url,
        created_at,
        updated_at,
        profiles!course_owner_id_fkey(
          id,
          display_name,
          email,
          avatar_url
        )
      `)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    // Apply filters
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }
    if (category && category !== 'all') {
      query = query.eq('category', category);
    }
    if (owner_id) {
      query = query.eq('owner_id', parseInt(owner_id));
    }
    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }

    // Get total count for pagination
    const { count } = await supabase
      .from('course')
      .select('*', { count: 'exact', head: true })
      .eq('is_deleted', false);

    // Get paginated results
    const { data: courses, error } = await query
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching courses:', error);
      return NextResponse.json({ message: 'Failed to fetch courses' }, { status: 500 });
    }

    return NextResponse.json({
      courses,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });

  } catch (error) {
    console.error('Admin courses GET error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/admin/courses - Create a new course (admin override)
export async function POST(request: NextRequest) {
  const authResult = await authorize('admin');
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const courseData = await request.json();
    const supabase = await createAdminClient();

    // Create course with admin privileges
    const { data: course, error } = await supabase
      .from('course')
      .insert({
        ...courseData,
        status: courseData.status || 'active', // Admin can set any status
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating course:', error);
      return NextResponse.json({ message: 'Failed to create course' }, { status: 500 });
    }

    // Log the action
    await supabase
      .from('audit_log')
      .insert({
        actor_id: authResult.user.profile?.id,
        action: 'admin_create_course',
        subject_type: 'course',
        subject_id: course.id.toString(),
        meta: {
          course_title: course.title,
          course_public_id: course.public_id
        }
      });

    return NextResponse.json({
      message: 'Course created successfully',
      course
    });

  } catch (error) {
    console.error('Admin course creation error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
