// Course Data Tool - 调用内部API获取课程相关数据
import { DynamicTool } from "@langchain/core/tools";
import { createClient } from '@supabase/supabase-js';

export const courseDataTool = new DynamicTool({
  name: "get_course_data",
  description: `Get course data from the internal API. Use this when you need specific course information, user enrollments, progress data, or course statistics. 
  Input should be a JSON string with query parameters: {"type": "user_courses|course_details|course_progress", "userId"?: number, "courseId"?: number, "filters"?: object}`,
  func: async (input: string) => {
    try {
      const params = JSON.parse(input);
      const { type, userId, courseId, filters = {} } = params;

      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      switch (type) {
        case 'user_courses':
          if (!userId) {
            return 'Error: userId is required for user_courses query';
          }
          
          const { data: userCourses, error: coursesError } = await supabase
            .from('user_course_enrollments')
            .select(`
              *,
              course:courses(
                id,
                title,
                description,
                difficulty_level,
                estimated_hours,
                instructor_id,
                thumbnail_url,
                created_at
              )
            `)
            .eq('user_id', userId)
            .order('enrolled_at', { ascending: false });

          if (coursesError) {
            return `Error fetching user courses: ${coursesError.message}`;
          }

          return `User ${userId} enrolled courses (${userCourses?.length || 0} total):\n${JSON.stringify(userCourses, null, 2)}`;

        case 'course_details':
          if (!courseId) {
            return 'Error: courseId is required for course_details query';
          }

          const { data: courseDetails, error: detailsError } = await supabase
            .from('courses')
            .select(`
              *,
              course_modules(
                id,
                title,
                description,
                position,
                course_lessons(
                  id,
                  title,
                  lesson_type,
                  duration_minutes,
                  position
                )
              ),
              profiles:instructor_id(
                display_name,
                bio
              )
            `)
            .eq('id', courseId)
            .single();

          if (detailsError) {
            return `Error fetching course details: ${detailsError.message}`;
          }

          return `Course ${courseId} details:\n${JSON.stringify(courseDetails, null, 2)}`;

        case 'course_progress':
          if (!userId || !courseId) {
            return 'Error: Both userId and courseId are required for course_progress query';
          }

          const { data: progressData, error: progressError } = await supabase
            .from('user_course_progress')
            .select(`
              *,
              course_lesson:lesson_id(
                title,
                lesson_type,
                duration_minutes
              )
            `)
            .eq('user_id', userId)
            .eq('course_id', courseId)
            .order('updated_at', { ascending: false });

          if (progressError) {
            return `Error fetching course progress: ${progressError.message}`;
          }

          // Calculate overall progress
          const totalLessons = progressData?.length || 0;
          const completedLessons = progressData?.filter(p => p.completion_percentage >= 100).length || 0;
          const overallProgress = totalLessons > 0 ? (completedLessons / totalLessons * 100).toFixed(1) : 0;

          return `Course progress for user ${userId} in course ${courseId}:
Overall Progress: ${overallProgress}% (${completedLessons}/${totalLessons} lessons completed)

Detailed Progress:
${JSON.stringify(progressData, null, 2)}`;

        case 'course_analytics':
          if (!courseId) {
            return 'Error: courseId is required for course_analytics query';
          }

          // Get enrollment statistics
          const { data: enrollmentStats, error: enrollmentError } = await supabase
            .from('user_course_enrollments')
            .select('id, enrolled_at, user_id')
            .eq('course_id', courseId);

          if (enrollmentError) {
            return `Error fetching enrollment stats: ${enrollmentError.message}`;
          }

          // Get average progress
          const { data: avgProgress, error: avgError } = await supabase
            .rpc('get_course_average_progress', { course_id_param: courseId });

          if (avgError) {
            console.warn('Could not fetch average progress:', avgError.message);
          }

          return `Course ${courseId} Analytics:
- Total Enrollments: ${enrollmentStats?.length || 0}
- Average Progress: ${avgProgress || 'N/A'}%
- Recent Enrollments: ${enrollmentStats?.filter(e => 
  new Date(e.enrolled_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
).length || 0} (last 30 days)

Enrollment Data:
${JSON.stringify(enrollmentStats?.slice(0, 10), null, 2)}`;

        default:
          return `Error: Unknown query type "${type}". Supported types: user_courses, course_details, course_progress, course_analytics`;
      }

    } catch (error) {
      if (error instanceof SyntaxError) {
        return `Error: Invalid JSON input. Please provide valid JSON with query parameters.`;
      }
      return `Course data query failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }
});
