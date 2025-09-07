import { getLLM } from '../client';
import { PromptTemplate } from '@langchain/core/prompts';
import { StructuredOutputParser } from 'langchain/output_parsers';
import { z } from 'zod';

// Define the chapter structure
const ChapterSchema = z.object({
  title: z.string().describe('Chapter title'),
  description: z.string().describe('Brief description of chapter content'),
  start_time_sec: z.number().optional().describe('Start time in seconds for video content'),
  end_time_sec: z.number().optional().describe('End time in seconds for video content'),
  order_index: z.number().describe('Chapter order/position'),
  key_concepts: z.array(z.string()).describe('Key concepts covered in this chapter'),
  estimated_duration_minutes: z.number().optional().describe('Estimated time to complete this chapter')
});

const ChaptersArraySchema = z.object({
  chapters: z.array(ChapterSchema),
  total_duration_minutes: z.number().optional(),
  difficulty_level: z.enum(['beginner', 'intermediate', 'advanced']),
  summary: z.string().describe('Overall content summary')
});

export type GeneratedChapter = z.infer<typeof ChapterSchema>;
export type ChapterAnalysisResult = z.infer<typeof ChaptersArraySchema>;

export class CourseChapterGenerator {
  private llm;
  private parser;

  constructor() {
    this.llm = getLLM('gpt-4o-mini');
    this.parser = StructuredOutputParser.fromZodSchema(ChaptersArraySchema);
  }

  async generateChaptersFromVideo(
    courseTitle: string,
    materialTitle: string,
    transcript: string,
    videoDurationSec?: number
  ): Promise<ChapterAnalysisResult> {
    const prompt = PromptTemplate.fromTemplate(`
You are an expert educational content analyzer. Analyze the following video transcript and generate a well-structured chapter breakdown.

Course: {courseTitle}
Material: {materialTitle}
Video Duration: {duration} seconds
Transcript: {transcript}

Create logical, educational chapters that:
1. Break down the content into digestible segments
2. Each chapter should be 3-8 minutes long for optimal learning
3. Include clear learning objectives for each chapter
4. Provide accurate time stamps based on content flow
5. Identify key concepts and skills taught

Consider the educational value and create chapters that build upon each other progressively.

{format_instructions}
`);

    const formattedPrompt = await prompt.format({
      courseTitle,
      materialTitle,
      transcript,
      duration: videoDurationSec || 'Unknown',
      format_instructions: this.parser.getFormatInstructions()
    });

    const response = await this.llm.invoke(formattedPrompt);
    return this.parser.parse(response.content as string);
  }

  async generateChaptersFromPDF(
    courseTitle: string,
    materialTitle: string,
    pdfContent: string,
    totalPages?: number
  ): Promise<ChapterAnalysisResult> {
    const prompt = PromptTemplate.fromTemplate(`
You are an expert educational content analyzer. Analyze the following PDF document content and generate a well-structured chapter breakdown.

Course: {courseTitle}
Material: {materialTitle}
Total Pages: {totalPages}
Content: {pdfContent}

Create logical, educational chapters that:
1. Break down the content into coherent sections
2. Each chapter should cover related concepts or topics
3. Include clear learning objectives for each chapter
4. Identify key concepts and skills taught
5. Estimate reading/study time for each chapter

For PDF content, focus on topical organization rather than time-based segments.

{format_instructions}
`);

    const formattedPrompt = await prompt.format({
      courseTitle,
      materialTitle,
      pdfContent: pdfContent.substring(0, 8000), // Limit content length
      totalPages: totalPages || 'Unknown',
      format_instructions: this.parser.getFormatInstructions()
    });

    const response = await this.llm.invoke(formattedPrompt);
    return this.parser.parse(response.content as string);
  }

  async enhanceChapterWithConcepts(
    chapterTitle: string,
    chapterDescription: string,
    courseContext: string
  ): Promise<string[]> {
    const conceptPrompt = PromptTemplate.fromTemplate(`
Analyze this course chapter and extract key learning concepts:

Course Context: {courseContext}
Chapter: {chapterTitle}
Description: {chapterDescription}

Extract 3-7 specific, actionable learning concepts that students will master in this chapter.
Return as a simple array of concept names.

Example format:
["Variable Declaration", "Function Parameters", "Error Handling"]
`);

    const formattedPrompt = await conceptPrompt.format({
      courseContext,
      chapterTitle,
      chapterDescription
    });

    const response = await this.llm.invoke(formattedPrompt);
    
    try {
      return JSON.parse(response.content as string);
    } catch {
      // Fallback parsing if JSON format isn't perfect
      const content = response.content as string;
      const concepts = content
        .split('\n')
        .map(line => line.replace(/^[-*"'\[\]]/g, '').trim())
        .filter(line => line.length > 0 && !line.includes('Example'))
        .slice(0, 7);
      
      return concepts;
    }
  }

  async generateQuizQuestions(
    chapterTitle: string,
    chapterDescription: string,
    keyConcepts: string[],
    difficultyLevel: 'beginner' | 'intermediate' | 'advanced' = 'beginner'
  ) {
    const quizPrompt = PromptTemplate.fromTemplate(`
Generate quiz questions for this course chapter:

Chapter: {chapterTitle}
Description: {chapterDescription}
Key Concepts: {keyConcepts}
Difficulty: {difficultyLevel}

Create 3-5 questions that test understanding of the key concepts.
Include multiple choice, true/false, and short answer questions.

Return in this JSON format:
{{
  "questions": [
    {{
      "question": "What is...",
      "type": "multiple_choice",
      "options": ["A", "B", "C", "D"],
      "correct_answer": "A",
      "explanation": "Because..."
    }}
  ]
}}
`);

    const formattedPrompt = await quizPrompt.format({
      chapterTitle,
      chapterDescription,
      keyConcepts: keyConcepts.join(', '),
      difficultyLevel
    });

    const response = await this.llm.invoke(formattedPrompt);
    
    try {
      return JSON.parse(response.content as string);
    } catch (error) {
      console.error('Failed to parse quiz questions:', error);
      return { questions: [] };
    }
  }
}