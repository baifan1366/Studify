import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/server';
import { authorize } from '@/utils/auth/server-guard';

export const runtime = 'nodejs';

// GET - Generate signed URL for attachment access
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Parse the ID to get the actual attachment ID
    // The ID might be in format like "123-abc" where 123 is the attachment ID
    const attachmentId = id.split('-')[0];
    
    if (!attachmentId || isNaN(Number(attachmentId))) {
      return NextResponse.json({ error: 'Invalid attachment ID' }, { status: 400 });
    }

    // Allow both students and tutors to access attachments
    const authResult = await authorize(['student', 'tutor']);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    const supabase = await createAdminClient();

    // Get user's profile ID
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Get attachment details
    const { data: attachment, error: attachmentError } = await supabase
      .from('classroom_attachments')
      .select(`
        id,
        bucket,
        path,
        visibility,
        context_type,
        context_id,
        file_name,
        mime_type,
        owner_id
      `)
      .eq('id', attachmentId)
      .eq('is_deleted', false)
      .single();

    console.log('📎 Attachment lookup:', {
      attachmentId,
      attachment,
      attachmentError,
      profileId: profile.id
    });

    if (attachmentError || !attachment) {
      console.error('❌ Attachment not found:', attachmentError);
      return NextResponse.json({ error: 'Attachment not found' }, { status: 404 });
    }

    console.log('🔐 Starting permission check:', {
      contextType: attachment.context_type,
      ownerId: attachment.owner_id,
      currentProfileId: profile.id,
      isOwner: attachment.owner_id === profile.id
    });

    // Check access permissions
    if (attachment.context_type === 'chat') {
      // For chat attachments, check if user is member of the classroom
      const { data: classroom } = await supabase
        .from('classroom')
        .select('id')
        .eq('id', attachment.context_id)
        .single();

      if (classroom) {
        const { data: membership } = await supabase
          .from('classroom_member')
          .select('id')
          .eq('classroom_id', classroom.id)
          .eq('user_id', profile.id)
          .single();

        if (!membership) {
          return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }
      }
    } else if (attachment.context_type === 'submission') {
      console.log('🔍 Checking submission attachment access:', {
        attachmentId,
        contextId: attachment.context_id,
        ownerId: attachment.owner_id,
        currentProfileId: profile.id,
        isOwner: attachment.owner_id === profile.id
      });

      // For submissions, only owner and classroom tutors/owners can access
      if (attachment.owner_id !== profile.id) {
        console.log('👤 User is not the owner, checking classroom permissions...');

        // Get submission to find the classroom
        const { data: submission, error: submissionError } = await supabase
          .from('classroom_submission')
          .select('assignment_id, student_id')
          .eq('id', attachment.context_id)
          .single();

        console.log('📝 Submission lookup:', { submission, submissionError });

        if (submissionError || !submission) {
          console.error('❌ Submission not found:', submissionError);
          return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
        }

        // Get assignment to find classroom
        const { data: assignment, error: assignmentError } = await supabase
          .from('classroom_assignment')
          .select('classroom_id')
          .eq('id', submission.assignment_id)
          .single();

        console.log('📋 Assignment lookup:', { assignment, assignmentError });

        if (assignmentError || !assignment) {
          console.error('❌ Assignment not found:', assignmentError);
          return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
        }

        // Check if user is tutor/owner of the classroom
        const { data: membership, error: membershipError } = await supabase
          .from('classroom_member')
          .select('role')
          .eq('classroom_id', assignment.classroom_id)
          .eq('user_id', profile.id)
          .single();

        console.log('👥 Membership lookup:', { 
          membership, 
          membershipError,
          classroomId: assignment.classroom_id,
          profileId: profile.id
        });

        if (membershipError || !membership) {
          console.error('❌ Membership not found:', membershipError);
          return NextResponse.json({ 
            message: 'Forbidden: Not a member of this classroom.' 
          }, { status: 403 });
        }

        if (!['owner', 'tutor'].includes(membership.role)) {
          console.error('❌ Insufficient role:', membership.role);
          return NextResponse.json({ 
            message: `Forbidden: Insufficient permissions. Role: ${membership.role}` 
          }, { status: 403 });
        }

        console.log('✅ Access granted. User role:', membership.role);
      } else {
        console.log('✅ Access granted. User is the owner.');
      }
    } else if (attachment.context_type === 'material') {
      // For materials, context_id might be classroom_id directly
      console.log('🔍 Material attachment, context_id:', attachment.context_id);
      
      // Try to find classroom directly first
      const { data: classroom, error: classroomError } = await supabase
        .from('classroom')
        .select('id')
        .eq('id', attachment.context_id)
        .single();

      console.log('🏫 Classroom lookup for material:', { classroom, classroomError });

      if (classroom) {
        // Check if user is member of the classroom
        const { data: membership, error: membershipError } = await supabase
          .from('classroom_member')
          .select('role')
          .eq('classroom_id', classroom.id)
          .eq('user_id', profile.id)
          .single();

        console.log('👥 Membership lookup for material:', { 
          membership, 
          membershipError,
          classroomId: classroom.id,
          profileId: profile.id
        });

        if (membershipError || !membership) {
          console.error('❌ Not a member of classroom for material');
          return NextResponse.json({ 
            message: 'Forbidden: Not a member of this classroom.' 
          }, { status: 403 });
        }

        console.log('✅ Access granted. User is a classroom member with role:', membership.role);
      } else {
        // If not a classroom, try as assignment
        const { data: assignment, error: assignmentError } = await supabase
          .from('classroom_assignment')
          .select('classroom_id')
          .eq('id', attachment.context_id)
          .single();

        console.log('📋 Assignment lookup for material:', { assignment, assignmentError });

        if (assignmentError || !assignment) {
          console.error('❌ Neither classroom nor assignment found for material');
          // If not found, only owner can access
          if (attachment.owner_id !== profile.id) {
            return NextResponse.json({ 
              message: 'Forbidden: Insufficient permissions for material.' 
            }, { status: 403 });
          }
        } else {
          // Check if user is member of the classroom
          const { data: membership, error: membershipError } = await supabase
            .from('classroom_member')
            .select('role')
            .eq('classroom_id', assignment.classroom_id)
            .eq('user_id', profile.id)
            .single();

          console.log('👥 Membership lookup via assignment:', { 
            membership, 
            membershipError,
            classroomId: assignment.classroom_id,
            profileId: profile.id
          });

          if (membershipError || !membership) {
            console.error('❌ Not a member of classroom');
            return NextResponse.json({ 
              message: 'Forbidden: Not a member of this classroom.' 
            }, { status: 403 });
          }

          console.log('✅ Access granted. User is a classroom member with role:', membership.role);
        }
      }
    } else if (attachment.context_type === 'assignment') {
      // For assignments, context_id is assignment ID
      console.log('🔍 Assignment attachment, context_id:', attachment.context_id);
      
      const { data: assignment, error: assignmentError } = await supabase
        .from('classroom_assignment')
        .select('classroom_id')
        .eq('id', attachment.context_id)
        .single();

      console.log('📋 Assignment lookup:', { assignment, assignmentError });

      if (assignmentError || !assignment) {
        console.error('❌ Assignment not found');
        if (attachment.owner_id !== profile.id) {
          return NextResponse.json({ 
            message: 'Forbidden: Insufficient permissions for assignment.' 
          }, { status: 403 });
        }
      } else {
        // Check if user is member of the classroom
        const { data: membership, error: membershipError } = await supabase
          .from('classroom_member')
          .select('role')
          .eq('classroom_id', assignment.classroom_id)
          .eq('user_id', profile.id)
          .single();

        console.log('👥 Membership lookup:', { 
          membership, 
          membershipError,
          classroomId: assignment.classroom_id,
          profileId: profile.id
        });

        if (membershipError || !membership) {
          console.error('❌ Not a member of classroom');
          return NextResponse.json({ 
            message: 'Forbidden: Not a member of this classroom.' 
          }, { status: 403 });
        }

        console.log('✅ Access granted. User is a classroom member with role:', membership.role);
      }
    } else {
      // For other context types, only owner can access
      console.log('🔍 Other context type:', attachment.context_type);
      if (attachment.owner_id !== profile.id) {
        console.error('❌ Access denied: Not the owner for context type:', attachment.context_type);
        return NextResponse.json({ 
          message: `Forbidden: Insufficient permissions for ${attachment.context_type}.` 
        }, { status: 403 });
      }
      console.log('✅ Access granted. User is the owner.');
    }

    console.log('🎉 Permission check passed, generating URL...');

    // Generate signed URL based on visibility
    if (attachment.visibility === 'public') {
      // For public files, return direct public URL
      const { data: { publicUrl } } = supabase.storage
        .from(attachment.bucket)
        .getPublicUrl(attachment.path);
      
      // Redirect to the public URL
      return NextResponse.redirect(publicUrl);
    } else {
      // For private files, generate signed URL (24 hours expiration)
      const { data, error: signedUrlError } = await supabase.storage
        .from(attachment.bucket)
        .createSignedUrl(attachment.path, 24 * 60 * 60); // 24 hours

      if (signedUrlError || !data?.signedUrl) {
        console.error('Error creating signed URL:', signedUrlError);
        return NextResponse.json({ error: 'Failed to generate access URL' }, { status: 500 });
      }

      // Redirect to the signed URL
      return NextResponse.redirect(data.signedUrl);
    }

  } catch (error: any) {
    console.error('Error in GET /api/attachment/[id]:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error?.message || 'Unknown error'
    }, { status: 500 });
  }
}
