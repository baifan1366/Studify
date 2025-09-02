import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/utils/supabase/server';
import { getAuthUser } from '@/lib/auth';

// 概念解释API路由
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    // 验证用户身份
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    const { id } = params;
    const { concept } = await req.json();

    // 验证请求参数
    if (!concept) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    // 初始化Supabase客户端
    const supabase = createSupabaseServerClient();

    // 获取会议信息
    const { data: sessionData, error: sessionError } = await supabase
      .from('classroom.live_session')
      .select('id')
      .eq('public_id', id)
      .single();

    if (sessionError) {
      console.error('获取会议信息失败:', sessionError);
      return NextResponse.json({ error: '获取会议信息失败' }, { status: 500 });
    }

    // 调用LLM生成概念解释
    // 这里是一个简化的示例，实际实现中需要调用OpenAI API或其他LLM服务
    // 由于涉及到第三方API调用，这里只提供一个框架

    // 模拟概念解释结果
    const explanation = {
      definition: `${concept}是一个重要的概念，它指的是...`,
      examples: [
        '示例1: ...',
        '示例2: ...',
        '示例3: ...',
      ],
      mindmap: {
        nodes: [
          { id: '1', label: concept, x: 0, y: 0 },
          { id: '2', label: '相关概念1', x: -100, y: -50 },
          { id: '3', label: '相关概念2', x: 100, y: -50 },
          { id: '4', label: '应用领域', x: 0, y: 100 },
        ],
        edges: [
          { source: '1', target: '2' },
          { source: '1', target: '3' },
          { source: '1', target: '4' },
        ],
      },
    };

    // 保存概念解释到数据库
    const { data: conceptData, error: conceptError } = await supabase
      .from('classroom.concept_explanation')
      .insert({
        session_id: sessionData.id,
        concept: concept,
        explanation: explanation,
        created_by: user.id,
        created_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (conceptError) {
      console.error('保存概念解释失败:', conceptError);
      return NextResponse.json({ error: '保存概念解释失败' }, { status: 500 });
    }

    return NextResponse.json({
      explanation,
      conceptId: conceptData.id,
    });
  } catch (error) {
    console.error('生成概念解释失败:', error);
    return NextResponse.json({ error: '生成概念解释失败' }, { status: 500 });
  }
}