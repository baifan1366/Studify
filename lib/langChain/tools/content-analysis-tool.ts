import { DynamicTool } from "@langchain/core/tools";
import { analyzeDocument } from "@/lib/langChain/langchain-integration";
import { getLLM } from "@/lib/langChain/client";

function extractJson(text: string): unknown {
  const json = text.replace(/```json\s*/gi, "").replace(/```/g, "").match(/\{[\s\S]*\}/)?.[0];
  if (!json) throw new Error("The model did not return a JSON object");
  return JSON.parse(json);
}

async function generateLearningPath(content: string, customPrompt?: string) {
  const llm = await getLLM({ streaming: false, temperature: 0.2, maxTokens: 7000 });
  const response = await llm.invoke(`You are a rigorous curriculum architect. Build a personalized, dependency-aware plan, not a generic topic list.

Learner context:
${content}

Additional request:
${customPrompt || "Create the most effective realistic learning path."}

Requirements:
- 6-12 concrete stages calibrated to the learner's starting level and time constraint.
- Every stage needs measurable outcomes, prerequisites, duration, difficulty, practice tasks, a checkpoint, and mastery criteria.
- Include at least two portfolio milestones plus review and recovery time.
- Do not invent course IDs or claim a resource exists. Studify recommendations are matched separately.
- The graph must read as a learning route, not a radial mind map. Use one
  start node followed by the roadmap stages in chronological order:
  root -> stage_1 -> stage_2 -> ... -> stage_n.
- Every roadmap stage must have one matching graph node. A stage may have up
  to two child nodes for a checkpoint or portfolio deliverable, but those
  children must not interrupt the main stage-to-stage route.
- Use 10-24 nodes total, stable ids, numeric levels that increase along the
  route, and explicit prerequisite/next-stage edges for React Flow.
  Do not output Mermaid and do not connect root directly to every stage.
- Return valid JSON only:
{"learningGoal":"...","currentLevel":"...","timeConstraint":"...","summary":"...","roadmap":[{"id":"stage_1","title":"...","description":"...","duration":"...","difficulty":"...","prerequisites":["..."],"outcomes":["..."],"practiceTasks":["..."],"checkpoint":"...","masteryCriteria":["..."]}],"mindMap":{"nodes":[{"id":"root","label":"...","description":"...","level":0}],"edges":[{"source":"root","target":"stage_1","label":"prerequisite"}]},"milestones":[{"title":"...","evidence":"...","targetWeek":"..."}],"recommendedCourses":[],"quizSuggestions":[{"title":"...","topics":["..."],"questions":15,"estimatedTime":"20 minutes"}],"studyTips":["..."]}`);
  const raw = typeof response.content === "string"
    ? response.content
    : response.content.map((part: any) => part.text || "").join("");
  return extractJson(raw);
}

export const contentAnalysisTool = new DynamicTool({
  name: "analyze_content",
  description: `Analyze educational content. Input JSON: {"content":"...","analysisType":"summary|topics|questions|notes|learning_path|problem_solving","customPrompt":"optional"}.`,
  func: async (input: string) => {
    try {
      const params = JSON.parse(input);
      const content = params.content || params.input;
      const analysisType = params.analysisType || "summary";
      if (!content) return "Error: content is required";

      if (analysisType === "learning_path") {
        const result = await generateLearningPath(content, params.customPrompt);
        return `Learning Path Analysis Results:\n${JSON.stringify(result, null, 2)}`;
      }

      const result = await analyzeDocument(content, analysisType);
      return `Content Analysis Results (${analysisType}):\n${
        typeof result === "string" ? result : JSON.stringify(result, null, 2)
      }`;
    } catch (error) {
      return `Content analysis failed: ${error instanceof Error ? error.message : "Unknown error"}`;
    }
  },
});
