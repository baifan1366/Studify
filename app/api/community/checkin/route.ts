import { NextResponse } from "next/server";
import { createServerClient } from "@/utils/supabase/server";
import { calculateDateKeyStreak, localDateKey } from "@/lib/learning/study-metrics";

export async function GET() {
  try {
    const supabase = await createServerClient();

    // Get current user from session
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, timezone")
      .eq("user_id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const userId = profile.id;
    const timeZone = profile.timezone || "Asia/Kuala_Lumpur";
    const todayStr = localDateKey(new Date(), timeZone);

    // Check if already checked in today
    const { data: existingCheckin } = await supabase
      .from("community_checkin")
      .select("id, checkin_date")
      .eq("user_id", userId)
      .eq("checkin_date", todayStr)
      .single();

    const hasCheckedInToday = !!existingCheckin;
    const currentStreak = await calculateStreak(supabase, userId, todayStr);
    const weeklyCheckins = await getWeeklyCheckins(supabase, userId, todayStr);

    return NextResponse.json({
      success: true,
      data: {
        hasCheckedInToday,
        currentStreak,
        weeklyCheckins,
      },
    });
  } catch (error: any) {
    console.error("Check-in status error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    const supabase = await createServerClient();

    // Get current user from session
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, timezone")
      .eq("user_id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const userId = profile.id;
    const timeZone = profile.timezone || "Asia/Kuala_Lumpur";
    const todayStr = localDateKey(new Date(), timeZone);

    // Check if already checked in today
    const { data: existingCheckin } = await supabase
      .from("community_checkin")
      .select("id, checkin_date")
      .eq("user_id", userId)
      .eq("checkin_date", todayStr)
      .single();

    if (existingCheckin) {
      // Already checked in today
      const currentStreak = await calculateStreak(supabase, userId, todayStr);
      const weeklyCheckins = await getWeeklyCheckins(supabase, userId, todayStr);
      return NextResponse.json({
        success: true,
        data: {
          alreadyCheckedIn: true,
          currentStreak,
          pointsEarned: 0,
          isNewRecord: false,
          message: "You've already checked in today!",
          weeklyCheckins,
        },
      });
    }

    // Insert new check-in
    const { error: insertError } = await supabase
      .from("community_checkin")
      .insert({
        user_id: userId,
        checkin_date: todayStr,
      });

    if (insertError) {
      console.error("Check-in insert error:", insertError);
      return NextResponse.json(
        { error: "Failed to check in" },
        { status: 500 }
      );
    }

    // Calculate current streak
    const currentStreak = await calculateStreak(supabase, userId, todayStr);

    // Calculate points based on streak
    const basePoints = 10;
    const streakBonus = Math.floor(currentStreak / 7) * 5; // +5 points per week
    const pointsEarned = basePoints + streakBonus;

    // Award points to ledger
    const { error: pointsError } = await supabase
      .from("community_points_ledger")
      .insert({
        user_id: userId,
        points: pointsEarned,
        reason: "Daily check-in",
        ref: { streak: currentStreak, date: todayStr },
      });

    if (pointsError) {
      console.error("Points ledger error:", pointsError);
    }

    // Update user's total points in profile
    const { data: currentProfile } = await supabase
      .from("profiles")
      .select("points")
      .eq("id", userId)
      .single();

    const newTotalPoints = (currentProfile?.points || 0) + pointsEarned;

    const { error: profileUpdateError } = await supabase
      .from("profiles")
      .update({ points: newTotalPoints })
      .eq("id", userId);

    if (profileUpdateError) {
      console.error("Profile points update error:", profileUpdateError);
    }

    // Check if it's a new record (using preferences jsonb field to store max_streak)
    const { data: profileData } = await supabase
      .from("profiles")
      .select("preferences")
      .eq("id", userId)
      .single();

    const preferences = profileData?.preferences || {};
    const maxStreak = preferences.max_streak || 0;
    const isNewRecord = currentStreak > maxStreak;

    if (isNewRecord) {
      await supabase
        .from("profiles")
        .update({
          preferences: {
            ...preferences,
            max_streak: currentStreak,
          },
        })
        .eq("id", userId);
    }

    // Get motivational message
    const message = getMotivationalMessage(currentStreak, isNewRecord);

    // Get weekly checkins
    const weeklyCheckins = await getWeeklyCheckins(supabase, userId, todayStr);

    return NextResponse.json({
      success: true,
      data: {
        pointsEarned,
        currentStreak,
        isNewRecord,
        message,
        alreadyCheckedIn: false,
        weeklyCheckins,
      },
    });
  } catch (error: any) {
    console.error("Check-in error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// Get weekly checkins for visualization
async function getWeeklyCheckins(
  supabase: any,
  userId: number,
  todayStr: string
): Promise<boolean[]> {
  try {
    const today = new Date(`${todayStr}T12:00:00Z`);
    const weekStart = new Date(today);
    weekStart.setUTCDate(weekStart.getUTCDate() - 6);

    const weekStartStr = weekStart.toISOString().slice(0, 10);

    const { data: weekCheckins } = await supabase
      .from("community_checkin")
      .select("checkin_date")
      .eq("user_id", userId)
      .gte("checkin_date", weekStartStr)
      .lte("checkin_date", todayStr);

    // Create array of 7 booleans for the week
    return Array(7)
      .fill(false)
      .map((_, index) => {
        const date = new Date(weekStart);
        date.setUTCDate(date.getUTCDate() + index);
        const dateStr = date.toISOString().slice(0, 10);
        return (
          weekCheckins?.some((c: any) => c.checkin_date === dateStr) || false
        );
      });
  } catch (error) {
    console.error("Error getting weekly checkins:", error);
    return Array(7).fill(false);
  }
}

// Calculate user's current streak
async function calculateStreak(
  supabase: any,
  userId: number,
  todayStr: string
): Promise<number> {
  try {
    const { data: checkins } = await supabase
      .from("community_checkin")
      .select("checkin_date")
      .eq("user_id", userId)
      .order("checkin_date", { ascending: false })
      .limit(365); // Check last year

    return calculateDateKeyStreak(
      (checkins || []).map((checkin: any) => checkin.checkin_date),
      todayStr
    );
  } catch (error) {
    console.error("Error calculating streak:", error);
    return 0;
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
    {
      threshold: 1,
      message: "🌱 Great start! Every journey begins with a single step!",
    },
  ];

  for (const { threshold, message } of messages) {
    if (streak >= threshold) {
      return message;
    }
  }

  return "🎯 Keep going! You're building something great!";
}
