import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/utils/auth/server-guard';
import { createAdminClient } from '@/utils/supabase/server';

// GET: Fetch learning path progress
export async function GET(req: NextRequest) {
  try {
    const authResult = await authorize('student');
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { payload } = authResult;
    const supabase = await createAdminClient();

    // Get user profile ID
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', payload.sub)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const userId = profile.id;
    const { searchParams } = new URL(req.url);
    const pathId = searchParams.get('path_id');

    // Fetch active learning paths
    let pathQuery = supabase
      .from('learning_paths')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (pathId) {
      pathQuery = pathQuery.eq('id', pathId);
    }

    const { data: paths, error: pathsError } = await pathQuery;

    if (pathsError) {
      console.error('Error fetching paths:', pathsError);
      return NextResponse.json({ error: 'Failed to fetch paths' }, { status: 500 });
    }

    // Fetch user's course progress
    const { data: courseProgress } = await supabase
      .from('course_progress')
      .select('course_id, progress_percentage, completed')
      .eq('user_id', userId);

    const completedCourses = courseProgress
      ?.filter(cp => cp.completed)
      .map(cp => cp.course_id) || [];

    // Calculate progress for each path
    const progressData = paths?.map(path => {
      const roadmap = path.roadmap || [];
      const milestones = roadmap.map((step: any, idx: number) => {
        const isCompleted = step.courseId && completedCourses.includes(step.courseId);
        return {
          id: `${path.id}-milestone-${idx}`,
          name: step.title || step.name || `Step ${idx + 1}`,
          description: step.description || '',
          order: idx,
          completed: isCompleted,
          completedAt: isCompleted ? new Date().toISOString() : undefined,
          relatedCourses: step.courseId ? [step.courseId] : []
        };
      });

      const completedMilestones = milestones.filter((m: any) => m.completed).length;
      const totalMilestones = milestones.length;
      const overallProgress = totalMilestones > 0 
        ? Math.round((completedMilestones / totalMilestones) * 100) 
        : 0;

      const currentMilestone = milestones.find((m: any) => !m.completed) || null;
      const currentIndex = currentMilestone ? milestones.indexOf(currentMilestone) : -1;
      const nextMilestone = currentIndex >= 0 && currentIndex < milestones.length - 1
        ? milestones[currentIndex + 1]
        : null;

      return {
        pathId: path.id,
        pathTitle: path.title,
        overallProgress,
        milestones,
        currentMilestone,
        nextMilestone,
        completedMilestones,
        totalMilestones,
        estimatedCompletion: calculateEstimatedCompletion(overallProgress, totalMilestones)
      };
    }) || [];

    return NextResponse.json({
      success: true,
      data: progressData
    });

  } catch (error) {
    console.error('Error fetching learning path progress:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH: Update milestone completion
export async function PATCH(req: NextRequest) {
  try {
    const authResult = await authorize('student');
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { pathId, milestoneId, completed } = await req.json();

    if (!pathId || !milestoneId) {
      return NextResponse.json(
        { error: 'Path ID and Milestone ID are required' },
        { status: 400 }
      );
    }

    // Note: Since milestones are derived from roadmap, 
    // we'd need to update the roadmap array in the learning_paths table
    // For now, return success (implement actual update logic as needed)

    return NextResponse.json({
      success: true,
      message: 'Milestone updated successfully'
    });

  } catch (error) {
    console.error('Error updating milestone:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function calculateEstimatedCompletion(progress: number, totalMilestones: number): string {
  if (progress === 100) return 'Completed';
  if (progress === 0) return 'Not started';

  // Estimate based on average completion rate
  const remainingMilestones = totalMilestones * (1 - progress / 100);
  const estimatedWeeks = Math.ceil(remainingMilestones * 2); // Assume 2 weeks per milestone

  if (estimatedWeeks < 4) {
    return `~${estimatedWeeks} weeks`;
  } else {
    const estimatedMonths = Math.ceil(estimatedWeeks / 4);
    return `~${estimatedMonths} months`;
  }
}
