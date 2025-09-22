# Studify LangChain Tool Calling Examples

## 🔧 Tool Calling System Overview

我们的tool calling系统为Studify平台提供了强大的AI代理功能，支持多种工具来增强用户体验：

### 可用工具类别

1. **SEARCH_AND_QA** - 搜索和问答
   - `search`: 语义搜索知识库
   - `answer_question`: 基于上下文的问答

2. **CONTENT_ANALYSIS** - 内容分析
   - `analyze_course`: 课程内容分析

3. **DATA_ACCESS** - 数据访问
   - `query_database`: 数据库查询
   - `get_user_profile`: 用户档案获取

4. **RECOMMENDATIONS** - 推荐系统
   - `recommend_content`: 个性化内容推荐

5. **UTILITIES** - 实用工具
   - `calculate`: 数学计算
   - `get_datetime`: 时间日期

## 🚀 使用示例

### 1. 前端React组件中使用

```tsx
import { useAIToolCalling } from '@/lib/langChain/ai-client';

function AIAssistantComponent() {
  const { 
    callWithTools, 
    educationalQA, 
    analyzeCourse, 
    isLoading, 
    error, 
    toolsUsed 
  } = useAIToolCalling();

  const handleAIQuery = async () => {
    try {
      // 基础工具调用
      const result = await callWithTools(
        "帮我找到关于机器学习的课程，并分析它们的难度等级",
        {
          toolCategories: ['SEARCH_AND_QA', 'CONTENT_ANALYSIS'],
          model: "openai/gpt-4o",
          temperature: 0.3
        }
      );
      
      console.log('AI Response:', result.result);
      console.log('Tools Used:', toolsUsed);
    } catch (err) {
      console.error('Error:', error);
    }
  };

  const handleEducationalQA = async () => {
    try {
      // 教育问答
      const result = await educationalQA(
        "什么是深度学习？它与机器学习有什么区别？",
        {
          contentTypes: ['course', 'lesson'],
          includeAnalysis: true
        }
      );
      
      console.log('Answer:', result.answer);
      console.log('Sources:', result.sources);
      console.log('Confidence:', result.confidence);
    } catch (err) {
      console.error('Error:', error);
    }
  };

  return (
    <div>
      <button onClick={handleAIQuery} disabled={isLoading}>
        {isLoading ? 'Processing...' : 'Ask AI with Tools'}
      </button>
      
      <button onClick={handleEducationalQA} disabled={isLoading}>
        Educational Q&A
      </button>
      
      {error && <div className="error">{error}</div>}
      {toolsUsed.length > 0 && (
        <div>Tools used: {toolsUsed.join(', ')}</div>
      )}
    </div>
  );
}
```

### 2. 服务端直接使用

```typescript
import { 
  StudifyToolCallingAgent, 
  enhancedAIExecutor 
} from '@/lib/langChain/tool-calling-integration';

// 创建自定义工具代理
async function customAIAgent() {
  const agent = new StudifyToolCallingAgent({
    model: "openai/gpt-4o",
    temperature: 0.3,
    toolCategories: ['SEARCH_AND_QA', 'CONTENT_ANALYSIS'],
    maxIterations: 10,
    userId: 123
  });

  await agent.initialize();

  const result = await agent.execute(
    "分析用户最近的学习进度，推荐适合的下一步课程"
  );

  console.log('AI Response:', result.output);
  console.log('Tools Used:', result.toolsUsed);
  console.log('Execution Time:', result.executionTime, 'ms');
}

// 使用增强的AI执行器
async function enhancedQA() {
  const result = await enhancedAIExecutor.educationalQA(
    "如何优化深度学习模型的性能？",
    {
      userId: 123,
      contentTypes: ['course', 'lesson'],
      includeAnalysis: true
    }
  );

  console.log('Answer:', result.answer);
  console.log('Confidence:', result.confidence);
  console.log('Tools Used:', result.toolsUsed);
}
```

### 3. API端点调用示例

