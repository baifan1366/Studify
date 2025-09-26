import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/utils/auth/server-guard';
import { createAdminClient } from '@/utils/supabase/server';
import { aiWorkflowExecutor } from '@/lib/langChain/ai-workflow';

// 每日学习计划生成接口
export async function POST(req: NextRequest) {
  try {
    // 用户认证
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
    const today = new Date().toISOString().split('T')[0];

    // 检查今天是否已经有计划
    const { data: existingPlan } = await supabase
      .from('daily_learning_plans')
      .select('*')
      .eq('user_id', userId)
      .eq('plan_date', today)
      .single();

    if (existingPlan && existingPlan.status !== 'draft') {
      return NextResponse.json({
        success: true,
        plan: existingPlan,
        message: 'Daily plan already exists for today'
      });
    }

    // 获取用户学习数据用于AI分析
    const learningContext = await gatherLearningContext(supabase, userId);
    
    // 使用AI生成每日学习计划
    const aiPlan = await generateDailyPlanWithAI(learningContext);

    // 保存或更新计划到数据库
    let savedPlan;
    if (existingPlan) {
      // 更新现有草稿
      const { data: updatedPlan, error: updateError } = await supabase
        .from('daily_learning_plans')
        .update({
          plan_title: aiPlan.title,
          plan_description: aiPlan.description,
          ai_insights: aiPlan.insights,
          motivation_message: aiPlan.motivationMessage,
          total_tasks: aiPlan.tasks.length,
          total_points: aiPlan.tasks.reduce((sum: number, task: any) => sum + task.pointsReward, 0),
          estimated_duration_minutes: aiPlan.tasks.reduce((sum: number, task: any) => sum + task.estimatedMinutes, 0),
          status: 'active',
          ai_model_version: 'grok-4-fast',
          generation_context: learningContext,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingPlan.id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating daily plan:', updateError);
        return NextResponse.json({ error: 'Failed to update daily plan' }, { status: 500 });
      }
      savedPlan = updatedPlan;
    } else {
      // 创建新计划
      const { data: newPlan, error: insertError } = await supabase
        .from('daily_learning_plans')
        .insert({
          user_id: userId,
          plan_date: today,
          plan_title: aiPlan.title,
          plan_description: aiPlan.description,
          ai_insights: aiPlan.insights,
          motivation_message: aiPlan.motivationMessage,
          total_tasks: aiPlan.tasks.length,
          total_points: aiPlan.tasks.reduce((sum: number, task: any) => sum + task.pointsReward, 0),
          estimated_duration_minutes: aiPlan.tasks.reduce((sum: number, task: any) => sum + task.estimatedMinutes, 0),
          status: 'active',
          ai_model_version: 'grok-4-fast',
          generation_context: learningContext
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error creating daily plan:', insertError);
        return NextResponse.json({ error: 'Failed to create daily plan' }, { status: 500 });
      }
      savedPlan = newPlan;
    }

    // 删除旧任务（如果是更新）
    if (existingPlan) {
      await supabase
        .from('daily_plan_tasks')
        .delete()
        .eq('plan_id', savedPlan.id);
    }

    // 插入任务
    const tasksToInsert = aiPlan.tasks.map((task: any, index: number) => ({
      plan_id: savedPlan.id,
      task_title: task.title,
      task_description: task.description,
      task_type: task.type,
      related_course_id: task.relatedCourseId,
      related_lesson_id: task.relatedLessonId,
      related_content_type: task.relatedContentType,
      related_content_id: task.relatedContentId,
      priority: task.priority,
      difficulty: task.difficulty,
      estimated_minutes: task.estimatedMinutes,
      points_reward: task.pointsReward,
      position: index,
      category: task.category
    }));

    const { data: insertedTasks, error: tasksError } = await supabase
      .from('daily_plan_tasks')
      .insert(tasksToInsert)
      .select();

    if (tasksError) {
      console.error('Error creating tasks:', tasksError);
      return NextResponse.json({ error: 'Failed to create tasks' }, { status: 500 });
    }

    // 返回完整的计划数据
    const fullPlan = {
      ...savedPlan,
      tasks: insertedTasks
    };

    return NextResponse.json({
      success: true,
      plan: fullPlan,
      message: 'Daily learning plan generated successfully'
    });

  } catch (error) {
    console.error('Error generating daily plan:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// 获取今日学习计划
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
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

    // 获取指定日期的计划和任务
    const { data: plan, error: planError } = await supabase
      .from('daily_learning_plans')
      .select(`
        *,
        tasks:daily_plan_tasks(*)
      `)
      .eq('user_id', userId)
      .eq('plan_date', date)
      .single();

    if (planError && planError.code !== 'PGRST116') {
      console.error('Error fetching daily plan:', planError);
      return NextResponse.json({ error: 'Failed to fetch daily plan' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      plan: plan || null,
      date
    });

  } catch (error) {
    console.error('Error fetching daily plan:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// 更新任务完成状态
export async function PATCH(req: NextRequest) {
  try {
    const authResult = await authorize('student');
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { taskId, isCompleted, actualMinutes } = await req.json();
    const supabase = await createAdminClient();

    // 更新任务状态
    const { data: updatedTask, error: updateError } = await supabase
      .from('daily_plan_tasks')
      .update({
        is_completed: isCompleted,
        actual_minutes: actualMinutes || 0,
        completed_at: isCompleted ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      })
      .eq('public_id', taskId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating task:', updateError);
      return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
    }

    // 如果任务完成，给用户加积分
    if (isCompleted && updatedTask.points_reward > 0) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, points')
        .eq('user_id', authResult.payload.sub)
        .single();

      if (profile) {
        await supabase
          .from('profiles')
          .update({
            points: profile.points + updatedTask.points_reward
          })
          .eq('id', profile.id);
      }
    }

    return NextResponse.json({
      success: true,
      task: updatedTask,
      pointsEarned: isCompleted ? updatedTask.points_reward : 0
    });

  } catch (error) {
    console.error('Error updating task status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// 收集用户学习上下文用于AI分析
async function gatherLearningContext(supabase: any, userId: number) {
  const context: any = {
    userId,
    timestamp: new Date().toISOString(),
    timezone: 'Asia/Kuala_Lumpur'
  };

  try {
    // 获取用户基本信息和偏好
    const { data: profile } = await supabase
      .from('profiles')
      .select('preferences, points, onboarded')
      .eq('id', userId)
      .single();

    context.profile = profile;

    // 获取最近7天学习统计
    const { data: recentStats } = await supabase
      .from('study_session')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });

    context.recentStudySessions = recentStats || [];

    // 获取课程进度
    const { data: courseProgress } = await supabase
      .from('course_progress')
      .select(`
        course_id,
        progress_percentage,
        last_accessed_at,
        course:course(title, level, category)
      `)
      .eq('user_id', userId)
      .order('last_accessed_at', { ascending: false })
      .limit(5);

    context.activeCourses = courseProgress || [];

    // 获取最近的学习路径
    const { data: learningPaths } = await supabase
      .from('learning_paths')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(3);

    context.activeLearningPaths = learningPaths || [];

    // 获取最近的错题记录
    const { data: mistakes } = await supabase
      .from('quiz_submission_answers')
      .select(`
        *,
        quiz_question:course_quiz_question(question_text, explanation)
      `)
      .eq('user_id', userId)
      .eq('is_correct', false)
      .gte('created_at', new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(10);

    context.recentMistakes = mistakes || [];

    // 获取教练设置
    const { data: coachSettings } = await supabase
      .from('coach_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    context.coachSettings = coachSettings;

  } catch (error) {
    console.error('Error gathering learning context:', error);
  }

  return context;
}

// 使用AI生成每日学习计划
async function generateDailyPlanWithAI(context: any) {
  try {
    // Get user's preferred language from coach settings
    const userLanguage = context.coachSettings?.language || 'en';
    
    const prompts = {
      en: `As an AI learning coach, generate a personalized daily learning plan for the user.

User Context:
- Points: ${context.profile?.points || 0}
- Recent Study Sessions: ${context.recentStudySessions?.length || 0} sessions
- Active Courses: ${context.activeCourses?.map((c: any) => c.course?.title).join(', ') || 'None'}
- Learning Paths: ${context.activeLearningPaths?.map((p: any) => p.title).join(', ') || 'None'}
- Recent Mistakes: ${context.recentMistakes?.length || 0} questions
- Daily Study Goal: ${context.coachSettings?.target_daily_minutes || 60} minutes

Please generate a learning plan with the following structure:`,
      zh: `作为AI学习教练，为用户生成今日个性化学习计划。

用户上下文：
- 积分：${context.profile?.points || 0}
- 最近学习时长：${context.recentStudySessions?.length || 0}个会话
- 活跃课程：${context.activeCourses?.map((c: any) => c.course?.title).join(', ') || '无'}
- 学习路径：${context.activeLearningPaths?.map((p: any) => p.title).join(', ') || '无'}
- 最近错题：${context.recentMistakes?.length || 0}道
- 目标每日学习：${context.coachSettings?.target_daily_minutes || 60}分钟

请生成包含以下结构的学习计划：`
    };

    const jsonStructure = {
      en: `
{
  "title": "Daily Learning Plan Title",
  "description": "Plan description",
  "insights": "Learning insights based on user data",
  "motivationMessage": "Motivational message",
  "tasks": [
    {
      "title": "Task title",
      "description": "Task description",
      "type": "study|review|quiz|reading|practice|video|exercise",
      "priority": "low|medium|high|urgent",
      "difficulty": "easy|medium|hard",
      "estimatedMinutes": 25,
      "pointsReward": 10,
      "category": "Category label",
      "relatedCourseId": null,
      "relatedLessonId": null,
      "relatedContentType": null,
      "relatedContentId": null
    }
  ]
}

Requirements:
1. Generate 4-8 micro-tasks, total time should not exceed target time
2. Tasks should be specific and actionable, avoid vague descriptions
3. Arrange review tasks based on mistake patterns
4. Arrange learning tasks based on course progress
5. Include motivational language
6. Progressive task difficulty and reasonable priorities`,
      zh: `
{
  "title": "今日学习计划标题",
  "description": "计划描述",
  "insights": "基于用户数据的学习洞察",
  "motivationMessage": "激励消息",
  "tasks": [
    {
      "title": "任务标题",
      "description": "任务描述",
      "type": "study|review|quiz|reading|practice|video|exercise",
      "priority": "low|medium|high|urgent",
      "difficulty": "easy|medium|hard",
      "estimatedMinutes": 25,
      "pointsReward": 10,
      "category": "分类标签",
      "relatedCourseId": null,
      "relatedLessonId": null,
      "relatedContentType": null,
      "relatedContentId": null
    }
  ]
}

要求：
1. 生成4-8个微任务，总时长不超过目标时间
2. 任务要具体可执行，避免泛泛而谈
3. 根据错题情况安排复习任务
4. 根据课程进度安排学习任务
5. 包含激励性语言
6. 任务难度递进，优先级合理`
    };

    const fullPrompt = prompt + (jsonStructure[userLanguage as keyof typeof jsonStructure] || jsonStructure.en);

    const result = await aiWorkflowExecutor.simpleAICall(fullPrompt);
    
    // 解析AI响应
    let aiPlan;
    try {
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        aiPlan = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in AI response');
      }
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      // 回退到默认计划
      aiPlan = getDefaultDailyPlan(context);
    }

    return aiPlan;

  } catch (error) {
    console.error('Error generating AI plan:', error);
    return getDefaultDailyPlan(context);
  }
}

// 默认学习计划模板
function getDefaultDailyPlan(context: any) {
  const targetMinutes = context.coachSettings?.target_daily_minutes || 60;
  const sessionLength = context.coachSettings?.preferred_session_length || 25;
  
  return {
    title: "今日学习计划",
    description: "为您精心安排的个性化学习任务",
    insights: "基于您的学习进度，今天适合巩固基础知识并推进新内容。",
    motivationMessage: "每一小步都是进步，坚持就是胜利！🚀",
    tasks: [
      {
        title: "回顾昨日学习内容",
        description: "快速回顾昨天学习的知识点，加深记忆",
        type: "review",
        priority: "high",
        difficulty: "easy",
        estimatedMinutes: 10,
        pointsReward: 5,
        category: "复习"
      },
      {
        title: "专注学习25分钟",
        description: "使用番茄钟技术，专注学习当前课程",
        type: "study",
        priority: "high",
        difficulty: "medium",
        estimatedMinutes: sessionLength,
        pointsReward: 15,
        category: "学习"
      },
      {
        title: "练习题巩固",
        description: "完成相关练习题，检验学习效果",
        type: "quiz",
        priority: "medium",
        difficulty: "medium",
        estimatedMinutes: 15,
        pointsReward: 10,
        category: "练习"
      },
      {
        title: "总结今日所学",
        description: "用自己的话总结今天学到的重点内容",
        type: "exercise",
        priority: "medium",
        difficulty: "easy",
        estimatedMinutes: 10,
        pointsReward: 8,
        category: "总结"
      }
    ]
  };
}
