# Studify AI Workflow 系统设置指南

## 📋 系统概览

我为你构建了一个完整的LangChain AI工作流系统，包含以下核心功能：

### 🔑 核心组件

1. **API Key 轮换管理** (`api-key-manager.ts`)
   - 自动切换API Key避免限制
   - 智能错误处理和冷却机制
   - 使用统计和性能监控

2. **双Embedding上下文管理** (`context-manager.ts`)
   - 结合E5-Small和BGE-M3模型
   - 智能上下文拼接和多样性控制
   - 内容类型权重和相关性排序

3. **AI工作流执行器** (`ai-workflow.ts`)
   - 预定义工作流和自定义步骤
   - 多次AI调用的编排和管理
   - 进度跟踪和错误重试

4. **简化客户端库** (`ai-client.ts`)
   - 便捷的前端调用接口
   - TypeScript类型支持
   - React Hooks集成

## ⚙️ 环境配置

### 1. 必需的环境变量

在你的 `.env.local` 或 `.env` 文件中添加：

```bash
# OpenRouter API Keys (至少配置1个，建议配置3个)
OPENROUTER_API_KEY_1="sk-or-v1-your-primary-key"
OPENROUTER_API_KEY_2="sk-or-v1-your-secondary-key"  
OPENROUTER_API_KEY_3="sk-or-v1-your-backup-key"

# Supabase (已有)
NEXT_PUBLIC_SUPABASE_URL="your-supabase-url"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# QStash (已有)
QSTASH_URL="https://qstash.upstash.io"
QSTASH_TOKEN="your-qstash-token"
QSTASH_CURRENT_SIGNING_KEY="your-signing-key"
```

### 2. 数据库设置

执行以下SQL文件来设置数据库：

```bash
# 1. 执行AI工作流表创建
psql -d your_database < db/ai_workflow_tables.sql

# 2. 如果需要新的embedding类型，执行：
psql -d your_database < db/additional_embedding_triggers.sql
psql -d your_database < db/additional_extract_functions.sql
```

## 🚀 快速开始

### 1. 基本用法 - 简单AI调用

```typescript
import { aiClient } from '@/lib/langChain/ai-client';

// 简单的AI问答
const result = await aiClient.simpleCall(
  "解释什么是机器学习",
  {
    model: "anthropic/claude-3.5-sonnet",
    temperature: 0.3,
    includeContext: true, // 自动获取相关上下文
    contextQuery: "机器学习 人工智能" // 上下文搜索查询
  }
);

console.log(result.result); // AI的回答
```

### 2. 复杂工作流 - 课程分析

```typescript
import { aiClient, WORKFLOWS } from '@/lib/langChain/ai-client';

// 执行课程分析工作流
const analysis = await aiClient.executeWorkflow(
  WORKFLOWS.COURSE_ANALYSIS,
  "分析这个JavaScript入门课程",
  {
    additionalContext: {
      courseId: 123,
      userLevel: "beginner"
    }
  }
);

// 获取分析结果
const topics = analysis.results['extract-topics'];
const summary = analysis.results['generate-summary'];  
const studyPlan = analysis.results['create-study-plan'];
```

### 3. 上下文管理 - 智能搜索

```typescript
// 获取相关学习内容
const context = await aiClient.getRelevantContext(
  "React Hooks 使用方法",
  {
    contentTypes: ['course', 'lesson', 'quiz_question'],
    maxTokens: 3000,
    maxChunks: 8,
    minSimilarity: 0.7
  }
);

console.log(context.context); // 格式化的上下文文本
console.log(context.chunks);  // 详细的内容块信息
```

## 🎯 预定义工作流

### 1. 课程内容分析 (`course-analysis`)

**用途**: 分析课程内容，提取主题和生成学习计划

**输入**: 
- `query`: 课程描述或主题
- `additionalContext`: 可选的课程ID、用户级别等

**输出**:
- `extract-topics`: 主要学习主题
- `generate-summary`: 课程总结
- `create-study-plan`: 个性化学习计划

### 2. 智能题目生成 (`question-generation`)

**用途**: 基于课程内容生成多样化的测验题目

**输入**:
- `query`: 要生成题目的主题或内容范围

**输出**:
- `analyze-content`: 内容分析和知识点提取
- `generate-questions`: 多类型题目生成(选择题、判断题等)
- `review-questions`: 题目质量审核和优化

### 3. 个性化内容推荐 (`content-recommendation`)

**用途**: 基于用户兴趣和学习历史推荐相关内容

**输入**:
- `query`: 用户兴趣或学习目标
- `userId`: 自动传入用户ID

**输出**:
- `analyze-user-profile`: 用户学习画像分析
- `find-relevant-content`: 匹配内容发现
- `create-learning-path`: 推荐学习路径

## 🔧 React组件使用示例

### 1. 使用Hook进行AI调用

```typescript
import { useAIWorkflow } from '@/lib/langChain/ai-client';

function CourseAnalysisComponent() {
  const { executeWorkflow, isLoading, error } = useAIWorkflow();

  const analyzeCourse = async () => {
    try {
      const result = await executeWorkflow(
        'course-analysis',
        '分析Python编程入门课程',
        { userLevel: 'beginner' }
      );
      
      // 处理结果
      console.log('分析完成:', result);
    } catch (err) {
      console.error('分析失败:', error);
    }
  };

  return (
    <div>
      <button 
        onClick={analyzeCourse} 
        disabled={isLoading}
      >
        {isLoading ? '分析中...' : '分析课程'}
      </button>
      {error && <p>错误: {error}</p>}
    </div>
  );
}
```

### 2. 进度跟踪组件

