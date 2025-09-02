'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useGenerateLearningPath } from '@/hooks/use-learning-path';
import { Loader2 } from 'lucide-react';

interface PathFormProps {
  onSuccess?: () => void;
}

export function PathForm({ onSuccess }: PathFormProps) {
  const [goal, setGoal] = useState('');
  const [duration, setDuration] = useState(30); // 默认30天
  
  const { mutate: generatePath, isPending } = useGenerateLearningPath();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!goal) return;
    
    generatePath(
      { goal, duration },
      {
        onSuccess: () => {
          setGoal('');
          if (onSuccess) onSuccess();
        },
      }
    );
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>创建学习路径</CardTitle>
        <CardDescription>
          输入你的学习目标，我们将为你生成个性化学习路径
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="goal">学习目标</Label>
            <Textarea
              id="goal"
              placeholder="例如：三个月通过雅思考试"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              required
              className="min-h-[100px]"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="duration">计划时长（天）</Label>
            <Input
              id="duration"
              type="number"
              min={1}
              max={365}
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value))}
              required
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                生成中...
              </>
            ) : (
              '生成学习路径'
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}