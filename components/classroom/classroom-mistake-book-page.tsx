'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertCircle, BookOpen, Brain, Calendar, FileText, Filter, Plus, Search, Tag, TrendingUp, X } from 'lucide-react';
import { MistakeBookWithDetails, CreateMistakeBookRequest } from '@/interface/classroom/mistake-book-interface';

interface ClassroomMistakeBookPageProps {
  classroomSlug: string;
}

export default function ClassroomMistakeBookPage({ 
  classroomSlug 
}: ClassroomMistakeBookPageProps) {
  const t = useTranslations('MistakeBookPage');
  const [mistakes, setMistakes] = useState<MistakeBookWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSourceType, setSelectedSourceType] = useState<string>('all');
  const [selectedKnowledgePoint, setSelectedKnowledgePoint] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedMistake, setSelectedMistake] = useState<MistakeBookWithDetails | null>(null);

  // Create mistake form state
  const [newMistake, setNewMistake] = useState<CreateMistakeBookRequest>({
    mistake_content: '',
    analysis: '',
    source_type: 'manual',
    knowledge_points: [],
  });

  // Mock data for development
  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setMistakes([
        {
          id: 1,
          public_id: 'mistake-1',
          user_id: 1,
          assignment_id: 1,
          mistake_content: '在解二次方程时，忘记考虑判别式为负数的情况，导致答案不完整。',
          analysis: '需要加强对二次方程判别式的理解，特别是当Δ<0时方程无实数解的概念。',
          source_type: 'assignment',
          knowledge_points: ['二次方程', '判别式', '实数解'],
          recommended_exercises: {
            exercises: ['练习题1', '练习题2'],
            difficulty: 'medium'
          },
          is_deleted: false,
          created_at: '2024-03-15T10:30:00Z',
          updated_at: '2024-03-15T10:30:00Z',
          assignment_title: '二次方程综合练习',
          user_name: '张三',
          user_email: 'zhangsan@example.com'
        },
        {
          id: 2,
          public_id: 'mistake-2',
          user_id: 1,
          question_id: 1,
          mistake_content: '在计算三角函数值时，角度和弧度制混淆，导致计算错误。',
          analysis: '需要明确区分角度制和弧度制，并熟练掌握两者之间的转换关系。',
          source_type: 'quiz',
          knowledge_points: ['三角函数', '角度制', '弧度制'],
          recommended_exercises: {
            exercises: ['角度弧度转换练习', '三角函数计算练习'],
            difficulty: 'easy'
          },
          is_deleted: false,
          created_at: '2024-03-14T14:20:00Z',
          updated_at: '2024-03-14T14:20:00Z',
          question_stem: '计算sin(π/6)的值',
          user_name: '张三',
          user_email: 'zhangsan@example.com'
        }
      ]);
      setLoading(false);
    }, 1000);
  }, []);

  const filteredMistakes = mistakes.filter(mistake => {
    const matchesSearch = mistake.mistake_content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         mistake.analysis?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         mistake.knowledge_points.some(point => point.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesSourceType = selectedSourceType === 'all' || mistake.source_type === selectedSourceType;
    
    const matchesKnowledgePoint = selectedKnowledgePoint === 'all' || 
                                 mistake.knowledge_points.includes(selectedKnowledgePoint);
    
    return matchesSearch && matchesSourceType && matchesKnowledgePoint;
  });

  const allKnowledgePoints = Array.from(
    new Set(mistakes.flatMap(mistake => mistake.knowledge_points))
  );

  const handleCreateMistake = () => {
    // TODO: Implement API call to create mistake
    console.log('Creating mistake:', newMistake);
    setIsCreateDialogOpen(false);
    setNewMistake({
      mistake_content: '',
      analysis: '',
      source_type: 'manual',
      knowledge_points: [],
    });
  };

  const addKnowledgePoint = (point: string) => {
    if (point && !newMistake.knowledge_points.includes(point)) {
      setNewMistake(prev => ({
        ...prev,
        knowledge_points: [...prev.knowledge_points, point]
      }));
    }
  };

  const removeKnowledgePoint = (point: string) => {
    setNewMistake(prev => ({
      ...prev,
      knowledge_points: prev.knowledge_points.filter(p => p !== point)
    }));
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
      case 'quiz': return 'bg-blue-100 text-blue-800';
      case 'assignment': return 'bg-green-100 text-green-800';
      case 'manual': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('mistake_book')}</h1>
          <p className="text-gray-600">{t('track_mistakes')}</p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              {t('create_mistake')}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{t('create_mistake')}</DialogTitle>
              <DialogDescription>
                {t('track_mistakes')}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="source-type">{t('source_type')}</Label>
                <Select 
                  value={newMistake.source_type} 
                  onValueChange={(value: 'quiz' | 'assignment' | 'manual') => 
                    setNewMistake(prev => ({ ...prev, source_type: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">{t('manual')}</SelectItem>
                    <SelectItem value="quiz">{t('quiz')}</SelectItem>
                    <SelectItem value="assignment">{t('assignment')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="mistake-content">{t('mistake_content')}</Label>
                <Textarea
                  id="mistake-content"
                  placeholder={t('mistake_content')}
                  value={newMistake.mistake_content}
                  onChange={(e) => setNewMistake(prev => ({ ...prev, mistake_content: e.target.value }))}
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="analysis">错误分析</Label>
                <Textarea
                  id="analysis"
                  placeholder="分析错误原因和改进方法..."
                  value={newMistake.analysis}
                  onChange={(e) => setNewMistake(prev => ({ ...prev, analysis: e.target.value }))}
                  rows={3}
                />
              </div>

              <div>
                <Label>知识点标签</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {newMistake.knowledge_points.map((point, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center gap-1">
                      {point}
                      <X 
                        className="h-3 w-3 cursor-pointer" 
                        onClick={() => removeKnowledgePoint(point)}
                      />
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2 mt-2">
                  <Input
                    placeholder="添加知识点..."
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        addKnowledgePoint(e.currentTarget.value);
                        e.currentTarget.value = '';
                      }
                    }}
                  />
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={(e) => {
                      const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                      addKnowledgePoint(input.value);
                      input.value = '';
                    }}
                  >
                    添加
                  </Button>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleCreateMistake}>
                保存错题
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card className="bg-transparent p-2">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="搜索错题内容、分析或知识点..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={selectedSourceType} onValueChange={setSelectedSourceType}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="来源类型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">所有类型</SelectItem>
                <SelectItem value="quiz">测验</SelectItem>
                <SelectItem value="assignment">作业</SelectItem>
                <SelectItem value="manual">手动添加</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedKnowledgePoint} onValueChange={setSelectedKnowledgePoint}>
              <SelectTrigger className="w-[180px]">
                <Tag className="h-4 w-4 mr-2" />
                <SelectValue placeholder="知识点" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">所有知识点</SelectItem>
                {allKnowledgePoints.map((point) => (
                  <SelectItem key={point} value={point}>{point}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-transparent p-2">
          <CardContent className="pt-6">
            <div className="flex items-center">
              <AlertCircle className="h-8 w-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">总错题数</p>
                <p className="text-2xl font-bold">{mistakes.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-transparent p-2">
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Brain className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">测验错题</p>
                <p className="text-2xl font-bold">
                  {mistakes.filter(m => m.source_type === 'quiz').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-transparent p-2">
          <CardContent className="pt-6">
            <div className="flex items-center">
              <FileText className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">作业错题</p>
                <p className="text-2xl font-bold">
                  {mistakes.filter(m => m.source_type === 'assignment').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-transparent p-2">
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Tag className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">知识点</p>
                <p className="text-2xl font-bold">{allKnowledgePoints.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Mistake List */}
      <div className="space-y-4">
        {filteredMistakes.length === 0 ? (
          <Card className="bg-transparent p-2">
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">暂无错题记录</h3>
                <p className="text-gray-600 mb-4">开始记录错题，提升学习效果</p>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  添加第一个错题
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredMistakes.map((mistake) => (
            <Card key={mistake.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-3">
                      <Badge className={`flex items-center gap-1 ${getSourceTypeColor(mistake.source_type)}`}>
                        {getSourceTypeIcon(mistake.source_type)}
                        {mistake.source_type === 'quiz' ? '测验' : 
                         mistake.source_type === 'assignment' ? '作业' : '手动添加'}
                      </Badge>
                      
                      {mistake.assignment_title && (
                        <span className="text-sm text-gray-600">
                          来自: {mistake.assignment_title}
                        </span>
                      )}
                      
                      {mistake.question_stem && (
                        <span className="text-sm text-gray-600">
                          题目: {mistake.question_stem}
                        </span>
                      )}
                    </div>

                    <div className="space-y-3">
                      <div>
                        <h4 className="font-medium text-gray-900 mb-1">错误内容</h4>
                        <p className="text-gray-700">{mistake.mistake_content}</p>
                      </div>

                      {mistake.analysis && (
                        <div>
                          <h4 className="font-medium text-gray-900 mb-1">错误分析</h4>
                          <p className="text-gray-700">{mistake.analysis}</p>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2">
                        {mistake.knowledge_points.map((point, index) => (
                          <Badge key={index} variant="outline">
                            {point}
                          </Badge>
                        ))}
                      </div>

                      {mistake.recommended_exercises && (
                        <div>
                          <h4 className="font-medium text-gray-900 mb-1">推荐练习</h4>
                          <div className="flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-blue-600" />
                            <span className="text-sm text-gray-600">
                              难度: {mistake.recommended_exercises.difficulty}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-right text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {new Date(mistake.created_at).toLocaleDateString('zh-CN')}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}