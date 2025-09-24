"use client";

import React, { useState, useRef, useEffect } from 'react';
import './ai-assistant-preview.css';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageCircle, 
  Calculator, 
  FileText, 
  Route, 
  Lightbulb, 
  Target, 
  Loader2, 
  ArrowRight, 
  ArrowLeft,
  BookOpen, 
  ChevronRight, 
  X,
  Play,
  Pause,
  RotateCcw,
  CheckCircle,
  Send,
  User,
  Bot,
  ChevronLeft,
  Menu,
  Brain,
  Upload,
  Clock,
  Maximize2
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { toast } from 'sonner';
import { 
  useAIQuickQA, 
  useAISolveProblem, 
  useAISmartNotes, 
  useAILearningPath 
} from '@/hooks/ai/use-ai-quick-actions';
import { useSaveLearningPath } from '@/hooks/dashboard/use-learning-paths';
import { useSaveAINote } from '@/hooks/dashboard/use-ai-notes';
import { useSaveMistake } from '@/hooks/dashboard/use-mistake-book';
import ReactMarkdown from 'react-markdown';
import AIContentRecommendations from './ai/ai-content-recommendations';
import SmartRecommendations from './ai/smart-recommendations';
import { useUser } from '@/hooks/profile/use-user';

// 导入真正的Mermaid渲染器
import Mermaid from '@/components/ui/mermaid';

interface AIAssistantPreviewProps {
  onExperienceAI?: () => void;
}

