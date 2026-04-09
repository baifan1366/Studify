// Tool Index - 统一导出所有工具
import { searchTool } from './search-tool';
import { courseDataTool } from './course-data-tool';
import { qaTool } from './qa-tool';
import { userProfileTool } from './user-profile-tool';
import { classroomTool } from './classroom-tool';
import { contentAnalysisTool } from './content-analysis-tool';
import { recommendationTool } from './recommendation-tool';
import { courseRecommendationTool } from './course-recommendation-tool';
import { quizGenerationTool } from './quiz-generation-tool';
import { calculatorTool, dateTimeTool, textProcessingTool } from './utility-tools';
import { webSearchTool } from './web-search-tool';

// === TOOL REGISTRY ===
// Helper function to check if web search is configured
function isWebSearchConfigured(): boolean {
  const apiKey = process.env.GOOGLE_API_KEY;
  const cx = process.env.GOOGLE_CX;
  return !!(apiKey && apiKey.trim() !== '' && cx && cx.trim() !== '');
}

// Build available tools with conditional web search registration
function buildAvailableTools() {
  const tools: Record<string, any> = {
    search: searchTool,
    get_course_data: courseDataTool,
    answer_question: qaTool,
    get_user_profile: userProfileTool,
    get_classroom_data: classroomTool,
    analyze_content: contentAnalysisTool,
    recommend_content: recommendationTool,
    course_recommendations: courseRecommendationTool,
    generate_quiz: quizGenerationTool,
    calculate: calculatorTool,
    get_datetime: dateTimeTool,
    process_text: textProcessingTool
  };

  // Conditionally add web_search tool if API keys are configured
  if (isWebSearchConfigured()) {
    tools.web_search = webSearchTool;
    console.log('✅ Web Search Tool registered (API keys configured)');
  } else {
    console.warn('⚠️ Web Search Tool not registered (GOOGLE_API_KEY or GOOGLE_CX not configured)');
  }

  return tools;
}

export const AVAILABLE_TOOLS = buildAvailableTools();

// Tool categories for better organization
export const TOOL_CATEGORIES = {
  SEARCH_AND_QA: ['search', 'answer_question'],
  WEB_SEARCH: ['web_search'],
  CONTENT_ANALYSIS: ['analyze_content'],
  CONTENT_GENERATION: ['generate_quiz'],
  DATA_ACCESS: ['get_course_data', 'get_user_profile', 'get_classroom_data'],
  RECOMMENDATIONS: ['recommend_content', 'course_recommendations'],
  UTILITIES: ['calculate', 'get_datetime', 'process_text']
};

// Tool selection helpers
export function getToolsByCategory(category: keyof typeof TOOL_CATEGORIES) {
  const toolNames = TOOL_CATEGORIES[category];
  return toolNames
    .map(name => AVAILABLE_TOOLS[name as keyof typeof AVAILABLE_TOOLS])
    .filter(tool => tool !== undefined); // Filter out undefined tools (e.g., web_search if not configured)
}

export function getAllTools() {
  return Object.values(AVAILABLE_TOOLS);
}

export function getToolByName(name: string) {
  return AVAILABLE_TOOLS[name as keyof typeof AVAILABLE_TOOLS];
}

// Individual tool exports
export {
  searchTool,
  courseDataTool,
  qaTool,
  userProfileTool,
  classroomTool,
  contentAnalysisTool,
  recommendationTool,
  courseRecommendationTool,
  quizGenerationTool,
  calculatorTool,
  dateTimeTool,
  textProcessingTool,
  webSearchTool
};

// Tool information export
export function getToolInfo() {
  return Object.entries(AVAILABLE_TOOLS).map(([name, tool]) => {
    // Find category for this tool
    let category = 'UTILITIES';
    for (const [cat, toolNames] of Object.entries(TOOL_CATEGORIES)) {
      if (toolNames.includes(name)) {
        category = cat;
        break;
      }
    }

    return {
      name: tool.name,
      description: tool.description,
      category,
      internalName: name
    };
  });
}

// Validation helper
export function validateToolExists(toolName: string): boolean {
  return toolName in AVAILABLE_TOOLS;
}

// Get tools by multiple categories
export function getToolsByMultipleCategories(categories: (keyof typeof TOOL_CATEGORIES)[]) {
  const tools = new Set();
  categories.forEach(category => {
    getToolsByCategory(category).forEach(tool => tools.add(tool));
  });
  return Array.from(tools);
}