```javascript
// 工具调用API
const toolCallResponse = await fetch('/api/ai/tools', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: "帮我搜索Python编程相关的课程，并计算学习这些课程需要多少小时",
    toolCategories: ['SEARCH_AND_QA', 'UTILITIES'],
    model: "openai/gpt-4o",
    temperature: 0.3,
    includeSteps: true
  })
});

const toolResult = await toolCallResponse.json();
console.log('Result:', toolResult.result);
console.log('Tools Used:', toolResult.toolsUsed);

// 教育问答API
const qaResponse = await fetch('/api/ai/qa', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    question: "什么是RESTful API设计的最佳实践？",
    contentTypes: ['course', 'lesson', 'post'],
    includeAnalysis: true
  })
});

const qaResult = await qaResponse.json();
console.log('Answer:', qaResult.answer);
console.log('Sources:', qaResult.sources);

// 课程分析API
const analysisResponse = await fetch('/api/ai/analyze', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    content: "这是一个关于React开发的课程内容...",
    analysisType: "topics",
    includeRecommendations: true
  })
});

const analysisResult = await analysisResponse.json();
console.log('Analysis:', analysisResult.analysis);
console.log('Recommendations:', analysisResult.recommendations);
```

## 🎯 实际使用场景

### 1. 智能学习助手
```typescript
// 场景：学生询问学习建议
const learningAssistant = async (userQuestion: string, userId: number) => {
  const agent = new StudifyToolCallingAgent({
    toolCategories: ['SEARCH_AND_QA', 'RECOMMENDATIONS', 'DATA_ACCESS'],
    userId
  });

  await agent.initialize();

  const result = await agent.execute(`
    基于用户的学习历史和偏好，回答这个问题：${userQuestion}
    
    请：
    1. 搜索相关的课程内容
    2. 获取用户的学习档案
    3. 提供个性化的学习建议
    4. 推荐相关的学习资源
  `);

  return result;
};
```

### 2. 课程内容智能分析
```typescript
// 场景：教师上传课程材料，AI自动分析并生成教学建议
const courseContentAnalyzer = async (courseContent: string, instructorId: number) => {
  const result = await enhancedAIExecutor.analyzeCourseContent(
    courseContent,
    'topics',
    {
      userId: instructorId,
      includeRecommendations: true
    }
  );

  return {
    topics: result.analysis,
    recommendations: result.recommendations,
    toolsUsed: result.toolsUsed
  };
};
```

### 3. 实时问答系统
```typescript
// 场景：课堂实时问答系统
const classroomQA = async (question: string, classroomId: string) => {
  const result = await enhancedAIExecutor.educationalQA(
    question,
    {
      contentTypes: ['course', 'lesson'],
      includeAnalysis: true
    }
  );

  // 可以进一步集成到classroom系统中
  return {
    answer: result.answer,
    confidence: result.confidence,
    sources: result.sources,
    classroomId
  };
};
```

## 📊 性能和监控

系统自动记录：
- 工具使用统计
- 执行时间
- 错误率
- 用户满意度

```typescript
// 获取工具使用统计
const getToolUsageStats = async () => {
  const stats = await fetch('/api/ai/tools/stats');
  return stats.json();
};
```

## 🔒 安全和权限

- 所有工具调用都需要用户认证
- 基于用户角色的工具访问控制
- 敏感操作需要额外权限验证
- 所有操作都有完整的审计日志

## 🚀 扩展新工具

添加新工具的步骤：

1. 在`tools.ts`中定义新工具
2. 添加到相应的工具类别
3. 更新API端点（如需要）
4. 添加前端Hook支持
5. 编写测试用例

```typescript
// 示例：添加新的翻译工具
export const translationTool = new StructuredTool({
  name: "translate_text",
  description: "Translate text between different languages",
  schema: z.object({
    text: z.string(),
    targetLanguage: z.string(),
    sourceLanguage: z.string().optional()
  }),
  func: async ({ text, targetLanguage, sourceLanguage }) => {
    // 翻译逻辑
    return `Translated text: ${text}`;
  }
});
```

这个tool calling系统为Studify平台提供了强大的AI功能，让用户能够通过自然语言与系统交互，获得个性化的学习支持和智能分析。
