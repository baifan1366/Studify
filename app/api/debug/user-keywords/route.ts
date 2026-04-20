import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';
import { authorize } from '@/utils/auth/server-guard';

/**
 * Debug API: View user's AI activity keywords extraction
 * 
 * This endpoint shows:
 * - Raw data from AI activities
 * - Extracted keywords with frequencies
 * - Top keywords by source
 */
export async function GET(request: NextRequest) {
  try {
    // Authorize using app JWT and role guard
    const authResult = await authorize(['student', 'tutor']);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const supabase = await createServerClient();

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', authResult.sub)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    const userId = profile.id;
    console.log(`🔍 [User Keywords Debug] Analyzing for user ${userId}`);

    // Helper function to check if word is common
    function isCommonWord(word: string): boolean {
      const commonWords = new Set([
        'what', 'when', 'where', 'which', 'who', 'whom', 'whose', 'why', 'how',
        'this', 'that', 'these', 'those', 'the', 'and', 'but', 'for', 'with',
        'from', 'about', 'into', 'through', 'during', 'before', 'after',
        'above', 'below', 'between', 'under', 'again', 'further', 'then',
        'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'both',
        'each', 'few', 'more', 'most', 'other', 'some', 'such', 'only', 'own',
        'same', 'than', 'too', 'very', 'can', 'will', 'just', 'should', 'now',
        'have', 'has', 'had', 'having', 'does', 'did', 'doing', 'would', 'could',
        'ought', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'them', 'their',
        'what', 'which', 'who', 'whom', 'this', 'that', 'am', 'is', 'are', 'was',
        'were', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
        'would', 'shall', 'should', 'may', 'might', 'must', 'can', 'could'
      ]);
      return commonWords.has(word.toLowerCase());
    }

    const keywordFrequency: Map<string, { count: number; sources: string[] }> = new Map();

    // 1. Get AI Q&A messages (user questions)
    const { data: qaMessages } = await supabase
      .from('ai_quick_qa_messages')
      .select(`
        id,
        content,
        created_at,
        session_id,
        ai_quick_qa_sessions!inner(user_id)
      `)
      .eq('ai_quick_qa_sessions.user_id', userId)
      .eq('role', 'user')
      .order('created_at', { ascending: false })
      .limit(30);

    console.log(`  ├─ AI Q&A messages: ${qaMessages?.length || 0} found`);

    const qaKeywords: string[] = [];
    qaMessages?.forEach((message: any) => {
      if (message.content) {
        const words = message.content
          .toLowerCase()
          .replace(/[^\w\s]/g, ' ')
          .split(/\s+/)
          .filter((word: string) => word.length > 3 && !isCommonWord(word));
        words.forEach((word: string) => {
          qaKeywords.push(word);
          const entry = keywordFrequency.get(word) || { count: 0, sources: [] };
          entry.count += 2;
          if (!entry.sources.includes('Q&A')) entry.sources.push('Q&A');
          keywordFrequency.set(word, entry);
        });
      }
    });

    // 2. Get mistake book entries
    const { data: mistakes } = await supabase
      .from('mistake_book')
      .select('id, title, subject, question_text, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(15);

    const mistakeKeywords: string[] = [];
    mistakes?.forEach((mistake: any) => {
      if (mistake.title) {
        const words = mistake.title
          .toLowerCase()
          .replace(/[^\w\s]/g, ' ')
          .split(/\s+/)
          .filter((word: string) => word.length > 3 && !isCommonWord(word));
        words.forEach((word: string) => {
          mistakeKeywords.push(word);
          const entry = keywordFrequency.get(word) || { count: 0, sources: [] };
          entry.count += 1.5;
          if (!entry.sources.includes('Mistakes')) entry.sources.push('Mistakes');
          keywordFrequency.set(word, entry);
        });
      }
      if (mistake.subject) {
        const subject = mistake.subject.toLowerCase();
        mistakeKeywords.push(subject);
        const entry = keywordFrequency.get(subject) || { count: 0, sources: [] };
        entry.count += 3;
        if (!entry.sources.includes('Mistakes')) entry.sources.push('Mistakes');
        keywordFrequency.set(subject, entry);
      }
    });

    // 3. Get course notes
    const { data: notes } = await supabase
      .from('course_notes')
      .select('id, title, tags, content, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    // Filter out auto-generated error notes
    const validNotes = notes?.filter((note: any) => {
      // Skip notes with error messages
      if (note.content?.includes('Content analysis failed') || 
          note.content?.includes('Provider returned error') ||
          note.content?.includes('429') ||
          note.content?.includes('rate limit')) {
        return false;
      }
      // Skip notes with only ai_generated tag and no real content
      if (note.tags?.includes('ai_generated') && 
          (!note.content || note.content.length < 50)) {
        return false;
      }
      return true;
    }) || [];

    const noteKeywords: string[] = [];
    validNotes?.forEach((note: any) => {
      if (note.title) {
        const words = note.title
          .toLowerCase()
          .replace(/[^\w\s]/g, ' ')
          .split(/\s+/)
          .filter((word: string) => word.length > 3 && !isCommonWord(word));
        words.forEach((word: string) => {
          noteKeywords.push(word);
          const entry = keywordFrequency.get(word) || { count: 0, sources: [] };
          entry.count += 2;
          if (!entry.sources.includes('Notes')) entry.sources.push('Notes');
          keywordFrequency.set(word, entry);
        });
      }
      if (note.tags && Array.isArray(note.tags)) {
        note.tags.forEach((tag: string) => {
          const tagLower = tag.toLowerCase();
          noteKeywords.push(tagLower);
          const entry = keywordFrequency.get(tagLower) || { count: 0, sources: [] };
          entry.count += 3;
          if (!entry.sources.includes('Notes')) entry.sources.push('Notes');
          keywordFrequency.set(tagLower, entry);
        });
      }
      if (note.content) {
        const words = note.content
          .toLowerCase()
          .replace(/[^\w\s]/g, ' ')
          .split(/\s+/)
          .filter((word: string) => word.length > 4 && !isCommonWord(word));
        words.slice(0, 100).forEach((word: string) => {
          const entry = keywordFrequency.get(word) || { count: 0, sources: [] };
          entry.count += 0.5;
          if (!entry.sources.includes('Notes')) entry.sources.push('Notes');
          keywordFrequency.set(word, entry);
        });
      }
    });

    // 4. Get workflow templates
    const { data: workflows } = await supabase
      .from('ai_workflow_templates')
      .select('id, name, description, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    const workflowKeywords: string[] = [];
    workflows?.forEach((workflow: any) => {
      if (workflow.name) {
        const words = workflow.name
          .toLowerCase()
          .replace(/[^\w\s]/g, ' ')
          .split(/\s+/)
          .filter((word: string) => word.length > 3 && !isCommonWord(word));
        words.forEach((word: string) => {
          workflowKeywords.push(word);
          const entry = keywordFrequency.get(word) || { count: 0, sources: [] };
          entry.count += 2;
          if (!entry.sources.includes('Workflows')) entry.sources.push('Workflows');
          keywordFrequency.set(word, entry);
        });
      }
    });

    // Sort by frequency
    const sortedKeywords = Array.from(keywordFrequency.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .map(([word, data]) => ({
        keyword: word,
        frequency: data.count,
        sources: data.sources
      }));

    return NextResponse.json({
      success: true,
      userId,
      summary: {
        qaMessages: qaMessages?.length || 0,
        mistakes: mistakes?.length || 0,
        notes: notes?.length || 0,
        validNotes: validNotes?.length || 0,
        workflows: workflows?.length || 0,
        totalKeywords: sortedKeywords.length,
        uniqueKeywords: keywordFrequency.size
      },
      rawData: {
        qaMessages: qaMessages?.map((m: any) => ({
          id: m.id,
          content: m.content?.substring(0, 100) + '...',
          created_at: m.created_at
        })),
        mistakes: mistakes?.map((m: any) => ({
          id: m.id,
          title: m.title,
          subject: m.subject,
          created_at: m.created_at
        })),
        notes: validNotes?.map((n: any) => ({
          id: n.id,
          title: n.title,
          tags: n.tags,
          content_preview: n.content?.substring(0, 100) + '...',
          created_at: n.created_at
        })),
        workflows: workflows?.map((w: any) => ({
          id: w.id,
          name: w.name,
          created_at: w.created_at
        }))
      },
      keywordsBySource: {
        qa: [...new Set(qaKeywords)].slice(0, 20),
        mistakes: [...new Set(mistakeKeywords)].slice(0, 20),
        notes: [...new Set(noteKeywords)].slice(0, 20),
        workflows: [...new Set(workflowKeywords)].slice(0, 20)
      },
      topKeywords: sortedKeywords.slice(0, 50),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [User Keywords Debug] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to analyze user keywords',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
