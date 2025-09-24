import { NextResponse } from "next/server";
import { createServerClient } from "@/utils/supabase/server";
import { authorize } from '@/utils/auth/server-guard';

export async function GET(_: Request, { params }: { params: Promise<{ lessonId: string, quizId: string }> }) {
  try {
    const authResult = await authorize('tutor');
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    
    const client = await createServerClient();
    const { lessonId, quizId } = await params;
    const { data: { user } } = await client.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = user.id;

    const { data: questions, error: questionsError } = await client
      .from('course_quiz_question')
      .select('*')
      .eq("user_id", userId)
      .eq("lesson_id", lessonId)
      .eq("public_id", quizId)
      .eq('is_deleted', false)
      .single();

    if (questionsError) {
      return NextResponse.json(
        { error: 'Failed to fetch quiz questions' },
        { status: 500 }
      );
    }

    return NextResponse.json(questions);

  } catch (error) {
    console.error('Quiz fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ lessonId: string, quizId: string }> }) {
  try {
    const body = await req.json();
    const client = await createServerClient();
    const { lessonId, quizId } = await params;

    const updates = {
      question_text: body.question_text,
      question_type: body.question_type,
      options: body.options,
      correct_answer: body.correct_answer,
      explanation: body.explanation,
      points: body.points,
      difficulty: body.difficulty,
      position: body.position,
      updated_at: new Date().toISOString(),
    } as Record<string, any>;

    Object.keys(updates).forEach((k) => updates[k] === undefined && delete updates[k]);

    const { data, error } = await client
      .from("course_quiz_question")
      .update(updates)
      .eq("lesson_id", lessonId)
      .eq("public_id", quizId)
      .eq("is_deleted", false)
      .select("*")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Internal error" }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ lessonId: string, quizId: string }> }) {
  try {
    const client = await createServerClient();
    const { lessonId, quizId } = await params;
    
    const { error } = await client
      .from("course_quiz_question")
      .update({ is_deleted: true, deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("lesson_id", lessonId)
      .eq("public_id", quizId);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Internal error" }, { status: 500 });
  }
}
