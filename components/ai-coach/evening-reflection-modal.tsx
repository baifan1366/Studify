'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  X,
  Brain,
  Star,
  MessageSquare,
  Lightbulb,
  Target,
  TrendingUp,
  Heart,
  Moon,
  Zap,
  Eye,
  CheckCircle2,
  Save
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { 
  useCreateRetrospective, 
  useTodayRetrospective,
  getMoodInfo 
} from '@/hooks/ai-coach/use-ai-coach';

interface EveningReflectionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function EveningReflectionModal({ isOpen, onClose }: EveningReflectionModalProps) {
  const t = useTranslations('AICoach');
  const { data: existingRetro } = useTodayRetrospective();
  const createRetro = useCreateRetrospective();

  // Form state
  const [formData, setFormData] = useState({
    selfRating: existingRetro?.self_rating || 3,
    moodRating: existingRetro?.mood_rating || 'neutral',
    energyLevel: existingRetro?.energy_level || 3,
    focusQuality: existingRetro?.focus_quality || 3,
    achievementsToday: existingRetro?.achievements_today || '',
    challengesFaced: existingRetro?.challenges_faced || '',
    lessonsLearned: existingRetro?.lessons_learned || '',
    improvementsNeeded: existingRetro?.improvements_needed || '',
    tomorrowGoals: existingRetro?.tomorrow_goals || ''
  });

  const [currentStep, setCurrentStep] = useState(0);
  const [showAnalysis, setShowAnalysis] = useState(!!existingRetro);

  const handleSubmit = async () => {
    try {
      // AI Coach analyzes reflection using:
      // - User's learning paths (to show progress toward goals)
      // - Today's AI notes (evidence of deep learning)
      // - Recent AI notes (for pattern analysis)
      // - Actual performance data vs self-assessment
      // This provides comprehensive, context-aware insights
      await createRetro.mutateAsync(formData);
      setShowAnalysis(true);
    } catch (error) {
      console.error('Failed to create retrospective:', error);
    }
  };

  const handleClose = () => {
    onClose();
    setTimeout(() => {
      setCurrentStep(0);
      setShowAnalysis(false);
    }, 300);
  };

  if (!isOpen) return null;

  const steps = [
    { icon: Star, title: 'self_rating', key: 'selfRating' },
    { icon: Heart, title: 'mood_today', key: 'moodRating' },
    { icon: Zap, title: 'energy_level', key: 'energyLevel' },
    { icon: Eye, title: 'focus_quality', key: 'focusQuality' },
    { icon: MessageSquare, title: 'reflection', key: 'reflection' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleClose}
      />

      {/* Modal */}
      <motion.div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-white/95 via-purple-50/95 to-indigo-50/95 dark:from-slate-900/95 dark:via-purple-900/95 dark:to-indigo-900/95 backdrop-blur-xl rounded-2xl border border-slate-200 dark:border-white/20 shadow-2xl"
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ duration: 0.3 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/20 dark:bg-purple-500/30 rounded-lg">
              <Moon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                {t('evening_retro')}
              </h2>
              <p className="text-sm text-slate-600 dark:text-white/60">
                {t('how_was_today')}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm" 
            onClick={handleClose}
            className="text-slate-600 dark:text-white/70 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="p-6">
          {!showAnalysis ? (
            // Reflection Form
            <div className="space-y-8">
              {/* Progress Steps */}
              <div className="flex items-center justify-between mb-8">
                {steps.map((step, index) => (
                  <div
                    key={step.key}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-full transition-all",
                      currentStep === index
                        ? "bg-purple-500/20 text-purple-300"
                        : currentStep > index
                        ? "bg-green-500/20 text-green-300"
                        : "bg-white/5 text-white/50"
                    )}
                  >
                    <step.icon className="w-4 h-4" />
                    <span className="text-xs font-medium">
                      {index + 1}
                    </span>
                  </div>
                ))}
              </div>

              {/* Step Content */}
              <div className="min-h-[300px]">
                {currentStep === 0 && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-6"
                  >
                    <div className="text-center">
                      <Star className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                        {t('self_rating')}
                      </h3>
                      <p className="text-slate-600 dark:text-white/60 text-sm">
                        {t('self_rating_desc')}
                      </p> 
                    </div>

                    <div className="space-y-4">
                      <div className="text-center">
                        <div className="text-4xl font-bold text-slate-900 dark:text-white mb-2">
                          {formData.selfRating}/5
                        </div>
                        <div className="flex justify-center gap-1">
                          {[1, 2, 3, 4, 5].map((rating) => (
                            <Star
                              key={rating}
                              className={cn(
                                "w-6 h-6 cursor-pointer transition-colors",
                                rating <= formData.selfRating
                                  ? "text-yellow-400 fill-yellow-400"
                                  : "text-white/30"
                              )}
                              onClick={() => setFormData(prev => ({ ...prev, selfRating: rating }))}
                            />
                          ))}
                        </div>
                      </div>
                      <Slider
                        value={[formData.selfRating]}
                        onValueChange={([value]) => setFormData(prev => ({ ...prev, selfRating: value }))}
                        max={5}
                        min={1}
                        step={1}
                        className="w-full max-w-xs mx-auto"
                      />
                    </div>
                  </motion.div>
                )}

