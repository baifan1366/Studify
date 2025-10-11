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

// === TOOL REGISTRY ===
export const AVAILABLE_TOOLS = {
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

// Tool categories for better organization
export const TOOL_CATEGORIES = {
  SEARCH_AND_QA: ['search', 'answer_question'],
  CONTENT_ANALYSIS: ['analyze_content'],
  CONTENT_GENERATION: ['generate_quiz'],
  DATA_ACCESS: ['get_course_data', 'get_user_profile', 'get_classroom_data'],
  RECOMMENDATIONS: ['recommend_content', 'course_recommendations'],
  UTILITIES: ['calculate', 'get_datetime', 'process_text']
};

// Tool selection helpers
export function getToolsByCategory(category: keyof typeof TOOL_CATEGORIES) {
  const toolNames = TOOL_CATEGORIES[category];
  return toolNames.map(name => AVAILABLE_TOOLS[name as keyof typeof AVAILABLE_TOOLS]);
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
  textProcessingTool
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
