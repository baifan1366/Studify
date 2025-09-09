import { NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

/**
 * AI自动批改
 * POST /api/classroom/assignments/:id/autograde
 * Body: { submissionId: string, internal_key: string }
 */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { params } = context;
  const assignmentId = params.id;
  
  try {
    // 解析请求体
    const { submissionId, internal_key } = await request.json();
    
    // 验证内部API密钥
    if (internal_key !== process.env.INTERNAL_API_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (!submissionId) {
      return NextResponse.json({ error: 'Submission ID is required' }, { status: 400 });
    }
    
const supabase = await createServerClient();
    
    // 获取提交内容
    const { data: submission, error: submissionError } = await supabase
      .from('assessment.submission')
      .select(`
        id,
        user_id,
        text_content,
        content_url
      `)
      .eq('id', submissionId)
      .eq('assignment_id', assignmentId)
      .eq('is_deleted', false)
      .single();
    
    if (submissionError || !submission) {
      console.error('Error fetching submission:', submissionError);
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }
    
    // 获取作业详情
    const { data: assignment, error: assignmentError } = await supabase
      .from('assessment.assignment')
      .select(`
        id,
        title,
        description
      `)
      .eq('id', assignmentId)
      .eq('is_deleted', false)
      .single();
    
    if (assignmentError || !assignment) {
      console.error('Error fetching assignment:', assignmentError);
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }
    
    // 调用AI模型进行评分
    const aiResponse = await gradeSubmissionWithAI({
      assignmentTitle: assignment.title,
      assignmentDescription: assignment.description,
      submissionContent: submission.text_content || '无文本内容',
      submissionFileUrl: submission.content_url || null
    });
    
    // 保存评分结果
    const { error: gradeError } = await supabase
      .from('assessment.grade')
      .upsert({
        assignment_id: assignmentId,
        user_id: submission.user_id,
        score: aiResponse.score,
        feedback: aiResponse.feedback,
        graded_at: new Date().toISOString()
      });
    
    if (gradeError) {
      console.error('Error saving grade:', gradeError);
      return NextResponse.json({ error: 'Failed to save grade' }, { status: 500 });
    }
    
    // 如果有错误，添加到错题本
    if (aiResponse.hasErrors) {
      const { error: mistakeError } = await supabase
        .from('mistake_book')
        .insert({
          user_id: submission.user_id,
          assignment_id: assignmentId,
          submission_id: submissionId,
          mistake_content: aiResponse.mistakeContent || submission.text_content,
          analysis: aiResponse.analysis,
          knowledge_points: aiResponse.knowledgePoints || [],
          recommended_exercises: aiResponse.recommendedExercises || {},
          is_deleted: false
        });
      
      if (mistakeError) {
        console.error('Error saving to mistake book:', mistakeError);
        // 不阻塞响应，记录错误
      }
    }
    
    return NextResponse.json({
      success: true,
      data: {
        score: aiResponse.score,
        feedback: aiResponse.feedback,
        added_to_mistake_book: aiResponse.hasErrors
      }
    });
  } catch (error) {
    console.error('Error processing autograde request:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * 使用AI模型对提交内容进行评分
 */
async function gradeSubmissionWithAI({
  assignmentTitle,
  assignmentDescription,
  submissionContent,
  submissionFileUrl
}: {
  assignmentTitle: string;
  assignmentDescription: string;
  submissionContent: string;
  submissionFileUrl: string | null;
}) {
  // 这里应该调用实际的AI模型API，如OpenAI
  // 为了演示，我们返回模拟数据
  
  // 模拟AI评分逻辑
  const score = Math.floor(Math.random() * 40) + 60; // 60-100分
  const hasErrors = score < 80;
  
  return {
    score,
    feedback: hasErrors 
      ? '作业中存在一些问题，请查看错题本了解详情。' 
      : '作业完成得很好，继续保持！',
    hasErrors,
    mistakeContent: hasErrors ? submissionContent : null,
    analysis: hasErrors 
      ? '你的答案中存在一些概念性错误，需要重新理解相关知识点。' 
      : null,
    knowledgePoints: hasErrors ? ['数据结构', '算法复杂度'] : [],
    recommendedExercises: hasErrors 
      ? { type: 'practice', ids: ['practice-1', 'practice-2'] } 
      : {}
  };
  
  // 实际实现应该类似：
  /*
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `你是一个教育AI助手，负责评分学生的作业提交。请根据作业要求和学生的提交内容，给出评分（0-100分）和详细反馈。
                   如果发现错误，请分析错误原因，提供相关知识点，并推荐练习题。`
        },
        {
          role: 'user',
          content: `作业标题：${assignmentTitle}\n\n作业描述：${assignmentDescription}\n\n学生提交内容：${submissionContent}${submissionFileUrl ? '\n\n提交文件：' + submissionFileUrl : ''}`
        }
      ],
      temperature: 0.7,
      max_tokens: 1000
    })
  });

  const data = await response.json();
  const aiOutput = data.choices[0].message.content;
  
  // 解析AI输出，提取评分、反馈等信息
  // ...
  
  return {
    score: extractedScore,
    feedback: extractedFeedback,
    hasErrors: extractedScore < 80,
    mistakeContent: hasErrors ? relevantMistakeContent : null,
    analysis: extractedAnalysis,
    knowledgePoints: extractedKnowledgePoints,
    recommendedExercises: extractedRecommendedExercises
  };
  */
}