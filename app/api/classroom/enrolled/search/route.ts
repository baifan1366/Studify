import { NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';

export async function GET(req: Request) {
  const supabase = await createServerClient();
  const url = new URL(req.url);
  const query = url.searchParams.get('query') || '';
  const category = url.searchParams.get('category');

  // 获取当前用户
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 构建搜索查询
  let courseQuery = supabase
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
      // 排除用户已经注册的课程
      user ? supabase
        .from('courses.enrollment')
        .select('course_id')
        .eq('user_id', user.id)
      : ''
    );

  // 添加全文搜索条件
  if (query) {
    courseQuery = courseQuery.textSearch('search', query, {
      type: 'plain',
      config: 'english'
    });
  }

  // 添加分类筛选
  if (category) {
    courseQuery = courseQuery.contains('tags', [category]);
  }

  // 执行查询
  const { data: courses, error } = await courseQuery
    .order('updated_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('Error searching courses:', error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // 获取每个课程的额外信息
  const coursesWithDetails = await Promise.all(
    courses.map(async (course) => {
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
        duration: `${Math.ceil((totalLessons || 0) * 30 / 60)} hours`
      };
    })
  );

  return NextResponse.json(coursesWithDetails);
}