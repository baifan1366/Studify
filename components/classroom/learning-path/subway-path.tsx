'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Milestone } from '@/hooks/profile/use-learning-path';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, Lock, Circle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUpdateMilestoneProgress, useUnlockNextMilestone, useClaimReward } from '@/hooks/profile/use-learning-path';


interface SubwayPathProps {
  milestones: Milestone[];
  pathId: string;
  progress: number;
}

export function SubwayPath({ milestones, pathId, progress }: SubwayPathProps) {
  const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(null);
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [rewardMessage, setRewardMessage] = useState('');
  
  const { mutate: updateProgress } = useUpdateMilestoneProgress();
  const { mutate: unlockMilestone } = useUnlockNextMilestone();
  const { mutate: claimReward } = useClaimReward();
  const { toast } = useToast();

  // 找到当前进行中的里程碑
  useEffect(() => {
    const currentMilestone = milestones.find(m => m.status === 'in-progress');
    if (currentMilestone) {
      setSelectedMilestone(currentMilestone);
    } else if (milestones.length > 0) {
      setSelectedMilestone(milestones[0]);
    }
  }, [milestones]);

  // 处理里程碑点击
  const handleMilestoneClick = (milestone: Milestone) => {
    setSelectedMilestone(milestone);
  };

  // 处理完成里程碑
  const handleCompleteMilestone = (milestone: Milestone) => {
    if (milestone.status === 'locked') {
      toast({
        title: '无法完成',
        description: '此里程碑尚未解锁',
        variant: 'destructive',
      });
      return;
    }
    
    updateProgress(
      { pathId, milestoneId: milestone.id, status: 'completed' },
      {
        onSuccess: (data) => {
          // 如果里程碑有奖励，显示奖励模态框
          if (milestone.reward && Object.keys(milestone.reward).length > 0) {
            claimReward(
              { pathId, milestoneId: milestone.id },
              {
                onSuccess: (rewardData) => {
                  setRewardMessage(rewardData.message);
                  setShowRewardModal(true);
                }
              }
            );
          }
        }
      }
    );
  };

  // 渲染里程碑图标
  const renderMilestoneIcon = (milestone: Milestone) => {
    switch (milestone.status) {
      case 'completed':
        return <CheckCircle className="h-8 w-8 text-green-500" />;
      case 'in-progress':
        return <Circle className="h-8 w-8 text-blue-500" />;
      case 'locked':
        return <Lock className="h-8 w-8 text-gray-400" />;
      default:
        return <AlertCircle className="h-8 w-8 text-yellow-500" />;
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* 进度条 */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium">总体进度</span>
          <span className="text-sm font-medium">{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* 地铁线路图 */}
      <div className="relative">
        {/* 连接线 */}
        <div className="absolute top-1/2 left-0 right-0 h-1 bg-border -translate-y-1/2 z-0" />
        
        {/* 里程碑节点 */}
        <div className="flex justify-between relative z-10">
          {milestones.map((milestone, index) => (
            <div key={milestone.id} className="flex flex-col items-center">
              <button
                onClick={() => handleMilestoneClick(milestone)}
                className={cn(
                  "rounded-full p-2 bg-card border-2 transition-all",
                  milestone.status === 'completed' ? "border-green-500" :
                  milestone.status === 'in-progress' ? "border-blue-500" :
                  "border-gray-300"
                )}
                disabled={milestone.status === 'locked'}
                title={milestone.status === 'locked' ? "请先完成上一步" : milestone.title}
              >
                {renderMilestoneIcon(milestone)}
              </button>
              <span className={cn(
                "mt-2 text-xs font-medium text-center max-w-[100px] truncate",
                milestone.status === 'locked' ? "text-muted-foreground/70" : "text-foreground"
              )}>
                {milestone.title}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 里程碑详情 */}
      {selectedMilestone && (
        <div className="mt-12 rounded-lg border border-border bg-card p-6 text-card-foreground shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-lg font-semibold">{selectedMilestone.title}</h3>
              <Badge variant={selectedMilestone.status === 'completed' ? "secondary" :
                       selectedMilestone.status === 'in-progress' ? "default" : "outline"}
                     className="mt-1">
                {selectedMilestone.status === 'completed' ? "已完成" : 
                 selectedMilestone.status === 'in-progress' ? "进行中" : "未解锁"}
              </Badge>
            </div>
            {selectedMilestone.status === 'in-progress' && (
              <Button onClick={() => handleCompleteMilestone(selectedMilestone)}>
                标记为已完成
              </Button>
            )}
            {selectedMilestone.status === 'completed' && (
              <Button variant="outline" onClick={() => {
                // 实现查看相关资源的逻辑
                if (selectedMilestone.resourceId && selectedMilestone.resourceType) {
                  toast({
                    title: '查看资源',
                    description: `正在打开 ${selectedMilestone.resourceType}: ${selectedMilestone.resourceId}`,
                  });
                }
              }}>
                查看资源
              </Button>
            )}
          </div>
          
          <p className="mb-4 text-muted-foreground">{selectedMilestone.description}</p>
          
          {selectedMilestone.resourceType && (
            <div className="text-sm text-gray-500 mb-2">
              资源类型: {selectedMilestone.resourceType}
            </div>
          )}
        </div>
      )}

      {/* 奖励模态框 */}
      {showRewardModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 text-card-foreground">
            <h3 className="text-xl font-bold mb-4 text-center">🎉 恭喜！</h3>
            <div className="py-4 text-center">
              <p className="text-lg">{rewardMessage}</p>
            </div>
            <div className="flex justify-center mt-4">
              <Button onClick={() => setShowRewardModal(false)}>
                太棒了！
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
