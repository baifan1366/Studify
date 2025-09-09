import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';
import { authorize } from '@/utils/auth/server-guard';
import { OpenAI } from '@/lib/stubs/openai';
import { v1 as uuidv1 } from 'uuid';

// 初始化OpenAI客户端
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 生成学习路径的AI函数
async function generateLearningPathWithAI(goal: string, duration: number) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `你是一个教育专家，负责为学生创建个性化学习路径。根据学生的学习目标和时间范围，生成一个详细的学习路径，包括里程碑和学习资源。`
        },
        {
          role: "user",
          content: `我的学习目标是：${goal}，我计划在${duration}天内完成。请为我创建一个学习路径，包括阶段性里程碑。`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    // 解析AI返回的JSON
    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('AI未返回有效内容');
    }

    const parsedContent = JSON.parse(content);
    return parsedContent;
  } catch (error) {
    console.error('调用AI生成学习路径失败:', error);
    throw error;
  }
}

// 处理学习路径生成请求
export async function POST(req: NextRequest) {
  try {
    // 验证用户身份
    const authResult = await authorize('student');
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const user = authResult.user;
    if (!user) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    // 解析请求体
    const { goal, duration } = await req.json();

    // 验证请求参数
    if (!goal || !duration) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    // 初始化Supabase客户端
    const supabase = await createServerClient();

    // 调用AI生成学习路径
    const aiResponse = await generateLearningPathWithAI(goal, duration);

    // 创建学习路径记录
    const { data: pathData, error: pathError } = await supabase
      .from('classroom.learning_path')
      .insert({
        user_id: user.id,
        goal,
        duration,
        progress: 0,
        is_active: true
      })
      .select('id')
      .single();

    if (pathError) {
      console.error('创建学习路径失败:', pathError);
      return NextResponse.json({ error: '创建学习路径失败' }, { status: 500 });
    }

    // 处理AI返回的里程碑数据
    const milestones = aiResponse.milestones || [];
    const milestonesWithIds = milestones.map((milestone: any, index: number) => ({
      id: uuidv1(),
      path_id: pathData.id,
      title: milestone.title,
      description: milestone.description || '',
      order_index: index,
      status: index === 0 ? 'in-progress' : 'locked',
      resource_type: milestone.resource_type || null,
      resource_id: milestone.resource_id || null,
      prerequisites: milestone.prerequisites || {},
      reward: milestone.reward || {},
    }));

    // 批量插入里程碑记录
    if (milestonesWithIds.length > 0) {
      const { error: milestonesError } = await supabase
        .from('classroom.milestone')
        .insert(milestonesWithIds);

      if (milestonesError) {
        console.error('创建里程碑失败:', milestonesError);
        return NextResponse.json({ error: '创建里程碑失败' }, { status: 500 });
      }
    }

    // 返回成功响应
    return NextResponse.json({
      success: true,
      pathId: pathData.id,
      milestones: milestonesWithIds.map((m: any) => ({
        id: m.id,
        title: m.title,
        order: m.order_index,
        locked: m.status === 'locked',
        status: m.status
      }))
    });

  } catch (error) {
    console.error('生成学习路径失败:', error);
    return NextResponse.json({ error: '生成学习路径失败' }, { status: 500 });
  }
}