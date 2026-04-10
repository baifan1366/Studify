// Q&A Tool - 问答工具
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from 'zod';
import { answerQuestion } from '../langchain-integration';

const QASchema = z.object({
  question: z.string().min(1).describe("The question to answer"),
  contentTypes: z.array(z.string()).optional().describe("Types of content to search for context"),
  includeSourceReferences: z.boolean().optional().default(true).describe("Whether to include source references in the answer"),
  model: z.string().optional().describe("LLM model to use for answering")
});

export const qaTool = new DynamicStructuredTool({
  name: "answer_question",
  description: `Answer questions using the knowledge base with context retrieval. Use this to provide detailed, accurate answers based on available educational content.`,
  schema: QASchema,
  func: async (input) => {
    try {
      console.log("🔧 QA Tool received input:", {
        hasInput: !!input,
        inputType: typeof input,
        inputKeys: input ? Object.keys(input) : [],
        questionExists: 'question' in (input || {}),
        questionValue: (input as any)?.question?.substring(0, 100),
        model: (input as any)?.model || 'default'
      });
      
      const { question, contentTypes, includeSourceReferences = true, model } = input;

      if (!question) {
        console.error("❌ QA Tool: question is missing or empty!", { question, input });
        return 'Error: question is required';
      }

      const result = await answerQuestion(question, {
        contentTypes,
        includeSourceReferences,
        maxContext: 5,
        model // Pass model to answerQuestion
      });
      
      let response = `Answer: ${result.answer}`;
      
      if (result.confidence) {
        response += `\n\nConfidence: ${(result.confidence * 100).toFixed(1)}%`;
      }
      
      if (result.reasoning) {
        response += `\n\nNote: ${result.reasoning}`;
      }
      
      if (result.sources.length > 0 && includeSourceReferences) {
        const sourceInfo = result.sources.map((source, index) => 
          `[${index + 1}] ${source.metadata.contentType}: ${source.pageContent.substring(0, 100)}...`
        ).join('\n');
        response += `\n\nCourse Sources:\n${sourceInfo}`;
      } else if (includeSourceReferences) {
        response += `\n\n💡 This answer is based on general AI knowledge since no relevant course content was found in the knowledge base.`;
      }
      
      return response;
    } catch (error) {
      return `Question answering failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }
});
