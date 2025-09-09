import { NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

export async function GET(req: Request) {
  const supabase = await createServerClient();

  // 获取当前用户
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 如果用户已登录，检查他们是否已注册任何课程
  let hasEnrolledCourses = false;
  let userTags: string[] = [];
  
  if (user) {
    const { count } = await supabase
      .from('courses.enrollment')
      .select('course_id', { count: 'exact', head: true })
      .eq('user_id', user.id);
    
    hasEnrolledCourses = (count || 0) > 0;

    // 如果用户已注册课程，获取这些课程的标签以用于推荐
    if (hasEnrolledCourses) {
      const { data: enrolledCourses } = await supabase
        .from('courses.enrollment')
        .select(`
          course:course_id (
            tags
          )
        `)
        .eq('user_id', user.id)
        .limit(5);

      // 收集所有标签
      userTags = enrolledCourses?.reduce((tags: string[], enrollment: any) => {
        return tags.concat(enrollment.course && enrollment.course.tags ? enrollment.course.tags : []);
      }, [] as string[]) || [];
    }
  }

  // 根据用户状态决定推荐策略
  let recommendedCourses;
  
  if (!user || !hasEnrolledCourses) {
    // 未登录用户或未注册任何课程的用户：显示热门课程
    const { data, error } = await supabase
      .from('courses.course')
      .select(`
        id,
        title,
        description,
        tags,
        price_cents,
        currency,
        owner:owner_id (user_id, full_name, avatar_url),
        visibility
      `)
      .eq('visibility', 'public')
      .order('id', { ascending: false }) // 这里应该是按注册人数排序，但示例中简化为最新课程
      .limit(6);

    if (error) {
      console.error('Error fetching popular courses:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    recommendedCourses = data;
  } else {
    // 已注册课程的用户：基于他们的兴趣推荐类似课程
    // 使用收集到的标签进行推荐
    const { data, error } = await supabase
      .from('courses.course')
      .select(`
        id,
        title,
        description,
        tags,
        price_cents,
        currency,
        owner:owner_id (user_id, full_name, avatar_url),
        visibility
      `)
      .eq('visibility', 'public')
      .not('id', 'in', 
        supabase
          .from('courses.enrollment')
          .select('course_id')
          .eq('user_id', user.id)
      );

    if (error) {
      console.error('Error fetching recommended courses:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // 根据标签相似度对课程进行排序
    recommendedCourses = data
      .map(course => {
        // 计算标签匹配度
        const courseTags = course.tags || [];
        const matchingTags = courseTags.filter((tag: string) => userTags.includes(tag));
        const matchScore = matchingTags.length;
        
        return { ...course, matchScore };
      })
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 6);
  }

  // 获取每个课程的额外信息
  const coursesWithDetails = await Promise.all(
    recommendedCourses.map(async (course) => {
      // 获取课程的总课时数
      const { count: totalLessons } = await supabase
        .from('courses.lesson')
        .select('id', { count: 'exact', head: true })
        .eq('course_id', course.id);

      // 获取课程的学生数量
      const { count: studentCount } = await supabase
        .from('courses.enrollment')
        .select('user_id', { count: 'exact', head: true })
        .eq('course_id', course.id)
        .eq('role', 'student');

      // 获取课程的平均评分
      const { data: ratings } = await supabase
        .from('courses.reviews')
        .select('rating')
        .eq('course_id', course.id);

      const averageRating = ratings && ratings.length > 0
        ? ratings.reduce((sum, item) => sum + item.rating, 0) / ratings.length
        : 0;

      // 随机生成一个颜色（实际应用中可能会从课程数据中获取）
      const colors = [
        'from-blue-500 to-cyan-500',
        'from-purple-500 to-pink-500',
        'from-green-500 to-teal-500',
        'from-orange-500 to-red-500'
      ];
      const color = colors[Math.floor(Math.random() * colors.length)];

      return {
        id: course.id,
        title: course.title,
        description: course.description,
        instructor: course.owner && course.owner[0]?.full_name || 'Unknown Instructor',
        instructorAvatar: course.owner && course.owner[0]?.avatar_url,
        totalLessons: totalLessons || 0,
        studentCount: studentCount || 0,
        rating: parseFloat(averageRating.toFixed(1)),
        price: course.price_cents / 100,
        currency: course.currency,
        isFree: course.price_cents === 0,
        color,
        tags: course.tags || [],
        // 估算课程时长（假设每课时30分钟）
        duration: `${Math.ceil((totalLessons || 0) * 30 / 60)} hours`,
        // 添加推荐原因
        recommendReason: hasEnrolledCourses && (course as any).matchScore > 0 
          ? 'Based on your interests' 
          : 'Popular among students'
      };
    })
  );

  return NextResponse.json(coursesWithDetails);
}