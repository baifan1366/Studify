import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/utils/auth/server-guard';
import { createAdminClient } from '@/utils/supabase/server';
import { StudifyToolCallingAgent } from '@/lib/langChain/tool-calling-integration';
import { createRateLimitCheck, rateLimitResponse } from '@/lib/ratelimit';

// 每日学习计划生成接口 (升级版：Tool Calling)
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

    // Rate limiting check
    const checkLimit = createRateLimitCheck('ai');
    const { allowed, remaining, resetTime, limit } = checkLimit(userId.toString());
    
    if (!allowed) {
      console.log(`⚠️ Rate limit exceeded for user ${userId}`);
      return NextResponse.json(
        rateLimitResponse(resetTime, limit),
        { 
          status: 429,
          headers: rateLimitResponse(resetTime, limit).headers
        }
      );
    }
    
    console.log(`✅ Rate limit OK: ${remaining}/${limit} remaining for user ${userId}`);

    // Check if we should force regeneration (from client request)
    const { forceRegenerate } = await req.json().catch(() => ({ forceRegenerate: false }));

    // Check if plan already exists for today
    const { data: existingPlan } = await supabase
      .from('daily_learning_plans')
      .select('*')
      .eq('user_id', userId)
      .eq('plan_date', today)
      .single();

    // Only return existing plan if NOT forcing regeneration AND plan is not draft
    if (existingPlan && existingPlan.status !== 'draft' && !forceRegenerate) {
      console.log(`📋 Returning existing plan for ${today}`);
      return NextResponse.json({
        success: true,
        plan: existingPlan,
        message: 'Daily plan already exists for today'
      });
    }

    // Log regeneration
    if (forceRegenerate) {
      console.log(`🔄 Force regenerating plan for ${today}`);
    }

    // Gather learning context
    const learningContext = await gatherLearningContext(supabase, userId);

    // Use AI Tool Calling to generate daily learning plan
    console.log('🤖 Generating daily plan with tool calling...');
    const aiPlan = await generateDailyPlanWithToolCalling(userId, today);
    
    console.log('✅ AI Plan generated:', {
      title: aiPlan.title,
      tasksCount: aiPlan.tasks.length,
      insights: aiPlan.insights?.substring(0, 50) + '...',
      isEnglish: /^[a-zA-Z0-9\s.,!?'-]+$/.test(aiPlan.title)
    });

    // Save or update plan to database
    let savedPlan;
    if (existingPlan) {
      // Update existing draft or regenerated plan
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
          ai_model_version: process.env.OPEN_ROUTER_MODEL || 'deepseek-chat-v3.1',
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
      // Create new plan
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
          ai_model_version: process.env.OPEN_ROUTER_MODEL || 'deepseek-chat-v3.1',
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

    // Delete old tasks (if updating)
    if (existingPlan) {
      await supabase
        .from('daily_plan_tasks')
        .delete()
        .eq('plan_id', savedPlan.id);
    }

    // Insert new tasks
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

    // Return complete plan data
    const fullPlan = {
      ...savedPlan,
      tasks: insertedTasks
    };

    return NextResponse.json({
      success: true,
      plan: fullPlan,
      message: 'Daily learning plan generated successfully'
    }, {
      headers: {
        'X-RateLimit-Limit': limit.toString(),
        'X-RateLimit-Remaining': remaining.toString(),
        'X-RateLimit-Reset': resetTime.toString()
      }
    });

  } catch (error) {
    console.error('Error generating daily plan:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Get today's learning plan
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

    // Get plan and tasks for specified date
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

// Update task completion status
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

    // 获取最近的AI笔记
    const { data: aiNotes } = await supabase
      .from('course_notes')
      .select('*')
      .eq('user_id', userId)
      .eq('note_type', 'ai_generated')
      .order('created_at', { ascending: false })
      .limit(10);

    context.recentAINotes = aiNotes || [];

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

// 使用 Tool Calling 生成每日学习计划（升级版）
async function generateDailyPlanWithToolCalling(userId: number, today: string) {
  try {
    // 首先收集上下文数据
    const supabase = await createAdminClient();
    const context = await gatherLearningContext(supabase, userId);
    
    console.log('📊 Context gathered:', {
      userId,
      hasProfile: !!context.profile,
      activeCourses: context.activeCourses?.length || 0,
      learningPaths: context.activeLearningPaths?.length || 0,
      aiNotes: context.recentAINotes?.length || 0,
      studySessions: context.recentStudySessions?.length || 0
    });
    
    // 使用更强大的模型来保证JSON生成质量
    // DeepSeek V3 或 GPT-4o-mini 都支持良好的JSON格式输出
    const modelToUse = process.env.OPEN_ROUTER_MODEL || 'deepseek/deepseek-chat';
    
    console.log('🤖 Using model for plan generation:', modelToUse);
    
    // 不使用agent，直接使用LLM生成JSON
    // Agent可能会导致工具调用失败，我们直接用LLM生成计划
    const { getLLM } = require('@/lib/langChain/client');
    const llm = await getLLM({
      model: modelToUse,
      temperature: 0.45,
    });

    // 构建包含完整上下文的提示
    const contextInfo = `
**User Profile:**
- Total Study Time: ${context.recentStudySessions?.reduce((sum: number, s: any) => sum + (s.duration_minutes || 0), 0) || 0} minutes (recent sessions)
- Active Courses: ${context.activeCourses?.length || 0}
- Learning Paths: ${context.activeLearningPaths?.length || 0}
- Recent Mistakes: ${context.recentMistakes?.length || 0}

**Active Courses:**
${context.activeCourses?.map((c: any) => `- ${c.course?.title || 'Course'} (${c.progress_percentage || 0}% complete)`).join('\n') || 'None'}

**Learning Paths:**
${context.activeLearningPaths?.map((p: any) => `- ${p.title}: ${p.description}`).join('\n') || 'None'}

**Recent AI Notes:**
${context.recentAINotes?.map((n: any) => `- ${n.title}: ${n.ai_summary || n.content?.substring(0, 100)}`).join('\n') || 'None'}

**Recent Mistakes:**
${context.recentMistakes?.map((m: any) => `- ${m.quiz_question?.question_text || 'Unresolved quiz mistake'}${m.quiz_question?.explanation ? ` — ${m.quiz_question.explanation}` : ''}`).join('\n') || 'None'}

**Coach Settings:**
- Target Daily Minutes: ${context.coachSettings?.target_daily_minutes || 60}
- Preferred Difficulty: ${context.coachSettings?.preferred_difficulty || 'medium'}
- Max Daily Tasks: ${context.coachSettings?.max_daily_tasks || 8}
`;

    const prompt = `You are an AI learning coach creating a personalized daily learning plan.

${contextInfo}

**CRITICAL INSTRUCTION:** You MUST respond EXCLUSIVELY IN ENGLISH. All text including titles, descriptions, insights, and motivation messages MUST be in English language. Do NOT use Chinese or any other language.

**RESPONSE FORMAT:** You MUST respond with ONLY a valid JSON object. No explanations, no markdown, no code blocks, just pure JSON. Start directly with { and end with }.

**Generate a plan with EXACTLY this structure:**
{
  "title": "Today's Learning Plan",
  "description": "One sentence stating today's concrete focus IN ENGLISH",
  "insights": "One concise sentence explaining which real signals shaped the plan IN ENGLISH",
  "motivationMessage": "A useful closing sentence of at most 12 words IN ENGLISH",
  "tasks": [
    {
      "title": "Specific task title IN ENGLISH",
      "description": "A measurable completion instruction that names the source and expected output IN ENGLISH",
      "type": "study",
      "priority": "high",
      "difficulty": "medium",
      "estimatedMinutes": 25,
      "pointsReward": 10,
      "category": "Learning"
    }
  ]
}

**Planning standard:**
- Generate 3-4 tasks totaling ${Math.max(30, (context.coachSettings?.target_daily_minutes || 60) - 10)}-${context.coachSettings?.target_daily_minutes || 60} minutes
- Ground every task in one concrete item above: an active course, recent mistake, AI note, or current learning-path goal
- Start each title with a clear action verb and make each description testable
- Use actual course, note, mistake topic, or learning-path names; never invent a course or lesson
- Prefer unfinished/recent course work first, then mistake repair or retrieval practice
- Never create generic tasks such as "Focused Study Session", "Review materials", or "Practice Exercises"
- Use only one high-priority task unless a real deadline is present; order tasks in execution sequence
- Keep insights under 30 words and do not repeat lifetime study-time statistics
- Task types: study, review, quiz, reading, practice, video, exercise
- Priorities: low, medium, high, urgent
- Difficulties: easy, medium, hard
- ALL TEXT MUST BE IN ENGLISH - NO CHINESE CHARACTERS ALLOWED

**IMPORTANT:** Respond with ONLY the JSON object in ENGLISH. Start with { and end with }. No other text. No markdown. No code blocks.`;

    console.log('📤 Sending prompt to LLM (length:', prompt.length, ')');
    
    const response = await llm.invoke(prompt);
    const rawOutput = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
    
    console.log('📥 LLM raw response (first 300 chars):', rawOutput.substring(0, 300));
    console.log('📏 Full response length:', rawOutput.length);

    // 解析 AI 响应
    let aiPlan;
    try {
      // Remove any markdown or code block markers
      let cleanedOutput = rawOutput.trim();
      
      console.log('🧹 Cleaning output...');
      
      // Remove markdown code blocks
      cleanedOutput = cleanedOutput.replace(/```json\s*/g, '').replace(/```\s*/g, '');
      
      // Remove any leading/trailing non-JSON text
      const jsonStart = cleanedOutput.indexOf('{');
      const jsonEnd = cleanedOutput.lastIndexOf('}');
      
      if (jsonStart >= 0 && jsonEnd >= 0 && jsonEnd > jsonStart) {
        cleanedOutput = cleanedOutput.substring(jsonStart, jsonEnd + 1);
        console.log('🔍 Extracted JSON (first 200 chars):', cleanedOutput.substring(0, 200));
      } else {
        console.error('❌ No valid JSON boundaries found');
        throw new Error('No JSON boundaries found in AI response');
      }
      
      // Parse the JSON
      aiPlan = JSON.parse(cleanedOutput);
      
      console.log('✅ Successfully parsed AI plan:', {
        title: aiPlan.title,
        tasksCount: aiPlan.tasks?.length || 0,
        hasInsights: !!aiPlan.insights,
        hasMotivation: !!aiPlan.motivationMessage,
        isEnglish: /^[a-zA-Z0-9\s.,!?'"\-:;()]+$/.test(aiPlan.title)
      });
      
      // Validate the plan structure
      if (!aiPlan.title || !aiPlan.tasks || !Array.isArray(aiPlan.tasks)) {
        console.error('❌ Invalid plan structure:', { hasTitle: !!aiPlan.title, hasTasks: !!aiPlan.tasks, isArray: Array.isArray(aiPlan.tasks) });
        throw new Error('Invalid plan structure from AI');
      }

      aiPlan.tasks = aiPlan.tasks.slice(0, 4);
      
    } catch (parseError) {
      console.error('❌ Error parsing AI response:', parseError);
      console.log('❌ Raw output (first 500 chars):', rawOutput.substring(0, 500));
      console.log('❌ Falling back to default plan');
      // 回退到默认计划
      aiPlan = getDefaultDailyPlan(context);
    }

    return aiPlan;

  } catch (error) {
    console.error('❌ Error generating AI plan:', error);
    return getDefaultDailyPlan({ userId });
  }
}

// Default learning plan template - ALL IN ENGLISH
function getDefaultDailyPlan(context: any) {
  const targetMinutes = context.coachSettings?.target_daily_minutes || 60;
  const sessionLength = context.coachSettings?.preferred_session_length || 25;
  const activeCourse = context.activeCourses?.[0]?.course?.title;
  const recentNote = context.recentAINotes?.[0]?.title;
  const recentMistake = context.recentMistakes?.[0]?.quiz_question?.question_text;
  const focusName = activeCourse || recentNote || 'your current learning goal';
  
  return {
    title: "Today's Learning Plan",
    description: `A focused ${targetMinutes}-minute plan built around ${focusName}.`,
    insights: activeCourse
      ? `Your most recent active course, ${activeCourse}, is the strongest next step.`
      : "No recent course activity was available, so this plan uses retrieval and reflection.",
    motivationMessage: "Every small step is progress. Persistence leads to victory! 🚀",
    tasks: [
      {
        title: activeCourse ? `Continue ${activeCourse}` : "Define today's learning outcome",
        description: activeCourse
          ? `Complete the next unfinished section in ${activeCourse} and record three key points.`
          : "Choose one current topic and write one measurable outcome for this session.",
        type: activeCourse ? "study" : "exercise",
        priority: "high",
        difficulty: "medium",
        estimatedMinutes: sessionLength,
        pointsReward: 15,
        category: activeCourse || "Planning"
      },
      {
        title: recentMistake ? "Repair a recent quiz mistake" : "Test recall without notes",
        description: recentMistake
          ? `Re-answer this question and explain why the correct answer works: ${recentMistake}`
          : `Write five questions about ${focusName}, answer them without notes, then check your answers.`,
        type: "quiz",
        priority: "medium",
        difficulty: "medium",
        estimatedMinutes: 15,
        pointsReward: 10,
        category: recentMistake ? "Mistake repair" : "Retrieval"
      },
      {
        title: recentNote ? `Apply ideas from ${recentNote}` : "Create a concise learning summary",
        description: recentNote
          ? `Use one idea from ${recentNote} in a small example and note what remains unclear.`
          : `Summarize ${focusName} in three bullets and add one question for the next session.`,
        type: "exercise",
        priority: "medium",
        difficulty: "medium",
        estimatedMinutes: 15,
        pointsReward: 10,
        category: recentNote ? "Application" : "Reflection"
      }
    ]
  };
}
