import { NextResponse } from "next/server";
import { createServerClient } from "@/utils/supabase/server";
import { authorize } from '@/utils/auth/server-guard';

export async function GET(_: Request, { params }: { params: Promise<{ lessonId: string }> }) {
  try {
    const authResult = await authorize('tutor');
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    
    const client = await createServerClient();
    const { lessonId } = await params;
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
      .eq('is_deleted', false)
      .order('position', { ascending: true });

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

export async function POST(req: Request, { params }: { params: Promise<{ lessonId: string }> }) {
    try {
        const authResult = await authorize('tutor');
        if (authResult instanceof NextResponse) {
            return authResult;
        }
        
        const client = await createServerClient();
        const { lessonId } = await params;
        const { data: { user } } = await client.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = user.id;
        const body = await req.json();
    
        if (!body.lesson_id) {
            return NextResponse.json({ error: "lesson_id is required" }, { status: 422 });
        }
  
        const payload = {
            question_text: body.question_text,
            question_type: body.question_type,
            options: body.options,
            correct_answer: body.correct_answer,
            explanation: body.explanation,
            points: body.points,
            difficulty: body.difficulty,
            position: body.position,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            is_deleted: false,
            lesson_id: lessonId,
            user_id: userId,
        };
    
        if (!payload.question_text) {
            return NextResponse.json({ error: "question_text is required" }, { status: 422 });
        }
    
        if (!payload.question_type) {
            return NextResponse.json({ error: "question_type is required" }, { status: 422 });
        }
    
        const { data, error } = await client
            .from("course_quiz_question")
            .insert([payload])
            .select("*")
            .single();
    
        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }
  
      return NextResponse.json({ data }, { status: 201 });
    } catch (e: any) {
      return NextResponse.json({ error: e?.message ?? "Internal error" }, { status: 500 });
    }
}