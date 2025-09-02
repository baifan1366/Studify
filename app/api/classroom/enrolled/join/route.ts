import { NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';

export async function POST(req: Request) {
  const supabase = await createServerClient();

  try {
    // 获取请求体
    const { courseId, inviteCode } = await req.json();

    if (!courseId && !inviteCode) {
      return NextResponse.json(
        { error: 'Either courseId or inviteCode is required' },
        { status: 400 }
      );
    }

    // 获取当前用户
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 确定课程ID
    let finalCourseId = courseId;

    // 如果提供了邀请码，通过邀请码查找课程
    if (inviteCode && !courseId) {
      // 这里假设有一个表存储邀请码和课程的关系
      // 实际实现中，可能需要创建这样的表或在课程表中添加邀请码字段
      const { data: courseData, error: inviteError } = await supabase
        .from('courses.course')
        .select('id')
        .eq('invite_code', inviteCode)
        .single();

      if (inviteError || !courseData) {
        return NextResponse.json(
          { error: 'Invalid invite code' },
          { status: 400 }
        );
      }

      finalCourseId = courseData.id;
    }

    // 检查课程是否存在
    const { data: course, error: courseError } = await supabase
      .from('courses.course')
      .select('id, visibility')
      .eq('id', finalCourseId)
      .single();

    if (courseError || !course) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      );
    }

    // 检查课程是否公开可见（除非使用邀请码）
    if (!inviteCode && course.visibility !== 'public') {
      return NextResponse.json(
        { error: 'This course requires an invite code' },
        { status: 403 }
      );
    }

    // 检查用户是否已经注册了该课程
    const { count, error: enrollmentCheckError } = await supabase
      .from('courses.enrollment')
      .select('course_id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('course_id', finalCourseId);

    if (enrollmentCheckError) {
      return NextResponse.json(
        { error: 'Failed to check enrollment status' },
        { status: 500 }
      );
    }

    if (count && count > 0) {
      return NextResponse.json(
        { error: 'You are already enrolled in this course' },
        { status: 400 }
      );
    }

    // 注册课程
    const { error: enrollError } = await supabase
      .from('courses.enrollment')
      .insert({
        user_id: user.id,
        course_id: finalCourseId,
        role: 'student',
        status: 'active',
        started_at: new Date().toISOString()
      });

    if (enrollError) {
      console.error('Error enrolling in course:', enrollError);
      return NextResponse.json(
        { error: 'Failed to enroll in course' },
        { status: 500 }
      );
    }

    // 获取课程详情以返回
    const { data: courseDetails, error: detailsError } = await supabase
      .from('courses.course')
      .select(`
        id,
        title,
        description,
        owner:owner_id (full_name)
      `)
      .eq('id', finalCourseId)
      .single();

    if (detailsError) {
      // 虽然注册成功了，但获取详情失败
      return NextResponse.json(
        { success: true, message: 'Successfully enrolled in course' },
        { status: 200 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Successfully enrolled in ${courseDetails.title}`,
      course: courseDetails
    });
  } catch (error) {
    console.error('Error processing enrollment:', error);
    return NextResponse.json(
      { error: 'Failed to process enrollment request' },
      { status: 500 }
    );
  }
}