import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';
import { authorize } from '@/utils/auth/server-guard';

// 翻译API路由
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    // 验证用户身份
    const authResult = await authorize('student');
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const user = authResult.user;

    const { id } = params;
    const { text, sourceLanguage = 'zh', targetLanguage = 'en' } = await req.json();

    // 验证请求参数
    if (!text) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    // 初始化Supabase客户端
    const supabase = await createServerClient();

    // 获取会议信息
    const { data: sessionData, error: sessionError } = await supabase
      .from('live_session')
      .select('id')
      .eq('public_id', id)
      .single();

    if (sessionError) {
      console.error('获取会议信息失败:', sessionError);
      return NextResponse.json({ error: '获取会议信息失败' }, { status: 500 });
    }

    // 调用翻译API
    // 这里是一个简化的示例，实际实现中需要调用Google Translate API或其他翻译服务
    // 由于涉及到第三方API调用，这里只提供一个框架

    // 模拟翻译结果
    const translation = `This is a simulated translation of: ${text}`;

    // 保存翻译结果到数据库
    const { data: translationData, error: translationError } = await supabase
      .from('translation')
      .insert({
        session_id: sessionData.id,
        original_text: text,
        translated_text: translation,
        source_language: sourceLanguage,
        target_language: targetLanguage,
        created_by: user.id,
        created_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (translationError) {
      console.error('保存翻译结果失败:', translationError);
      return NextResponse.json({ error: '保存翻译结果失败' }, { status: 500 });
    }

    return NextResponse.json({
      translation,
      translationId: translationData.id,
    });
  } catch (error) {
    console.error('翻译失败:', error);
    return NextResponse.json({ error: '翻译失败' }, { status: 500 });
  }
}