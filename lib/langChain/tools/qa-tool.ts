// Q&A Tool - 问答工具
import { DynamicTool } from "@langchain/core/tools";
import { answerQuestion } from '../langchain-integration';

export const qaTool = new DynamicTool({
  name: "answer_question",
  description: `Answer questions using the knowledge base with context retrieval. Use this to provide detailed, accurate answers based on available educational content.
  Input should be a JSON string: {"question": "your question", "contentTypes"?: ["course", "lesson"], "includeSourceReferences"?: true}`,
  func: async (input: string) => {
    try {
      const params = JSON.parse(input);
      const { question, contentTypes, includeSourceReferences = true } = params;

      if (!question) {
        return 'Error: question is required';
      }

      const result = await answerQuestion(question, {
        contentTypes,
        includeSourceReferences,
        maxContext: 5
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
      if (error instanceof SyntaxError) {
        return 'Error: Invalid JSON input. Please provide valid JSON with question parameter.';
      }
      return `Question answering failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }
});
