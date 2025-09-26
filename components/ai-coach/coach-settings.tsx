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
  const t = useTranslations('AICoach');
  
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
        <div className="p-2 bg-purple-500/20 rounded-lg">
          <Brain className="w-6 h-6 text-purple-400" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-white">AI Learning Coach Settings</h2>
          <p className="text-sm text-white/60">Customize your personalized learning experience</p>
        </div>
      </div>

      {/* Notification Times */}
      <Card className="bg-white/5 border-white/10 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Clock className="w-5 h-5 text-blue-400" />
          <h3 className="text-lg font-semibold text-white">Notification Times</h3>
        </div>
        
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label className="text-white/80 text-sm font-medium flex items-center gap-2">
              <Sun className="w-4 h-4" />
              Daily Plan Reminder
            </Label>
            <input
              type="time"
              value={settings.dailyPlanTime}
              onChange={(e) => updateSetting('dailyPlanTime', e.target.value)}
              className="mt-2 w-full p-2 bg-white/5 border border-white/20 rounded-lg text-white"
            />
          </div>
          
          <div>
            <Label className="text-white/80 text-sm font-medium flex items-center gap-2">
              <Moon className="w-4 h-4" />
              Evening Reflection Reminder
            </Label>
            <input
              type="time"
              value={settings.eveningRetroTime}
              onChange={(e) => updateSetting('eveningRetroTime', e.target.value)}
              className="mt-2 w-full p-2 bg-white/5 border border-white/20 rounded-lg text-white"
            />
          </div>
        </div>
      </Card>

      {/* Learning Preferences */}
      <Card className="bg-white/5 border-white/10 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Target className="w-5 h-5 text-green-400" />
          <h3 className="text-lg font-semibold text-white">Learning Preferences</h3>
        </div>
        
        <div className="space-y-4">
          <div>
            <Label className="text-white/80 text-sm font-medium">
              Preferred Difficulty Level
            </Label>
            <Select value={settings.preferredDifficulty} onValueChange={(value) => updateSetting('preferredDifficulty', value)}>
              <SelectTrigger className="mt-2 bg-white/5 border-white/20 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="easy">Easy - Gentle learning pace</SelectItem>
                <SelectItem value="medium">Medium - Balanced challenge</SelectItem>
                <SelectItem value="hard">Hard - Push my limits</SelectItem>
                <SelectItem value="adaptive">Adaptive - AI decides based on progress</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label className="text-white/80 text-sm font-medium">
              Daily Learning Target: {settings.targetDailyMinutes} minutes
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
            <Label className="text-white/80 text-sm font-medium">
              Max Daily Tasks: {settings.maxDailyTasks}
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
            <Label className="text-white/80 text-sm font-medium">
              Preferred Session Length: {settings.preferredSessionLength} minutes
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
      <Card className="bg-white/5 border-white/10 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Heart className="w-5 h-5 text-pink-400" />
          <h3 className="text-lg font-semibold text-white">Coaching Style</h3>
        </div>
        
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label className="text-white/80 text-sm font-medium">
              Coaching Approach
            </Label>
            <Select value={settings.coachingStyle} onValueChange={(value) => updateSetting('coachingStyle', value)}>
              <SelectTrigger className="mt-2 bg-white/5 border-white/20 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gentle">Gentle - Supportive and encouraging</SelectItem>
                <SelectItem value="balanced">Balanced - Mix of support and challenge</SelectItem>
                <SelectItem value="intensive">Intensive - High energy and demanding</SelectItem>
                <SelectItem value="adaptive">Adaptive - Adjusts to your mood</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label className="text-white/80 text-sm font-medium">
              Motivation Type
            </Label>
            <Select value={settings.motivationType} onValueChange={(value) => updateSetting('motivationType', value)}>
              <SelectTrigger className="mt-2 bg-white/5 border-white/20 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="achievement">Achievement - Focus on accomplishments</SelectItem>
                <SelectItem value="progress">Progress - Celebrate small wins</SelectItem>
                <SelectItem value="social">Social - Community and sharing</SelectItem>
                <SelectItem value="learning">Learning - Knowledge and growth</SelectItem>
                <SelectItem value="mixed">Mixed - Variety of motivation styles</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Notification Preferences */}
      <Card className="bg-white/5 border-white/10 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Bell className="w-5 h-5 text-yellow-400" />
          <h3 className="text-lg font-semibold text-white">Notification Preferences</h3>
        </div>
        
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-white/80 font-medium">Daily Plan Reminders</Label>
                <p className="text-xs text-white/50">Get notified about your daily learning plan</p>
              </div>
              <Switch
                checked={settings.enableDailyPlan}
                onCheckedChange={(checked) => updateSetting('enableDailyPlan', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-white/80 font-medium">Task Reminders</Label>
                <p className="text-xs text-white/50">Reminders for incomplete tasks</p>
              </div>
              <Switch
                checked={settings.enableTaskReminders}
                onCheckedChange={(checked) => updateSetting('enableTaskReminders', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-white/80 font-medium">Evening Reflection</Label>
                <p className="text-xs text-white/50">Daily learning reflection prompts</p>
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
                <Label className="text-white/80 font-medium">Motivation Messages</Label>
                <p className="text-xs text-white/50">Encouraging messages throughout the day</p>
              </div>
              <Switch
                checked={settings.enableMotivationMessages}
                onCheckedChange={(checked) => updateSetting('enableMotivationMessages', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-white/80 font-medium">Achievement Celebrations</Label>
                <p className="text-xs text-white/50">Celebrate your learning milestones</p>
              </div>
              <Switch
                checked={settings.enableAchievementCelebrations}
                onCheckedChange={(checked) => updateSetting('enableAchievementCelebrations', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-white/80 font-medium">Streak Reminders</Label>
                <p className="text-xs text-white/50">Keep your learning streak alive</p>
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
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Settings
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