```typescript
import { useEffect, useState } from 'react';
import { aiClient } from '@/lib/langChain/ai-client';

function WorkflowProgress({ sessionId }: { sessionId: string }) {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    const checkProgress = async () => {
      try {
        const result = await aiClient.getWorkflowStatus(sessionId);
        setStatus(result);
      } catch (error) {
        console.error('获取进度失败:', error);
      }
    };

    // 每5秒检查一次进度
    const interval = setInterval(checkProgress, 5000);
    checkProgress(); // 立即检查一次

    return () => clearInterval(interval);
  }, [sessionId]);

  if (!status) return <div>加载中...</div>;

  return (
    <div>
      <h3>工作流进度</h3>
      <p>状态: {status.status}</p>
      {status.progress && (
        <div>
          <p>当前步骤: {status.progress.currentStep}</p>
          <p>进度: {status.progress.completedSteps}/{status.progress.totalSteps}</p>
          <div className="progress-bar">
            <div 
              style={{ 
                width: `${(status.progress.completedSteps / status.progress.totalSteps) * 100}%` 
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
```

## 📊 监控和管理

### 1. 检查API Key状态

```typescript
import { apiKeyManager } from '@/lib/langChain/api-key-manager';

// 获取所有API Key状态
const status = apiKeyManager.getStatus();
console.log('API Keys状态:', status);

// 重置特定Key
apiKeyManager.resetKey('primary');
```

### 2. 数据库查询示例

```sql
-- 查看AI工作流执行统计
SELECT 
  workflow_id,
  COUNT(*) as total_runs,
  COUNT(*) FILTER (WHERE status = 'completed') as completed,
  COUNT(*) FILTER (WHERE status = 'failed') as failed,
  AVG(execution_time_ms) as avg_time_ms
FROM ai_workflow_executions 
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY workflow_id;

-- 查看API使用统计
SELECT * FROM get_ai_usage_summary(7);

-- 清理旧数据
SELECT cleanup_ai_workflow_data(90);
```

## ⚠️ 注意事项和最佳实践

### 1. API Key 管理
- 至少配置2个API Key以确保高可用性
- 监控API使用量，避免超过限制
- 定期检查Key状态和错误率

### 2. 上下文控制
- 控制上下文长度，避免超过模型限制
- 使用合适的相似度阈值(0.6-0.8)
- 为不同用例调整内容类型权重

### 3. 性能优化
- 使用适合的模型(Claude-3.5-Sonnet用于复杂任务，GPT-4o-mini用于简单任务)
- 缓存常用查询结果
- 监控响应时间和成本

### 4. 错误处理
- 始终包装AI调用在try-catch中
- 提供用户友好的错误消息
- 记录详细错误信息用于调试

## 🎛️ 管理和监控

### 1. 管理员API
```typescript
// 获取系统状态
const response = await fetch('/api/ai/admin');
const systemStatus = await response.json();

// 获取API Key状态
const keyStatus = await fetch('/api/ai/admin?action=api-keys');

// 重置API Key
await fetch('/api/ai/admin', {
  method: 'POST',
  body: JSON.stringify({
    action: 'reset-api-key',
    data: { keyName: 'primary' }
  })
});
```

### 2. React组件使用
```tsx
import AIWorkflowDemo from '@/components/ai/ai-workflow-demo';

function MyPage() {
  return (
    <div>
      <h1>AI功能演示</h1>
      <AIWorkflowDemo />
    </div>
  );
}
```

### 3. 自定义Hook使用
```tsx
import { useCourseAnalysis, useAIAssistant } from '@/hooks/ai/use-ai-workflow';

function CourseAnalysisPage() {
  const { analyzeCourse, isLoading, data } = useCourseAnalysis();
  
  const handleAnalysis = () => {
    analyzeCourse("分析React入门课程");
  };
  
  return (
    <button onClick={handleAnalysis} disabled={isLoading}>
      {isLoading ? '分析中...' : '分析课程'}
    </button>
  );
}
```

## 📁 文件结构总览

```
studify/
├── lib/langChain/
│   ├── api-key-manager.ts      # API Key轮换管理
│   ├── context-manager.ts      # 双embedding上下文
│   ├── ai-workflow.ts          # 工作流执行器
│   └── ai-client.ts            # 简化客户端
├── app/api/ai/
│   ├── workflow/route.ts       # 工作流API
│   ├── simple/route.ts         # 简单AI调用
│   ├── context/route.ts        # 上下文检索
│   └── admin/route.ts          # 管理员API
├── hooks/ai/
│   └── use-ai-workflow.ts      # React Hooks
├── components/ai/
│   └── ai-workflow-demo.tsx    # 演示组件
└── db/
    └── ai_workflow_tables.sql  # 数据库架构
```

## 🎉 恭喜！

你现在拥有了一个完整的AI工作流系统！这个系统包含：

✅ **智能API Key轮换** - 自动处理限制，确保服务不中断  
✅ **双模型Embedding搜索** - 结合E5和BGE的优势  
✅ **复杂工作流编排** - 支持多步骤、多模型的复杂AI任务  
✅ **个性化上下文** - 基于用户数据和兴趣提供相关信息  
✅ **完整监控体系** - 性能统计、错误追踪、使用分析  
✅ **React组件和Hooks** - 即插即用的前端集成  
✅ **管理员监控** - 完整的系统监控和管理功能  

## 🚀 下一步行动

1. **配置环境变量** - 参考 `ai_environment_config.md`
2. **运行数据库迁移** - 执行 `ai_workflow_tables.sql`
3. **测试演示组件** - 使用 `AIWorkflowDemo` 组件测试功能
4. **集成到现有页面** - 使用提供的Hooks构建AI功能
5. **监控系统状态** - 通过管理员API检查系统健康状况

开始构建强大的AI功能吧！🚀
