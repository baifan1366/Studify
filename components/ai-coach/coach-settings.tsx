'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Brain,
  Clock,
  Bell,
  Heart,
  Trophy,
  Zap,
  Target,
  Settings,
  Save,
  Moon,
  Sun
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

interface CoachSettingsProps {
  className?: string;
}

export default function CoachSettings({ className }: CoachSettingsProps) {
  const t = useTranslations('CoachSettings');
  
  // 设置状态
  const [settings, setSettings] = useState({
    // 通知时间设置
    dailyPlanTime: '08:00',
    eveningRetroTime: '20:00',
    
    // 个性化设置
    preferredDifficulty: 'medium',
    targetDailyMinutes: 60,
    maxDailyTasks: 8,
    
    // 推送偏好
    enableDailyPlan: true,
    enableTaskReminders: true,
    enableEveningRetro: true,
    enableMotivationMessages: true,
    enableAchievementCelebrations: true,
    enableStreakReminders: true,
    
    // 教练风格偏好
    coachingStyle: 'balanced',
    motivationType: 'mixed',
    
    // 学习偏好
    preferredSessionLength: 25,
    breakReminderInterval: 50,
    
    // 时区和语言
    timezone: 'Asia/Kuala_Lumpur',
    language: 'en'
  });

  const [isSaving, setIsSaving] = useState(false);

  const updateSetting = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // TODO: 调用API保存设置
      await new Promise(resolve => setTimeout(resolve, 1000)); // 模拟API调用
      console.log('Saving settings:', settings);
    } catch (error) {
      console.error('Error saving settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-purple-500/20 dark:bg-purple-500/30 rounded-lg">
          <Brain className="w-6 h-6 text-purple-600 dark:text-purple-400" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">{t('title')}</h2>
          <p className="text-sm text-slate-600 dark:text-white/60">{t('subtitle')}</p>
        </div>
      </div>

      {/* Notification Times */}
      <Card className="bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{t('notification_times')}</h3>
        </div>
        
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label className="text-slate-700 dark:text-white/80 text-sm font-medium flex items-center gap-2">
              <Sun className="w-4 h-4" />
              {t('daily_plan_reminder')}
            </Label>
            <input
              type="time"
              value={settings.dailyPlanTime}
              onChange={(e) => updateSetting('dailyPlanTime', e.target.value)}
              className="mt-2 w-full p-2 bg-white dark:bg-white/5 border border-slate-300 dark:border-white/20 rounded-lg text-slate-900 dark:text-white"
            />
          </div>
          
          <div>
            <Label className="text-slate-700 dark:text-white/80 text-sm font-medium flex items-center gap-2">
              <Moon className="w-4 h-4" />
              {t('evening_reflection_reminder')}
            </Label>
            <input
              type="time"
              value={settings.eveningRetroTime}
              onChange={(e) => updateSetting('eveningRetroTime', e.target.value)}
              className="mt-2 w-full p-2 bg-white dark:bg-white/5 border border-slate-300 dark:border-white/20 rounded-lg text-slate-900 dark:text-white"
            />
          </div>
        </div>
      </Card>

      {/* Learning Preferences */}
      <Card className="bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Target className="w-5 h-5 text-green-600 dark:text-green-400" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{t('learning_preferences')}</h3>
        </div>
        
        <div className="space-y-4">
          <div>
            <Label className="text-slate-700 dark:text-white/80 text-sm font-medium">
              {t('preferred_difficulty')}
            </Label>
            <Select value={settings.preferredDifficulty} onValueChange={(value) => updateSetting('preferredDifficulty', value)}>
              <SelectTrigger className="mt-2 bg-white dark:bg-white/5 border-slate-300 dark:border-white/20 text-slate-900 dark:text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="easy">{t('difficulty_easy')}</SelectItem>
                <SelectItem value="medium">{t('difficulty_medium')}</SelectItem>
                <SelectItem value="hard">{t('difficulty_hard')}</SelectItem>
                <SelectItem value="adaptive">{t('difficulty_adaptive')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label className="text-slate-700 dark:text-white/80 text-sm font-medium">
              {t('daily_target', { minutes: settings.targetDailyMinutes })}
            </Label>
            <Slider
              value={[settings.targetDailyMinutes]}
              onValueChange={([value]) => updateSetting('targetDailyMinutes', value)}
              max={180}
              min={15}
              step={15}
              className="mt-2"
            />
          </div>
          
          <div>
            <Label className="text-slate-700 dark:text-white/80 text-sm font-medium">
              {t('max_tasks', { count: settings.maxDailyTasks })}
            </Label>
            <Slider
              value={[settings.maxDailyTasks]}
              onValueChange={([value]) => updateSetting('maxDailyTasks', value)}
              max={15}
              min={3}
              step={1}
              className="mt-2"
            />
          </div>
          
          <div>
            <Label className="text-slate-700 dark:text-white/80 text-sm font-medium">
              {t('session_length', { minutes: settings.preferredSessionLength })}
            </Label>
            <Slider
              value={[settings.preferredSessionLength]}
              onValueChange={([value]) => updateSetting('preferredSessionLength', value)}
              max={90}
              min={10}
              step={5}
              className="mt-2"
            />
          </div>
        </div>
      </Card>

      {/* Coaching Style */}
      <Card className="bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Heart className="w-5 h-5 text-pink-600 dark:text-pink-400" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{t('coaching_style')}</h3>
        </div>
        
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label className="text-slate-700 dark:text-white/80 text-sm font-medium">
              {t('coaching_approach')}
            </Label>
            <Select value={settings.coachingStyle} onValueChange={(value) => updateSetting('coachingStyle', value)}>
              <SelectTrigger className="mt-2 bg-white dark:bg-white/5 border-slate-300 dark:border-white/20 text-slate-900 dark:text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gentle">{t('style_gentle')}</SelectItem>
                <SelectItem value="balanced">{t('style_balanced')}</SelectItem>
                <SelectItem value="intensive">{t('style_intensive')}</SelectItem>
                <SelectItem value="adaptive">{t('style_adaptive')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label className="text-slate-700 dark:text-white/80 text-sm font-medium">
              {t('motivation_type')}
            </Label>
            <Select value={settings.motivationType} onValueChange={(value) => updateSetting('motivationType', value)}>
              <SelectTrigger className="mt-2 bg-white dark:bg-white/5 border-slate-300 dark:border-white/20 text-slate-900 dark:text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="achievement">{t('motivation_achievement')}</SelectItem>
                <SelectItem value="progress">{t('motivation_progress')}</SelectItem>
                <SelectItem value="social">{t('motivation_social')}</SelectItem>
                <SelectItem value="learning">{t('motivation_learning')}</SelectItem>
                <SelectItem value="mixed">{t('motivation_mixed')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Notification Preferences */}
      <Card className="bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Bell className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{t('notification_preferences')}</h3>
        </div>
        
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-slate-700 dark:text-white/80 font-medium">{t('enable_daily_plan')}</Label>
                <p className="text-xs text-slate-500 dark:text-white/50">{t('enable_daily_plan_desc')}</p>
              </div>
              <Switch
                checked={settings.enableDailyPlan}
                onCheckedChange={(checked) => updateSetting('enableDailyPlan', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-slate-700 dark:text-white/80 font-medium">{t('enable_task_reminders')}</Label>
                <p className="text-xs text-slate-500 dark:text-white/50">{t('enable_task_reminders_desc')}</p>
              </div>
              <Switch
                checked={settings.enableTaskReminders}
                onCheckedChange={(checked) => updateSetting('enableTaskReminders', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-slate-700 dark:text-white/80 font-medium">{t('enable_evening_retro')}</Label>
                <p className="text-xs text-slate-500 dark:text-white/50">{t('enable_evening_retro_desc')}</p>
              </div>
              <Switch
                checked={settings.enableEveningRetro}
                onCheckedChange={(checked) => updateSetting('enableEveningRetro', checked)}
              />
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-slate-700 dark:text-white/80 font-medium">{t('enable_motivation')}</Label>
                <p className="text-xs text-slate-500 dark:text-white/50">{t('enable_motivation_desc')}</p>
              </div>
              <Switch
                checked={settings.enableMotivationMessages}
                onCheckedChange={(checked) => updateSetting('enableMotivationMessages', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-slate-700 dark:text-white/80 font-medium">{t('enable_achievements')}</Label>
                <p className="text-xs text-slate-500 dark:text-white/50">{t('enable_achievements_desc')}</p>
              </div>
              <Switch
                checked={settings.enableAchievementCelebrations}
                onCheckedChange={(checked) => updateSetting('enableAchievementCelebrations', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-slate-700 dark:text-white/80 font-medium">{t('enable_streaks')}</Label>
                <p className="text-xs text-slate-500 dark:text-white/50">{t('enable_streaks_desc')}</p>
              </div>
              <Switch
                checked={settings.enableStreakReminders}
                onCheckedChange={(checked) => updateSetting('enableStreakReminders', checked)}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white px-8"
        >
          {isSaving ? (
            <>
              <Settings className="w-4 h-4 mr-2 animate-spin" />
              {t('saving')}
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              {t('save_settings')}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
