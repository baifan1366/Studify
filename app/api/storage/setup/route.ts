import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/server';
import { authorize } from '@/utils/auth/server-guard';
export const runtime = 'nodejs';

// 设置 Supabase Storage 桶的 API 端点
export async function POST(request: NextRequest) {
  try {
    // 只允许开发环境或具有管理员权限的用户执行
    if (process.env.NODE_ENV !== 'development') {
      try {
        const authResult = await authorize('tutor'); // 至少需要导师权限
        if (authResult instanceof NextResponse) {
          return authResult;
        }
      } catch (authError) {
        return NextResponse.json({ 
          error: 'Unauthorized. This endpoint requires tutor permissions or development environment.',
          details: 'Storage setup is restricted for security reasons.'
        }, { status: 403 });
      }
    }

    const supabase = await createAdminClient();

    // 检查现有桶
    const { data: bucketList, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('Error listing buckets:', listError);
      return NextResponse.json({ error: 'Failed to list buckets' }, { status: 500 });
    }

    console.log('📋 Current buckets:', bucketList?.map(b => b.name) || []);

    // 需要创建的桶配置
    const requiredBuckets = [
      {
        name: 'classroom-attachment',
        config: {
          public: false,
          allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml'],
          fileSizeLimit: 10485760 // 10MB
        }
      },
      {
        name: 'user-avatars',
        config: {
          public: true,
          allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/webp'],
          fileSizeLimit: 5242880 // 5MB
        }
      },
      {
        name: 'assignment-files',
        config: {
          public: false,
          allowedMimeTypes: ['image/*', 'application/pdf', 'text/*'],
          fileSizeLimit: 52428800 // 50MB
        }
      }
    ];

    const results = [];

    for (const bucket of requiredBuckets) {
      const exists = bucketList?.some(b => b.name === bucket.name);
      
      if (!exists) {
        console.log(`🔧 Creating bucket: ${bucket.name}`);
        const { data: createData, error: createError } = await supabase.storage
          .createBucket(bucket.name, bucket.config);

        if (createError) {
          console.error(`❌ Failed to create ${bucket.name}:`, createError);
          results.push({
            bucket: bucket.name,
            status: 'error',
            error: createError.message
          });
        } else {
          console.log(`✅ Successfully created ${bucket.name}`);
          results.push({
            bucket: bucket.name,
            status: 'created',
            data: createData
          });
        }
      } else {
        console.log(`✅ Bucket ${bucket.name} already exists`);
        results.push({
          bucket: bucket.name,
          status: 'exists'
        });
      }
    }

    // 再次获取桶列表以确认
    const { data: updatedBucketList } = await supabase.storage.listBuckets();
    
    return NextResponse.json({
      success: true,
      message: 'Storage setup completed',
      results,
      buckets: updatedBucketList?.map(b => ({
        name: b.name,
        id: b.id,
        public: b.public,
        created_at: b.created_at
      })) || []
    });

  } catch (error) {
    console.error('Error in POST /api/storage/setup:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// 获取当前存储桶状态
export async function GET() {
  try {
    const supabase = await createAdminClient();

    const { data: bucketList, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      return NextResponse.json({ error: 'Failed to list buckets' }, { status: 500 });
    }

    return NextResponse.json({
      buckets: bucketList?.map(b => ({
        name: b.name,
        id: b.id,
        public: b.public,
        created_at: b.created_at
      })) || [],
      total: bucketList?.length || 0
    });

  } catch (error) {
    console.error('Error in GET /api/storage/setup:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
