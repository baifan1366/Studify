import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/utils/auth/server-guard';
import { createClient } from '@/utils/supabase/server';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ contentType: string; contentId: string }> }
) {
  try {
    // Authorize admin user
    const authResult = await authorize('admin');
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    
    const userId = authResult.sub;    
    const supabaseServer = await createClient();
    const { contentType, contentId } = await context.params;
    
    // Validate parameters
    if (!contentType || !contentId) {
      return NextResponse.json(
        { error: 'Content type and ID are required' },
        { status: 400 }
      );
    }
    
    const id = parseInt(contentId);
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid content ID' },
        { status: 400 }
      );
    }
    
    // Validate content type
    const validTypes = ['course', 'post', 'comment'];
    if (!validTypes.includes(contentType)) {
      return NextResponse.json(
        { error: 'Invalid content type' },
        { status: 400 }
      );
    }
    
    // Fetch reports for the specific content
    const { data: reports, error: reportsError } = await supabaseServer
      .from('report')
      .select(`
        id,
        public_id,
        reason,
        description,
        status,
        created_at,
        updated_at,
        reporter_id,
        target_type,
        target_id,
        reporter_profile:profiles!reporter_id(
          id,
          full_name,
          avatar_url
        )
      `)
      .eq('target_type', contentType)
      .eq('target_id', id)
      .order('created_at', { ascending: false });
    
    if (reportsError) {
      console.error('[CONTENT_REPORTS_FETCH_ERROR]', reportsError);
      return NextResponse.json(
        { error: 'Failed to fetch reports' },
        { status: 500 }
      );
    }
    
    // Transform reports to match expected interface
    const transformedReports = reports?.map(report => {
      // Handle reporter_profile which might be an array or single object
      const reporterProfile = Array.isArray(report.reporter_profile) 
        ? report.reporter_profile[0] 
        : report.reporter_profile;
      
      return {
        id: report.public_id || report.id.toString(),
        reason: report.reason,
        description: report.description,
        status: report.status,
        created_at: report.created_at,
        updated_at: report.updated_at,
        reporter_id: report.reporter_id,
        target_type: report.target_type,
        target_id: report.target_id,
        reporter_profile: reporterProfile ? {
          id: reporterProfile.id,
          full_name: reporterProfile.full_name,
          avatar_url: reporterProfile.avatar_url,
        } : null,
      };
    }) || [];
    
    return NextResponse.json(transformedReports);
    
  } catch (error) {
    console.error('[ADMIN_CONTENT_REPORTS_LIST_ERROR]', error);
    return NextResponse.json(
      { error: 'Failed to fetch content reports' },
      { status: 500 }
    );
  }
}
