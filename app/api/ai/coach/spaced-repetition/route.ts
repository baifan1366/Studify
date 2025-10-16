import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/utils/auth/server-guard';
import { createAdminClient } from '@/utils/supabase/server';
import { StudifyToolCallingAgent } from '@/lib/langChain/tool-calling-integration';

// GET: Fetch spaced repetition cards
export async function GET(req: NextRequest) {
  try {
    const authResult = await authorize('student');
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { payload } = authResult;
    const supabase = await createAdminClient();

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', payload.sub)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const userId = profile.id;
    const { searchParams } = new URL(req.url);
    const dueOnly = searchParams.get('due_only') === 'true';
    const limit = parseInt(searchParams.get('limit') || '20');

    // Note: This would require a spaced_repetition_cards table
    // For now, return empty array
    // Implementation would fetch from database and filter by next_review_date

    return NextResponse.json({
      success: true,
      data: []
    });

  } catch (error) {
    console.error('Error fetching SR cards:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST: Generate flashcards from notes
export async function POST(req: NextRequest) {
  try {
    const authResult = await authorize('student');
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { payload } = authResult;
    const supabase = await createAdminClient();

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', payload.sub)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const userId = profile.id;
    const { noteIds, cardsPerNote = 3 } = await req.json();

    if (!noteIds || noteIds.length === 0) {
      return NextResponse.json(
        { error: 'Note IDs are required' },
        { status: 400 }
      );
    }

    // Fetch notes
    const { data: notes } = await supabase
      .from('course_notes')
      .select('*')
      .in('id', noteIds)
      .eq('user_id', userId);

    if (!notes || notes.length === 0) {
      return NextResponse.json({ error: 'Notes not found' }, { status: 404 });
    }

    // Generate flashcards using AI
    const cards = await generateFlashcardsFromNotes(notes, cardsPerNote);

    // Save to database (requires spaced_repetition_cards table)
    // For now, return generated cards

    return NextResponse.json({
      success: true,
      cards
    });

  } catch (error) {
    console.error('Error generating flashcards:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH: Review a card (update SM-2 algorithm values)
export async function PATCH(req: NextRequest) {
  try {
    const authResult = await authorize('student');
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { cardId, quality } = await req.json();

    if (!cardId || quality === undefined) {
      return NextResponse.json(
        { error: 'Card ID and quality rating required' },
        { status: 400 }
      );
    }

    // Calculate next review using SM-2 algorithm
    // This would update the card in the database
    // For now, return calculated values

    const nextReview = calculateSM2({
      quality,
      interval: 1,
      easeFactor: 2.5,
      reviewCount: 0
    });

    return NextResponse.json({
      success: true,
      card: {
        nextReviewDate: nextReview.nextReviewDate,
        interval: nextReview.interval,
        easeFactor: nextReview.easeFactor
      }
    });

  } catch (error) {
    console.error('Error reviewing card:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function generateFlashcardsFromNotes(notes: any[], cardsPerNote: number) {
  try {
    const agent = new StudifyToolCallingAgent({
      enabledTools: [],
      temperature: 0.7,
      model: process.env.OPEN_ROUTER_MODEL || 'z-ai/glm-4.5-air:free'
    });

    await agent.initialize();

    const allCards = [];

    for (const note of notes) {
      const prompt = `Generate ${cardsPerNote} flashcards from this learning note.

**Note:**
Title: ${note.title}
Content: ${note.content}
Summary: ${note.ai_summary || 'N/A'}

**Requirements:**
- Create concise, focused question-answer pairs
- Questions should prompt recall of key concepts
- Answers should be clear and accurate
- Classify difficulty (easy/medium/hard)

**Return JSON array:**
\`\`\`json
[
  {
    "question": "What is...?",
    "answer": "Clear, concise answer",
    "difficulty": "medium",
    "tags": ["tag1", "tag2"]
  }
]
\`\`\`

Return ONLY the JSON array.`;

      const result = await agent.execute(prompt, {});
      
      let cards;
      try {
        let cleanedOutput = result.output.trim();
        if (cleanedOutput.startsWith('```')) {
          cleanedOutput = cleanedOutput.replace(/```json?\n?/g, '').replace(/```$/g, '');
        }
        
        const jsonMatch = cleanedOutput.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          cards = JSON.parse(jsonMatch[0]);
          
          // Add metadata
          cards = cards.map((card: any, idx: number) => ({
            id: `${note.id}-card-${idx}`,
            noteId: note.id,
            question: card.question,
            answer: card.answer,
            difficulty: card.difficulty || 'medium',
            nextReviewDate: new Date().toISOString(),
            interval: 0,
            easeFactor: 2.5,
            reviewCount: 0,
            source: 'ai_note',
            tags: card.tags || note.tags || []
          }));
          
          allCards.push(...cards);
        }
      } catch (parseError) {
        console.error('Error parsing flashcards:', parseError);
      }
    }

    return allCards;

  } catch (error) {
    console.error('Error generating flashcards:', error);
    throw error;
  }
}

// SM-2 Algorithm implementation
function calculateSM2(params: {
  quality: number; // 0-5
  interval: number;
  easeFactor: number;
  reviewCount: number;
}) {
  const { quality, interval, easeFactor, reviewCount } = params;
  
  let newInterval = interval;
  let newEaseFactor = easeFactor;

  if (quality >= 3) {
    // Correct response
    if (reviewCount === 0) {
      newInterval = 1;
    } else if (reviewCount === 1) {
      newInterval = 6;
    } else {
      newInterval = Math.round(interval * easeFactor);
    }
    
    newEaseFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  } else {
    // Incorrect response
    newInterval = 1;
  }

  // Ensure ease factor doesn't go below 1.3
  newEaseFactor = Math.max(1.3, newEaseFactor);

  const nextReviewDate = new Date();
  nextReviewDate.setDate(nextReviewDate.getDate() + newInterval);

  return {
    interval: newInterval,
    easeFactor: newEaseFactor,
    nextReviewDate: nextReviewDate.toISOString(),
    reviewCount: reviewCount + 1
  };
}
