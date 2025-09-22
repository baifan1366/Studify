'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  useCourseAnalysis, 
  useQuestionGeneration, 
  useContentRecommendation,
  useAIAssistant,
  useWorkflowProgress
} from '@/hooks/ai/use-ai-workflow';
import { Loader2, Brain, BookOpen, HelpCircle, Lightbulb, MessageSquare } from 'lucide-react';

export default function AIWorkflowDemo() {
  const [activeTab, setActiveTab] = useState('course-analysis');
  const [query, setQuery] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Hooks for different workflows
  const courseAnalysis = useCourseAnalysis();
  const questionGeneration = useQuestionGeneration();
  const contentRecommendation = useContentRecommendation();
  const aiAssistant = useAIAssistant();
  const workflowProgress = useWorkflowProgress(sessionId);

  const handleCourseAnalysis = async () => {
    if (!query.trim()) return;
    
    try {
      const result = await courseAnalysis.analyzeCourse(query);
      setSessionId(result.sessionId);
    } catch (error) {
      console.error('Course analysis failed:', error);
    }
  };

  const handleQuestionGeneration = async () => {
    if (!query.trim()) return;
    
    try {
      const result = await questionGeneration.generateQuestions(query);
      setSessionId(result.sessionId);
    } catch (error) {
      console.error('Question generation failed:', error);
    }
  };

  const handleContentRecommendation = async () => {
    if (!query.trim()) return;
    
    try {
      const result = await contentRecommendation.getRecommendations(query);
      setSessionId(result.sessionId);
    } catch (error) {
      console.error('Content recommendation failed:', error);
    }
  };

  const handleAIAssistant = async () => {
    if (!query.trim()) return;
    
    try {
      await aiAssistant.askWithContext(query, {
        includeContext: true,
        model: "anthropic/claude-3.5-sonnet"
      });
    } catch (error) {
      console.error('AI assistant failed:', error);
    }
  };

  const renderWorkflowResults = (results: any) => {
    if (!results) return null;

    return (
      <div className="space-y-4">
        {Object.entries(results).map(([stepId, result]: [string, any]) => (
          <Card key={stepId}>
            <CardHeader>
              <CardTitle className="text-sm">{stepId}</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-40">
                {typeof result === 'string' ? result : JSON.stringify(result, null, 2)}
              </pre>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">AI Workflow 演示</h1>
        <p className="text-muted-foreground">
          体验Studify的智能AI工作流系统
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>输入查询</CardTitle>
          <CardDescription>
            输入你的问题或需求，选择相应的AI工作流进行处理
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="例如：分析JavaScript基础编程课程的内容结构"
            className="min-h-20"
          />
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="course-analysis">
            <BookOpen className="w-4 h-4 mr-2" />
            课程分析
          </TabsTrigger>
          <TabsTrigger value="question-generation">
            <HelpCircle className="w-4 h-4 mr-2" />
            题目生成
          </TabsTrigger>
          <TabsTrigger value="content-recommendation">
            <Lightbulb className="w-4 h-4 mr-2" />
            内容推荐
          </TabsTrigger>
          <TabsTrigger value="ai-assistant">
            <MessageSquare className="w-4 h-4 mr-2" />
            AI助手
          </TabsTrigger>
        </TabsList>

        <TabsContent value="course-analysis" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5" />
                课程内容分析
              </CardTitle>
              <CardDescription>
                智能分析课程内容，提取主题并生成个性化学习计划
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={handleCourseAnalysis}
                disabled={courseAnalysis.isLoading || !query.trim()}
                className="w-full"
              >
                {courseAnalysis.isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                开始分析课程
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="question-generation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5" />
                智能题目生成
              </CardTitle>
              <CardDescription>
                基于课程内容生成多样化的测验题目
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={handleQuestionGeneration}
                disabled={questionGeneration.isLoading || !query.trim()}
                className="w-full"
              >
                {questionGeneration.isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                生成题目
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="content-recommendation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5" />
                个性化内容推荐
              </CardTitle>
              <CardDescription>
                根据你的兴趣和学习历史推荐相关内容
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={handleContentRecommendation}
                disabled={contentRecommendation.isLoading || !query.trim()}
                className="w-full"
              >
                {contentRecommendation.isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                获取推荐
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai-assistant" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                AI学习助手
              </CardTitle>
              <CardDescription>
                智能问答，带上下文的个性化回答
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={handleAIAssistant}
                disabled={aiAssistant.isLoading || !query.trim()}
                className="w-full"
              >
                {aiAssistant.isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                提问AI助手
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 工作流进度显示 */}
      {workflowProgress.isRunning && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              工作流执行中
            </CardTitle>
            <CardDescription>
              当前步骤: {workflowProgress.currentStep}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>进度: {workflowProgress.completedSteps}/{workflowProgress.totalSteps}</span>
                <span>{workflowProgress.progressPercentage}%</span>
              </div>
              <Progress value={workflowProgress.progressPercentage} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* 结果显示 */}
      {workflowProgress.isCompleted && workflowProgress.results && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">完成</Badge>
              工作流结果
            </CardTitle>
          </CardHeader>
          <CardContent>
            {renderWorkflowResults(workflowProgress.results)}
          </CardContent>
        </Card>
      )}

      {/* AI助手结果显示 */}
      {aiAssistant.aiResponse && (
        <Card>
          <CardHeader>
            <CardTitle>AI助手回答</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-muted p-4 rounded">
              <p className="whitespace-pre-wrap">
                {aiAssistant.aiResponse.result}
              </p>
            </div>
            <div className="mt-4 text-sm text-muted-foreground">
              <p>模型: {aiAssistant.aiResponse.metadata.model}</p>
              <p>包含上下文: {aiAssistant.aiResponse.metadata.includeContext ? '是' : '否'}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 错误显示 */}
      {(courseAnalysis.error || questionGeneration.error || contentRecommendation.error || aiAssistant.error) && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">执行错误</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {courseAnalysis.error?.message || 
               questionGeneration.error?.message || 
               contentRecommendation.error?.message || 
               aiAssistant.error?.message}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