export default function AIAssistantPreview({ onExperienceAI }: AIAssistantPreviewProps) {
  const { toast } = useToast();
  const [activeFeature, setActiveFeature] = useState<string | null>(null);
  const [aiResult, setAIResult] = useState<{type: string; data: any} | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
  // 所有 hooks 必须在组件顶部调用，在任何条件逻辑之前
  const t = useTranslations('AIAssistant');

  // AI功能定义
  const aiFeatures = [
    {
      id: 'quick_qa',
      icon: MessageCircle,
      gradient: 'from-blue-500 to-cyan-500',
      bgGradient: 'from-blue-500/20 to-cyan-500/20',
      borderGradient: 'border-blue-500/30',
      activeGradient: 'from-blue-500/10 to-cyan-500/10'
    },
    {
      id: 'solve_problem', 
      icon: Calculator,
      gradient: 'from-emerald-500 to-teal-500',
      bgGradient: 'from-emerald-500/20 to-teal-500/20',
      borderGradient: 'border-emerald-500/30',
      activeGradient: 'from-emerald-500/10 to-teal-500/10'
    },
    {
      id: 'smart_notes',
      icon: FileText,
      gradient: 'from-purple-500 to-pink-500',
      bgGradient: 'from-purple-500/20 to-pink-500/20',
      borderGradient: 'border-purple-500/30',
      activeGradient: 'from-purple-500/10 to-pink-500/10'
    },
    {
      id: 'learning_path',
      icon: Route,
      gradient: 'from-orange-500 to-red-500',
      bgGradient: 'from-orange-500/20 to-red-500/20',
      borderGradient: 'border-orange-500/30',
      activeGradient: 'from-orange-500/10 to-red-500/10'
    }
  ];

  // 注释掉全屏显示，改为在右边区域显示
  // AI结果现在显示在右边区域，而不是替换整个界面

  // 渲染右侧功能卡片的函数
  const renderActiveFeatureCard = () => {
    if (!activeFeature) return null;

    const commonProps = {
      onClose: () => setActiveFeature(null),
      onResult: (data: any) => setAIResult({type: activeFeature, data})
    };

    switch (activeFeature) {
      case 'quick_qa':
        return <QuickQACard {...commonProps} onResult={(data) => setAIResult({type: 'quick_qa', data})} />;
      case 'solve_problem':
        return <SolveProblemCard {...commonProps} onResult={(data) => setAIResult({type: 'solve_problem', data})} />;
      case 'smart_notes':
        return <SmartNotesCard {...commonProps} onResult={(data) => setAIResult({type: 'smart_notes', data})} />;
      case 'learning_path':
        return <LearningPathCard {...commonProps} onResult={(data) => setAIResult({type: 'learning_path', data})} />;
      default:
        return null;
    }
  };

  return (
    <section className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6 mb-8">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <motion.div 
          className="mb-12"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
              <Brain className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t('title')}</h1>
              <p className="text-slate-600 dark:text-slate-400">{t('subtitle')}</p>
            </div>
          </div>
        </motion.div>

        {/* 左右分栏布局 */}
        <div className="flex gap-4">
          {/* 左侧功能列表 - 可收起 */}
          <motion.div 
            className={`${isSidebarCollapsed ? 'w-16' : 'w-[30%]'} transition-all duration-300 ease-in-out flex-shrink-0`}
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            {/* 收起/展开按钮 */}
            <div className="flex items-center justify-between mb-4">
              {!isSidebarCollapsed && (
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                  {t('sidebar.features')}
                </h3>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                className="h-8 w-8 p-0 border-slate-300 dark:border-slate-600"
                title={isSidebarCollapsed ? t('sidebar.expand') : t('sidebar.collapse')}
                aria-label={isSidebarCollapsed ? t('sidebar.expand') : t('sidebar.collapse')}
              >
                {isSidebarCollapsed ? (
                  <ChevronRight className="h-4 w-4" />
                ) : (
                  <ChevronLeft className="h-4 w-4" />
                )}
              </Button>
            </div>

            {/* 功能卡片列表 */}
            <div className="space-y-3">
            {aiFeatures.map((feature, index) => {
              const Icon = feature.icon;
              const isActive = activeFeature === feature.id;
              return (
                <motion.div
                  key={feature.id}
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1, duration: 0.6 }}
                >
                  <Card 
                    className={`group cursor-pointer transition-all duration-300 border overflow-hidden relative ${
                      isActive 
                        ? 'border-l-4 border-l-emerald-500 bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-600/30 shadow-md' 
                        : 'border-slate-200 dark:border-slate-700/30 bg-white/80 dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-600/50 hover:bg-white dark:hover:bg-slate-800/60'
                    } ${isSidebarCollapsed ? 'aspect-square' : ''}`}
                    onClick={() => setActiveFeature(feature.id)}
                    title={isSidebarCollapsed ? t(`features.${feature.id}.title`) : undefined}
                  >
                    {/* 左侧绿色边框高亮 */}
                    {isActive && (
                      <div className="absolute left-0 top-0 w-1 h-full bg-emerald-500" />
                    )}
                    
                    <CardContent className={`relative ${isSidebarCollapsed ? 'p-2' : 'p-4'}`}>
                      {isSidebarCollapsed ? (
                        // 收起状态：优化的图标设计
                        <div className="relative flex items-center justify-center">
                          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-300 border border-white/20 ${
                            isActive ? 'scale-110 ring-2 ring-emerald-400/50' : 'group-hover:scale-105'
                          }`}>
                            <Icon className="w-5 h-5 text-white" />
                          </div>
                          
                          {/* 活跃状态指示器 */}
                          {isActive && (
                            <motion.div 
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-400 border-2 border-white dark:border-slate-800 flex items-center justify-center"
                            >
                              <div className="w-1.5 h-1.5 rounded-full bg-white" />
                            </motion.div>
                          )}
                          
                          {/* Tooltip 提示 */}
                          <div className={`absolute left-full ml-3 px-3 py-2 bg-slate-900 dark:bg-slate-700 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none whitespace-nowrap z-10 ${
                            isActive ? 'opacity-100' : ''
                          }`}>
                            <div className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-1 w-2 h-2 bg-slate-900 dark:bg-slate-700 rotate-45"></div>
                            {t(`features.${feature.id}.title`)}
                          </div>
                        </div>
                      ) : (
                        // 展开状态：显示完整内容
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${feature.gradient} flex items-center justify-center flex-shrink-0 shadow-md`}>
                            <Icon className="w-4 h-4 text-white" />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <h3 className={`text-sm font-semibold mb-1 transition-colors ${
                              isActive ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white'
                            }`}>
                              {t(`features.${feature.id}.title`)}
                            </h3>
                            
                            <p className={`text-xs transition-colors line-clamp-2 ${
                              isActive ? 'text-slate-600 dark:text-slate-300' : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'
                            }`}>
                              {t(`features.${feature.id}.description`)}
                            </p>
                          </div>

                          {/* 活跃指示器 */}
                          {isActive && (
                            <div className="w-2 h-2 rounded-full bg-emerald-400" />
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
            </div>
          </motion.div>

          {/* 右侧功能区域 - 70% 宽度 */}
          <motion.div
            className={`${isSidebarCollapsed ? 'flex-1' : 'w-[70%]'} transition-all duration-300 ease-in-out lg:sticky lg:top-8`}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
          >
            <AnimatePresence mode="wait">
              {aiResult ? (
                <motion.div
                  key="ai-result"
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 30 }}
                  className="w-full"
                >
                  <AIResultCard
                    type={aiResult.type as any}
                    result={aiResult.data}
                    onClose={() => {
                      setAIResult(null);
                      setActiveFeature(null);
                    }}
                    onTryAgain={() => {
                      setAIResult(null);
                    }}
                    onExpand={() => setIsExpanded(true)}
                  />
                </motion.div>
              ) : activeFeature ? (
                <motion.div
                  key={activeFeature}
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 30 }}
                  className="w-full"
                >
                  {renderActiveFeatureCard()}
                </motion.div>
              ) : (
                <motion.div
                  key="preview"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <Card className="h-[400px] border border-slate-200 dark:border-slate-700/30 bg-white/80 dark:bg-slate-800/40 overflow-hidden">
                    <CardContent className="h-full flex flex-col items-center justify-center p-8 text-center">
                      {isSidebarCollapsed ? (
                        // 收起状态的特殊设计
                        <div className="space-y-6">
                          {/* AI助手图标动画 */}
                          <div className="relative">
                            <motion.div 
                              animate={{ 
                                rotate: 360,
                                scale: [1, 1.05, 1]
                              }}
                              transition={{ 
                                rotate: { duration: 8, repeat: Infinity, ease: "linear" },
                                scale: { duration: 2, repeat: Infinity }
                              }}
                              className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-purple-500 via-blue-500 to-emerald-500 flex items-center justify-center shadow-xl border border-white/20"
                            >
                              <Brain className="w-10 h-10 text-white" />
                            </motion.div>
                            
                            {/* 环绕的小图标 */}
                            {aiFeatures.map((feature, index) => {
                              const Icon = feature.icon;
                              const angle = (360 / aiFeatures.length) * index;
                              return (
                                <motion.div
                                  key={feature.id}
                                  animate={{ 
                                    rotate: -360
                                  }}
                                  transition={{ 
                                    duration: 8, 
                                    repeat: Infinity, 
                                    ease: "linear",
                                    delay: index * 0.2
                                  }}
                                  className="absolute w-8 h-8"
                                  style={{
                                    top: '50%',
                                    left: '50%',
                                    transform: `translate(-50%, -50%) rotate(${angle}deg) translateY(-50px)`
                                  }}
                                >
                                  <div className={`w-full h-full rounded-lg bg-gradient-to-br ${feature.gradient} flex items-center justify-center shadow-md border border-white/20`}>
                                    <Icon className="w-4 h-4 text-white" />
                                  </div>
                                </motion.div>
                              );
                            })}
                          </div>
                          
                          {/* 标题 */}
                          <div className="space-y-3">
                            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">
                              AI Assistant
                            </h3>
                            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-xs">
                              {t('preview.collapsed_description')}
                            </p>
                          </div>
                          
                          {/* 展开提示 */}
                          <motion.div 
                            animate={{ x: [0, 5, 0] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400"
                          >
                            <ChevronRight className="w-4 h-4" />
                            <span>{t('preview.expand_hint')}</span>
                          </motion.div>
                        </div>
                      ) : (
                        // 展开状态的默认设计
                        <div className="space-y-6">
                          {/* 默认图标 */}
                          <div className="w-16 h-16 mx-auto rounded-xl bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center border border-slate-200 dark:border-slate-600/30">
                            <Brain className="w-8 h-8 text-slate-400 dark:text-slate-400" />
                          </div>
                          
                          {/* 默认文案 */}
                          <div className="space-y-3">
                            <h3 className="text-lg font-medium text-slate-800 dark:text-slate-200">
                              {t('preview.select_feature')}
                            </h3>
                            <p className="text-slate-600 dark:text-slate-400 text-sm max-w-xs mx-auto leading-relaxed">
                              {t('preview.select_description')}
                            </p>
                          </div>
                          
                          {/* 提示动画 */}
                          <motion.div
                            animate={{ x: [-8, 8, -8] }}
                            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                            className="flex items-center gap-2 text-slate-500 dark:text-slate-500 text-xs mt-6"
                          >
                            <ArrowRight className="w-3 h-3 rotate-180" />
                            <span>{t('preview.start_experience')}</span>
                          </motion.div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        {/* 放大模态框 */}
        <Dialog open={isExpanded} onOpenChange={setIsExpanded}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                {aiResult && (
                  <>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      aiResult.type === 'quick_qa' ? 'bg-blue-500' :
                      aiResult.type === 'solve_problem' ? 'bg-emerald-500' :
                      aiResult.type === 'smart_notes' ? 'bg-purple-500' : 'bg-orange-500'
                    }`}>
                      {aiResult.type === 'quick_qa' && <MessageCircle className="h-4 w-4 text-white" />}
                      {aiResult.type === 'solve_problem' && <Calculator className="h-4 w-4 text-white" />}
                      {aiResult.type === 'smart_notes' && <FileText className="h-4 w-4 text-white" />}
                      {aiResult.type === 'learning_path' && <Route className="h-4 w-4 text-white" />}
                    </div>
                    {t('dialog.ai_result_title')} - {t(`features.${aiResult.type}.title`)}
                  </>
                )}
              </DialogTitle>
            </DialogHeader>
            {aiResult && (
              <div className="mt-4">
                <StreamingResultContent type={aiResult.type as any} result={aiResult.data} />
                
                {/* 工具使用信息 */}
                {aiResult.data.toolsUsed && aiResult.data.toolsUsed.length > 0 && (
                  <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700/50">
                    <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">{t('dialog.tools_used')}</h4>
                    <div className="flex flex-wrap gap-2">
                      {aiResult.data.toolsUsed.map((tool: string, index: number) => (
                        <Badge key={index} variant="secondary" className="bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                          {tool}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* 底部提示 */}
        <motion.div
          className="text-center mt-12"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-500 text-sm">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            {t('history_auto_save')}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// 消息类型定义
interface ChatMessage {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  error?: string;
}

// Typing Indicator 组件
function TypingIndicator() {
  const t = useTranslations('AIAssistant');
  return (
    <div className="flex items-center space-x-2 py-2">
      <div className="animate-pulse flex space-x-1">
        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
      </div>
      <span className="text-xs text-slate-500 dark:text-slate-400">
        {t('chat.typing') || 'AI is thinking...'}
      </span>
    </div>
  );
}

// Markdown渲染组件
function MarkdownContent({ content, isStreaming }: { content: string; isStreaming?: boolean }) {
  return (
    <ReactMarkdown
      className="markdown-chat-content"
      components={{
        // 代码块渲染
        code({ node, inline, className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || '');
          const language = match ? match[1] : '';
          
          return !inline && language ? (
            <pre className="bg-slate-800 dark:bg-slate-900 text-slate-100 p-3 rounded-md text-sm overflow-x-auto my-2">
              <code className="font-mono text-sm" {...props}>
                {String(children).replace(/\n$/, '')}
              </code>
            </pre>
          ) : (
            <code
              className="bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 px-1 py-0.5 rounded text-sm font-mono"
              {...props}
            >
              {children}
            </code>
          );
        },
        // 链接渲染
        a({ href, children, ...props }) {
          return (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:text-blue-600 underline"
              {...props}
            >
              {children}
            </a>
          );
        },
        // 标题渲染
        h1: ({ children, ...props }) => (
          <h1 className="text-lg font-bold mt-4 mb-2 text-slate-900 dark:text-slate-100" {...props}>
            {children}
          </h1>
        ),
        h2: ({ children, ...props }) => (
          <h2 className="text-base font-bold mt-3 mb-2 text-slate-900 dark:text-slate-100" {...props}>
            {children}
          </h2>
        ),
        h3: ({ children, ...props }) => (
          <h3 className="text-sm font-bold mt-2 mb-1 text-slate-900 dark:text-slate-100" {...props}>
            {children}
          </h3>
        ),
        // 列表渲染
        ul: ({ children, ...props }) => (
          <ul className="list-disc list-inside my-2 space-y-1 text-sm" {...props}>
            {children}
          </ul>
        ),
        ol: ({ children, ...props }) => (
          <ol className="list-decimal list-inside my-2 space-y-1 text-sm" {...props}>
            {children}
          </ol>
        ),
        // 段落渲染
        p: ({ children, ...props }) => (
          <p className="mb-2 last:mb-0 text-sm leading-relaxed" {...props}>
            {children}
          </p>
        ),
        // 引用块
        blockquote: ({ children, ...props }) => (
          <blockquote className="border-l-4 border-slate-300 dark:border-slate-600 pl-4 py-2 my-2 bg-slate-50 dark:bg-slate-800/50 rounded-r-md" {...props}>
            {children}
          </blockquote>
        ),
        // 表格
        table: ({ children, ...props }) => (
          <div className="overflow-x-auto my-2">
            <table className="min-w-full border border-slate-200 dark:border-slate-700 text-sm" {...props}>
              {children}
            </table>
          </div>
        ),
        th: ({ children, ...props }) => (
          <th className="border border-slate-200 dark:border-slate-700 px-2 py-1 bg-slate-100 dark:bg-slate-800 font-medium" {...props}>
            {children}
          </th>
        ),
        td: ({ children, ...props }) => (
          <td className="border border-slate-200 dark:border-slate-700 px-2 py-1" {...props}>
            {children}
          </td>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

// 聊天室风格的 QuickQA 卡片
function QuickQACard({ onClose, onResult }: { onClose: () => void; onResult: (data: any) => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const quickQAMutation = useAIQuickQA();
  const t = useTranslations('AIAssistant');
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // 获取当前用户ID
  useEffect(() => {
    const getUserId = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          const data = await response.json();
          setCurrentUserId(data.user?.id);
        }
      } catch (error) {
        console.error('Failed to get user ID:', error);
      }
    };
    getUserId();
  }, []);

  // 改进的滚动逻辑
  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  };

  // 滚动到最后一条消息的合适位置
  const scrollToLastMessage = () => {
    setTimeout(() => {
      if (chatContainerRef.current) {
        const container = chatContainerRef.current;
        const scrollHeight = container.scrollHeight;
        const clientHeight = container.clientHeight;
        // 滚动到底部往上一点，留出输入框的空间
        container.scrollTop = scrollHeight - clientHeight + 20;
      }
    }, 100);
  };

  React.useEffect(() => {
    scrollToLastMessage();
  }, [messages]);

  // 键盘快捷键支持
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === '/') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSend = async () => {
    if (!currentInput.trim() || isTyping) return;
    
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: currentInput.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setCurrentInput('');
    setIsTyping(true);

    // 添加AI消息占位符
    const aiMessageId = (Date.now() + 1).toString();
    const aiMessage: ChatMessage = {
      id: aiMessageId,
      type: 'ai',
      content: '',
      timestamp: new Date(),
      isStreaming: true
    };
    
    setMessages(prev => [...prev, aiMessage]);

    try {
      // 构建上下文 - 包含之前的聊天历史
      const conversationContext = messages.map(msg => ({
        role: msg.type === 'user' ? 'user' : 'assistant',
        content: msg.content
      }));

      // 添加当前用户消息到上下文
      conversationContext.push({
        role: 'user', 
        content: userMessage.content
      });

      const response = await quickQAMutation.mutateAsync({
        question: userMessage.content,
        context: conversationContext, // 传递上下文
        conversationId: messages.length > 0 ? `chat_${Date.now()}` : undefined
      });
      
      // 模拟流式输出
      const fullText = response.answer || response.result || '';
      let currentIndex = 0;
      const chars = fullText.split('');
      
      for (const char of chars) {
        currentIndex++;
        const partialText = chars.slice(0, currentIndex).join('');
        
        setMessages(prev => prev.map(msg => 
          msg.id === aiMessageId 
            ? { ...msg, content: partialText, isStreaming: currentIndex < chars.length }
            : msg
        ));
        
        await new Promise(resolve => setTimeout(resolve, 15)); // 稍微快一点
      }
      
      // 不调用onResult，让对话继续在聊天室中进行
      setIsTyping(false);
    } catch (error) {
      console.error('Quick QA error:', error);
      const errorMessage = error instanceof Error ? error.message : t('chat.error.unknown');
      
      setMessages(prev => prev.map(msg => 
        msg.id === aiMessageId 
          ? { 
              ...msg, 
              content: t('chat.error.network_error'), 
              isStreaming: false,
              error: errorMessage
            }
          : msg
      ));
      
      toast({
        title: t('chat.error.title'),
        description: t('chat.error.description'),
        variant: "destructive"
      });
      
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Card className="w-full h-[500px] border border-slate-200 dark:border-slate-700/30 bg-white dark:bg-slate-800/60 flex flex-col">
      {/* 聊天头部 */}
      <CardHeader className="pb-3 flex-shrink-0 border-b border-slate-200 dark:border-slate-700/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <MessageCircle className="h-4 w-4 text-white" />
            </div>
            <div>
              <CardTitle className="text-slate-900 dark:text-white text-sm font-medium">{t('chat.quickqa.title')}</CardTitle>
              <CardDescription className="text-slate-600 dark:text-slate-400 text-xs">{t('chat.quickqa.description')}</CardDescription>
            </div>
          </div>
          <Button variant="ghost" onClick={onClose} className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white h-7 w-7 p-0">
            <ArrowLeft className="h-3 w-3" />
          </Button>
        </div>
      </CardHeader>

      {/* 聊天消息区域 */}
      <CardContent ref={chatContainerRef} className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-3">
              <MessageCircle className="h-6 w-6 text-blue-500 dark:text-blue-400" />
            </div>
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-2">{t('chat.welcome.title')}</p>
            <p className="text-slate-500 dark:text-slate-500 text-xs">{t('chat.welcome.subtitle')}</p>
          </div>
        )}
        
        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'} mb-4`}>
            {message.type === 'user' ? (
              // 用户消息：右对齐，无头像
              <div className="max-w-[80%] px-4 py-2 bg-blue-500 text-white rounded-2xl rounded-tr-md">
                <div className="text-sm whitespace-pre-wrap break-words">
                  {message.content}
                </div>
              </div>
            ) : (
              // AI消息：左对齐，带AI头像
              <div className="flex items-start space-x-3 max-w-[85%]">
                <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center flex-shrink-0 mt-1">
                  <Bot className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                </div>
                <div className="flex-1">
                  <div className="bg-slate-100 dark:bg-slate-700 rounded-2xl rounded-tl-md px-4 py-3">
                    <div className="ai-message-content">
                      <div className="prose prose-sm max-w-none dark:prose-invert prose-slate">
                        <MarkdownContent 
                          content={message.content} 
                          isStreaming={message.isStreaming} 
                        />
                      </div>
                      {message.isStreaming && <span className="animate-pulse ml-1 text-slate-400">▋</span>}
                    </div>
                  </div>
                  {/* 显示推荐内容 - 只在AI回复完成且内容足够长时显示 */}
                  {!message.isStreaming && message.content.length > 50 && (
                    <AIContentRecommendations 
                      aiResponse={message.content}
                      userId={currentUserId || undefined}
                      questionContext={messages.find(m => m.type === 'user' && messages.indexOf(m) < messages.indexOf(message))?.content}
                      className="ml-0 mt-4"
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
        
        {/* Typing Indicator */}
        {isTyping && (
          <div className="flex justify-start">
            <div className="flex items-start space-x-2 max-w-[85%]">
              <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 bg-slate-200 dark:bg-slate-700">
                <Bot className="h-3 w-3 text-slate-600 dark:text-slate-300" />
              </div>
              <div className="bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-slate-100 px-3 py-2 rounded-lg">
                <TypingIndicator />
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </CardContent>

      {/* 输入区域 */}
      <div className="flex-shrink-0 border-t border-slate-200 dark:border-slate-700/30 p-3">
        <div className="flex items-end space-x-2">
          <div className="flex-1">
            <Textarea
              ref={inputRef}
              value={currentInput}
              onChange={(e) => setCurrentInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={t('chat.input.placeholder') || "Enter your question... (Press Enter to send)"}
              className="min-h-[36px] max-h-[120px] resize-none bg-slate-50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600/50 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 text-sm"
              disabled={isTyping}
              aria-label={t('chat.input.aria_label') || "Enter message"}
            />
          </div>
          <Button
            onClick={handleSend}
            disabled={!currentInput.trim() || isTyping}
            size="sm"
            className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-2"
          >
            {isTyping ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
}

function SolveProblemCard({ onClose, onResult }: { onClose: () => void; onResult: (data: any) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const solveProblemMutation = useAISolveProblem();
  const t = useTranslations('AIAssistant');
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 文件验证
  const validateFile = (file: File): boolean => {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

    if (!allowedTypes.includes(file.type)) {
      setUploadError(t('upload.error.invalid_type') || 'Please upload a valid image file (JPG, PNG, GIF, WebP)');
      return false;
    }

    if (file.size > maxSize) {
      setUploadError(t('upload.error.too_large') || 'File size must be less than 10MB');
      return false;
    }

    return true;
  };

  // 处理文件选择
  const handleFileSelect = (selectedFile: File) => {
    setUploadError(null);
    
    if (!validateFile(selectedFile)) {
      return;
    }

    setFile(selectedFile);
    
    // 创建预览
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(selectedFile);
  };

  // 输入框文件选择
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  };

  // 拖拽事件处理
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) {
      handleFileSelect(droppedFiles[0]);
    }
  };

  // 清除文件
  const clearFile = () => {
    setFile(null);
    setPreviewUrl(null);
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 拍照功能
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment', // 使用后置摄像头
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setShowCamera(true);
      }
    } catch (error) {
      console.error('Camera access error:', error);
      toast({
        title: t('camera.error.title') || "Camera Access Failed",
        description: t('camera.error.description') || "Please allow camera access to take photos",
        variant: "destructive"
      });
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setShowCamera(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const capturedFile = new File([blob], `captured_${Date.now()}.jpg`, { type: 'image/jpeg' });
            handleFileSelect(capturedFile);
            stopCamera();
          }
        }, 'image/jpeg', 0.9);
      }
    }
  };

  // 清理摄像头资源
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // 提交处理
  const handleSubmit = async () => {
    if (!file) return;
    
    setUploadError(null);
    
    try {
      console.log('🔄 Starting problem solving for file:', file.name);
      const response = await solveProblemMutation.mutateAsync(file);
      console.log('✅ Problem solving response:', response);
      
      console.log('📋 Full Problem Solving API response:', response);
      
      if (response && response.success) {
        // Check if any of the expected content fields exist and are not empty
        const hasContent = (response.result && response.result.trim()) || 
                          (response.answer && response.answer.trim()) || 
                          (response.analysis && response.analysis.trim());
        
        if (hasContent) {
          onResult(response);
          toast({
            title: t('upload.success.title') || "Upload Successful",
            description: t('upload.success.description') || "Your image has been analyzed successfully.",
          });
        } else {
          console.error('❌ Problem Solving Response structure:', {
            success: response.success,
            result: response.result,
            answer: response.answer,
            analysis: response.analysis,
            toolsUsed: response.toolsUsed
          });
          throw new Error(`解题分析返回空内容: ${JSON.stringify({
            hasResult: !!response.result,
            hasAnswer: !!response.answer, 
            hasAnalysis: !!response.analysis,
            toolsUsed: response.toolsUsed?.length || 0
          })}`);
        }
      } else {
        console.error('❌ Problem Solving API response failed:', response);
        throw new Error('解题服务请求失败: ' + (response?.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('❌ Solve problem error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Error details:', {
        message: errorMessage,
        stack: error instanceof Error ? error.stack : 'No stack trace',
        response: error
      });
      
      setUploadError(`解题失败: ${errorMessage}`);
      toast({
        title: t('upload.error.title') || "Upload Failed",
        description: errorMessage.includes('fetch') ? '网络连接失败，请检查网络连接' : errorMessage,
        variant: "destructive"
      });
    }
  };

  return (
    <Card className="w-full border border-slate-200 dark:border-slate-700/30 bg-white dark:bg-slate-800/60">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center">
              <Calculator className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-slate-900 dark:text-white text-base font-medium">{t('features.solve_problem.title')}</CardTitle>
              <CardDescription className="text-slate-600 dark:text-slate-400 text-sm">{t('features.solve_problem.input_description')}</CardDescription>
            </div>
          </div>
          <Button variant="ghost" onClick={onClose} className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white h-8 w-8 p-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* 上传区域 */}
        <div 
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-all cursor-pointer ${
            isDragging 
              ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20' 
              : file 
                ? 'border-emerald-300 bg-emerald-50/50 dark:bg-emerald-900/10'
                : 'border-slate-300 dark:border-slate-600/50 hover:border-slate-400 dark:hover:border-slate-500/50 bg-slate-50 dark:bg-slate-700/20'
          }`}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf,.doc,.docx"
            onChange={handleFileUpload}
            className="hidden"
          />

          {previewUrl ? (
            // 文件预览
            <div className="space-y-3">
              <div className="relative inline-block">
                <img 
                  src={previewUrl} 
                  alt="Preview" 
                  className="max-h-32 max-w-full rounded-lg shadow-sm"
                />
                <Button
                  variant="destructive"
                  size="sm"
                  className="absolute -top-2 -right-2 h-6 w-6 p-0 rounded-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    clearFile();
                  }}
                >
                  ×
                </Button>
              </div>
              <div className="text-sm text-slate-700 dark:text-slate-300">
                {file?.name}
              </div>
              <div className="text-xs text-slate-500">
                {file && `${(file.size / 1024 / 1024).toFixed(2)} MB`}
              </div>
            </div>
          ) : (
            // 默认上传界面
            <div className="space-y-3">
              <Upload className={`mx-auto h-12 w-12 ${isDragging ? 'text-emerald-500' : 'text-slate-400'}`} />
              <div>
                <div className="text-base font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {isDragging 
                    ? (t('upload.drop_here') || "Drop your file here") 
                    : (t('features.solve_problem.upload_text') || "Click to upload image or drag here")
                  }
                </div>
                <div className="text-sm text-slate-500 dark:text-slate-500">
                  {t('features.solve_problem.supported_formats') || "Supports PNG, JPG, JPEG, GIF, WebP formats"}
                </div>
                <div className="text-xs text-slate-400 dark:text-slate-400 mt-1">
                  {t('upload.max_size') || "Maximum file size: 10MB"}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 错误信息 */}
        {uploadError && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-lg">
            <div className="text-sm text-red-600 dark:text-red-400">
              {uploadError}
            </div>
          </div>
        )}

        {/* 按钮组 */}
        <div className="flex justify-end space-x-3">
          <Button variant="outline" onClick={onClose} className="border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700">
            {t('common.cancel')}
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!file || solveProblemMutation.isPending}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {solveProblemMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('features.solve_problem.submit')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function SmartNotesCard({ onClose, onResult }: { onClose: () => void; onResult: (data: any) => void }) {
  const [content, setContent] = useState('');
  const smartNotesMutation = useAISmartNotes();
  const t = useTranslations('AIAssistant');

  const handleSubmit = async () => {
    if (!content.trim()) return;
    
    try {
      console.log('🔄 Starting smart notes generation for content length:', content.length);
      const response = await smartNotesMutation.mutateAsync(content);
      console.log('✅ Smart notes response:', response);
      
      console.log('📋 Full API response:', response);
      
      if (response && response.success) {
        // Check if any of the expected content fields exist and are not empty
        const hasContent = (response.result && response.result.trim()) || 
                          (response.answer && response.answer.trim()) || 
                          (response.analysis && response.analysis.trim());
        
        if (hasContent) {
          onResult(response);
        } else {
          console.error('❌ Response structure:', {
            success: response.success,
            result: response.result,
            answer: response.answer,
            analysis: response.analysis,
            toolsUsed: response.toolsUsed
          });
          throw new Error(`AI分析返回空内容: ${JSON.stringify({
            hasResult: !!response.result,
            hasAnswer: !!response.answer, 
            hasAnalysis: !!response.analysis,
            toolsUsed: response.toolsUsed?.length || 0
          })}`);
        }
      } else {
        console.error('❌ API response failed:', response);
        throw new Error('AI服务请求失败: ' + (response?.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('❌ Smart notes error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Error details:', {
        message: errorMessage,
        stack: error instanceof Error ? error.stack : 'No stack trace',
        contentLength: content.length
      });
      
      toast.error("笔记生成失败: " + (errorMessage.includes('fetch') ? '网络连接失败，请检查网络连接' : errorMessage));
    }
  };

  return (
    <Card className="w-full border border-slate-200 dark:border-slate-700/30 bg-white dark:bg-slate-800/60">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-slate-900 dark:text-white text-base font-medium">{t('features.smart_notes.title')}</CardTitle>
              <CardDescription className="text-slate-600 dark:text-slate-400 text-sm">{t('features.smart_notes.input_description')}</CardDescription>
            </div>
          </div>
          <Button variant="ghost" onClick={onClose} className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white h-8 w-8 p-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <Textarea
          placeholder={t('features.smart_notes.placeholder')}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="min-h-[120px] bg-slate-50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600/50 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400"
        />
        <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>{content.length} {t('common.characters')}</span>
          <Badge variant="secondary" className="bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">{t('features.smart_notes.language_support')}</Badge>
        </div>
        
        <div className="flex justify-end space-x-3">
          <Button variant="outline" onClick={onClose} className="border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700">{t('common.cancel')}</Button>
          <Button 
            onClick={handleSubmit}
            disabled={!content.trim() || smartNotesMutation.isPending}
            className="bg-purple-500 hover:bg-purple-600 text-white"
          >
            {smartNotesMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('features.smart_notes.submit')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function LearningPathCard({ onClose, onResult }: { onClose: () => void; onResult: (data: any) => void }) {
  const [goal, setGoal] = useState('');
  const [level, setLevel] = useState('');
  const [timeConstraint, setTimeConstraint] = useState('');
  const learningPathMutation = useAILearningPath();
  const t = useTranslations('AIAssistant');

  const handleSubmit = async () => {
    if (!goal.trim()) return;
    
    try {
      console.log('🔄 Starting learning path generation for goal:', goal);
      const response = await learningPathMutation.mutateAsync({
        learning_goal: goal,
        current_level: level,
        time_constraint: timeConstraint
      });
      console.log('✅ Learning path response:', response);
      
      console.log('📋 Full Learning Path API response:', response);
      
      if (response && response.success) {
        // Check if any of the expected content fields exist and are not empty
        const hasContent = (response.result && response.result.trim()) || 
                          (response.answer && response.answer.trim()) || 
                          (response.analysis && response.analysis.trim());
        
        if (hasContent) {
          onResult(response);
        } else {
          console.error('❌ Learning Path Response structure:', {
            success: response.success,
            result: response.result,
            answer: response.answer,
            analysis: response.analysis,
            toolsUsed: response.toolsUsed
          });
          throw new Error(`学习路径生成返回空内容: ${JSON.stringify({
            hasResult: !!response.result,
            hasAnswer: !!response.answer, 
            hasAnalysis: !!response.analysis,
            toolsUsed: response.toolsUsed?.length || 0
          })}`);
        }
      } else {
        console.error('❌ Learning Path API response failed:', response);
        throw new Error('学习路径服务请求失败: ' + (response?.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('❌ Learning path error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Error details:', {
        message: errorMessage,
        stack: error instanceof Error ? error.stack : 'No stack trace',
        goal,
        level,
        timeConstraint
      });
      
      toast.error("学习路径生成失败: " + (errorMessage.includes('fetch') ? '网络连接失败，请检查网络连接' : errorMessage));
    }
  };

  return (
    <Card className="w-full border border-slate-200 dark:border-slate-700/30 bg-white dark:bg-slate-800/60">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
              <Route className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-slate-900 dark:text-white text-base font-medium">{t('features.learning_path.title')}</CardTitle>
              <CardDescription className="text-slate-600 dark:text-slate-400 text-sm">{t('features.learning_path.input_description')}</CardDescription>
            </div>
          </div>
          <Button variant="ghost" onClick={onClose} className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white h-8 w-8 p-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <Input
          placeholder={t('features.learning_path.placeholder')}
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          className="bg-slate-50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600/50 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400"
        />
        
        <div className="grid grid-cols-2 gap-4">
          <select 
            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600/50 rounded-md bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white"
            value={level}
            onChange={(e) => setLevel(e.target.value)}
          >
            <option value="" className="bg-slate-50 dark:bg-slate-800">{t('features.learning_path.select_level')}</option>
            <option value="beginner" className="bg-slate-50 dark:bg-slate-800">{t('features.learning_path.levels.beginner')}</option>
            <option value="intermediate" className="bg-slate-50 dark:bg-slate-800">{t('features.learning_path.levels.intermediate')}</option>
            <option value="advanced" className="bg-slate-50 dark:bg-slate-800">{t('features.learning_path.levels.advanced')}</option>
          </select>
          
          <select 
            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600/50 rounded-md bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white"
            value={timeConstraint}
            onChange={(e) => setTimeConstraint(e.target.value)}
          >
            <option value="" className="bg-slate-50 dark:bg-slate-800">{t('features.learning_path.select_time')}</option>
            <option value="1week" className="bg-slate-50 dark:bg-slate-800">{t('features.learning_path.timeframes.one_week')}</option>
            <option value="1month" className="bg-slate-50 dark:bg-slate-800">{t('features.learning_path.timeframes.one_month')}</option>
            <option value="3months" className="bg-slate-50 dark:bg-slate-800">{t('features.learning_path.timeframes.three_months')}</option>
            <option value="flexible" className="bg-slate-50 dark:bg-slate-800">{t('features.learning_path.timeframes.flexible')}</option>
          </select>
        </div>
        
        <div className="flex justify-end space-x-3">
          <Button variant="outline" onClick={onClose} className="border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700">{t('common.cancel')}</Button>
          <Button 
            onClick={handleSubmit}
            disabled={!goal.trim() || learningPathMutation.isPending}
            className="bg-orange-500 hover:bg-orange-600 text-white"
          >
            {learningPathMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('features.learning_path.submit')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// AI 结果卡片组件 - 在右边区域显示，支持流式输出和放大
interface AIResultCardProps {
  type: 'quick_qa' | 'solve_problem' | 'smart_notes' | 'learning_path';
  result: any;
  onClose: () => void;
  onTryAgain: () => void;
  onExpand: () => void;
}

function AIResultCard({ type, result, onClose, onTryAgain, onExpand }: AIResultCardProps) {
  const t = useTranslations('AIAssistant');
  
  const getConfig = () => {
    switch (type) {
      case 'quick_qa':
        return {
          title: t('features.quick_qa.title'),
          icon: MessageCircle,
          color: 'bg-blue-500'
        };
      case 'solve_problem':
        return {
          title: t('features.solve_problem.title'),
          icon: Calculator,
          color: 'bg-emerald-500'
        };
      case 'smart_notes':
        return {
          title: t('features.smart_notes.title'),
          icon: FileText,
          color: 'bg-purple-500'
        };
      case 'learning_path':
        return {
          title: t('features.learning_path.title'),
          icon: Route,
          color: 'bg-orange-500'
        };
    }
  };

  const config = getConfig();
  const Icon = config.icon;

  return (
    <Card className="w-full border border-slate-200 dark:border-slate-700/30 bg-white dark:bg-slate-800/60 max-h-[600px] flex flex-col">
      <CardHeader className="pb-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`w-8 h-8 ${config.color} rounded-lg flex items-center justify-center`}>
              <Icon className="h-4 w-4 text-white" />
            </div>
            <div>
              <CardTitle className="text-slate-900 dark:text-white text-sm font-medium flex items-center gap-2">
                {config.title}
                <CheckCircle className="h-4 w-4 text-green-400" />
              </CardTitle>
              <CardDescription className="text-slate-600 dark:text-slate-400 text-xs flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {result.metadata?.processingTimeMs || 0}ms
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={onExpand}
              className="h-8 w-8 p-0 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            >
              <Maximize2 className="h-3 w-3" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={onTryAgain}
              className="h-8 w-8 p-0 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            >
              <RotateCcw className="h-3 w-3" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            >
              <ArrowLeft className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto space-y-3">
        <StreamingResultContent type={type} result={result} />
        
        {/* 工具使用信息 */}
        {result.toolsUsed && result.toolsUsed.length > 0 && (
          <div className="pt-3 border-t border-slate-200 dark:border-slate-700/50">
            <div className="flex flex-wrap gap-1">
              {result.toolsUsed.map((tool: string, index: number) => (
                <Badge key={index} variant="secondary" className="bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs px-1.5 py-0.5">
                  {tool}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// 学习路径可视化组件
function LearningPathVisualization({ learningPath }: { learningPath: any }) {
  const [activeStep, setActiveStep] = useState<number | null>(null);
  const t = useTranslations('AIAssistant');

  if (!learningPath) return null;

  const { 
    mermaidDiagram, 
    roadmap, 
    recommendedCourses = [], 
    quizSuggestions = [], 
    milestones = [] 
  } = learningPath;

  return (
    <div className="space-y-6">
      {/* Mermaid学习路线图 */}
      {mermaidDiagram && (
        <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold mb-4 text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <Route className="h-5 w-5 text-orange-500" />
            {t('learning_path.roadmap')}
          </h3>
          <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 overflow-x-auto">
            <Mermaid chart={mermaidDiagram} className="w-full" />
          </div>
        </div>
      )}

      {/* 学习步骤详细 */}
      {roadmap && roadmap.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold mb-4 text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-500" />
            {t('learning_path.steps')}
          </h3>
          <div className="space-y-3">
            {roadmap.map((step: any, index: number) => (
              <div
                key={index}
                className={`border rounded-lg p-4 cursor-pointer transition-all ${
                  activeStep === index
                    ? 'border-orange-400 bg-orange-50 dark:bg-orange-900/20'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
                onClick={() => setActiveStep(activeStep === index ? null : index)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                      <span className="text-sm font-semibold text-orange-600 dark:text-orange-400">
                        {index + 1}
                      </span>
                    </div>
                    <div>
                      <h4 className="font-medium text-slate-800 dark:text-slate-200">
                        {step.title || step.step || `${t('learning_path.step_number')} ${index + 1}`}
                      </h4>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {step.duration && `${t('learning_path.duration')}: ${step.duration}`}
                        {step.difficulty && ` • ${t('learning_path.difficulty')}: ${step.difficulty}`}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className={`h-4 w-4 text-slate-400 transition-transform ${
                    activeStep === index ? 'rotate-90' : ''
                  }`} />
                </div>
                
                {activeStep === index && (
                  <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                      <MarkdownContent content={step.description || step.details || ''} />
                    </div>
                    {step.resources && (
                      <div className="mt-3">
                        <h5 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t('learning_path.resources')}:</h5>
                        <div className="flex flex-wrap gap-2">
                          {step.resources.map((resource: string, idx: number) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {resource}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 推荐课程 */}
      {recommendedCourses && recommendedCourses.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold mb-4 text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-green-500" />
            {t('learning_path.recommended_courses')}
          </h3>
          <div className="grid gap-3">
            {recommendedCourses.map((course: any, index: number) => (
              <div key={index} className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-slate-800 dark:text-slate-200">{course.title}</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{course.description}</p>
                    <div className="flex items-center gap-4 mt-2">
                      {course.level && (
                        <Badge variant="outline" className="text-xs">
                          {course.level}
                        </Badge>
                      )}
                      {course.duration && (
                        <span className="text-xs text-slate-500">{course.duration}</span>
                      )}
                    </div>
                  </div>
                  <Button size="sm" variant="outline" className="ml-3">
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 题库推荐 */}
      {quizSuggestions && quizSuggestions.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold mb-4 text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <Calculator className="h-5 w-5 text-purple-500" />
            {t('learning_path.practice_quizzes')}
          </h3>
          <div className="grid gap-3">
            {quizSuggestions.map((quiz: any, index: number) => (
              <div key={index} className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-slate-800 dark:text-slate-200">{quiz.title}</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{quiz.description}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="secondary" className="text-xs">
                        {quiz.questions || 10} {t('learning_path.questions')}
                      </Badge>
                      <span className="text-xs text-slate-500">
                        {quiz.estimatedTime || '15'} {t('learning_path.min')}
                      </span>
                    </div>
                  </div>
                  <Button size="sm" className="bg-purple-500 hover:bg-purple-600 text-white">
                    {t('learning_path.start_quiz')}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// 流式结果显示组件
interface StreamingResultContentProps {
  type: 'quick_qa' | 'solve_problem' | 'smart_notes' | 'learning_path';
  result: any;
}

function StreamingResultContent({ type, result }: StreamingResultContentProps) {
  const t = useTranslations('AIAssistant');
  const { data: user } = useUser();
  const [displayText, setDisplayText] = useState('');
  const [isStreaming, setIsStreaming] = useState(true);

  // Helper function to get numeric user ID
  const getUserId = (): number | undefined => {
    if (user?.profile?.id) return parseInt(user.profile.id);
    if (user?.id) return parseInt(user.id);
    return undefined;
  };
  
  const fullText = result.answer || result.result || '';

  React.useEffect(() => {
    if (!fullText) return;
    
    setDisplayText('');
    setIsStreaming(true);
    
    let currentIndex = 0;
    const streamInterval = setInterval(() => {
      if (currentIndex < fullText.length) {
        setDisplayText(fullText.slice(0, currentIndex + 1));
        currentIndex++;
      } else {
        setIsStreaming(false);
        clearInterval(streamInterval);
      }
    }, 20); // 控制流式输出速度

    return () => clearInterval(streamInterval);
  }, [fullText]);

  const getIcon = () => {
    switch (type) {
      case 'quick_qa': return MessageCircle;
      case 'solve_problem': return Calculator;
      case 'smart_notes': return FileText;
      case 'learning_path': return Route;
    }
  };

  const Icon = getIcon();

  // 学习路径类型使用特殊的可视化组件
  if (type === 'learning_path') {
    // 如果还在流式传输，显示流式文本内容而不是静态加载界面
    if (isStreaming) {
      return (
        <div className="space-y-4">
          {/* 学习路径标题和状态 */}
          <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">🧠 AI正在生成个性化学习路径...</span>
            </div>
            
            {/* 流式显示AI响应文本 */}
            <div className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed">
              <div className="prose prose-sm max-w-none dark:prose-invert prose-slate">
                <MarkdownContent content={displayText} isStreaming={isStreaming} />
              </div>
              {isStreaming && <span className="animate-pulse ml-1">▋</span>}
            </div>
          </div>
        </div>
      );
    }

    // 解析学习路径数据
    let learningData: any = {};
    try {
      const analysisText = result.analysis || result.result || fullText;
      if (typeof analysisText === 'string' && analysisText.includes('Learning Path Analysis Results:')) {
        const jsonStart = analysisText.indexOf('{');
        const jsonEnd = analysisText.lastIndexOf('}');
        if (jsonStart !== -1 && jsonEnd !== -1) {
          const jsonStr = analysisText.substring(jsonStart, jsonEnd + 1);
          learningData = JSON.parse(jsonStr);
        }
      } else if (typeof analysisText === 'object') {
        learningData = analysisText;
      }
    } catch (error) {
      console.error('Failed to parse learning path data:', error);
    }

    return (
      <div className="space-y-4">        
        {/* 学习路径可视化 - 使用和AI结果显示相同的组件 */}
        {learningData.learningGoal ? (
          <LearningPathVisualization learningPath={learningData} />
        ) : (
          // 如果解析失败，显示原始文本
          <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3">
            <div className="flex items-start gap-2 mb-2">
              <Icon className="h-4 w-4 text-slate-600 dark:text-slate-400 mt-0.5 flex-shrink-0" />
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{t('dialog.ai_answer')}</span>
            </div>
            <div className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed">
              <div className="prose prose-sm max-w-none dark:prose-invert prose-slate">
                <MarkdownContent content={displayText} isStreaming={false} />
              </div>
            </div>
          </div>
        )}
        
        {/* 学习路径完成后，显示保存按钮 */}
        {!isStreaming && learningData.learningGoal && (
          <div className="mt-6 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h4 className="font-medium text-emerald-800 dark:text-emerald-200">个性化学习路径生成完成</h4>
                  <p className="text-sm text-emerald-600 dark:text-emerald-300">保存到仪表盘以便随时查看和跟踪进度</p>
                </div>
              </div>
              <SaveLearningPathButton learningPath={learningData} />
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3">
        <div className="flex items-start gap-2 mb-2">
          <Icon className="h-4 w-4 text-slate-600 dark:text-slate-400 mt-0.5 flex-shrink-0" />
          <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{t('dialog.ai_answer')}</span>
          {isStreaming && <Loader2 className="h-3 w-3 animate-spin text-slate-400" />}
        </div>
        <div className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed">
          <div className="prose prose-sm max-w-none dark:prose-invert prose-slate">
            <MarkdownContent content={displayText} isStreaming={isStreaming} />
          </div>
          {isStreaming && <span className="animate-pulse ml-1">▋</span>}
        </div>
      </div>

      {/* 其他信息显示 */}
      {!isStreaming && result.confidence && (
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <Target className="h-3 w-3" />
          {t('dialog.confidence')}: {Math.round(result.confidence * 100)}%
        </div>
      )}

      {!isStreaming && result.recommendations && result.recommendations.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400">
            <Lightbulb className="h-3 w-3" />
            {t('dialog.recommendations')}
          </div>
          {result.recommendations.map((rec: any, index: number) => (
            <div key={index} className="text-xs text-slate-600 dark:text-slate-400 bg-amber-50 dark:bg-amber-900/20 border-l-2 border-amber-300 dark:border-amber-600/50 pl-2 py-1">
              {typeof rec === 'string' ? rec : JSON.stringify(rec)}
            </div>
          ))}
        </div>
      )}

      {/* 解题类型，显示保存到错题本按钮 */}
      {!isStreaming && type === 'solve_problem' && (
        <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center">
                <Calculator className="w-4 h-4 text-white" />
              </div>
              <div>
                <h4 className="font-medium text-red-800 dark:text-red-200">保存解题过程</h4>
                <p className="text-sm text-red-600 dark:text-red-300">将错题和解题分析保存到错题本中</p>
              </div>
            </div>
            <SaveToMistakeBookButton problemContent={fullText} analysis={fullText} />
          </div>
        </div>
      )}

      {/* Q&A类型，推荐社区帖子和群组 */}
      {!isStreaming && getUserId() && type === 'quick_qa' && (
        <div className="mt-6 space-y-4">
          {/* 推荐相关讨论帖子 */}
          <SmartRecommendations
            type="posts"
            userId={getUserId()}
            context={fullText}
            maxResults={3}
            className="w-full"
          />
          
          {/* 推荐相关学习社区 */}
          <SmartRecommendations
            type="groups"
            userId={getUserId()}
            context={fullText}
            maxResults={3}
            className="w-full"
          />
        </div>
      )}

      {/* 智能笔记类型，显示保存按钮 */}
      {!isStreaming && type === 'smart_notes' && (
        <div className="mt-6 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center">
                <FileText className="w-4 h-4 text-white" />
              </div>
              <div>
                <h4 className="font-medium text-purple-800 dark:text-purple-200">保存智能笔记</h4>
                <p className="text-sm text-purple-600 dark:text-purple-300">将AI生成的笔记保存到您的笔记本中</p>
              </div>
            </div>
            <SaveAINoteButton content={fullText} />
          </div>
        </div>
      )}
    </div>
  );
}

// 保存学习路径按钮组件
interface SaveLearningPathButtonProps {
  learningPath: any;
}

function SaveLearningPathButton({ learningPath }: SaveLearningPathButtonProps) {
  const saveLearningPath = useSaveLearningPath();
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = async () => {
    if (isSaving || isSaved) return;

    setIsSaving(true);
    try {
      await saveLearningPath.mutateAsync({
        learningPath,
        title: `${learningPath.learningGoal} 学习路径`,
        description: `基于您的目标"${learningPath.learningGoal}"生成的个性化学习路径`
      });
      setIsSaved(true);
    } catch (error) {
      // 错误处理由hook中的onError处理
    } finally {
      setIsSaving(false);
    }
  };

  if (isSaved) {
    return (
      <Button 
        variant="outline" 
        size="sm" 
        className="border-emerald-300 text-emerald-700 dark:text-emerald-300 cursor-default"
        disabled
      >
        <CheckCircle className="w-4 h-4 mr-2" />
        已保存
      </Button>
    );
  }

  return (
    <Button 
      onClick={handleSave}
      disabled={isSaving}
      size="sm"
      className="bg-emerald-600 hover:bg-emerald-700 text-white"
    >
      {isSaving ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          保存中...
        </>
      ) : (
        <>
          <BookOpen className="w-4 h-4 mr-2" />
          保存到仪表盘
        </>
      )}
    </Button>
  );
}

// 保存AI笔记按钮组件
interface SaveAINoteButtonProps {
  content: string;
}

function SaveAINoteButton({ content }: SaveAINoteButtonProps) {
  const saveAINote = useSaveAINote();
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = async () => {
    if (isSaving || isSaved || !content) return;

    setIsSaving(true);
    try {
      await saveAINote.mutateAsync({
        content,
        aiSummary: content, // 将内容作为AI摘要
        title: `AI智能笔记 - ${new Date().toLocaleDateString()}`,
        tags: ['ai_generated', 'smart_notes']
      });
      setIsSaved(true);
    } catch (error) {
      // 错误处理由hook中的onError处理
    } finally {
      setIsSaving(false);
    }
  };

  if (isSaved) {
    return (
      <Button 
        variant="outline" 
        size="sm" 
        className="border-purple-300 text-purple-700 dark:text-purple-300 cursor-default"
        disabled
      >
        <CheckCircle className="w-4 h-4 mr-2" />
        已保存
      </Button>
    );
  }

  return (
    <Button 
      onClick={handleSave}
      disabled={isSaving}
      size="sm"
      className="bg-purple-600 hover:bg-purple-700 text-white"
    >
      {isSaving ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          保存中...
        </>
      ) : (
        <>
          <FileText className="w-4 h-4 mr-2" />
          保存笔记
        </>
      )}
    </Button>
  );
}

// 保存到错题本按钮组件
interface SaveToMistakeBookButtonProps {
  problemContent: string;
  analysis: string;
}

function SaveToMistakeBookButton({ problemContent, analysis }: SaveToMistakeBookButtonProps) {
  const saveMistake = useSaveMistake();
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = async () => {
    if (isSaving || isSaved || !problemContent) return;

    setIsSaving(true);
    try {
      await saveMistake.mutateAsync({
        mistakeContent: problemContent,
        analysis,
        sourceType: 'ai_solve',
        knowledgePoints: [], // 可以后续扩展自动提取知识点
      });
      setIsSaved(true);
    } catch (error) {
      // 错误处理由hook中的onError处理
    } finally {
      setIsSaving(false);
    }
  };

  if (isSaved) {
    return (
      <Button 
        variant="outline" 
        size="sm" 
        className="border-red-300 text-red-700 dark:text-red-300 cursor-default"
        disabled
      >
        <CheckCircle className="w-4 h-4 mr-2" />
        已保存
      </Button>
    );
  }

  return (
    <Button 
      onClick={handleSave}
      disabled={isSaving}
      size="sm"
      className="bg-red-600 hover:bg-red-700 text-white"
    >
      {isSaving ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          保存中...
        </>
      ) : (
        <>
          <BookOpen className="w-4 h-4 mr-2" />
          保存到错题本
        </>
      )}
    </Button>
  );
}

