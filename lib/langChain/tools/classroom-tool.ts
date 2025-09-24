// Classroom Tool - 调用内部API获取教室和学习相关数据
import { DynamicTool } from "@langchain/core/tools";
import { createClient } from '@supabase/supabase-js';

export const classroomTool = new DynamicTool({
  name: "get_classroom_data",
  description: `Get classroom and learning session data from the internal API. Use this when you need classroom information, live sessions, or member data.
  Input should be a JSON string: {"type": "user_classrooms|classroom_details|live_sessions|classroom_members", "userId"?: number, "classroomId"?: number}`,
  func: async (input: string) => {
    try {
      const params = JSON.parse(input);
      const { type, userId, classroomId } = params;

      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      switch (type) {
        case 'user_classrooms':
          if (!userId) {
            return 'Error: userId is required for user_classrooms query';
          }
          
          const { data: userClassrooms, error: classroomsError } = await supabase
            .from('classroom_member')
            .select(`
              role,
              joined_at,
              classroom:classroom_id(
                id,
                name,
                description,
                class_code,
                created_at,
                owner_id,
                member_count:classroom_member(count)
              )
            `)
            .eq('user_id', userId)
            .order('joined_at', { ascending: false });

          if (classroomsError) {
            return `Error fetching user classrooms: ${classroomsError.message}`;
          }

          return `User ${userId} classrooms (${userClassrooms?.length || 0} total):\n${JSON.stringify(userClassrooms, null, 2)}`;

        case 'classroom_details':
          if (!classroomId) {
            return 'Error: classroomId is required for classroom_details query';
          }

          const { data: classroomDetails, error: detailsError } = await supabase
            .from('classroom')
            .select(`
              *,
              owner:profiles!classroom_owner_id_fkey(
                display_name,
                bio
              ),
              members:classroom_member(
                user_id,
                role,
                joined_at,
                user:profiles(
                  display_name,
                  avatar_url
                )
              ),
              live_sessions:classroom_live_session(
                id,
                title,
                description,
                session_type,
                scheduled_start,
                status
              )
            `)
            .eq('id', classroomId)
            .single();

          if (detailsError) {
            return `Error fetching classroom details: ${detailsError.message}`;
          }

          return `Classroom ${classroomId} details:\n${JSON.stringify(classroomDetails, null, 2)}`;

        case 'live_sessions':
          if (!classroomId) {
            return 'Error: classroomId is required for live_sessions query';
          }

          const { data: liveSessions, error: sessionsError } = await supabase
            .from('classroom_live_session')
            .select(`
              *,
              instructor:profiles!classroom_live_session_instructor_id_fkey(
                display_name
              )
            `)
            .eq('classroom_id', classroomId)
            .order('scheduled_start', { ascending: false });

          if (sessionsError) {
            return `Error fetching live sessions: ${sessionsError.message}`;
          }

          // Separate upcoming and past sessions
          const now = new Date();
          const upcomingSessions = liveSessions?.filter(s => new Date(s.scheduled_start) > now) || [];
          const pastSessions = liveSessions?.filter(s => new Date(s.scheduled_start) <= now) || [];

          return `Live Sessions for Classroom ${classroomId}:

Upcoming Sessions (${upcomingSessions.length}):
${JSON.stringify(upcomingSessions, null, 2)}

Past Sessions (${pastSessions.length}):
${JSON.stringify(pastSessions.slice(0, 5), null, 2)}`;

        case 'classroom_members':
          if (!classroomId) {
            return 'Error: classroomId is required for classroom_members query';
          }

          const { data: members, error: membersError } = await supabase
            .from('classroom_member')
            .select(`
              *,
              user:profiles(
                display_name,
                avatar_url,
                bio,
                role
              )
            `)
            .eq('classroom_id', classroomId)
            .order('joined_at', { ascending: true });

          if (membersError) {
            return `Error fetching classroom members: ${membersError.message}`;
          }

          // Group by roles
          const owners = members?.filter(m => m.role === 'owner') || [];
          const tutors = members?.filter(m => m.role === 'tutor') || [];
          const students = members?.filter(m => m.role === 'student') || [];

          return `Classroom ${classroomId} Members:

Owners (${owners.length}):
${JSON.stringify(owners, null, 2)}

Tutors (${tutors.length}):
${JSON.stringify(tutors, null, 2)}

Students (${students.length}):
${JSON.stringify(students.slice(0, 10), null, 2)}${students.length > 10 ? `\n... and ${students.length - 10} more students` : ''}`;

        case 'classroom_analytics':
          if (!classroomId) {
            return 'Error: classroomId is required for classroom_analytics query';
          }

          // Get basic stats
          const { data: analytics, error: analyticsError } = await supabase
            .from('classroom')
            .select(`
              id,
              name,
              created_at,
              members:classroom_member(count),
              live_sessions:classroom_live_session(count)
            `)
            .eq('id', classroomId)
            .single();

          if (analyticsError) {
            return `Error fetching classroom analytics: ${analyticsError.message}`;
          }

          // Get recent activity
          const { data: recentSessions } = await supabase
            .from('classroom_live_session')
            .select('scheduled_start, status, title')
            .eq('classroom_id', classroomId)
            .gte('scheduled_start', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
            .order('scheduled_start', { ascending: false });

          return `Classroom ${classroomId} Analytics:
${JSON.stringify(analytics, null, 2)}

Recent Activity (last 30 days):
- Sessions Conducted: ${recentSessions?.length || 0}
- Recent Sessions: ${JSON.stringify(recentSessions?.slice(0, 5), null, 2)}`;

        default:
          return `Error: Unknown query type "${type}". Supported types: user_classrooms, classroom_details, live_sessions, classroom_members, classroom_analytics`;
      }

    } catch (error) {
      if (error instanceof SyntaxError) {
        return 'Error: Invalid JSON input. Please provide valid JSON with query parameters.';
      }
      return `Classroom data query failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }
});
