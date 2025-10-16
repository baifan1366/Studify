import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/utils/auth/server-guard';
import { createAdminClient } from '@/utils/supabase/server';
import { StudifyToolCallingAgent } from '@/lib/langChain/tool-calling-integration';

// POST: Generate quiz from AI notes
export async function POST(req: NextRequest) {
  try {
    const authResult = await authorize('student');
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { payload } = authResult;
    const supabase = await createAdminClient();

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', payload.sub)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const userId = profile.id;
    const { noteIds, questionCount = 5, difficulty = 'intermediate' } = await req.json();

    if (!noteIds || noteIds.length === 0) {
      return NextResponse.json(
        { error: 'Note IDs are required' },
        { status: 400 }
      );
    }

    // Fetch the AI notes
    const { data: notes, error: notesError } = await supabase
      .from('course_notes')
      .select('*')
      .in('id', noteIds)
      .eq('user_id', userId);

    if (notesError || !notes || notes.length === 0) {
      return NextResponse.json({ error: 'Notes not found' }, { status: 404 });
    }

    // Generate quiz using AI
    const quiz = await generateQuizFromNotes(notes, questionCount, difficulty);

    // Save quiz to database (optional - create quiz_from_notes table if needed)
    // For now, return the generated quiz

    return NextResponse.json({
      success: true,
      quiz
    });

  } catch (error) {
    console.error('Error generating quiz from notes:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET: Fetch generated quizzes
export async function GET(req: NextRequest) {
  try {
    const authResult = await authorize('student');
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    // Note: Implement database fetch if quizzes are stored
    // For now, return empty array

    return NextResponse.json({
      success: true,
      data: []
    });

  } catch (error) {
    console.error('Error fetching quizzes:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function generateQuizFromNotes(
  notes: any[],
  questionCount: number,
  difficulty: string
) {
  try {
    const agent = new StudifyToolCallingAgent({
      enabledTools: [],
      temperature: 0.7,
      model: process.env.OPEN_ROUTER_MODEL || 'z-ai/glm-4.5-air:free'
    });

    await agent.initialize();

    const notesContent = notes.map((note, idx) => `
**Note ${idx + 1}: ${note.title}**
Content: ${note.content}
Summary: ${note.ai_summary || 'N/A'}
Tags: ${note.tags?.join(', ') || 'N/A'}
---`).join('\n\n');

    const prompt = `You are an educational AI creating a quiz from student notes.

**Source Notes:**
${notesContent}

**Task:**
Generate ${questionCount} high-quality multiple-choice questions at ${difficulty} difficulty level based on these notes.

**Requirements:**
- Each question should test understanding, not just memorization
- Include 4 answer options (A, B, C, D)
- Indicate the correct answer (0-3)
- Provide a clear explanation for the correct answer
- Identify which note the question is based on
- Extract the core concept being tested

**Return JSON format:**
\`\`\`json
{
  "title": "Quiz Title",
  "description": "Brief description",
  "difficulty": "${difficulty}",
  "estimatedTime": 10,
  "questions": [
    {
      "id": "q1",
      "question": "Question text?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0,
      "explanation": "Why this is correct",
      "sourceNoteId": "note_id",
      "concept": "Main concept tested"
    }
  ]
}
\`\`\`

Return ONLY the JSON object.`;

    const result = await agent.execute(prompt, {});
    
    let quizData;
    try {
      let cleanedOutput = result.output.trim();
      if (cleanedOutput.startsWith('```')) {
        cleanedOutput = cleanedOutput.replace(/```json?\n?/g, '').replace(/```$/g, '');
      }
      
      const jsonMatch = cleanedOutput.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        quizData = JSON.parse(jsonMatch[0]);
        
        // Add source note IDs
        quizData.questions = quizData.questions.map((q: any, idx: number) => ({
          ...q,
          sourceNoteId: notes[idx % notes.length].id,
          id: `q${idx + 1}`
        }));

        quizData.sourceNotes = notes.map(n => n.id);
        quizData.createdAt = new Date().toISOString();
        quizData.id = `quiz-${Date.now()}`;
      } else {
        throw new Error('No JSON found in AI response');
      }
    } catch (parseError) {
      console.error('Error parsing quiz JSON:', parseError);
      throw parseError;
    }

    return quizData;

  } catch (error) {
    console.error('Error in quiz generation:', error);
    throw error;
  }
}
