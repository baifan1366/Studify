'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  AlertCircle, 
  BookOpen, 
  Brain, 
  Calendar, 
  FileText, 
  Filter, 
  Plus, 
  Search, 
  Tag, 
  TrendingUp, 
  X,
  Trash2,
  Lightbulb,
  Target,
  CheckCircle2
} from 'lucide-react';
import { useMistakeBook, useSaveMistake, useDeleteMistake } from '@/hooks/dashboard/use-mistake-book';

export default function MistakeBookPageContent() {
  const t = useTranslations('MistakeBookPage');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSourceType, setSelectedSourceType] = useState<string>('all');
  const [selectedKnowledgePoint, setSelectedKnowledgePoint] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [knowledgePointInput, setKnowledgePointInput] = useState('');

  // Fetch mistakes data
  const { data: mistakes = [], isLoading } = useMistakeBook({ limit: 100 });
  const saveMistake = useSaveMistake();
  const deleteMistake = useDeleteMistake();

  // Create mistake form state
  const [newMistake, setNewMistake] = useState({
    mistakeContent: '',
    analysis: '',
    sourceType: 'manual' as 'quiz' | 'assignment' | 'manual',
    knowledgePoints: [] as string[],
  });

  const filteredMistakes = mistakes.filter((mistake: any) => {
    const matchesSearch = mistake.mistake_content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         mistake.analysis?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         mistake.knowledge_points?.some((point: string) => point.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesSourceType = selectedSourceType === 'all' || mistake.source_type === selectedSourceType;
    
    const matchesKnowledgePoint = selectedKnowledgePoint === 'all' || 
                                 mistake.knowledge_points?.includes(selectedKnowledgePoint);
    
    return matchesSearch && matchesSourceType && matchesKnowledgePoint;
  });

  const allKnowledgePoints = Array.from(
    new Set(mistakes.flatMap((mistake: any) => mistake.knowledge_points || []))
  );

  const handleCreateMistake = async () => {
    if (!newMistake.mistakeContent.trim()) {
      return;
    }

    await saveMistake.mutateAsync({
      mistakeContent: newMistake.mistakeContent,
      analysis: newMistake.analysis,
      knowledgePoints: newMistake.knowledgePoints,
      sourceType: newMistake.sourceType,
    });

    setIsCreateDialogOpen(false);
    setNewMistake({
      mistakeContent: '',
      analysis: '',
      sourceType: 'manual',
      knowledgePoints: [],
    });
  };

  const addKnowledgePoint = () => {
    const point = knowledgePointInput.trim();
    if (point && !newMistake.knowledgePoints.includes(point)) {
      setNewMistake(prev => ({
        ...prev,
        knowledgePoints: [...prev.knowledgePoints, point]
      }));
      setKnowledgePointInput('');
    }
  };

  const removeKnowledgePoint = (point: string) => {
    setNewMistake(prev => ({
      ...prev,
      knowledgePoints: prev.knowledgePoints.filter(p => p !== point)
    }));
  };

  const handleDelete = async (mistakeId: string) => {
    if (confirm(t('delete') + '?')) {
      await deleteMistake.mutateAsync(mistakeId);
    }
  };

  const getSourceTypeIcon = (sourceType: string) => {
    switch (sourceType) {
      case 'quiz': return <Brain className="h-4 w-4" />;
      case 'assignment': return <FileText className="h-4 w-4" />;
      case 'manual': return <BookOpen className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getSourceTypeColor = (sourceType: string) => {
    switch (sourceType) {
      case 'quiz': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'assignment': return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'manual': return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      default: return 'bg-white/10 text-white/70 border-white/20';
    }
  };

  const getSourceTypeLabel = (sourceType: string) => {
    switch (sourceType) {
      case 'quiz': return t('quiz');
      case 'assignment': return t('assignment');
      case 'manual': return t('manual');
      default: return sourceType;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="w-full h-32" />
          <Skeleton className="w-full h-64" />
          <Skeleton className="w-full h-96" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-red-500/20 to-orange-500/20 rounded-2xl border border-red-500/30">
                <AlertCircle className="h-8 w-8 text-red-400" />
              </div>
              {t('mistake_book')}
            </h1>
            <p className="text-white/70 text-lg">{t('track_mistakes')}</p>
          </div>
          
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                <Plus className="h-4 w-4 mr-2" />
                {t('create_mistake')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl bg-gray-900/95 border-white/10">
              <DialogHeader>
                <DialogTitle className="text-white text-xl">{t('create_mistake')}</DialogTitle>
                <DialogDescription className="text-white/60">
                  {t('track_mistakes')}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="source-type" className="text-white">{t('source_type')}</Label>
                  <Select 
                    value={newMistake.sourceType} 
                    onValueChange={(value: 'quiz' | 'assignment' | 'manual') => 
                      setNewMistake(prev => ({ ...prev, sourceType: value }))
                    }
                  >
                    <SelectTrigger className="bg-white/5 border-white/10 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-white/10">
                      <SelectItem value="manual">{t('manual')}</SelectItem>
                      <SelectItem value="quiz">{t('quiz')}</SelectItem>
                      <SelectItem value="assignment">{t('assignment')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="mistake-content" className="text-white">{t('mistake_content')}</Label>
                  <Textarea
                    id="mistake-content"
                    placeholder={t('mistake_content')}
                    value={newMistake.mistakeContent}
                    onChange={(e) => setNewMistake(prev => ({ ...prev, mistakeContent: e.target.value }))}
                    rows={4}
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
                  />
                </div>

                <div>
                  <Label htmlFor="analysis" className="text-white">{t('analysis')}</Label>
                  <Textarea
                    id="analysis"
                    placeholder={t('error_analysis_placeholder')}
                    value={newMistake.analysis}
                    onChange={(e) => setNewMistake(prev => ({ ...prev, analysis: e.target.value }))}
                    rows={3}
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
                  />
                </div>

                <div>
                  <Label className="text-white">{t('knowledge_points')}</Label>
                  <div className="flex flex-wrap gap-2 mt-2 mb-3">
                    {newMistake.knowledgePoints.map((point, index) => (
                      <Badge key={index} className="bg-purple-500/20 text-purple-300 border-purple-500/30 flex items-center gap-1">
                        {point}
                        <X 
                          className="h-3 w-3 cursor-pointer hover:text-purple-100" 
                          onClick={() => removeKnowledgePoint(point)}
                        />
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder={t('add_knowledge_point_placeholder')}
                      value={knowledgePointInput}
                      onChange={(e) => setKnowledgePointInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addKnowledgePoint();
                        }
                      }}
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
                    />
                    <Button 
                      type="button" 
                      variant="outline"
                      onClick={addKnowledgePoint}
                      className="border-white/10 hover:bg-white/5"
                    >
                      {t('add')}
                    </Button>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)} className="border-white/10 hover:bg-white/5">
                  {t('cancel')}
                </Button>
                <Button 
                  onClick={handleCreateMistake}
                  disabled={!newMistake.mistakeContent.trim() || saveMistake.isPending}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  {saveMistake.isPending ? t('create') + '...' : t('save_mistake')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </motion.div>

        {/* Statistics */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-4 gap-6"
        >
          <Card className="bg-gradient-to-br from-red-600/20 to-orange-600/20 border-red-500/30 backdrop-blur-sm">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white/70">{t('total_mistakes')}</p>
                  <p className="text-3xl font-bold text-white">{mistakes.length}</p>
                </div>
                <AlertCircle className="h-12 w-12 text-red-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-600/20 to-cyan-600/20 border-blue-500/30 backdrop-blur-sm">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white/70">{t('quiz_mistakes')}</p>
                  <p className="text-3xl font-bold text-white">
                    {mistakes.filter((m: any) => m.source_type === 'quiz').length}
                  </p>
                </div>
                <Brain className="h-12 w-12 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-600/20 to-emerald-600/20 border-green-500/30 backdrop-blur-sm">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white/70">{t('assignment_mistakes')}</p>
                  <p className="text-3xl font-bold text-white">
                    {mistakes.filter((m: any) => m.source_type === 'assignment').length}
                  </p>
                </div>
                <FileText className="h-12 w-12 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-600/20 to-pink-600/20 border-purple-500/30 backdrop-blur-sm">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white/70">{t('knowledge_point_count')}</p>
                  <p className="text-3xl font-bold text-white">{allKnowledgePoints.length}</p>
                </div>
                <Tag className="h-12 w-12 text-purple-400" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="bg-white/5 backdrop-blur-sm border-white/10">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40 h-4 w-4" />
                  <Input
                    placeholder={t('search_content_analysis_knowledge')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/40"
                  />
                </div>
                
                <Select value={selectedSourceType} onValueChange={setSelectedSourceType}>
                  <SelectTrigger className="w-full md:w-[200px] bg-white/5 border-white/10 text-white">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-white/10">
                    <SelectItem value="all">{t('all_types')}</SelectItem>
                    <SelectItem value="quiz">{t('quiz')}</SelectItem>
                    <SelectItem value="assignment">{t('assignment')}</SelectItem>
                    <SelectItem value="manual">{t('manual')}</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={selectedKnowledgePoint} onValueChange={setSelectedKnowledgePoint}>
                  <SelectTrigger className="w-full md:w-[200px] bg-white/5 border-white/10 text-white">
                    <Tag className="h-4 w-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-white/10">
                    <SelectItem value="all">{t('all_knowledge_points')}</SelectItem>
                    {allKnowledgePoints.map((point: string) => (
                      <SelectItem key={point} value={point}>{point}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Mistake List */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="space-y-4"
        >
          <AnimatePresence mode="popLayout">
            {filteredMistakes.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
              >
                <Card className="bg-white/5 backdrop-blur-sm border-white/10">
                  <CardContent className="pt-6">
                    <div className="text-center py-12">
                      <BookOpen className="h-16 w-16 text-white/30 mx-auto mb-4" />
                      <h3 className="text-xl font-medium text-white mb-2">{t('no_mistake_records')}</h3>
                      <p className="text-white/60 mb-6">{t('start_recording_mistakes')}</p>
                      <Button 
                        onClick={() => setIsCreateDialogOpen(true)}
                        className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        {t('add_first_mistake')}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              filteredMistakes.map((mistake: any, index: number) => (
                <motion.div
                  key={mistake.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="bg-white/5 backdrop-blur-sm border-white/10 hover:bg-white/10 transition-all duration-300 group">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-4">
                          {/* Header with badges */}
                          <div className="flex items-center gap-3 flex-wrap">
                            <Badge className={`flex items-center gap-1.5 ${getSourceTypeColor(mistake.source_type)}`}>
                              {getSourceTypeIcon(mistake.source_type)}
                              {getSourceTypeLabel(mistake.source_type)}
                            </Badge>
                            
                            <div className="flex items-center text-sm text-white/50">
                              <Calendar className="h-3.5 w-3.5 mr-1" />
                              {new Date(mistake.created_at).toLocaleDateString()}
                            </div>
                          </div>

                          {/* Mistake Content */}
                          <div className="space-y-2">
                            <div className="flex items-start gap-2">
                              <Target className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
                              <div>
                                <h4 className="font-medium text-white/90 mb-1">{t('mistake_content_label')}</h4>
                                <p className="text-white/70 leading-relaxed">{mistake.mistake_content}</p>
                              </div>
                            </div>

                            {/* Analysis */}
                            {mistake.analysis && (
                              <div className="flex items-start gap-2 bg-white/5 rounded-lg p-4 border border-white/10">
                                <Lightbulb className="h-5 w-5 text-yellow-400 mt-0.5 flex-shrink-0" />
                                <div>
                                  <h4 className="font-medium text-white/90 mb-1">{t('error_analysis_label')}</h4>
                                  <p className="text-white/70 leading-relaxed">{mistake.analysis}</p>
                                </div>
                              </div>
                            )}

                            {/* Knowledge Points */}
                            {mistake.knowledge_points && mistake.knowledge_points.length > 0 && (
                              <div className="flex flex-wrap gap-2">
                                {mistake.knowledge_points.map((point: string, idx: number) => (
                                  <Badge 
                                    key={idx} 
                                    variant="outline" 
                                    className="bg-purple-500/10 text-purple-300 border-purple-500/30"
                                  >
                                    <Tag className="h-3 w-3 mr-1" />
                                    {point}
                                  </Badge>
                                ))}
                              </div>
                            )}

                            {/* Recommended Exercises */}
                            {mistake.recommended_exercises && (
                              <div className="flex items-center gap-2 text-sm text-white/60">
                                <TrendingUp className="h-4 w-4 text-blue-400" />
                                <span>{t('from')}: {mistake.recommended_exercises.difficulty}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(mistake.id)}
                            className="text-red-400 hover:text-red-300 hover:bg-red-500/20"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
