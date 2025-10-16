'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Brain,
  BookOpen,
  Sparkles,
  Network,
  Calendar,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Lightbulb,
  Zap,
  Star,
  Award,
  ArrowRight,
  Loader2
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  useGenerateQuizFromNotes,
  useSpacedRepetitionCards,
  useReviewCard,
  useGenerateCardsFromNotes,
  useGenerateConceptSynthesis,
  calculateNextReview
} from '@/hooks/ai-coach/use-advanced-features';
import { useAINotes } from '@/hooks/dashboard/use-ai-notes';
import { useLearningPaths } from '@/hooks/dashboard/use-learning-paths';

interface AdvancedFeaturesPanelProps {
  className?: string;
}

export default function AdvancedFeaturesPanel({ className }: AdvancedFeaturesPanelProps) {
  const [activeTab, setActiveTab] = useState('quiz');
  const [selectedNotes, setSelectedNotes] = useState<string[]>([]);
  const [selectedPaths, setSelectedPaths] = useState<string[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [generatedQuiz, setGeneratedQuiz] = useState<any>(null);
  const [generatedSynthesis, setGeneratedSynthesis] = useState<any>(null);

  // Hooks
  const { data: aiNotes } = useAINotes({ limit: 20 });
  const { data: learningPaths } = useLearningPaths({ activeOnly: true });
  const { data: srCards } = useSpacedRepetitionCards({ dueOnly: true, limit: 10 });
  const generateQuiz = useGenerateQuizFromNotes();
  const generateCards = useGenerateCardsFromNotes();
  const reviewCard = useReviewCard();
  const generateSynthesis = useGenerateConceptSynthesis();

  const handleGenerateQuiz = async () => {
    if (selectedNotes.length === 0) return;
    
    const result = await generateQuiz.mutateAsync({
      noteIds: selectedNotes,
      questionCount: 5,
      difficulty: 'intermediate'
    });
    
    setGeneratedQuiz(result.quiz);
  };

  const handleGenerateFlashcards = async () => {
    if (selectedNotes.length === 0) return;
    
    await generateCards.mutateAsync({
      noteIds: selectedNotes,
      cardsPerNote: 3
    });
  };

  const handleReviewCard = async (quality: number) => {
    if (!srCards || srCards.length === 0) return;
    
    await reviewCard.mutateAsync({
      cardId: srCards[currentCardIndex].id,
      quality: quality as any
    });
    
    setCurrentCardIndex((prev) => Math.min(prev + 1, srCards.length - 1));
    setShowAnswer(false);
  };

  const handleGenerateSynthesis = async () => {
    if (selectedPaths.length < 2) return;
    
    const result = await generateSynthesis.mutateAsync({
      pathIds: selectedPaths
    });
    
    setGeneratedSynthesis(result.synthesis);
  };

  return (
    <Card className={cn("bg-white/5 border-white/10 p-6", className)}>
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-purple-500/20 rounded-lg">
          <Sparkles className="w-6 h-6 text-purple-400" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-white">Advanced Learning Features</h2>
          <p className="text-sm text-white/60">Powered by your notes and learning paths</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 w-full mb-6">
          <TabsTrigger value="quiz">
            <Brain className="w-4 h-4 mr-2" />
            Quiz Generator
          </TabsTrigger>
          <TabsTrigger value="flashcards">
            <BookOpen className="w-4 h-4 mr-2" />
            Flashcards
          </TabsTrigger>
          <TabsTrigger value="synthesis">
            <Network className="w-4 h-4 mr-2" />
            Synthesis
          </TabsTrigger>
        </TabsList>

        {/* Quiz Generation Tab */}
        <TabsContent value="quiz" className="space-y-4">
          <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
            <h3 className="text-sm font-medium text-blue-300 mb-2">Generate Quiz from Notes</h3>
            <p className="text-xs text-white/60 mb-4">
              Select AI notes to automatically generate a practice quiz
            </p>

            {/* Note Selection */}
            <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
              {aiNotes?.map((note) => (
                <div
                  key={note.id}
                  onClick={() => {
                    setSelectedNotes(prev =>
                      prev.includes(note.id)
                        ? prev.filter(id => id !== note.id)
                        : [...prev, note.id]
                    );
                  }}
                  className={cn(
                    "p-3 rounded-lg cursor-pointer transition-all",
                    selectedNotes.includes(note.id)
                      ? "bg-blue-500/20 border border-blue-500/50"
                      : "bg-white/5 border border-white/10 hover:bg-white/10"
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-white">{note.title}</h4>
                      <p className="text-xs text-white/60 line-clamp-1">{note.ai_summary}</p>
                    </div>
                    {selectedNotes.includes(note.id) && (
                      <CheckCircle2 className="w-4 h-4 text-blue-400 flex-shrink-0 ml-2" />
                    )}
                  </div>
                </div>
              ))}
            </div>

            <Button
              onClick={handleGenerateQuiz}
              disabled={selectedNotes.length === 0 || generateQuiz.isPending}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white"
            >
              {generateQuiz.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating Quiz...
                </>
              ) : (
                <>
                  <Brain className="w-4 h-4 mr-2" />
                  Generate Quiz ({selectedNotes.length} notes)
                </>
              )}
            </Button>
          </div>

          {/* Generated Quiz Display */}
          {generatedQuiz && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-green-500/10 rounded-lg border border-green-500/20"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-white">{generatedQuiz.title}</h3>
                  <p className="text-sm text-white/60">{generatedQuiz.description}</p>
                </div>
                <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
                  {generatedQuiz.questions?.length} questions
                </Badge>
              </div>

              <div className="space-y-4">
                {generatedQuiz.questions?.map((q: any, idx: number) => (
                  <div key={q.id} className="p-3 bg-white/5 rounded-lg">
                    <div className="flex items-start gap-2 mb-2">
                      <span className="text-sm font-bold text-white/80">Q{idx + 1}.</span>
                      <p className="text-sm text-white flex-1">{q.question}</p>
                    </div>
                    <div className="space-y-1 ml-6">
                      {q.options?.map((option: string, optIdx: number) => (
                        <div
                          key={optIdx}
                          className={cn(
                            "text-xs p-2 rounded",
                            optIdx === q.correctAnswer
                              ? "bg-green-500/10 text-green-300"
                              : "text-white/60"
                          )}
                        >
                          {String.fromCharCode(65 + optIdx)}. {option}
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 ml-6 text-xs text-blue-300 flex items-start gap-1">
                      <Lightbulb className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      <span>{q.explanation}</span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </TabsContent>

        {/* Spaced Repetition Tab */}
        <TabsContent value="flashcards" className="space-y-4">
          {/* Generate Cards Section */}
          <div className="p-4 bg-purple-500/10 rounded-lg border border-purple-500/20 mb-4">
            <h3 className="text-sm font-medium text-purple-300 mb-2">Generate Flashcards</h3>
            <p className="text-xs text-white/60 mb-4">
              Create spaced repetition flashcards from your notes
            </p>

            <Button
              onClick={handleGenerateFlashcards}
              disabled={selectedNotes.length === 0 || generateCards.isPending}
              className="w-full bg-purple-500 hover:bg-purple-600 text-white"
            >
              {generateCards.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating Flashcards...
                </>
              ) : (
                <>
                  <BookOpen className="w-4 h-4 mr-2" />
                  Generate Flashcards ({selectedNotes.length} notes)
                </>
              )}
            </Button>
          </div>

          {/* Review Cards Section */}
          {srCards && srCards.length > 0 && (
            <div className="p-4 bg-white/5 rounded-lg border border-white/10">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-medium text-white">Cards Due for Review</h3>
                  <p className="text-xs text-white/60">
                    {currentCardIndex + 1} of {srCards.length}
                  </p>
                </div>
                <Badge className="bg-orange-500/20 text-orange-300 border-orange-500/30">
                  {srCards.length} due
                </Badge>
              </div>

              {/* Current Card */}
              <div className="bg-gradient-to-br from-purple-600/20 to-pink-600/20 rounded-xl p-6 mb-4">
                <div className="text-center mb-6">
                  <h4 className="text-lg font-semibold text-white mb-4">
                    {srCards[currentCardIndex].question}
                  </h4>

                  <AnimatePresence mode="wait">
                    {!showAnswer ? (
                      <motion.div
                        key="question"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        <Button
                          onClick={() => setShowAnswer(true)}
                          className="bg-white/10 hover:bg-white/20 text-white border border-white/20"
                        >
                          <HelpCircle className="w-4 h-4 mr-2" />
                          Show Answer
                        </Button>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="answer"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="space-y-4"
                      >
                        <div className="p-4 bg-white/10 rounded-lg">
                          <p className="text-white">{srCards[currentCardIndex].answer}</p>
                        </div>

                        {/* Review Quality Buttons */}
                        <div className="grid grid-cols-4 gap-2">
                          {[
                            { label: 'Again', quality: 0, color: 'red' },
                            { label: 'Hard', quality: 3, color: 'orange' },
                            { label: 'Good', quality: 4, color: 'blue' },
                            { label: 'Easy', quality: 5, color: 'green' }
                          ].map((option) => (
                            <Button
                              key={option.quality}
                              onClick={() => handleReviewCard(option.quality)}
                              className={cn(
                                "text-xs",
                                `bg-${option.color}-500/20 hover:bg-${option.color}-500/30 text-${option.color}-300 border border-${option.color}-500/30`
                              )}
                            >
                              {option.label}
                            </Button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <Progress 
                value={((currentCardIndex + 1) / srCards.length) * 100} 
                className="h-2"
              />
            </div>
          )}

          {(!srCards || srCards.length === 0) && (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 text-white/30 mx-auto mb-3" />
              <p className="text-white/60">No cards due for review</p>
              <p className="text-sm text-white/40 mt-1">Generate flashcards from your notes to start learning</p>
            </div>
          )}
        </TabsContent>

        {/* Concept Synthesis Tab */}
        <TabsContent value="synthesis" className="space-y-4">
          <div className="p-4 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
            <h3 className="text-sm font-medium text-indigo-300 mb-2">Cross-Path Concept Synthesis</h3>
            <p className="text-xs text-white/60 mb-4">
              Discover connections between your learning paths
            </p>

            {/* Path Selection */}
            <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
              {learningPaths?.map((path) => (
                <div
                  key={path.id}
                  onClick={() => {
                    setSelectedPaths(prev =>
                      prev.includes(path.id)
                        ? prev.filter(id => id !== path.id)
                        : [...prev, path.id]
                    );
                  }}
                  className={cn(
                    "p-3 rounded-lg cursor-pointer transition-all",
                    selectedPaths.includes(path.id)
                      ? "bg-indigo-500/20 border border-indigo-500/50"
                      : "bg-white/5 border border-white/10 hover:bg-white/10"
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-white">{path.title}</h4>
                      <p className="text-xs text-white/60">{path.learning_goal}</p>
                    </div>
                    {selectedPaths.includes(path.id) && (
                      <CheckCircle2 className="w-4 h-4 text-indigo-400 flex-shrink-0 ml-2" />
                    )}
                  </div>
                </div>
              ))}
            </div>

            <Button
              onClick={handleGenerateSynthesis}
              disabled={selectedPaths.length < 2 || generateSynthesis.isPending}
              className="w-full bg-indigo-500 hover:bg-indigo-600 text-white"
            >
              {generateSynthesis.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing Connections...
                </>
              ) : (
                <>
                  <Network className="w-4 h-4 mr-2" />
                  Synthesize ({selectedPaths.length} paths)
                </>
              )}
            </Button>
          </div>

          {/* Generated Synthesis Display */}
          {generatedSynthesis && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              {/* Title and Description */}
              <div className="p-4 bg-gradient-to-br from-indigo-600/20 to-purple-600/20 rounded-lg border border-indigo-500/30">
                <h3 className="text-lg font-semibold text-white mb-2">{generatedSynthesis.title}</h3>
                <p className="text-sm text-white/80">{generatedSynthesis.description}</p>
              </div>

              {/* AI Insights */}
              <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="w-4 h-4 text-blue-400" />
                  <h4 className="text-sm font-medium text-blue-300">AI Insights</h4>
                </div>
                <p className="text-sm text-white/80">{generatedSynthesis.aiInsights}</p>
              </div>

              {/* Connections */}
              <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                <h4 className="text-sm font-medium text-white mb-3">Discovered Connections</h4>
                <div className="space-y-3">
                  {generatedSynthesis.connections?.map((conn: any, idx: number) => (
                    <div key={idx} className="p-3 bg-indigo-500/10 rounded-lg">
                      <div className="flex items-start gap-2">
                        <Network className="w-4 h-4 text-indigo-400 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-white">{conn.concept}</p>
                          <p className="text-xs text-white/60 mt-1">{conn.relationship}</p>
                          <Badge className="mt-2 text-xs bg-white/10 text-white/70 border-white/20">
                            {conn.pathTitle}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Suggested Projects */}
              <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="w-4 h-4 text-green-400" />
                  <h4 className="text-sm font-medium text-green-300">Suggested Projects</h4>
                </div>
                <div className="space-y-2">
                  {generatedSynthesis.suggestedProjects?.map((project: any, idx: number) => (
                    <div key={idx} className="p-3 bg-white/5 rounded-lg">
                      <h5 className="text-sm font-medium text-white mb-1">{project.title}</h5>
                      <p className="text-xs text-white/60 mb-2">{project.description}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className="text-xs bg-green-500/20 text-green-300 border-green-500/30">
                          {project.difficulty}
                        </Badge>
                        <Badge className="text-xs bg-blue-500/20 text-blue-300 border-blue-500/30">
                          {project.estimatedHours}h
                        </Badge>
                        {project.skills?.map((skill: string, skillIdx: number) => (
                          <Badge key={skillIdx} className="text-xs bg-white/10 text-white/70 border-white/20">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </TabsContent>
      </Tabs>
    </Card>
  );
}
