"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { 
  MessageCircle, 
  Calculator, 
  FileText, 
  Route, 
  CheckCircle,
  Clock,
  Lightbulb,
  BookOpen,
  Target,
  ArrowLeft,
  RotateCcw
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useTranslations } from 'next-intl';

interface AIResultDisplayProps {
  type: 'quick_qa' | 'solve_problem' | 'smart_notes' | 'learning_path';
  result: any;
  onClose: () => void;
  onTryAgain?: () => void;
}

export default function AIResultDisplay({ type, result, onClose, onTryAgain }: AIResultDisplayProps) {
  const t = useTranslations('AIAssistant');
  
  const getConfig = () => {
    switch (type) {
      case 'quick_qa':
        return {
          title: t('results.quick_qa.title'),
          icon: MessageCircle,
          color: 'bg-blue-500'
        };
      case 'solve_problem':
        return {
          title: t('results.solve_problem.title'),
          icon: Calculator,
          color: 'bg-green-500'
        };
      case 'smart_notes':
        return {
          title: t('results.smart_notes.title'),
          icon: FileText,
          color: 'bg-purple-500'
        };
      case 'learning_path':
        return {
          title: t('results.learning_path.title'),
          icon: Route,
          color: 'bg-orange-500'
        };
    }
  };

  const config = getConfig();
  const Icon = config.icon;

  return (
    <section className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 py-8">
      <div className="max-w-4xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
        >
          <Card className="border border-slate-700/50 shadow-2xl bg-slate-800/90 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className={`w-12 h-12 ${config.color} rounded-xl flex items-center justify-center shadow-lg`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="flex items-center gap-2 text-white text-xl">
                      {config.title}
                      <CheckCircle className="h-5 w-5 text-green-400" />
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-2 text-slate-400">
                      <Clock className="h-4 w-4" />
                      {t('results.processing_time')}: {result.metadata?.processingTimeMs || 0}ms
                    </CardDescription>
                  </div>
                </div>
                <div className="flex space-x-3">
                  {onTryAgain && (
                    <Button 
                      variant="outline" 
                      onClick={onTryAgain}
                      className="border-slate-600 text-slate-300 hover:bg-slate-700"
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      {t('results.regenerate')}
                    </Button>
                  )}
                  <Button 
                    variant="ghost" 
                    onClick={onClose}
                    className="text-slate-300 hover:bg-slate-700"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    {t('results.back')}
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* 渲染不同类型的结果 */}
              {type === 'quick_qa' && <QuickQAResult result={result} t={t} />}
              {type === 'solve_problem' && <SolveProblemResult result={result} t={t} />}
              {type === 'smart_notes' && <SmartNotesResult result={result} t={t} />}
              {type === 'learning_path' && <LearningPathResult result={result} t={t} />}

              {/* 工具使用信息 */}
              {result.toolsUsed && result.toolsUsed.length > 0 && (
                <div className="mt-8 pt-6 border-t border-slate-700/50">
                  <h4 className="text-sm font-medium text-slate-300 mb-3">{t('results.tools_used')}</h4>
                  <div className="flex flex-wrap gap-2">
                    {result.toolsUsed.map((tool: string, index: number) => (
                      <Badge key={index} variant="secondary" className="bg-slate-700 text-slate-300 text-xs">
                        {tool}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </section>
  );
}

// Quick QA 结果组件
function QuickQAResult({ result, t }: { result: any; t: any }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold text-lg mb-4 flex items-center gap-2 text-white">
          <MessageCircle className="h-5 w-5 text-blue-400" />
          {t('results.quick_qa.answer_title')}
        </h3>
        <div className="bg-slate-700/50 rounded-xl p-6 border border-slate-600/50">
          <p className="text-slate-100 leading-relaxed whitespace-pre-wrap text-base">
            {result.answer || result.result}
          </p>
        </div>
      </div>

      {result.sources && result.sources.length > 0 && (
        <div>
          <h4 className="font-medium mb-3 flex items-center gap-2 text-slate-300">
            <BookOpen className="h-4 w-4 text-slate-400" />
            {t('results.quick_qa.sources')}
          </h4>
          <div className="space-y-3">
            {result.sources.map((source: any, index: number) => (
              <div key={index} className="bg-slate-700/30 rounded-lg p-4 border border-slate-600/30">
                <p className="font-medium text-sm text-slate-200">{source.title}</p>
                <p className="text-xs text-slate-400 mt-1">{source.type}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {result.confidence && (
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Target className="h-4 w-4" />
          {t('results.quick_qa.confidence')}: {Math.round(result.confidence * 100)}%
        </div>
      )}
    </div>
  );
}

// Solve Problem 结果组件
function SolveProblemResult({ result, t }: { result: any; t: any }) {
  const analysis = result.analysis || result.result;
  
  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold text-lg mb-4 flex items-center gap-2 text-white">
          <Calculator className="h-5 w-5 text-green-400" />
          {t('results.solve_problem.solution_title')}
        </h3>
        <div className="bg-slate-700/50 rounded-xl p-6 border border-slate-600/50">
          <div className="prose prose-sm max-w-none">
            <div className="whitespace-pre-wrap text-slate-100 leading-relaxed text-base">
              {typeof analysis === 'string' ? analysis : JSON.stringify(analysis, null, 2)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Smart Notes 结果组件
function SmartNotesResult({ result, t }: { result: any; t: any }) {
  const analysis = result.analysis || result.result;
  
  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold text-lg mb-4 flex items-center gap-2 text-white">
          <FileText className="h-5 w-5 text-purple-400" />
          {t('results.smart_notes.notes_title')}
        </h3>
        <div className="bg-slate-700/50 rounded-xl p-6 border border-slate-600/50">
          <div className="prose prose-sm max-w-none">
            <div className="whitespace-pre-wrap text-slate-100 leading-relaxed text-base">
              {typeof analysis === 'string' ? analysis : JSON.stringify(analysis, null, 2)}
            </div>
          </div>
        </div>
      </div>

      {result.recommendations && result.recommendations.length > 0 && (
        <div>
          <h4 className="font-medium mb-3 flex items-center gap-2 text-slate-300">
            <Lightbulb className="h-4 w-4 text-yellow-400" />
            {t('results.smart_notes.recommendations')}
          </h4>
          <div className="space-y-3">
            {result.recommendations.map((rec: any, index: number) => (
              <div key={index} className="bg-slate-700/30 border-l-4 border-yellow-400/50 p-4 rounded-r-lg">
                <p className="text-sm text-slate-200">{rec}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Learning Path 结果组件
function LearningPathResult({ result, t }: { result: any; t: any }) {
  const learningResult = result.result || result;
  
  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold text-lg mb-4 flex items-center gap-2 text-white">
          <Route className="h-5 w-5 text-orange-400" />
          {t('results.learning_path.path_title')}
        </h3>
        <div className="bg-slate-700/50 rounded-xl p-6 border border-slate-600/50">
          <div className="prose prose-sm max-w-none">
            <div className="whitespace-pre-wrap text-slate-100 leading-relaxed text-base">
              {typeof learningResult === 'string' ? learningResult : JSON.stringify(learningResult, null, 2)}
            </div>
          </div>
        </div>
      </div>

      {result.toolsUsed && result.toolsUsed.includes('recommend_content') && (
        <div className="bg-slate-700/30 border-l-4 border-orange-400/50 p-4 rounded-r-lg">
          <p className="text-sm text-slate-200 flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-orange-400" />
            {t('results.learning_path.personalized_note')}
          </p>
        </div>
      )}
    </div>
  );
}
