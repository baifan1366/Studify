'use client';

import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Brain, Check, CheckCircle2, ChevronDown, ChevronUp, Clock3,
  Lightbulb, ListChecks, Plus, RefreshCw, Sparkles, Star, Target,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import {
  DailyPlanTask, formatDuration, getTaskTypeInfo, useDailyPlan,
  useGenerateDailyPlan, usePlanStats, useUpdateTaskStatus,
} from '@/hooks/ai-coach/use-ai-coach';

interface DailyCoachCardProps {
  className?: string;
  onReflectionClick?: () => void;
}

const priorityStyles: Record<DailyPlanTask['priority'], string> = {
  urgent: 'border-red-400/30 bg-red-400/10 text-red-300',
  high: 'border-orange-400/30 bg-orange-400/10 text-orange-300',
  medium: 'border-blue-400/30 bg-blue-400/10 text-blue-300',
  low: 'border-white/15 bg-white/5 text-white/60',
};
const priorityOrder: Record<DailyPlanTask['priority'], number> = {
  urgent: 4, high: 3, medium: 2, low: 1,
};

export default function DailyCoachCard({ className, onReflectionClick }: DailyCoachCardProps) {
  const t = useTranslations('AICoach');
  const [showAllTasks, setShowAllTasks] = useState(false);
  const [showRationale, setShowRationale] = useState(false);
  const { data: plan, isLoading } = useDailyPlan();
  const generatePlan = useGenerateDailyPlan();
  const updateTaskStatus = useUpdateTaskStatus();
  const stats = usePlanStats(plan);

  const tasks = useMemo<DailyPlanTask[]>(
    () => ([...(plan?.tasks || [])] as DailyPlanTask[]).sort(
      (a, b) => Number(a.is_completed) - Number(b.is_completed)
        || priorityOrder[b.priority] - priorityOrder[a.priority]
        || a.position - b.position
    ),
    [plan?.tasks]
  );
  const visibleTasks = showAllTasks ? tasks : tasks.slice(0, 3);
  const remainingMinutes = tasks
    .filter((task) => !task.is_completed)
    .reduce((total, task) => total + task.estimated_minutes, 0);

  const handleGeneratePlan = () => generatePlan.mutate();
  const handleTaskToggle = (task: DailyPlanTask) => {
    updateTaskStatus.mutate({
      taskId: task.public_id,
      isCompleted: !task.is_completed,
      actualMinutes: !task.is_completed ? task.estimated_minutes : 0,
    });
  };

  if (isLoading) return <DailyCoachCardSkeleton className={className} />;

  return (
    <motion.section
      className={cn(
        'relative overflow-hidden rounded-2xl border border-white/10 bg-card/70 p-5 shadow-sm backdrop-blur-md',
        className
      )}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-orange-400/70 to-transparent" />
      <header className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="rounded-xl border border-orange-400/20 bg-orange-400/10 p-2.5">
            <Brain className="h-5 w-5 text-orange-400" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-lg font-semibold text-foreground">{t('daily_coach')}</h3>
              {stats.isCompleted && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
            </div>
            <p className="text-sm text-muted-foreground">
              {plan?.plan_description || t('plan_description')}
            </p>
          </div>
        </div>
        {plan && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleGeneratePlan}
            disabled={generatePlan.isPending}
            aria-label={t('regenerate_plan')}
            className="shrink-0 text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className={cn('h-4 w-4', generatePlan.isPending && 'animate-spin')} />
          </Button>
        )}
      </header>

      {!plan ? (
        <div className="mt-5 rounded-xl border border-dashed border-white/15 bg-white/[0.025] px-5 py-8 text-center">
          <Target className="mx-auto mb-3 h-9 w-9 text-orange-400/70" />
          <p className="mb-4 text-sm text-muted-foreground">{t('no_plan_today')}</p>
          <Button onClick={handleGeneratePlan} disabled={generatePlan.isPending}>
            {generatePlan.isPending ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            {generatePlan.isPending ? t('generating_plan') : t('generate_plan')}
          </Button>
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          <div className="rounded-xl border border-white/10 bg-white/[0.035] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t('focus_plan')}</p>
                <p className="mt-1 text-sm font-medium text-foreground">
                  {stats.completedTasks} / {stats.totalTasks} {t('tasks_completed_short')}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Clock3 className="h-3.5 w-3.5 text-blue-400" />
                  {formatDuration(remainingMinutes)} {t('remaining')}
                </span>
                <span className="flex items-center gap-1.5">
                  <Star className="h-3.5 w-3.5 text-amber-400" />
                  {stats.earnedPoints}/{stats.totalPoints} {t('pts')}
                </span>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <Progress value={stats.completionRate} className="h-1.5 flex-1 bg-white/10" />
              <span className="w-9 text-right text-xs font-semibold text-foreground">{stats.completionRate}%</span>
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <ListChecks className="h-4 w-4 text-orange-400" />
                {t('today_tasks')}
              </h4>
              <span className="text-xs text-muted-foreground">{formatDuration(stats.estimatedTime)}</span>
            </div>
            <div className="space-y-2">
              {visibleTasks.map((task, index) => {
                const typeInfo = getTaskTypeInfo(task.task_type);
                return (
                  <button
                    key={task.public_id}
                    type="button"
                    onClick={() => handleTaskToggle(task)}
                    disabled={updateTaskStatus.isPending}
                    className={cn(
                      'group flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors',
                      task.is_completed
                        ? 'border-emerald-400/20 bg-emerald-400/[0.07]'
                        : index === 0
                          ? 'border-orange-400/25 bg-orange-400/[0.06] hover:bg-orange-400/10'
                          : 'border-white/10 bg-white/[0.025] hover:bg-white/[0.055]'
                    )}
                  >
                    <span className={cn(
                      'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border',
                      task.is_completed
                        ? 'border-emerald-400 bg-emerald-400 text-slate-950'
                        : 'border-white/25 text-transparent group-hover:border-orange-400/60'
                    )}>
                      <Check className="h-3.5 w-3.5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className={cn(
                          'text-sm font-medium',
                          task.is_completed ? 'text-muted-foreground line-through' : 'text-foreground'
                        )}>
                          {task.task_title}
                        </span>
                        <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-medium', priorityStyles[task.priority])}>
                          {t(`priorities.${task.priority}`)}
                        </span>
                      </span>
                      {task.task_description && (
                        <span className="mt-1 block line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                          {task.task_description}
                        </span>
                      )}
                      <span className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                        <span>{typeInfo.icon} {t(`task_types.${task.task_type}`)}</span>
                        <span className="flex items-center gap-1">
                          <Clock3 className="h-3 w-3" />
                          {task.estimated_minutes} {t('minutes_short')}
                        </span>
                        {task.category && <span>{task.category}</span>}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
            {tasks.length > 3 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAllTasks((value) => !value)}
                className="mt-2 w-full text-muted-foreground"
              >
                {showAllTasks ? t('show_less') : t('show_remaining_tasks', { count: tasks.length - 3 })}
                {showAllTasks ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />}
              </Button>
            )}
          </div>

          {plan.ai_insights && (
            <div className="rounded-xl border border-blue-400/15 bg-blue-400/[0.055]">
              <button
                type="button"
                onClick={() => setShowRationale((value) => !value)}
                className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left"
              >
                <span className="flex items-center gap-2 text-xs font-medium text-blue-300">
                  <Lightbulb className="h-3.5 w-3.5" />
                  {t('why_this_plan')}
                </span>
                {showRationale ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
              </button>
              {showRationale && (
                <p className="border-t border-blue-400/10 px-3 py-3 text-xs leading-relaxed text-muted-foreground">
                  {plan.ai_insights}
                </p>
              )}
            </div>
          )}

          <div className="flex flex-wrap justify-end gap-2 border-t border-white/10 pt-4">
            {onReflectionClick && (
              <Button variant="outline" size="sm" onClick={onReflectionClick}>
                <Brain className="mr-2 h-4 w-4" />
                {t('evening_retro')}
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={handleGeneratePlan} disabled={generatePlan.isPending}>
              <Sparkles className="mr-2 h-4 w-4" />
              {t('regenerate_plan')}
            </Button>
          </div>
          {stats.isCompleted && (
            <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/[0.07] p-3 text-sm text-emerald-300">
              <CheckCircle2 className="mr-2 inline h-4 w-4" />
              {t('great_job')}
            </div>
          )}
        </div>
      )}
    </motion.section>
  );
}

function DailyCoachCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-2xl border border-white/10 bg-card/70 p-5', className)}>
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 animate-pulse rounded-xl bg-white/10" />
        <div className="space-y-2">
          <div className="h-4 w-40 animate-pulse rounded bg-white/10" />
          <div className="h-3 w-56 animate-pulse rounded bg-white/5" />
        </div>
      </div>
      <div className="mt-5 h-20 animate-pulse rounded-xl bg-white/5" />
      <div className="mt-3 space-y-2">
        {[0, 1, 2].map((item) => <div key={item} className="h-20 animate-pulse rounded-xl bg-white/5" />)}
      </div>
    </div>
  );
}
