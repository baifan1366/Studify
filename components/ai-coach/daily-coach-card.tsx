'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Brain,
  CheckCircle2,
  Clock,
  Target,
  Star,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Play,
  Plus,
  Lightbulb,
  Heart,
  Route,
  TrendingUp,
  Award
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  useDailyPlan, 
  useGenerateDailyPlan, 
  useUpdateTaskStatus, 
  usePlanStats,
  formatDuration,
  getTaskTypeInfo,
  getPriorityInfo,
  DailyLearningPlan 
} from '@/hooks/ai-coach/use-ai-coach';
import { useLearningPathProgress } from '@/hooks/ai-coach/use-learning-path-progress';

interface DailyCoachCardProps {
  className?: string;
  onReflectionClick?: () => void;
}

export default function DailyCoachCard({ className, onReflectionClick }: DailyCoachCardProps) {
  const t = useTranslations('AICoach');
  const [isExpanded, setIsExpanded] = useState(false);
  const [showPathProgress, setShowPathProgress] = useState(false);
  
  // Hooks
  const { data: planData, isLoading, error } = useDailyPlan();
  const generatePlan = useGenerateDailyPlan();
  const updateTaskStatus = useUpdateTaskStatus();
  const { data: pathProgress, isLoading: pathProgressLoading } = useLearningPathProgress();
  
  const plan = planData;
  const stats = usePlanStats(plan);

  const handleGeneratePlan = () => {
    // AI Coach generates personalized plan using:
    // - User's learning paths (long-term goals and roadmaps)
    // - Recent AI notes (insights and key learnings)
    // - Active courses and progress
    // - Learning statistics and patterns
    // This ensures tasks align with learning paths and build upon saved notes
    generatePlan.mutate();
  };

  const handleTaskToggle = (taskId: string, isCompleted: boolean, estimatedMinutes: number) => {
    updateTaskStatus.mutate({
      taskId,
      isCompleted,
      actualMinutes: isCompleted ? estimatedMinutes : 0
    });
  };

  if (isLoading) {
    return <DailyCoachCardSkeleton className={className} />;
  }

  return (
    <motion.div
      className={cn(
        "relative bg-gradient-to-br from-indigo-600/20 via-purple-600/20 to-pink-500/20 rounded-2xl border border-white/20 backdrop-blur-sm p-6",
        className
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/20 rounded-lg">
            <Brain className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              {t('daily_coach')}
              {stats.isCompleted && (
                <CheckCircle2 className="w-4 h-4 text-green-400" />
              )}
            </h3>
            <p className="text-sm text-white/60">
              {plan ? t('today_plan') : t('plan_description')}
            </p>
          </div>
        </div>
        
        {plan && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-white/70 hover:text-white hover:bg-white/10"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        )}
      </div>

      {/* No Plan State */}
      {!plan && (
        <div className="text-center py-6">
          <div className="mb-4">
            <Target className="w-12 h-12 text-white/40 mx-auto mb-2" />
            <p className="text-white/60 text-sm mb-4">{t('no_plan_today')}</p>
          </div>
          
          <Button
            onClick={handleGeneratePlan}
            disabled={generatePlan.isPending}
            className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white border-0"
          >
            {generatePlan.isPending ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                {t('generating_plan')}
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                {t('generate_plan')}
              </>
            )}
          </Button>
        </div>
      )}

      {/* Plan Overview */}
      {plan && (
        <div className="space-y-4">
          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="text-center p-3 bg-white/5 rounded-lg">
              <div className="text-sm text-white/60">{t('tasks_completed')}</div>
              <div className="text-lg font-semibold text-white">
                {stats.completedTasks}/{stats.totalTasks}
              </div>
            </div>
            
            <div className="text-center p-3 bg-white/5 rounded-lg">
              <div className="text-sm text-white/60">{t('completion_rate')}</div>
              <div className="text-lg font-semibold text-white">
                {stats.completionRate}%
              </div>
            </div>
            
            <div className="text-center p-3 bg-white/5 rounded-lg">
              <div className="text-sm text-white/60">{t('points_earned')}</div>
              <div className="text-lg font-semibold text-white flex items-center justify-center gap-1">
                <Star className="w-4 h-4 text-yellow-400" />
                {stats.earnedPoints}
              </div>
            </div>
            
            <div className="text-center p-3 bg-white/5 rounded-lg">
              <div className="text-sm text-white/60">{t('estimated_time')}</div>
              <div className="text-lg font-semibold text-white flex items-center justify-center gap-1">
                <Clock className="w-4 h-4 text-blue-400" />
                {formatDuration(stats.estimatedTime)}
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-white/70">
              <span>{t('today_progress')}</span>
              <span>{stats.completionRate}%</span>
            </div>
            <Progress 
              value={stats.completionRate} 
              className="h-2 bg-white/10"
            />
          </div>

          {/* AI Insights & Motivation - Always Visible */}
          {plan.ai_insights && (
            <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-medium text-blue-400">{t('insights_title')}</span>
              </div>
              <p className="text-sm text-white/80">{plan.ai_insights}</p>
            </div>
          )}

          {plan.motivation_message && (
            <div className="p-4 bg-pink-500/10 rounded-lg border border-pink-500/20">
              <div className="flex items-center gap-2 mb-2">
                <Heart className="w-4 h-4 text-pink-400" />
                <span className="text-sm font-medium text-pink-400">{t('motivation_title')}</span>
              </div>
              <p className="text-sm text-white/80">{plan.motivation_message}</p>
            </div>
          )}

          {/* Expandable Tasks List */}
          <AnimatePresence>
            {isExpanded && plan.tasks && plan.tasks.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-3 overflow-hidden"
              >
                <div className="border-t border-white/10 pt-4">
                  <h4 className="text-sm font-medium text-white/80 mb-3">{t('today_tasks')}</h4>
                  
                  {plan.tasks
                    .sort((a: any, b: any) => getPriorityInfo(b.priority).order - getPriorityInfo(a.priority).order)
                    .map((task: any) => {
                      const typeInfo = getTaskTypeInfo(task.task_type);
                      const priorityInfo = getPriorityInfo(task.priority);
                      
                      return (
                        <motion.div
                          key={task.public_id}
                          className={cn(
                            "p-3 rounded-lg border transition-all duration-200 cursor-pointer",
                            task.is_completed
                              ? "bg-green-500/10 border-green-500/20"
                              : "bg-white/5 border-white/10 hover:bg-white/10"
                          )}
                          onClick={() => handleTaskToggle(
                            task.public_id, 
                            !task.is_completed, 
                            task.estimated_minutes
                          )}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <div className="flex items-start gap-3">
                            <div className={cn(
                              "w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 transition-colors",
                              task.is_completed
                                ? "bg-green-500 border-green-500"
                                : "border-white/30 hover:border-white/50"
                            )}>
                              {task.is_completed && (
                                <CheckCircle2 className="w-3 h-3 text-white" />
                              )}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm">{typeInfo.icon}</span>
                                <h5 className={cn(
                                  "font-medium text-sm",
                                  task.is_completed 
                                    ? "text-green-300 line-through" 
                                    : "text-white"
                                )}>
                                  {task.task_title}
                                </h5>
                                <span className={cn(
                                  "px-2 py-0.5 rounded-full text-xs font-medium",
                                  `bg-${priorityInfo.color}-500/20 text-${priorityInfo.color}-300`
                                )}>
                                  {priorityInfo.label}
                                </span>
                              </div>
                              
                              {task.task_description && (
                                <p className="text-xs text-white/60 mb-2">
                                  {task.task_description}
                                </p>
                              )}
                              
                              <div className="flex items-center gap-3 text-xs text-white/50">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {task.estimated_minutes} {t('minutes_short')}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Star className="w-3 h-3" />
                                  {task.points_reward} {t('pts')}
                                </span>
                                {task.category && (
                                  <span className="px-2 py-0.5 bg-white/10 rounded-full">
                                    {task.category}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleGeneratePlan}
              disabled={generatePlan.isPending}
              className="flex-1 bg-white/5 border-white/20 text-white hover:bg-white/10 disabled:opacity-50"
            >
              {generatePlan.isPending ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  {t('generating_plan')}
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  {t('regenerate_plan')}
                </>
              )}
            </Button>
            
            {onReflectionClick && (
              <Button
                variant="outline"
                size="sm"
                onClick={onReflectionClick}
                className="flex-1 bg-purple-500/20 border-purple-500/30 text-purple-300 hover:bg-purple-500/30"
              >
                <Brain className="w-4 h-4 mr-2" />
                {t('evening_retro')}
              </Button>
            )}
          </div>

          {/* Completion Celebration */}
          {stats.isCompleted && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center p-4 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-lg border border-green-500/30"
            >
              <div className="text-2xl mb-2">🎉</div>
              <h4 className="font-semibold text-green-300 mb-1">{t('plan_completed')}</h4>
              <p className="text-sm text-green-400">{t('great_job')}</p>
              {onReflectionClick && (
                <p className="text-xs text-green-500 mt-2">{t('time_to_reflect')}</p>
              )}
            </motion.div>
          )}

          {/* Learning Path Progress Section */}
          {pathProgress && pathProgress.length > 0 && (
            <div className="border-t border-white/10 pt-4 mt-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-white/80 flex items-center gap-2">
                  <Route className="w-4 h-4 text-indigo-400" />
                  {t('learning_path_progress')}
                </h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPathProgress(!showPathProgress)}
                  className="text-white/60 hover:text-white/80 h-auto p-1"
                >
                  {showPathProgress ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </Button>
              </div>

              {/* Path Progress Overview (Always Visible) */}
              <div className="space-y-2">
                {pathProgress.slice(0, showPathProgress ? pathProgress.length : 2).map((path) => (
                  <div key={path.pathId} className="p-3 bg-white/5 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <h5 className="text-sm font-medium text-white truncate">{path.pathTitle}</h5>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex items-center gap-1 text-xs text-white/50">
                            <Award className="w-3 h-3" />
                            {path.completedMilestones}/{path.totalMilestones} {t('milestones')}
                          </div>
                          {path.currentMilestone && (
                            <div className="flex items-center gap-1 text-xs text-indigo-300">
                              <Target className="w-3 h-3" />
                              {path.currentMilestone.name}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right ml-3">
                        <div className="text-lg font-bold text-white">{path.overallProgress}%</div>
                        <div className="text-xs text-white/40">{t('complete')}</div>
                      </div>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="relative h-2 bg-white/10 rounded-full overflow-hidden">
                      <motion.div
                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-indigo-500 to-purple-600"
                        initial={{ width: 0 }}
                        animate={{ width: `${path.overallProgress}%` }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                      />
                      
                      {/* Milestone Markers */}
                      {path.milestones.map((milestone, idx) => (
                        <div
                          key={milestone.id}
                          className="absolute top-0 bottom-0 w-0.5 bg-white/20"
                          style={{ 
                            left: `${((idx + 1) / path.totalMilestones) * 100}%` 
                          }}
                          title={milestone.name}
                        >
                          {milestone.completed && (
                            <CheckCircle2 
                              className="absolute -top-1 -left-1.5 w-3 h-3 text-green-400 bg-slate-900 rounded-full" 
                            />
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Milestones Detail (when expanded) */}
                    {showPathProgress && (
                      <div className="mt-3 space-y-1">
                        {path.milestones.map((milestone) => (
                          <div
                            key={milestone.id}
                            className={cn(
                              "flex items-center gap-2 text-xs p-2 rounded",
                              milestone.completed 
                                ? "bg-green-500/10 text-green-300" 
                                : milestone.id === path.currentMilestone?.id
                                ? "bg-indigo-500/10 text-indigo-300"
                                : "text-white/40"
                            )}
                          >
                            {milestone.completed ? (
                              <CheckCircle2 className="w-3 h-3 flex-shrink-0" />
                            ) : (
                              <div className="w-3 h-3 rounded-full border border-current flex-shrink-0" />
                            )}
                            <span className="flex-1 truncate">{milestone.name}</span>
                            {milestone.completedAt && (
                              <span className="text-xs opacity-60">
                                {new Date(milestone.completedAt).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Next Milestone Hint */}
                    {path.nextMilestone && !showPathProgress && (
                      <div className="mt-2 text-xs text-white/60 flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        Next: {path.nextMilestone.name}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {pathProgress.length > 2 && !showPathProgress && (
                <button 
                  onClick={() => setShowPathProgress(true)}
                  className="w-full text-xs text-white/60 hover:text-white/80 transition-colors mt-2"
                >
                  {t('view_all_paths', { count: pathProgress.length })}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

// Loading skeleton component
function DailyCoachCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn(
      "relative bg-gradient-to-br from-indigo-600/20 via-purple-600/20 to-pink-500/20 rounded-2xl border border-white/20 backdrop-blur-sm p-6",
      className
    )}>
      {/* Header Skeleton */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 bg-white/20 rounded-lg animate-pulse" />
        <div className="space-y-2">
          <div className="w-32 h-4 bg-white/20 rounded animate-pulse" />
          <div className="w-48 h-3 bg-white/10 rounded animate-pulse" />
        </div>
      </div>

      {/* Stats Skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="p-3 bg-white/5 rounded-lg">
            <div className="w-16 h-3 bg-white/20 rounded animate-pulse mb-2" />
            <div className="w-12 h-5 bg-white/20 rounded animate-pulse" />
          </div>
        ))}
      </div>

      {/* Progress Skeleton */}
      <div className="space-y-2">
        <div className="flex justify-between">
          <div className="w-24 h-3 bg-white/20 rounded animate-pulse" />
          <div className="w-8 h-3 bg-white/20 rounded animate-pulse" />
        </div>
        <div className="w-full h-2 bg-white/10 rounded animate-pulse" />
      </div>
    </div>
  );
}
