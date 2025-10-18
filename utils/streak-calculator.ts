/**
 * Utility function to calculate study streak from session dates
 * Used by both dashboard API and learning stats API
 */

export function calculateStudyStreak(sessionDates: string[]): number {
  if (sessionDates.length === 0) return 0;

  // Get unique dates and sort them (most recent first)
  const uniqueDates = [...new Set(sessionDates.map(d => new Date(d).toISOString().split('T')[0]))];
  uniqueDates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split('T')[0];
  
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  // Check if user studied today or yesterday (streak is still active)
  if (uniqueDates[0] !== todayStr && uniqueDates[0] !== yesterdayStr) {
    return 0; // Streak is broken
  }

  let streak = 0;
  let expectedDate = new Date(today);
  
  // Count consecutive days
  for (const dateStr of uniqueDates) {
    const sessionDate = new Date(dateStr + 'T00:00:00');
    sessionDate.setHours(0, 0, 0, 0);
    expectedDate.setHours(0, 0, 0, 0);
    
    const diffDays = Math.floor((expectedDate.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      // This day matches our expected date
      streak++;
      expectedDate.setDate(expectedDate.getDate() - 1); // Move to previous day
    } else if (diffDays > 0) {
      // Gap found, streak ends
      break;
    }
  }

  return streak;
}

/**
 * Test helper to validate streak calculation
 */
export function testStreakCalculation() {
  const tests = [
    {
      name: 'No sessions',
      dates: [],
      expected: 0
    },
    {
      name: 'Studied today only',
      dates: [new Date().toISOString()],
      expected: 1
    },
    {
      name: 'Studied yesterday only',
      dates: [new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()],
      expected: 1
    },
    {
      name: '3 consecutive days (including today)',
      dates: [
        new Date().toISOString(),
        new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      ],
      expected: 3
    },
    {
      name: '5 consecutive days (including today)',
      dates: [
        new Date().toISOString(),
        new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
      ],
      expected: 5
    },
    {
      name: 'Broken streak (gap 2 days ago)',
      dates: [
        new Date().toISOString(),
        new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      ],
      expected: 1
    },
    {
      name: 'Broken streak (last study was 3 days ago)',
      dates: [
        new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
      ],
      expected: 0
    }
  ];

  console.log('🧪 Testing Streak Calculation...\n');
  
  let passed = 0;
  let failed = 0;

  tests.forEach(test => {
    const result = calculateStudyStreak(test.dates);
    const success = result === test.expected;
    
    if (success) {
      passed++;
      console.log(`✅ PASS: ${test.name}`);
    } else {
      failed++;
      console.log(`❌ FAIL: ${test.name}`);
      console.log(`   Expected: ${test.expected}, Got: ${result}`);
    }
  });

  console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
  return { passed, failed, total: tests.length };
}
