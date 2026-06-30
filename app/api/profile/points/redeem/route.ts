import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';
import { authorize } from '@/utils/auth/server-guard';

// POST /api/profile/points/redeem - 使用积分兑换课程
export async function POST(request: NextRequest) {
  try {
    const authResult = await authorize('student');
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    
    const { user } = authResult;
    const client = await createServerClient();
    const body = await request.json();
    const { courseId } = body;

    if (!courseId) {
      return NextResponse.json({ error: 'Course ID is required' }, { status: 400 });
    }

    const userId = user.profile?.id || user.id;

    // 开始数据库事务
    const courseColumn = /^\d+$/.test(String(courseId)) ? 'id' : 'public_id';
    const { data: course, error: courseError } = await client
      .from('course')
      .select('id')
      .eq(courseColumn, courseId)
      .eq('is_deleted', false)
      .maybeSingle();

    if (courseError || !course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    const { data: transactionResult, error: transactionError } = await client.rpc('redeem_course_with_points', {
      p_user_id: userId,
      p_course_id: course.id
    });

    if (transactionError) {
      console.error('Transaction error:', transactionError);
      return NextResponse.json({ 
        error: transactionError.message || 'Failed to redeem course' 
      }, { status: 400 });
    }

    if (transactionResult?.error) {
      return NextResponse.json(
        { error: transactionResult.error, data: transactionResult },
        { status: transactionResult.error === 'Insufficient points' ? 409 : 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Course redeemed successfully',
      data: transactionResult
    });

  } catch (error) {
    console.error('Error in POST /api/profile/points/redeem:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
