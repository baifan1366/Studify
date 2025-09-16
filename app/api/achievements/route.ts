import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Define achievements based on user data
    const achievements = [
      {
        id: 'first_course_completed',
        title: 'First Course Completed',
        description: 'Complete your first course',
        icon: '🎓',
        points: 100,
        unlocked: false, // Check against course_progress table
        category: 'learning'
      },
      {
        id: 'week_warrior',
        title: 'Week Warrior',
        description: 'Study for 7 consecutive days',
        icon: '🔥',
        points: 200,
        unlocked: false, // Check against daily activity
        category: 'consistency'
      },
      {
        id: 'community_helper',
        title: 'Community Helper',
        description: 'Help 10 fellow students in community',
        icon: '🤝',
        points: 150,
        unlocked: false, // Check against community interactions
        category: 'community'
      },
      {
        id: 'note_taker',
        title: 'Note Taker',
        description: 'Create 50 lesson notes',
        icon: '📝',
        points: 75,
        unlocked: false, // Check against course_notes table
        category: 'learning'
      },
      {
        id: 'quiz_master',
        title: 'Quiz Master',
        description: 'Score 90% or higher on 10 quizzes',
        icon: '🏆',
        points: 300,
        unlocked: false, // Check against quiz attempts
        category: 'performance'
      },
      {
        id: 'early_bird',
        title: 'Early Bird',
        description: 'Complete 5 lessons before 9 AM',
        icon: '🌅',
        points: 100,
        unlocked: false, // Check lesson completion times
        category: 'habits'
      },
      {
        id: 'social_butterfly',
        title: 'Social Butterfly',
        description: 'Join 3 different communities',
        icon: '🦋',
        points: 125,
        unlocked: false, // Check community memberships
        category: 'community'
      },
      {
        id: 'perfectionist',
        title: 'Perfectionist',
        description: 'Complete a course with 100% progress',
        icon: '⭐',
        points: 250,
        unlocked: false, // Check for 100% course completion
        category: 'performance'
      }
    ];

    // Check achievement conditions
    // This is a simplified version - you'd implement actual checks
    for (let achievement of achievements) {
      switch (achievement.id) {
        case 'first_course_completed':
          // Check if user has completed any course
          const { data: completedCourses } = await supabase
            .from('course_progress')
            .select('*')
            .eq('user_id', user.id)
            .eq('completion_percentage', 100)
            .limit(1);
          achievement.unlocked = (completedCourses?.length || 0) > 0;
          break;
          
        case 'note_taker':
          // Check note count
          const { data: notes } = await supabase
            .from('course_notes')
            .select('id')
            .eq('user_id', user.id);
          achievement.unlocked = (notes?.length || 0) >= 50;
          break;
          
        case 'social_butterfly':
          // Check community memberships
          const { data: memberships } = await supabase
            .from('community_group_member')
            .select('group_id')
            .eq('user_id', user.id);
          achievement.unlocked = (memberships?.length || 0) >= 3;
          break;
          
        // Add more checks for other achievements
        default:
          // For now, randomly unlock some achievements for demo
          achievement.unlocked = Math.random() > 0.7;
      }
    }

    return NextResponse.json({
      achievements,
      totalPoints: profile.points,
      unlockedCount: achievements.filter(a => a.unlocked).length,
      totalCount: achievements.length
    });

  } catch (error) {
    console.error('Error fetching achievements:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { achievementId } = await request.json();

    // This would be called when an achievement is unlocked
    // Update user points and create achievement record
    
    const achievementPoints = {
      'first_course_completed': 100,
      'week_warrior': 200,
      'community_helper': 150,
      'note_taker': 75,
      'quiz_master': 300,
      'early_bird': 100,
      'social_butterfly': 125,
      'perfectionist': 250
    };

    const points = achievementPoints[achievementId as keyof typeof achievementPoints] || 0;

    // Get current points first
    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('points')
      .eq('user_id', user.id)
      .single();

    const newPoints = (currentProfile?.points || 0) + points;

    // Update user points
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ points: newPoints })
      .eq('user_id', user.id);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      pointsEarned: points,
      message: `Achievement unlocked! You earned ${points} points.`
    });

  } catch (error) {
    console.error('Error unlocking achievement:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
