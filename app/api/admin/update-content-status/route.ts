import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/utils/auth/server-guard';
import { createClient } from '@/utils/supabase/server';

export async function PATCH(request: NextRequest) {
  try {
    // Authorize admin user
    const authResult = await authorize('admin');
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const userId = authResult.sub;
    
    const supabaseServer = await createClient();
    const body = await request.json();
    
    const {
      content_type,
      content_id,
      status,
      reason
    } = body;
    
    // Validate required fields
    if (!content_type || !content_id || !status) {
      return NextResponse.json(
        { error: 'Content type, content ID, and status are required' },
        { status: 400 }
      );
    }
    
    // Validate content type and status combinations
    let validStatuses: string[] = [];
    let tableName = '';
    
    switch (content_type) {
      case 'course':
        validStatuses = ['active', 'pending', 'inactive', 'ban'];
        tableName = 'course';
        break;
        
      case 'post':
        validStatuses = ['active', 'inactive', 'ban'];
        tableName = 'community_post';
        break;
        
      case 'comment':
        // Comments typically don't have status fields, but we can handle deletion
        return NextResponse.json(
          { error: 'Comments cannot have status updated directly' },
          { status: 400 }
        );
        
      default:
        return NextResponse.json(
          { error: 'Invalid content type' },
          { status: 400 }
        );
    }
    
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status for ${content_type}` },
        { status: 400 }
      );
    }
    
    // Check if content exists
    const { data: existingContent, error: fetchError } = await supabaseServer
      .from(tableName)
      .select('id, status')
      .eq('id', content_id)
      .single();
    
    if (fetchError || !existingContent) {
      return NextResponse.json(
        { error: 'Content not found' },
        { status: 404 }
      );
    }
    
    // Update content status
    const { data: updatedContent, error: updateError } = await supabaseServer
      .from(tableName)
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', content_id)
      .select()
      .single();
    
    if (updateError) {
      console.error('[UPDATE_CONTENT_STATUS_ERROR]', updateError);
      return NextResponse.json(
        { error: 'Failed to update content status' },
        { status: 500 }
      );
    }
    
    // Log the status change
    const { error: logError } = await supabaseServer
      .from('audit_logs')
      .insert({
        user_id: userId,
        action: 'update_content_status',
        table_name: tableName,
        record_id: content_id.toString(),
        old_values: { status: existingContent.status },
        new_values: { status },
        metadata: {
          reason,
          content_type,
          changed_by: userId,
        }
      });
    
    if (logError) {
      console.error('[AUDIT_LOG_ERROR]', logError);
      // Don't fail the update, just log the error
    }
    
    return NextResponse.json({
      success: true,
      content: updatedContent,
      message: `${content_type} status updated to ${status}`,
    });
    
  } catch (error) {
    console.error('[ADMIN_UPDATE_CONTENT_STATUS_ERROR]', error);
    return NextResponse.json(
      { error: 'Failed to update content status' },
      { status: 500 }
    );
  }
}
