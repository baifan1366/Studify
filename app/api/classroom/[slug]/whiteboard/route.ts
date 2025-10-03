import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/server';
import { authorize } from '@/utils/auth/server-guard';
import redis from '@/utils/redis/redis';
import { STORAGE_PATHS, STORAGE_BUCKETS } from '@/lib/storage-paths';
export const runtime = 'nodejs';

// 确保使用服务角色客户端
const getStorageClient = async () => {
  const supabase = await createAdminClient();
  return supabase;
};

// 缓存过期时间：在 session 活跃期间保持缓存 (4小时)
const CACHE_EXPIRATION_SECONDS = 4 * 60 * 60; // 4小时

// GET - Load whiteboard from bucket storage
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const authResult = await authorize(['student', 'tutor']);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    const supabase = await createAdminClient();

    // Get user's profile ID for membership verification
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Get classroom and verify membership
    const { data: classroom, error: classroomError } = await supabase
      .from('classroom')
      .select('id')
      .eq('slug', slug)
      .single();

    if (classroomError || !classroom) {
      return NextResponse.json({ error: 'Classroom not found' }, { status: 404 });
    }

    const { data: membership } = await supabase
      .from('classroom_member')
      .select('id')
      .eq('classroom_id', classroom.id)
      .eq('user_id', profile.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get session ID from query params
    const url = new URL(request.url);
    const sessionId = url.searchParams.get('session_id');

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    // 1. 定义缓存键 (Cache Key)
    const cacheKey = `whiteboard:${slug}:${sessionId}`;

    try {
      // 2. 首先尝试从 Redis 获取数据
      const cachedData = await redis.get(cacheKey);
      if (cachedData) {
        console.log('🎯 Cache HIT for key:', cacheKey);
        // 如果命中，直接返回缓存的数据
        const parsedData = typeof cachedData === 'string' ? JSON.parse(cachedData) : cachedData;
        return NextResponse.json(parsedData);
      }

      console.log('❌ Cache MISS for key:', cacheKey);

      // 3. 缓存未命中，从 Supabase Storage 查询
      // Skip bucket existence check due to RLS policy restrictions
      console.log(`📂 Using existing ${STORAGE_BUCKETS.CLASSROOM_ATTACHMENT} bucket (skipping existence check)`);

      // Try to load whiteboard from bucket
      const filePath = STORAGE_PATHS.whiteboard(slug, sessionId);
      
      // First try main bucket
      let fileData = null;
      let successfulBucket = null;
      
      try {
        const result = await supabase.storage
          .from(STORAGE_BUCKETS.CLASSROOM_ATTACHMENT)
          .download(filePath);
        if (result.data) {
          fileData = result.data;
          successfulBucket = STORAGE_BUCKETS.CLASSROOM_ATTACHMENT;
        }
      } catch (err) {
        console.log(`${STORAGE_BUCKETS.CLASSROOM_ATTACHMENT} bucket failed, trying alternatives...`);
      }
      
      // Try alternative buckets if main one failed
      if (!fileData) {
        const alternativeBuckets = ['attachments', 'uploads', 'files', 'classroom_attachments'];
        for (const bucketName of alternativeBuckets) {
          try {
            const result = await supabase.storage
              .from(bucketName)
              .download(filePath);
            if (result.data) {
              fileData = result.data;
              successfulBucket = bucketName;
              console.log(`Found whiteboard in bucket: ${bucketName}`);
              break;
            }
          } catch (err) {
            console.log(`Failed to load from ${bucketName}`);
          }
        }
      }

      if (fileData) {
        // Convert blob to base64
        const arrayBuffer = await fileData.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');
        const imageData = `data:image/png;base64,${base64}`;

        console.log(`Successfully loaded whiteboard from ${successfulBucket}`);

        // 4. 构建返回数据
        const whiteboardData = [{
          id: sessionId,
          image_data: imageData,
          width: 800,
          height: 600,
          created_at: new Date().toISOString(),
          bucket: successfulBucket
        }];

        // 5. 将从存储获得的数据存入 Redis 缓存
        try {
          await redis.set(cacheKey, JSON.stringify(whiteboardData), { ex: CACHE_EXPIRATION_SECONDS });
          console.log('✅ Data cached successfully for key:', cacheKey);
        } catch (cacheError) {
          console.error('⚠️ Failed to cache data:', cacheError);
          // 缓存失败不影响数据返回
        }

        return NextResponse.json(whiteboardData);
      }
    } catch (error) {
      console.log('No existing whiteboard found, returning empty:', error);
    }

    // Return empty array if no whiteboard found
    return NextResponse.json([]);

  } catch (error) {
    console.error('Error in GET /api/classroom/[slug]/whiteboard:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Save whiteboard to bucket storage
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    
    // TEMPORARY: Skip authentication to test storage
    console.log('⚠️ DEBUGGING MODE: Skipping authentication for storage test');
    
    /*
    const authResult = await authorize(['student', 'tutor']); // 允许所有成员保存白板
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

    // Get classroom and verify membership
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
      .select('id, role')
      .eq('classroom_id', classroom.id)
      .eq('user_id', profile.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    */
    
    const supabase = await createAdminClient();

    // Parse request body
    const body = await request.json();
    const { sessionId, imageData, width, height, metadata } = body;

    if (!sessionId || !imageData) {
      return NextResponse.json({ error: 'Session ID and image data are required' }, { status: 400 });
    }

    // 1. 定义缓存键 (与 GET 一致)
    const cacheKey = `whiteboard:${slug}:${sessionId}`;

    try {
      // Convert base64 image to blob
      const base64Data = imageData.replace(/^data:image\/png;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      
      console.log('Attempting to save whiteboard:', {
        slug,
        sessionId,
        bufferSize: buffer.length,
        contentType: 'image/png'
      });
      
      // Save to bucket
      const filePath = STORAGE_PATHS.whiteboard(slug, sessionId);
      console.log('Storage path:', filePath);
      
      // Skip bucket existence check due to RLS policy restrictions
      // Assume whiteboard bucket exists and proceed with upload
      console.log(`📂 Using existing ${STORAGE_BUCKETS.CLASSROOM_ATTACHMENT} bucket (skipping existence check)`);
      
      // Use admin client to bypass RLS policies
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKETS.CLASSROOM_ATTACHMENT)
        .upload(filePath, buffer, {
          contentType: 'image/png',
          upsert: true, // 覆盖已存在的文件
          duplex: 'half'
        });

      if (uploadError) {
        console.error('Detailed bucket upload error:', {
          error: uploadError,
          message: uploadError.message,
          name: uploadError.name
        });
        
        // Try alternative bucket name if classroom-attachments doesn't exist
        console.log('Trying alternative bucket names...');
        
        // Try common bucket names
        const alternativeBuckets = ['attachments', 'uploads', 'files', 'classroom_attachments'];
        let alternativeSuccess = false;
        
        for (const bucketName of alternativeBuckets) {
          try {
            const { data: altData, error: altError } = await supabase.storage
              .from(bucketName)
              .upload(filePath, buffer, {
                contentType: 'image/png',
                upsert: true
              });
            
            if (!altError && altData) {
              console.log(`Successfully uploaded to alternative bucket: ${bucketName}`);
              alternativeSuccess = true;
              
              // 3. 成功保存到存储后，使缓存失效 (清除缓存)
              try {
                await redis.del(cacheKey);
                console.log('✅ Cache INVALIDATED for key:', cacheKey);
              } catch (cacheError) {
                console.error('⚠️ Failed to invalidate cache:', cacheError);
                // 缓存失效失败不影响数据保存成功响应
              }
              
              return NextResponse.json({ 
                success: true, 
                message: 'Whiteboard saved successfully',
                path: altData.path,
                bucket: bucketName
              });
            }
          } catch (altErr) {
            console.log(`Failed to upload to ${bucketName}:`, altErr);
          }
        }
        
        if (!alternativeSuccess) {
          return NextResponse.json({ 
            error: 'Failed to save whiteboard - storage bucket access denied',
            details: uploadError.message,
            suggestion: 'Check Supabase RLS policies for storage access'
          }, { status: 500 });
        }
      } else {
        console.log('Whiteboard saved to bucket successfully:', uploadData.path);
        
        // 3. 成功保存到存储后，使缓存失效 (清除缓存)
        // 这是最关键的一步，确保数据一致性
        try {
          await redis.del(cacheKey);
          console.log('✅ Cache INVALIDATED for key:', cacheKey);
        } catch (cacheError) {
          console.error('⚠️ Failed to invalidate cache:', cacheError);
          // 缓存失效失败不影响数据保存成功响应
        }
        
        return NextResponse.json({ 
          success: true, 
          message: 'Whiteboard saved successfully',
          path: uploadData.path
        });
      }

    } catch (error) {
      console.error('Error processing whiteboard save:', error);
      return NextResponse.json({ 
        error: 'Failed to process whiteboard data',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Error in POST /api/classroom/[slug]/whiteboard:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - 清除特定 session 的白板缓存 (用于 session 结束时)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const authResult = await authorize(['student', 'tutor']);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const url = new URL(request.url);
    const sessionId = url.searchParams.get('session_id');

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    // 定义缓存键
    const cacheKey = `whiteboard:${slug}:${sessionId}`;

    try {
      // 删除缓存
      const result = await redis.del(cacheKey);
      
      if (result === 1) {
        console.log('🗑️ Cache successfully deleted for key:', cacheKey);
        return NextResponse.json({ 
          success: true, 
          message: 'Whiteboard cache cleared successfully',
          cacheKey 
        });
      } else {
        console.log('🤷 No cache found to delete for key:', cacheKey);
        return NextResponse.json({ 
          success: true, 
          message: 'No cache found (already cleared)',
          cacheKey 
        });
      }
    } catch (error) {
      console.error('❌ Error clearing cache:', error);
      return NextResponse.json({ 
        error: 'Failed to clear cache',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Error in DELETE /api/classroom/[slug]/whiteboard:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
