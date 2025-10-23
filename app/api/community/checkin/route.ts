import { NextResponse } from "next/server";
import { createServerClient } from "@/utils/supabase/server";

export async function POST(req: Request) {
  try {
    const supabase = await createServerClient();
    
    // Get current user from session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('auth_id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const userId = profile.id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    // Check if already checked in today
    const { data: existingCheckin } = await supabase
      .from("community_checkin")
      .select('id, checkin_at')
      .eq('user_id', userId)
      .gte('checkin_at', todayStr)
      .single();

    if (existingCheckin) {
      // Already checked in today
      const currentStreak = await calculateStreak(supabase, userId);
      return NextResponse.json({
        success: true,
        data: {
          alreadyCheckedIn: true,
          currentStreak,
          pointsEarned: 0,
          isNewRecord: false,
          message: "You've already checked in today!"
        }
      });
    }

    // Insert new check-in
    const { error: insertError } = await supabase
      .from("community_checkin")
      .insert({
        user_id: userId,
        checkin_at: new Date().toISOString()
      });

    if (insertError) {
      console.error('Check-in insert error:', insertError);
      return NextResponse.json({ error: "Failed to check in" }, { status: 500 });
    }

    // Calculate current streak
    const currentStreak = await calculateStreak(supabase, userId);
    
    // Calculate points based on streak
    const basePoints = 10;
    const streakBonus = Math.floor(currentStreak / 7) * 5; // +5 points per week
    const pointsEarned = basePoints + streakBonus;

    // Award points
    const { error: pointsError } = await supabase
      .from('user_points')
      .insert({
        user_id: userId,
        points: pointsEarned,
        reason: 'Daily check-in',
        ref: { streak: currentStreak, date: todayStr }
      });

    if (pointsError) {
      console.error('Points award error:', pointsError);
    }

    // Check if it's a new record
    const { data: maxStreak } = await supabase
      .from('profiles')
      .select('max_streak')
      .eq('id', userId)
      .single();

    const isNewRecord = currentStreak > (maxStreak?.max_streak || 0);

    if (isNewRecord) {
      await supabase
        .from('profiles')
        .update({ max_streak: currentStreak })
        .eq('id', userId);
    }

    // Get motivational message
    const message = getMotivationalMessage(currentStreak, isNewRecord);

    return NextResponse.json({
      success: true,
      data: {
        pointsEarned,
        currentStreak,
        isNewRecord,
        message,
        alreadyCheckedIn: false
      }
    });

  } catch (error: any) {
    console.error('Check-in error:', error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// Calculate user's current streak
async function calculateStreak(supabase: any, userId: number): Promise<number> {
  try {
    const { data: checkins } = await supabase
      .from('community_checkin')
      .select('checkin_at')
      .eq('user_id', userId)
      .order('checkin_at', { ascending: false })
      .limit(365); // Check last year

    if (!checkins || checkins.length === 0) {
      return 1; // First check-in
    }

    let streak = 1;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    const checkinDates = new Set(
      checkins.map((c: any) => new Date(c.checkin_at).toISOString().split('T')[0])
    );

    // Check today
    const todayStr = currentDate.toISOString().split('T')[0];
    if (!checkinDates.has(todayStr)) {
      // If not checked in today, start from yesterday
      currentDate.setDate(currentDate.getDate() - 1);
    }

    // Count consecutive days backwards
    while (true) {
      const dateStr = currentDate.toISOString().split('T')[0];
      if (!checkinDates.has(dateStr)) {
        break;
      }
      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    }

    return streak;
  } catch (error) {
    console.error('Error calculating streak:', error);
    return 1;
  }
}

// Get motivational message based on streak
function getMotivationalMessage(streak: number, isNewRecord: boolean): string {
  if (isNewRecord) {
    return `🎉 New personal record! ${streak} days streak!`;
  }
  
  const messages = [
    { threshold: 100, message: "👑 You're a legend! 100+ days of dedication!" },
    { threshold: 50, message: "💎 Master level achieved! Keep shining!" },
    { threshold: 30, message: "🏆 30 days strong! You're unstoppable!" },
    { threshold: 21, message: "🌟 3 weeks! You've built a solid habit!" },
    { threshold: 14, message: "🔥 Two weeks! You're on fire!" },
    { threshold: 7, message: "⭐ One week streak! Amazing consistency!" },
    { threshold: 3, message: "💪 3 days in! Keep the momentum going!" },
    { threshold: 1, message: "🌱 Great start! Every journey begins with a single step!" }
  ];

  for (const { threshold, message } of messages) {
    if (streak >= threshold) {
      return message;
    }
  }

  return "🎯 Keep going! You're building something great!";
}