                {currentStep === 1 && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-6"
                  >
                    <div className="text-center">
                      <Heart className="w-12 h-12 text-pink-600 dark:text-pink-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                        {t('mood_today')}
                      </h3>
                      <p className="text-slate-600 dark:text-white/60 text-sm">
                        {t('mood_desc')}
                      </p>
                    </div>

                    <RadioGroup
                      value={formData.moodRating}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, moodRating: value as any }))}
                      className="grid grid-cols-5 gap-4"
                    >
                      {(['very_bad', 'bad', 'neutral', 'good', 'excellent'] as const).map((mood) => {
                        const moodInfo = getMoodInfo(mood);
                        return (
                          <div key={mood} className="text-center">
                            <RadioGroupItem
                              value={mood}
                              id={mood}
                              className="sr-only"
                            />
                            <Label
                              htmlFor={mood}
                              className={cn(
                                "flex flex-col items-center gap-2 p-4 rounded-lg border cursor-pointer transition-all",
                                formData.moodRating === mood
                                  ? "bg-purple-500/20 border-purple-500/50"
                                  : "bg-white/5 border-white/10 hover:bg-white/10"
                              )}
                            >
                              <span className="text-2xl">{moodInfo.emoji}</span>
                              <span className="text-xs text-white/70">
                                {t(`moods.${mood}`)}
                              </span>
                            </Label>
                          </div>
                        );
                      })}
                    </RadioGroup>
                  </motion.div>
                )}

                {currentStep === 2 && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-6"
                  >
                    <div className="text-center">
                      <Zap className="w-12 h-12 text-yellow-600 dark:text-yellow-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                        {t('energy_level')}
                      </h3>
                      <p className="text-slate-600 dark:text-white/60 text-sm">
                        {t('energy_desc')}
                      </p>
                    </div>

                    <div className="space-y-4">
                      <div className="text-center">
                        <div className="text-4xl font-bold text-slate-900 dark:text-white mb-2">
                          {formData.energyLevel}/5
                        </div>
                        <div className="flex justify-center gap-1">
                          {[1, 2, 3, 4, 5].map((level) => (
                            <Zap
                              key={level}
                              className={cn(
                                "w-6 h-6 cursor-pointer transition-colors",
                                level <= formData.energyLevel
                                  ? "text-yellow-400 fill-yellow-400"
                                  : "text-white/30"
                              )}
                              onClick={() => setFormData(prev => ({ ...prev, energyLevel: level }))}
                            />
                          ))}
                        </div>
                      </div>
                      <Slider
                        value={[formData.energyLevel]}
                        onValueChange={([value]) => setFormData(prev => ({ ...prev, energyLevel: value }))}
                        max={5}
                        min={1}
                        step={1}
                        className="w-full max-w-xs mx-auto"
                      />
                    </div>
                  </motion.div>
                )}

                {currentStep === 3 && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-6"
                  >
                    <div className="text-center">
                      <Eye className="w-12 h-12 text-blue-600 dark:text-blue-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                        {t('focus_quality')}
                      </h3>
                      <p className="text-slate-600 dark:text-white/60 text-sm">
                        {t('focus_desc')}
                      </p>
                    </div>

                    <div className="space-y-4">
                      <div className="text-center">
                        <div className="text-4xl font-bold text-slate-900 dark:text-white mb-2">
                          {formData.focusQuality}/5
                        </div>
                        <div className="flex justify-center gap-1">
                          {[1, 2, 3, 4, 5].map((quality) => (
                            <Eye
                              key={quality}
                              className={cn(
                                "w-6 h-6 cursor-pointer transition-colors",
                                quality <= formData.focusQuality
                                  ? "text-blue-400 fill-blue-400"
                                  : "text-white/30"
                              )}
                              onClick={() => setFormData(prev => ({ ...prev, focusQuality: quality }))}
                            />
                          ))}
                        </div>
                      </div>
                      <Slider
                        value={[formData.focusQuality]}
                        onValueChange={([value]) => setFormData(prev => ({ ...prev, focusQuality: value }))}
                        max={5}
                        min={1}
                        step={1}
                        className="w-full max-w-xs mx-auto"
                      />
                    </div>
                  </motion.div>
                )}

                {currentStep === 4 && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-6"
                  >
                    <div className="text-center mb-6">
                      <MessageSquare className="w-12 h-12 text-green-600 dark:text-green-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                        {t('reflection_questions')}
                      </h3>
                      <p className="text-slate-600 dark:text-white/60 text-sm">
                        {t('reflection_questions_desc')}
                      </p>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <Label className="text-slate-700 dark:text-white/80 text-sm font-medium">
                          {t('achievements_today')}
                        </Label>
                        <Textarea
                          value={formData.achievementsToday}
                          onChange={(e) => setFormData(prev => ({ ...prev, achievementsToday: e.target.value }))}
                          placeholder={t('achievements_today')}
                          className="mt-2 bg-white dark:bg-white/5 border-slate-300 dark:border-white/20 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/40"
                          rows={2}
                        />
                      </div>

                      <div>
                        <Label className="text-slate-700 dark:text-white/80 text-sm font-medium">
                          {t('challenges_faced')}
                        </Label>
                        <Textarea
                          value={formData.challengesFaced}
                          onChange={(e) => setFormData(prev => ({ ...prev, challengesFaced: e.target.value }))}
                          placeholder={t('challenges_faced')}
                          className="mt-2 bg-white dark:bg-white/5 border-slate-300 dark:border-white/20 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/40"
                          rows={2}
                        />
                      </div>

                      <div>
                        <Label className="text-slate-700 dark:text-white/80 text-sm font-medium">
                          {t('lessons_learned')}
                        </Label>
                        <Textarea
                          value={formData.lessonsLearned}
                          onChange={(e) => setFormData(prev => ({ ...prev, lessonsLearned: e.target.value }))}
                          placeholder={t('lessons_learned')}
                          className="mt-2 bg-white dark:bg-white/5 border-slate-300 dark:border-white/20 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/40"
                          rows={2}
                        />
                      </div>

                      <div>
                        <Label className="text-slate-700 dark:text-white/80 text-sm font-medium">
                          {t('tomorrow_goals')}
                        </Label>
                        <Textarea
                          value={formData.tomorrowGoals}
                          onChange={(e) => setFormData(prev => ({ ...prev, tomorrowGoals: e.target.value }))}
                          placeholder={t('tomorrow_goals')}
                          className="mt-2 bg-white dark:bg-white/5 border-slate-300 dark:border-white/20 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/40"
                          rows={2}
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Navigation */}
              <div className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                  disabled={currentStep === 0}
                  className="bg-white dark:bg-white/5 border-slate-300 dark:border-white/20 text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-white/10"
                >
                  {t('previous')}
                </Button>

                {currentStep < steps.length - 1 ? (
                  <Button
                    onClick={() => setCurrentStep(currentStep + 1)}
                    className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700"
                  >
                    {t('next')}
                  </Button>
                ) : (
                  <Button
                    onClick={handleSubmit}
                    disabled={createRetro.isPending}
                    className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                  >
                    {createRetro.isPending ? (
                      <>
                        <Brain className="w-4 h-4 mr-2 animate-pulse" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        {t('save_reflection')}
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          ) : (
            // AI Analysis Display
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="text-center">
                <CheckCircle2 className="w-12 h-12 text-green-600 dark:text-green-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                  {t('reflection_complete')}
                </h3>
                <p className="text-slate-600 dark:text-white/60">
                  {t('ai_analysis_ready')}
                </p>
              </div>

              {existingRetro && (
                <div className="space-y-4">
                  {existingRetro.ai_analysis && (
                    <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                      <div className="flex items-center gap-2 mb-3">
                        <Brain className="w-5 h-5 text-blue-400" />
                        <h4 className="font-semibold text-blue-400">{t('ai_analysis')}</h4>
                      </div>
                      <p className="text-white/80 text-sm leading-relaxed">
                        {existingRetro.ai_analysis}
                      </p>
                    </div>
                  )}

                  {existingRetro.ai_suggestions && (
                    <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                      <div className="flex items-center gap-2 mb-3">
                        <Lightbulb className="w-5 h-5 text-green-400" />
                        <h4 className="font-semibold text-green-400">{t('ai_suggestions')}</h4>
                      </div>
                      <p className="text-white/80 text-sm leading-relaxed">
                        {existingRetro.ai_suggestions}
                      </p>
                    </div>
                  )}

                  {existingRetro.ai_next_focus && (
                    <div className="p-4 bg-purple-500/10 rounded-lg border border-purple-500/20">
                      <div className="flex items-center gap-2 mb-3">
                        <Target className="w-5 h-5 text-purple-400" />
                        <h4 className="font-semibold text-purple-400">{t('next_focus')}</h4>
                      </div>
                      <p className="text-white/80 text-sm leading-relaxed">
                        {existingRetro.ai_next_focus}
                      </p>
                    </div>
                  )}

                  <div className="grid md:grid-cols-2 gap-4">
                    {existingRetro.strengths_identified && (
                      <div className="p-4 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                        <div className="flex items-center gap-2 mb-3">
                          <TrendingUp className="w-4 h-4 text-emerald-400" />
                          <h4 className="font-medium text-emerald-400">{t('strengths')}</h4>
                        </div>
                        <p className="text-white/80 text-sm">
                          {existingRetro.strengths_identified}
                        </p>
                      </div>
                    )}

                    {existingRetro.weaknesses_identified && (
                      <div className="p-4 bg-orange-500/10 rounded-lg border border-orange-500/20">
                        <div className="flex items-center gap-2 mb-3">
                          <Target className="w-4 h-4 text-orange-400" />
                          <h4 className="font-medium text-orange-400">{t('areas_to_improve')}</h4>
                        </div>
                        <p className="text-white/80 text-sm">
                          {existingRetro.weaknesses_identified}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="text-center">
                <Button
                  onClick={handleClose}
                  className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700"
                >
                  {t('close_reflection')}
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
