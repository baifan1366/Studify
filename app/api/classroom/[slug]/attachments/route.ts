import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/server';
import { authorize } from '@/utils/auth/server-guard';

// GET - List attachments for a classroom
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const authResult = await authorize('student');
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

    // Get classroom
    const { data: classroom, error: classroomError } = await supabase
      .from('classroom')
      .select('id')
      .eq('slug', slug)
      .single();

    if (classroomError || !classroom) {
      return NextResponse.json({ error: 'Classroom not found' }, { status: 404 });
    }

    // Check if user is a member of the classroom
    const { data: membership } = await supabase
      .from('classroom_member')
      .select('id')
      .eq('classroom_id', classroom.id)
      .eq('user_id', profile.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get attachments for this classroom
    const { data: attachments, error: attachmentsError } = await supabase
      .from('classroom_attachments')
      .select(`
        id,
        public_id,
        file_url,
        file_name,
        mime_type,
        size_bytes,
        created_at,
        profiles!classroom_attachments_owner_id_fkey (
          display_name,
          avatar_url
        )
      `)
      .eq('context_type', 'classroom')
      .eq('context_id', classroom.id)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    if (attachmentsError) {
      console.error('Error fetching attachments:', attachmentsError);
      return NextResponse.json({ error: 'Failed to fetch attachments' }, { status: 500 });
    }

    return NextResponse.json(attachments || []);

  } catch (error) {
    console.error('Error in GET /api/classroom/[slug]/attachments:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Upload attachment to classroom
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const authResult = await authorize('student');
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

    // Get classroom
    const { data: classroom, error: classroomError } = await supabase
      .from('classroom')
      .select('id')
      .eq('slug', slug)
      .single();

    if (classroomError || !classroom) {
      console.error('Classroom not found for slug:', slug);
      return NextResponse.json({ error: 'Classroom not found' }, { status: 404 });
    }

    console.log('POST /attachments - Classroom found:', classroom.id);
    console.log('Checking membership for user profile:', profile.id);

    // Check if user is a member of the classroom
    const { data: membership, error: membershipError } = await supabase
      .from('classroom_member')
      .select('id')
      .eq('classroom_id', classroom.id)
      .eq('user_id', profile.id)
      .single();

    if (membershipError) {
      console.error('Membership query error:', membershipError);
    }

    if (!membership) {
      console.error('User is not a member of the classroom');
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    console.log('User membership verified:', membership.id);

    // Parse form data - expecting actual file
    const formData = await request.formData();
    console.log('FormData keys:', Array.from(formData.keys()));
    const file = formData.get('file') as File;

    if (!file) {
      console.error('No file in formData');
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    console.log('File received:', {
      name: file.name,
      type: file.type,
      size: file.size
    });

    // Validate file size (100MB limit)
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File too large. Maximum size is 100MB.' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = [
      'image/', 'video/', 'audio/', 'application/pdf', 
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/', 'application/zip', 'application/x-rar-compressed'
    ];

    const isAllowedType = allowedTypes.some(type => file.type.startsWith(type));
    if (!isAllowedType) {
      return NextResponse.json({ error: 'File type not supported' }, { status: 400 });
    }

    // Generate unique filename
    const fileExtension = file.name.split('.').pop();
    const uniqueFilename = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExtension}`;

    // First, let's try to create a bucket if none exists
    const bucketName = 'classroom-files';
    let uploadData: any = null;
    let uploadError: any = null;
    
    console.log('Attempting to upload file to Supabase Storage...');
    
    // Check if bucket exists
    const { data: buckets } = await supabase.storage.listBuckets();
    console.log('Available buckets:', buckets?.map(b => b.name));
    
    const bucketExists = buckets?.some(b => b.name === bucketName);
    
    if (!bucketExists) {
      console.log(`Creating bucket: ${bucketName}`);
      const { error: createError } = await supabase.storage.createBucket(bucketName, {
        public: true,
        allowedMimeTypes: undefined,
        fileSizeLimit: 104857600 // 100MB
      });
      
      if (createError) {
        console.error('Failed to create bucket:', createError);
        // Try to use the first available bucket
        if (buckets && buckets.length > 0) {
          console.log(`Using existing bucket: ${buckets[0].name}`);
        }
      } else {
        console.log(`Successfully created bucket: ${bucketName}`);
      }
    }
    
    // Now try to upload to the bucket
    const targetBucket = bucketExists || !buckets?.length ? bucketName : buckets[0].name;
    console.log(`Uploading to bucket: ${targetBucket}, Path:`, `classrooms/${classroom.id}/${uniqueFilename}`);
    
    const result = await supabase.storage
      .from(targetBucket)
      .upload(`classrooms/${classroom.id}/${uniqueFilename}`, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (!result.error) {
      uploadData = result.data;
      console.log(`Successfully uploaded to bucket: ${targetBucket}`);
    } else {
      uploadError = result.error;
      console.log(`Failed to upload:`, result.error.message);
    }
    
    const successfulBucket = targetBucket;

    if (!uploadData) {
      console.error('All storage buckets failed. Last error:', uploadError);
      
      // Try to create bucket if it doesn't exist
      if (uploadError?.message?.includes('bucket') || (uploadError as any)?.statusCode === 404) {
        return NextResponse.json({ 
          error: 'Failed to create or access storage bucket. Please check Supabase Storage configuration.',
          details: uploadError.message,
          tried_bucket: targetBucket
        }, { status: 500 });
      }
      
      return NextResponse.json({ 
        error: 'Failed to upload file', 
        details: uploadError?.message || 'All storage buckets failed'
      }, { status: 500 });
    }

    console.log('File uploaded successfully to bucket:', successfulBucket);
    console.log('Upload data:', uploadData);

    // Get public URL using the successful bucket
    const { data: { publicUrl } } = supabase.storage
      .from(successfulBucket)
      .getPublicUrl(uploadData.path);

    // Save attachment record to database
    const { data: attachment, error: attachmentError } = await supabase
      .from('classroom_attachments')
      .insert({
        owner_id: profile.id,
        context_type: 'classroom',
        context_id: classroom.id,
        file_url: publicUrl,
        file_name: file.name,
        mime_type: file.type,
        size_bytes: file.size
      })
      .select(`
        id,
        public_id,
        file_url,
        file_name,
        mime_type,
        size_bytes,
        created_at,
        profiles!classroom_attachments_owner_id_fkey (
          display_name,
          avatar_url
        )
      `)
      .single();

    if (attachmentError) {
      console.error('Error saving attachment to database:', attachmentError);
      console.error('Attachment error details:', {
        message: attachmentError.message,
        details: attachmentError.details,
        hint: attachmentError.hint,
        code: attachmentError.code
      });
      
      // Clean up uploaded file from Supabase Storage
      await supabase.storage.from(successfulBucket).remove([uploadData.path]);
      
      return NextResponse.json({ 
        error: 'Failed to save attachment record', 
        details: attachmentError.message 
      }, { status: 500 });
    }

    console.log('Successfully saved attachment:', attachment);
    return NextResponse.json(attachment);

  } catch (error: any) {
    console.error('Error in POST /api/classroom/[slug]/attachments:', error);
    console.error('Error stack:', error?.stack);
    console.error('Error details:', {
      message: error?.message,
      name: error?.name,
      code: error?.code
    });
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error?.message || 'Unknown error'
    }, { status: 500 });
  }
}
