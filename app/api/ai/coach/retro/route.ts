import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/utils/auth/server-guard';
import { createAdminClient } from '@/utils/supabase/server';
import { aiWorkflowExecutor } from '@/lib/langChain/ai-workflow';

// 创建学习复盘
export async function POST(req: NextRequest) {
  try {
    const authResult = await authorize('student');
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    
    const { payload } = authResult;
    const supabase = await createAdminClient();

    // 获取用户profile ID
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', payload.sub)
      .single();

    if (profileError || !profile) {
      console.error('Profile lookup error:', profileError);
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const userId = profile.id;
    const {
      retroDate,
      retroType = 'daily',
      selfRating,
      moodRating,
      energyLevel,
      focusQuality,
      achievementsToday,
      challengesFaced,
      lessonsLearned,
      improvementsNeeded,
      tomorrowGoals
    } = await req.json();

    const date = retroDate || new Date().toISOString().split('T')[0];

    // 检查是否已经有复盘记录
    const { data: existingRetro } = await supabase
      .from('learning_retrospectives')
      .select('*')
      .eq('user_id', userId)
      .eq('retro_date', date)
      .eq('retro_type', retroType)
      .single();

    // 获取今日学习计划用于关联
    const { data: todayPlan } = await supabase
      .from('daily_learning_plans')
      .select('id')
      .eq('user_id', userId)
      .eq('plan_date', date)
      .single();

    // 收集今日学习数据用于AI分析
    const learningData = await gatherRetroLearningData(supabase, userId, date);
    
    // 使用AI生成复盘分析
    const aiAnalysis = await generateRetroAnalysisWithAI({
      userInput: {
        selfRating,
        moodRating,
        energyLevel,
        focusQuality,
        achievementsToday,
        challengesFaced,
        lessonsLearned,
        improvementsNeeded,
        tomorrowGoals
      },
      learningData,
      retroType
    });

    const retroData = {
      user_id: userId,
      plan_id: todayPlan?.id || null,
      retro_date: date,
      retro_type: retroType,
      self_rating: selfRating,
      mood_rating: moodRating,
      energy_level: energyLevel,
      focus_quality: focusQuality,
      achievements_today: achievementsToday,
      challenges_faced: challengesFaced,
      lessons_learned: lessonsLearned,
      improvements_needed: improvementsNeeded,
      tomorrow_goals: tomorrowGoals,
      ai_analysis: aiAnalysis.analysis,
      ai_suggestions: aiAnalysis.suggestions,
      ai_next_focus: aiAnalysis.nextFocus,
      strengths_identified: aiAnalysis.strengths,
      weaknesses_identified: aiAnalysis.weaknesses,
      learning_patterns: aiAnalysis.patterns,
      study_time_minutes: learningData.totalStudyTime,
      tasks_completed: learningData.tasksCompleted,
      points_earned: learningData.pointsEarned,
      courses_progressed: learningData.coursesProgressed,
      achievements_unlocked: learningData.achievementsUnlocked,
      ai_model_version: 'grok-4-fast',
      analysis_context: learningData
    };

    let savedRetro;
    if (existingRetro) {
      // 更新现有复盘
      const { data: updatedRetro, error: updateError } = await supabase
        .from('learning_retrospectives')
        .update({ ...retroData, updated_at: new Date().toISOString() })
        .eq('id', existingRetro.id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating retrospective:', updateError);
        return NextResponse.json({ error: 'Failed to update retrospective' }, { status: 500 });
      }
      savedRetro = updatedRetro;
    } else {
      // 创建新复盘
      const { data: newRetro, error: insertError } = await supabase
        .from('learning_retrospectives')
        .insert(retroData)
        .select()
        .single();

      if (insertError) {
        console.error('Error creating retrospective:', insertError);
        return NextResponse.json({ error: 'Failed to create retrospective' }, { status: 500 });
      }
      savedRetro = newRetro;
    }

    return NextResponse.json({
      success: true,
      retrospective: savedRetro,
      message: existingRetro ? 'Retrospective updated successfully' : 'Retrospective created successfully'
    });

  } catch (error) {
    console.error('Error creating retrospective:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// 获取学习复盘记录
export async function GET(req: NextRequest) {
  try {
    const authResult = await authorize('student');
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    
    const { payload } = authResult;
    const supabase = await createAdminClient();

    // 获取用户profile ID
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
    const date = searchParams.get('date');
    const retroType = searchParams.get('type') || 'daily';
    const limit = parseInt(searchParams.get('limit') || '10');

    let query = supabase
      .from('learning_retrospectives')
      .select(`
        *,
        plan:daily_learning_plans(*)
      `)
      .eq('user_id', userId)
      .eq('retro_type', retroType)
      .order('retro_date', { ascending: false })
      .limit(limit);

    if (date) {
      query = query.eq('retro_date', date);
    }

    const { data: retrospectives, error: retroError } = await query;

    if (retroError) {
      console.error('Error fetching retrospectives:', retroError);
      return NextResponse.json({ error: 'Failed to fetch retrospectives' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      retrospectives: retrospectives || [],
      count: retrospectives?.length || 0
    });

  } catch (error) {
    console.error('Error fetching retrospectives:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// 收集复盘所需的学习数据
async function gatherRetroLearningData(supabase: any, userId: number, date: string) {
  const data: any = {
    date,
    totalStudyTime: 0,
    tasksCompleted: 0,
    pointsEarned: 0,
    coursesProgressed: 0,
    achievementsUnlocked: 0
  };

  try {
    // 获取今日完成的任务
    const { data: completedTasks } = await supabase
      .from('daily_plan_tasks')
      .select(`
        *,
        plan:daily_learning_plans!inner(plan_date)
      `)
      .eq('is_completed', true)
      .eq('plan.plan_date', date)
      .eq('plan.user_id', userId);

    if (completedTasks) {
      data.tasksCompleted = completedTasks.length;
      data.totalStudyTime = completedTasks.reduce((sum: number, task: any) => sum + (task.actual_minutes || 0), 0);
      data.pointsEarned = completedTasks.reduce((sum: number, task: any) => sum + task.points_reward, 0);
      data.completedTasksDetail = completedTasks;
    }

    // 获取今日学习会话
    const startOfDay = new Date(date + 'T00:00:00Z');
    const endOfDay = new Date(date + 'T23:59:59Z');

    const { data: studySessions } = await supabase
      .from('study_session')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', startOfDay.toISOString())
      .lte('created_at', endOfDay.toISOString());

    data.studySessions = studySessions || [];

    // 获取今日课程进度变化
    const { data: progressUpdates } = await supabase
      .from('course_progress')
      .select(`
        course_id,
        progress_percentage,
        course:course(title)
      `)
      .eq('user_id', userId)
      .gte('updated_at', startOfDay.toISOString())
      .lte('updated_at', endOfDay.toISOString());

    data.coursesProgressed = progressUpdates?.length || 0;
    data.progressUpdates = progressUpdates || [];

    // 获取今日解锁的成就
    const { data: achievements } = await supabase
      .from('user_achievement')
      .select('*')
      .eq('user_id', userId)
      .gte('unlocked_at', startOfDay.toISOString())
      .lte('unlocked_at', endOfDay.toISOString());

    data.achievementsUnlocked = achievements?.length || 0;
    data.achievements = achievements || [];

    // 获取今日的学习计划
    const { data: todayPlan } = await supabase
      .from('daily_learning_plans')
      .select(`
        *,
        tasks:daily_plan_tasks(*)
      `)
      .eq('user_id', userId)
      .eq('plan_date', date)
      .single();

    data.todayPlan = todayPlan;

  } catch (error) {
    console.error('Error gathering retro learning data:', error);
  }

  return data;
}

// 使用AI生成复盘分析
async function generateRetroAnalysisWithAI(context: any) {
  try {
    const { userInput, learningData, retroType } = context;
    
    const prompt = `作为AI学习教练，基于用户的复盘输入和学习数据，生成深度分析和建议。

用户自评：
- 总体评分：${userInput.selfRating}/5
- 心情状态：${userInput.moodRating}
- 精力水平：${userInput.energyLevel}/5
- 专注质量：${userInput.focusQuality}/5

用户反思：
- 今日成就：${userInput.achievementsToday || '无'}
- 遇到挑战：${userInput.challengesFaced || '无'}
- 学到经验：${userInput.lessonsLearned || '无'}
- 改进需求：${userInput.improvementsNeeded || '无'}
- 明日目标：${userInput.tomorrowGoals || '无'}

学习数据：
- 学习时长：${learningData.totalStudyTime}分钟
- 完成任务：${learningData.tasksCompleted}个
- 获得积分：${learningData.pointsEarned}分
- 课程进展：${learningData.coursesProgressed}门
- 解锁成就：${learningData.achievementsUnlocked}个

请生成以下结构的分析：
{
  "analysis": "综合分析用户今日学习表现和状态",
  "suggestions": "具体的改进建议和优化策略",
  "nextFocus": "明日学习重点和方向",
  "strengths": "识别出的学习优势",
  "weaknesses": "需要改进的薄弱环节",
  "patterns": "发现的学习模式和习惯"
}

要求：
1. 分析要深入具体，不要泛泛而谈
2. 建议要可操作，有针对性
3. 语言要鼓励性，同时诚实
4. 考虑学习数据与自评的一致性
5. 提供个性化的学习策略`;

    const result = await aiWorkflowExecutor.simpleAICall(prompt);
    
    // 解析AI响应
    let aiAnalysis;
    try {
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        aiAnalysis = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in AI response');
      }
    } catch (parseError) {
      console.error('Error parsing AI analysis:', parseError);
      // 回退到默认分析
      aiAnalysis = getDefaultRetroAnalysis(userInput, learningData);
    }

    return aiAnalysis;

  } catch (error) {
    console.error('Error generating AI analysis:', error);
    return getDefaultRetroAnalysis(context.userInput, context.learningData);
  }
}

// 默认复盘分析模板
function getDefaultRetroAnalysis(userInput: any, learningData: any) {
  const performance = learningData.tasksCompleted >= 3 ? '出色' : learningData.tasksCompleted >= 1 ? '不错' : '需要改进';
  
  return {
    analysis: `今日学习表现${performance}，完成了${learningData.tasksCompleted}个任务，学习${learningData.totalStudyTime}分钟。您的自评${userInput.selfRating}/5分反映了对学习状态的认知。`,
    suggestions: learningData.totalStudyTime < 30 
      ? "建议明天增加专注学习时间，可以尝试番茄钟技术。"
      : "保持良好的学习节奏，可以适当增加复习和巩固环节。",
    nextFocus: learningData.tasksCompleted === 0 
      ? "明日重点放在建立学习习惯，从简单任务开始。"
      : "继续当前的学习轨道，深化理解，增加实践。",
    strengths: userInput.selfRating >= 4 
      ? "学习自觉性强，能够客观评估自己的表现。"
      : "有改进意识，愿意反思和调整学习策略。",
    weaknesses: learningData.totalStudyTime < 30 
      ? "学习时间较短，可能存在专注度不够或时间安排问题。"
      : "可以在学习方法和效率方面进一步优化。",
    patterns: `您倾向于${userInput.energyLevel >= 4 ? '高能量' : '中低能量'}状态下学习，专注质量${userInput.focusQuality >= 4 ? '较好' : '有待提升'}。`
  };
}
