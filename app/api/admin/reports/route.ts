// app/api/admin/reports/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/utils/auth/server-guard';
import { createAdminClient } from '@/utils/supabase/server';

// GET /api/admin/reports - List all reports with filtering and pagination
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
    const subject_type = searchParams.get('subject_type'); // Filter by content type
    const offset = (page - 1) * limit;

    const supabase = await createAdminClient();

    // Build query
    let query = supabase
      .from('report')
      .select(`
        id,
        public_id,
        subject_type,
        subject_id,
        reason,
        status,
        created_at,
        updated_at,
        profiles!report_reporter_id_fkey(
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
    if (subject_type && subject_type !== 'all') {
      query = query.eq('subject_type', subject_type);
    }

    // Get total count for pagination
    const { count } = await supabase
      .from('report')
      .select('*', { count: 'exact', head: true })
      .eq('is_deleted', false);

    // Get paginated results
    const { data: reports, error } = await query
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching reports:', error);
      return NextResponse.json({ message: 'Failed to fetch reports' }, { status: 500 });
    }

    // Get content details for each report
    const reportsWithContent = await Promise.all(
      reports.map(async (report) => {
        let contentDetails = null;
        
        try {
          switch (report.subject_type) {
            case 'post':
              const { data: post } = await supabase
                .from('community_post')
                .select('title, body, profiles!community_post_author_id_fkey(display_name)')
                .eq('id', parseInt(report.subject_id))
                .single();
              contentDetails = post;
              break;
              
            case 'comment':
              const { data: comment } = await supabase
                .from('community_comment')
                .select('body, profiles!community_comment_author_id_fkey(display_name)')
                .eq('id', parseInt(report.subject_id))
                .single();
              contentDetails = comment;
              break;
              
            case 'course':
              const { data: course } = await supabase
                .from('course')
                .select('title, description, profiles!course_owner_id_fkey(display_name)')
                .eq('id', parseInt(report.subject_id))
                .single();
              contentDetails = course;
              break;
              
            case 'profile':
              const { data: profile } = await supabase
                .from('profiles')
                .select('display_name, bio')
                .eq('id', parseInt(report.subject_id))
                .single();
              contentDetails = profile;
              break;
          }
        } catch (error) {
          console.error(`Error fetching content for ${report.subject_type}:`, error);
        }

        return {
          ...report,
          content_details: contentDetails
        };
      })
    );

    return NextResponse.json({
      reports: reportsWithContent,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });

  } catch (error) {
    console.error('Admin reports GET error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
