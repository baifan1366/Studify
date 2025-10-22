import { NextRequest, NextResponse } from 'next/server';
import { authorize } from '@/utils/auth/server-guard';
import { createAdminClient } from '@/utils/supabase/server';
import { StudifyToolCallingAgent } from '@/lib/langChain/tool-calling-integration';

// POST: Generate cross-path concept synthesis
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
    const { pathIds, focusConcept } = await req.json();

    if (!pathIds || pathIds.length < 2) {
      return NextResponse.json(
        { error: 'At least 2 learning paths required for synthesis' },
        { status: 400 }
      );
    }

    // Fetch learning paths
    const { data: paths, error: pathsError } = await supabase
      .from('learning_paths')
      .select('*')
      .in('id', pathIds)
      .eq('user_id', userId);

    if (pathsError || !paths || paths.length < 2) {
      return NextResponse.json({ error: 'Learning paths not found' }, { status: 404 });
    }

    // Fetch related AI notes for these paths
    const { data: notes } = await supabase
      .from('course_notes')
      .select('*')
      .eq('user_id', userId)
      .eq('note_type', 'ai_generated')
      .order('created_at', { ascending: false })
      .limit(20);

    // Generate synthesis using AI
    const synthesis = await generateConceptSynthesis(paths, notes || [], focusConcept);

    // Optionally save to database (requires concept_syntheses table)

    return NextResponse.json({
      success: true,
      synthesis
    });

  } catch (error) {
    console.error('Error generating concept synthesis:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET: Fetch saved concept syntheses
export async function GET(req: NextRequest) {
  try {
    const authResult = await authorize('student');
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    // Note: Would require concept_syntheses table
    // For now, return empty array

    return NextResponse.json({
      success: true,
      data: []
    });

  } catch (error) {
    console.error('Error fetching syntheses:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function generateConceptSynthesis(
  paths: any[],
  notes: any[],
  focusConcept?: string
) {
  try {
    const agent = new StudifyToolCallingAgent({
      enabledTools: [],
      temperature: 0.7,
      model: process.env.OPEN_ROUTER_MODEL || 'z-ai/glm-4.5-air:free'
    });

    await agent.initialize();

    const pathsInfo = paths.map((path, idx) => `
**Learning Path ${idx + 1}: ${path.title}**
Goal: ${path.learning_goal}
Level: ${path.current_level}
Description: ${path.description}
Roadmap: ${JSON.stringify(path.roadmap?.slice(0, 5) || [])}
---`).join('\n\n');

    const notesInfo = notes.slice(0, 10).map((note, idx) => `
**Note ${idx + 1}: ${note.title}**
${note.ai_summary || note.content.substring(0, 200)}
Tags: ${note.tags?.join(', ') || 'N/A'}
---`).join('\n\n');

    const prompt = `You are an AI learning analyst. Identify and synthesize connections between multiple learning paths.

**Learning Paths:**
${pathsInfo}

**Recent Learning Notes:**
${notesInfo}

${focusConcept ? `**Focus Concept:** ${focusConcept}` : ''}

**Task:**
Analyze these learning paths and find meaningful connections, overlapping concepts, and synergies.

**Generate synthesis with JSON structure:**
\`\`\`json
{
  "title": "Cross-Path Synthesis Title",
  "description": "Brief description of the synthesis",
  "synthesisText": "Detailed analysis of how these paths connect and complement each other. Identify shared concepts, transferable skills, and how learning in one path enhances the other.",
  "aiInsights": "Key insights about the learner's comprehensive skill development across these paths",
  "connections": [
    {
      "pathId": "path_id_1",
      "pathTitle": "Path Title",
      "concept": "Specific concept",
      "relationship": "How it relates to other paths",
      "notes": ["note_id"]
    }
  ],
  "practicalApplications": [
    "Practical project idea combining concepts from multiple paths",
    "Real-world application leveraging cross-path knowledge"
  ],
  "suggestedProjects": [
    {
      "title": "Project Title",
      "description": "Project combining multiple path concepts",
      "skills": ["skill1", "skill2"],
      "difficulty": "intermediate",
      "estimatedHours": 20
    }
  ]
}
\`\`\`

**Requirements:**
- Find at least 3 meaningful connections between paths
- Suggest practical applications combining multiple path concepts
- Identify transferable skills
- Propose 2-3 projects that leverage cross-path knowledge

Return ONLY the JSON object.`;

    const result = await agent.execute(prompt, {});
    
    let synthesisData;
    try {
      let cleanedOutput = result.output.trim();
      if (cleanedOutput.startsWith('```')) {
        cleanedOutput = cleanedOutput.replace(/```json?\n?/g, '').replace(/```$/g, '');
      }
      
      const jsonMatch = cleanedOutput.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        synthesisData = JSON.parse(jsonMatch[0]);
        
        // Add metadata
        synthesisData.id = `synthesis-${Date.now()}`;
        synthesisData.involvedPaths = paths.map(p => p.id);
        synthesisData.createdAt = new Date().toISOString();

        // Ensure connections have path info
        synthesisData.connections = synthesisData.connections?.map((conn: any) => {
          const path = paths.find(p => p.id === conn.pathId);
          return {
            ...conn,
            pathTitle: path?.title || conn.pathTitle,
            notes: notes
              .filter(n => n.content.toLowerCase().includes(conn.concept.toLowerCase()))
              .slice(0, 3)
              .map(n => n.id)
          };
        }) || [];
      } else {
        throw new Error('No JSON found in AI response');
      }
    } catch (parseError) {
      console.error('Error parsing synthesis JSON:', parseError);
      throw parseError;
    }

    return synthesisData;

  } catch (error) {
    console.error('Error in concept synthesis:', error);
    throw error;
  }
}
