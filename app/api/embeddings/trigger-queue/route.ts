import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Helper function to queue content for embedding
async function queueContent(contentType: string, contentId: number, priority: number = 5) {
  try {
    // Extract content text based on type
    let contentText = '';
    
    switch (contentType) {
      case 'profile':
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name, full_name, bio, role')
          .eq('id', contentId)
          .eq('is_deleted', false)
          .single();
        
        if (profile) {
          contentText = [
            profile.display_name,
            profile.full_name,
            profile.bio,
            profile.role
          ].filter(Boolean).join(' ');
        }
        break;
        
      case 'course':
        const { data: course } = await supabase
          .from('course')
          .select('title, description, category, tags, requirements, learning_objectives')
          .eq('id', contentId)
          .eq('is_deleted', false)
          .single();
        
        if (course) {
          contentText = [
            course.title,
            course.description,
            course.category,
            Array.isArray(course.tags) ? course.tags.join(' ') : '',
            Array.isArray(course.requirements) ? course.requirements.join(' ') : '',
            Array.isArray(course.learning_objectives) ? course.learning_objectives.join(' ') : ''
          ].filter(Boolean).join(' ');
        }
        break;
        
      case 'post':
        const { data: post } = await supabase
          .from('community_post')
          .select('title, body')
          .eq('id', contentId)
          .eq('is_deleted', false)
          .single();
        
        if (post) {
          contentText = [post.title, post.body].filter(Boolean).join(' ');
        }
        break;
        
      case 'comment':
        const { data: comment } = await supabase
          .from('community_comment')
          .select('body')
          .eq('id', contentId)
          .eq('is_deleted', false)
          .single();
        
        if (comment) {
          contentText = comment.body || '';
        }
        break;
        
      case 'lesson':
        const { data: lesson } = await supabase
          .from('course_lesson')
          .select('title, description, transcript')
          .eq('id', contentId)
          .eq('is_deleted', false)
          .single();
        
        if (lesson) {
          contentText = [
            lesson.title,
            lesson.description,
            lesson.transcript
          ].filter(Boolean).join(' ');
        }
        break;
    }
    
    if (!contentText.trim()) {
      return false;
    }
    
    // Generate content hash
    const contentHash = Buffer.from(contentText).toString('base64');
    
    // Insert into embedding_queue
    const { error } = await supabase
      .from('embedding_queue')
      .upsert({
        content_type: contentType,
        content_id: contentId,
        content_text: contentText,
        content_hash: contentHash,
        priority: priority,
        status: 'queued',
        retry_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'content_type,content_id'
      });
    
    return !error;
  } catch (error) {
    console.error(`Error queuing ${contentType} ${contentId}:`, error);
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { contentType, contentId, priority = 5 } = await request.json();
    
    if (!contentType || !contentId) {
      return NextResponse.json(
        { error: 'contentType and contentId are required' },
        { status: 400 }
      );
    }
    
    console.log(`📝 Manually queuing ${contentType} ${contentId} for embedding...`);
    
    const success = await queueContent(contentType, contentId, priority);
    
    if (success) {
      console.log(`✅ Successfully queued ${contentType} ${contentId}`);
      
      // Trigger queue monitor to process immediately
      try {
        await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/embeddings/queue-monitor`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ trigger: 'manual' })
        });
      } catch (monitorError) {
        console.log('Queue monitor trigger failed, but item is queued');
      }
      
      return NextResponse.json({
        success: true,
        message: `Successfully queued ${contentType} ${contentId} for embedding`
      });
    } else {
      return NextResponse.json(
        { error: 'Failed to queue content for embedding' },
        { status: 500 }
      );
    }
    
  } catch (error) {
    console.error('Error in trigger-queue:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Batch queue multiple items
export async function PUT(request: NextRequest) {
  try {
    const { items } = await request.json();
    
    if (!Array.isArray(items)) {
      return NextResponse.json(
        { error: 'items must be an array' },
        { status: 400 }
      );
    }
    
    console.log(`📦 Batch queuing ${items.length} items for embedding...`);
    
    const results = await Promise.allSettled(
      items.map(item => queueContent(item.contentType, item.contentId, item.priority))
    );
    
    const successful = results.filter(r => r.status === 'fulfilled' && r.value).length;
    const failed = results.length - successful;
    
    console.log(`✅ Batch queue results: ${successful} successful, ${failed} failed`);
    
    // Trigger queue monitor to process immediately
    try {
      await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/embeddings/queue-monitor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trigger: 'batch' })
      });
    } catch (monitorError) {
      console.log('Queue monitor trigger failed, but items are queued');
    }
    
    return NextResponse.json({
      success: true,
      message: `Batch queued ${successful} items, ${failed} failed`,
      successful,
      failed,
      total: items.length
    });
    
  } catch (error) {
    console.error('Error in batch trigger-queue:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
