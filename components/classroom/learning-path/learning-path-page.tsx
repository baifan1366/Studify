'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth-provider';
import { useLearningPath } from '@/hooks/profile/use-learning-path';
import { PathForm } from './path-form';
import { SubwayPath } from './subway-path';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { PlusCircle, RefreshCw } from 'lucide-react';

export function LearningPathPage() {
  const { user } = useAuth();
  const userId = user?.id;
  
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState('path');
  
  const { data: learningPath, isLoading, refetch } = useLearningPath(userId);

  // Adjust references to learningPath properties
  const pathId = learningPath?.id || "";
  const progress = learningPath?.progress || 0;
  const goal = learningPath?.goal;

  // 当成功创建学习路径后刷新数据并切换到路径视图
  const handlePathCreated = () => {
    refetch();
    setShowForm(false);
    setActiveTab('path');
  };

  if (!userId) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <p className="text-gray-500">请先登录以查看您的学习路径</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">个性化学习路径</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            刷新
          </Button>
          <Button
            size="sm"
            onClick={() => setShowForm(!showForm)}
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            {showForm ? '取消' : '创建新路径'}
          </Button>
        </div>
      </div>

      {showForm ? (
        <div className="mb-8">
          <PathForm onSuccess={handlePathCreated} />
        </div>
      ) : null}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="path">学习路径</TabsTrigger>
          <TabsTrigger value="stats">学习统计</TabsTrigger>
        </TabsList>
        
        <TabsContent value="path" className="mt-6">
          {isLoading ? (
            <div className="space-y-8">
              <Skeleton className="h-4 w-full" />
              <div className="flex justify-between">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-12 rounded-full" />
                ))}
              </div>
              <Skeleton className="h-64 w-full" />
            </div>
          ) : learningPath && learningPath.milestones.length > 0 ? (
            <SubwayPath 
              milestones={learningPath.milestones} 
              pathId={pathId} 
              progress={progress} 
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-gray-500 mb-4">您还没有创建学习路径</p>
              <Button onClick={() => setShowForm(true)}>
                创建学习路径
              </Button>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="stats" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-6 border rounded-lg bg-white shadow-sm">
              <h3 className="text-lg font-semibold mb-2">完成里程碑</h3>
              <p className="text-3xl font-bold">
                {learningPath ? learningPath.milestones.filter(m => m.status === 'completed').length : 0}
                <span className="text-sm text-gray-500 ml-2">/ {learningPath ? learningPath.milestones.length : 0}</span>
              </p>
            </div>
            
            <div className="p-6 border rounded-lg bg-white shadow-sm">
              <h3 className="text-lg font-semibold mb-2">总体进度</h3>
              <p className="text-3xl font-bold">
                {learningPath ? Math.round(learningPath.progress) : 0}%
              </p>
            </div>
            
            <div className="p-6 border rounded-lg bg-white shadow-sm">
              <h3 className="text-lg font-semibold mb-2">学习目标</h3>
              <p className="text-gray-700">
                {learningPath ? learningPath.goal : '暂无学习目标'}
              </p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}