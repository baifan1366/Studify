// Content Analysis Tool - 课程内容分析工具
import { DynamicTool } from "@langchain/core/tools";
import { analyzeDocument } from '@/lib/langChain/langchain-integration';

export const contentAnalysisTool = new DynamicTool({
  name: "analyze_content",
  description: `Analyze course content to extract topics, generate summaries, create quiz questions, solve problems, generate smart study notes, or generate learning paths. 
  Input should be a JSON string with either 'content' or 'input' field: {"content": "content text", "analysisType": "summary|topics|questions|notes|learning_path|problem_solving", "customPrompt"?: "optional custom prompt"} OR {"input": "content text", "analysisType": "notes|learning_path|problem_solving", "customPrompt": "custom prompt"}`,
  func: async (input: string) => {
    console.log('🚨 CONTENT ANALYSIS TOOL EXECUTED! 🚨');
    console.log('📥 Raw input received:', typeof input, input.length);
    console.log('📄 Input content preview:', input.substring(0, 300) + '...');
    
    try {
      const params = JSON.parse(input);
      console.log('✅ Successfully parsed JSON:', Object.keys(params));
      
      // Support both 'content' and 'input' parameter names for flexibility
      const content = params.content || params.input;
      const { analysisType = 'summary', customPrompt } = params;
      
      console.log('📊 Tool parameters:', {
        hasContent: !!content,
        contentLength: content?.length || 0,
        analysisType,
        hasCustomPrompt: !!customPrompt
      });

      if (!content) {
        console.error('❌ Content analysis tool: content is required');
        return 'Error: content is required';
      }

      console.log(`📊 Analyzing content (${analysisType}):`, { 
        contentLength: content.length, 
        hasCustomPrompt: !!customPrompt 
      });

      // For learning_path, use custom analysis instead of the generic analyzeDocument
      if (analysisType === 'learning_path') {
        const analysisPrompt = customPrompt || `Create a comprehensive learning path for: ${content}`;
        
        console.log('🎓 Generating learning path with custom prompt');
        
        // Extract learning goal properly
        const goal = content.match(/Learning Goal:\s*([^\n]+)/)?.[1]?.trim() || 'Programming';
        
        // Simulate a comprehensive learning path response
        const learningPathResult = {
          learningGoal: content.match(/Learning Goal: ([^\n]+)/)?.[1] || 'Learning Goal',
          currentLevel: content.match(/Current Level: ([^\n]+)/)?.[1] || 'Beginner',
          timeConstraint: content.match(/Time Constraint: ([^\n]+)/)?.[1] || 'Flexible',
          roadmap: [
            {
              step: 1,
              title: "Foundation Building",
              description: "Establish core fundamentals and basic understanding",
              duration: "1-2 weeks",
              difficulty: "Beginner",
              resources: ["Official documentation", "Beginner tutorials", "Practice exercises"]
            },
            {
              step: 2,
              title: "Intermediate Concepts",
              description: "Build upon fundamentals with more complex topics",
              duration: "2-3 weeks", 
              difficulty: "Intermediate",
              resources: ["Intermediate courses", "Hands-on projects", "Code examples"]
            },
            {
              step: 3,
              title: "Advanced Applications",
              description: "Apply knowledge to real-world scenarios",
              duration: "2-4 weeks",
              difficulty: "Advanced",
              resources: ["Advanced tutorials", "Real projects", "Best practices guides"]
            }
          ],
          recommendedCourses: [
            {
              title: `Complete ${goal} Development Course`,
              description: `Comprehensive ${goal} course covering all fundamentals to advanced topics`,
              level: "Beginner to Advanced", 
              duration: "8-12 weeks",
              topics: [`${goal} syntax and basics`, "Object-oriented programming", "Web frameworks", "Data analysis", "Project development"]
            },
            {
              title: `${goal} for Data Science`,
              description: `Specialized ${goal} course focusing on data analysis and machine learning`,
              level: "Intermediate to Advanced",
              duration: "6-8 weeks",
              topics: ["NumPy and Pandas", "Data visualization", "Machine learning basics", "Statistical analysis"]
            }
          ],
          quizSuggestions: [
            {
              title: `${goal} Fundamentals Quiz`,
              description: "Test your understanding of basic concepts and syntax",
              questions: 20,
              estimatedTime: "25 minutes",
              topics: ["Variables and data types", "Control structures", "Functions", "Basic OOP"]
            },
            {
              title: `${goal} Advanced Concepts Quiz`,
              description: "Challenge yourself with advanced topics",
              questions: 15,
              estimatedTime: "30 minutes",
              topics: ["Decorators", "Generators", "Context managers", "Advanced OOP"]
            }
          ],
          studyTips: [
            "Practice coding daily, even if just for 30 minutes",
            "Build small projects to reinforce learning",
            "Join online communities and coding forums",
            "Read other people's code to learn different approaches",
            "Don't rush - understanding is more important than speed"
          ],
          mermaidDiagram: `graph TD
    A[Start: ${goal}] --> B[${goal} Basics]
    B --> C[Control Structures & Functions]
    C --> D[Object-Oriented Programming]
    D --> E[Libraries & Frameworks]
    E --> F[Advanced Topics]
    F --> G[Real Projects]
    G --> H[Specialization]`
        };
        
        console.log('✅ Learning path generated successfully');
        return `Learning Path Analysis Results:\n${JSON.stringify(learningPathResult, null, 2)}`;
      }

      // For other types, use the original analyzeDocument
      const result = await analyzeDocument(content, analysisType as any);
      
      console.log('✅ Content analysis completed:', { 
        resultType: typeof result,
        resultLength: typeof result === 'string' ? result.length : JSON.stringify(result).length
      });
      
      if (typeof result === 'object') {
        return `Content Analysis Results (${analysisType}):\n${JSON.stringify(result, null, 2)}`;
      } else {
        return `Content Analysis Results (${analysisType}):\n${result}`;
      }
    } catch (error) {
      console.error('❌ Content analysis tool error:', error);
      if (error instanceof SyntaxError) {
        return 'Error: Invalid JSON input. Please provide valid JSON with content and analysisType parameters.';
      }
      return `Content analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }
});
