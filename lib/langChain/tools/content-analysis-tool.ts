// Content Analysis Tool - 课程内容分析工具
import { DynamicTool } from "@langchain/core/tools";
import { analyzeDocument } from '../langchain-integration';

export const contentAnalysisTool = new DynamicTool({
  name: "analyze_content",
  description: `Analyze course content to extract topics, generate summaries, or create quiz questions. 
  Input should be a JSON string: {"content": "content text or file path", "analysisType": "summary|topics|questions", "customPrompt"?: "optional custom prompt"}`,
  func: async (input: string) => {
    try {
      const params = JSON.parse(input);
      const { content, analysisType = 'summary', customPrompt } = params;

      if (!content) {
        return 'Error: content is required';
      }

      const result = await analyzeDocument(content, analysisType);
      
      if (typeof result === 'object') {
        return `Content Analysis Results (${analysisType}):\n${JSON.stringify(result, null, 2)}`;
      } else {
        return `Content Analysis Results (${analysisType}):\n${result}`;
      }
    } catch (error) {
      if (error instanceof SyntaxError) {
        return 'Error: Invalid JSON input. Please provide valid JSON with content and analysisType parameters.';
      }
      return `Content analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }
});
