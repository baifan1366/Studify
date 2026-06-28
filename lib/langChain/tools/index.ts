// Tool Index - Unified export of all tools
import { searchTool } from "./search-tool";
import { courseDataTool } from "./course-data-tool";
import { qaTool } from "./qa-tool";
import { userProfileTool } from "./user-profile-tool";
import { classroomTool } from "./classroom-tool";
import { contentAnalysisTool } from "./content-analysis-tool";
import { recommendationTool } from "./recommendation-tool";
import { courseRecommendationTool } from "./course-recommendation-tool";
import { quizGenerationTool } from "./quiz-generation-tool";
import {
  calculatorTool,
  dateTimeTool,
  textProcessingTool,
} from "./utility-tools";
import { webSearchTool } from "./tavily-search-tool";

function isWebSearchConfigured() {
  return Boolean(process.env.TAVILY_API_KEY?.trim());
}

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
    process_text: textProcessingTool,
  };

  if (isWebSearchConfigured()) {
    tools.web_search = webSearchTool;
    console.log("Web Search Tool registered (Tavily configured)");
  } else {
    console.warn("Web Search Tool not registered (TAVILY_API_KEY not configured)");
  }

  return tools;
}

export const AVAILABLE_TOOLS = buildAvailableTools();

export const TOOL_CATEGORIES = {
  SEARCH_AND_QA: ["search", "answer_question", "web_search"],
  WEB_SEARCH: ["web_search"],
  CONTENT_ANALYSIS: ["analyze_content"],
  CONTENT_GENERATION: ["generate_quiz"],
  DATA_ACCESS: ["get_course_data", "get_user_profile", "get_classroom_data"],
  RECOMMENDATIONS: ["recommend_content", "course_recommendations"],
  UTILITIES: ["calculate", "get_datetime", "process_text"],
};

export function getToolsByCategory(category: keyof typeof TOOL_CATEGORIES) {
  return TOOL_CATEGORIES[category]
    .map((name) => AVAILABLE_TOOLS[name])
    .filter(Boolean);
}

export function getAllTools() {
  return Object.values(AVAILABLE_TOOLS);
}

export function getToolByName(name: string) {
  return AVAILABLE_TOOLS[name];
}

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
  webSearchTool,
};

export function getToolInfo() {
  return Object.entries(AVAILABLE_TOOLS).map(([name, tool]) => {
    let category = "UTILITIES";
    for (const [candidate, toolNames] of Object.entries(TOOL_CATEGORIES)) {
      if ((toolNames as readonly string[]).includes(name)) {
        category = candidate;
        break;
      }
    }

    return {
      name: tool.name,
      description: tool.description,
      category,
      internalName: name,
    };
  });
}

export function validateToolExists(toolName: string) {
  return toolName in AVAILABLE_TOOLS;
}

export function getToolsByMultipleCategories(
  categories: (keyof typeof TOOL_CATEGORIES)[],
) {
  const tools = new Set<any>();
  categories.forEach((category) => {
    getToolsByCategory(category).forEach((tool) => tools.add(tool));
  });
  return Array.from(tools);
}
