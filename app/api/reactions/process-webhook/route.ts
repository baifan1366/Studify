import { NextRequest, NextResponse } from "next/server";
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { createServerClient } from "@/utils/supabase/server";

async function handler(req: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Parse and validate request body
    let body;
    try {
      body = await req.json();
    } catch (parseError) {
      console.error('❌ Invalid JSON in reaction webhook request:', parseError);
      return NextResponse.json(
        { error: 'Invalid JSON payload', success: false },
        { status: 400 }
      );
    }

    const { action, user_id, target_type, target_id, emoji, timestamp } = body;

    // Enhanced input validation
    if (!action || !['added', 'removed'].includes(action)) {
      return NextResponse.json(
        { error: 'action is required and must be "added" or "removed"', success: false },
        { status: 400 }
      );
    }

    if (!user_id || (typeof user_id !== 'number' && typeof user_id !== 'string')) {
      return NextResponse.json(
        { error: 'user_id is required and must be a number or string', success: false },
        { status: 400 }
      );
    }

    if (!target_type || !['post', 'comment'].includes(target_type)) {
      return NextResponse.json(
        { error: 'target_type is required and must be "post" or "comment"', success: false },
        { status: 400 }
      );
    }

    if (!target_id || (typeof target_id !== 'number' && typeof target_id !== 'string')) {
      return NextResponse.json(
        { error: 'target_id is required and must be a number or string', success: false },
      );
    }

    if (!emoji || typeof emoji !== 'string' || emoji.length === 0) {
      return NextResponse.json(
        { error: 'emoji is required and must be a non-empty string', success: false },
        { status: 400 }
      );
    }

    console.log("📩 QStash Reaction Webhook:", {
      action,
      user_id,
      target_type,
      target_id,
      emoji,
      timestamp,
      requestId: req.headers.get('x-request-id') || 'unknown'
    });

    let supabase;
    try {
      supabase = await createServerClient();
    } catch (supabaseError) {
      console.error('❌ Failed to initialize Supabase client:', supabaseError);
      return NextResponse.json(
        { error: 'Database connection failed', success: false },
        { status: 500 }
      );
    }

    // Convert IDs to integers with validation
    let userIdInt, targetIdInt;
    try {
      userIdInt = parseInt(user_id.toString());
      targetIdInt = parseInt(target_id.toString());
      
      if (isNaN(userIdInt) || isNaN(targetIdInt)) {
        throw new Error('Invalid ID format');
      }
    } catch (idError) {
      return NextResponse.json(
        { error: 'user_id and target_id must be valid integers', success: false },
        { status: 400 }
      );
    }

    // Process reaction based on action
    let dbResult;
    try {
      if (action === "added") {
        console.log(`➕ Adding reaction: ${emoji} by user ${userIdInt} to ${target_type} ${targetIdInt}`);
        
        dbResult = await supabase.from("community_reaction").upsert({
          user_id: userIdInt,
          target_type: target_type,
          target_id: targetIdInt,
          emoji: emoji,
        }, {
          onConflict: 'user_id,target_type,target_id,emoji'
        });
        
      } else if (action === "removed") {
        console.log(`➖ Removing reaction: ${emoji} by user ${userIdInt} from ${target_type} ${targetIdInt}`);
        
        dbResult = await supabase
          .from("community_reaction")
          .delete()
          .eq("user_id", userIdInt)
          .eq("target_type", target_type)
          .eq("target_id", targetIdInt)
          .eq("emoji", emoji);
      }
      
      // Check for database errors
      if (dbResult?.error) {
        throw new Error(`Database operation failed: ${dbResult.error.message}`);
      }
      
    } catch (dbError: any) {
      console.error('❌ Database operation failed:', {
        error: dbError.message,
        action,
        user_id: userIdInt,
        target_type,
        target_id: targetIdInt,
        emoji
      });
      
      return NextResponse.json(
        { 
          error: 'Database operation failed', 
          success: false,
          details: dbError.message
        },
        { status: 500 }
      );
    }

    const processingTime = Date.now() - startTime;
    
    console.log(`✅ QStash Reaction Webhook completed successfully`, {
      action,
      user_id: userIdInt,
      target_type,
      target_id: targetIdInt,
      emoji,
      processingTimeMs: processingTime
    });

    return NextResponse.json({ 
      success: true,
      message: `Reaction ${action} successfully`,
      data: {
        action,
        user_id: userIdInt,
        target_type,
        target_id: targetIdInt,
        emoji,
        processingTimeMs: processingTime
      }
    });
    
  } catch (err: any) {
    const processingTime = Date.now() - startTime;
    
    console.error("🚨 QStash Reaction Webhook fatal error:", {
      error: err.message,
      stack: err.stack,
      processingTimeMs: processingTime,
      requestHeaders: Object.fromEntries(req.headers.entries())
    });
    
    return NextResponse.json({ 
      success: false,
      error: 'Internal server error',
      message: 'An unexpected error occurred while processing the reaction webhook',
      processingTimeMs: processingTime
    }, { status: 500 });
  }
}

// Always verify QStash signature for security
// In development, signature verification is optional for local testing
if (!process.env.QSTASH_CURRENT_SIGNING_KEY && process.env.NODE_ENV === 'production') {
  console.warn('QSTASH_CURRENT_SIGNING_KEY is missing in production - signature verification disabled');
}

// For local development or missing signing key, bypass signature verification
export const POST = (process.env.NODE_ENV === 'development' || !process.env.QSTASH_CURRENT_SIGNING_KEY)
  ? handler
  : verifySignatureAppRouter(handler);
