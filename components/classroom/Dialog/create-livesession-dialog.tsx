'use client';

import React from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface FormData {
  title: string;
  description: string;
  starts_at: string;
  ends_at: string;
}

interface CreateLiveSessionDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  formData: FormData;
  onFormDataChange: (updater: (prev: FormData) => FormData) => void;
  onCreateSession: () => void;
  canManageSessions: boolean;
  isCreating?: boolean;
}

export function CreateLiveSessionDialog({
  isOpen,
  onOpenChange,
  formData,
  onFormDataChange,
  onCreateSession,
  canManageSessions,
  isCreating = false
}: CreateLiveSessionDialogProps) {
  if (!canManageSessions) return null;

  // 验证开始时间和结束时间
  const [timeError, setTimeError] = React.useState<string>('');

  React.useEffect(() => {
    setTimeError('');

    // 验证结束时间必须在开始时间至少30分钟后
    if (formData.starts_at && formData.ends_at) {
      const start = new Date(formData.starts_at);
      const end = new Date(formData.ends_at);
      const diffMs = end.getTime() - start.getTime();
      const diffMinutes = diffMs / (1000 * 60);

      if (diffMinutes < 30) {
        const minutesNeeded = Math.ceil(30 - diffMinutes);
        setTimeError(`End time must be at least 30 minutes after start time (need ${minutesNeeded} more minutes)`);
        return;
      }
    }
  }, [formData.starts_at, formData.ends_at]);

  // 检查是否会立即开始（在5分钟内）并显示精确倒计时
  const { willAutoStart, timeToStart } = React.useMemo(() => {
    if (!formData.starts_at) return { willAutoStart: false, timeToStart: '' };
    
    const startTime = new Date(formData.starts_at);
    const now = new Date();
    const diffMs = startTime.getTime() - now.getTime();
    const diffMinutes = diffMs / (1000 * 60);
    const diffSeconds = Math.floor(diffMs / 1000);
    
    // 如果在5分钟内，认为是即将开始
    const willStart = diffMinutes >= 0 && diffMinutes <= 5;
    
    // 格式化时间显示
    let timeDisplay = '';
    if (diffSeconds < 0) {
      timeDisplay = 'Starting now';
    } else if (diffSeconds < 60) {
      timeDisplay = `in ${diffSeconds}s`;
    } else if (diffMinutes < 60) {
      timeDisplay = `in ${Math.floor(diffMinutes)}m`;
    } else {
      const hours = Math.floor(diffMinutes / 60);
      const mins = Math.floor(diffMinutes % 60);
      timeDisplay = `in ${hours}h ${mins}m`;
    }
    
    return { willAutoStart: willStart, timeToStart: timeDisplay };
  }, [formData.starts_at]);

  // 计算最小开始时间（当前时间）
  const minStartTime = React.useMemo(() => {
    const now = new Date();
    return now.toISOString().slice(0, 16);
  }, []);

  // 计算最小结束时间（开始时间 + 30分钟）
  const minEndTime = React.useMemo(() => {
    if (!formData.starts_at) return '';
    const start = new Date(formData.starts_at);
    const minEnd = new Date(start.getTime() + 30 * 60 * 1000);
    return minEnd.toISOString().slice(0, 16);
  }, [formData.starts_at]);

  // 计算 session 持续时间
  const sessionDuration = React.useMemo(() => {
    if (!formData.starts_at || !formData.ends_at) return null;
    
    const start = new Date(formData.starts_at);
    const end = new Date(formData.ends_at);
    const diffMs = end.getTime() - start.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    
    if (diffMinutes < 60) {
      return `${diffMinutes} minutes`;
    } else {
      const hours = Math.floor(diffMinutes / 60);
      const mins = diffMinutes % 60;
      return mins > 0 ? `${hours}h ${mins}m` : `${hours} hour${hours > 1 ? 's' : ''}`;
    }
  }, [formData.starts_at, formData.ends_at]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Schedule Session
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Schedule Live Session</DialogTitle>
          <DialogDescription>
            Create a new live session for your classroom.
            {willAutoStart && (
              <span className="text-green-600 dark:text-green-400 font-medium">
                {' '}⚡ This session will start {timeToStart}!
              </span>
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => onFormDataChange(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Session title"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => onFormDataChange(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Session description (optional)"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="starts_at">
              Start Time <span className="text-red-500">*</span>
            </Label>
            <Input
              id="starts_at"
              type="datetime-local"
              value={formData.starts_at}
              onChange={(e) => onFormDataChange(prev => ({ ...prev, starts_at: e.target.value }))}
              min={minStartTime}
            />
            <p className="text-xs text-muted-foreground">
              Can start immediately or schedule for later
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ends_at">End Time (Optional)</Label>
            <Input
              id="ends_at"
              type="datetime-local"
              value={formData.ends_at}
              onChange={(e) => onFormDataChange(prev => ({ ...prev, ends_at: e.target.value }))}
              min={minEndTime}
              placeholder="Leave empty for open-ended session"
              disabled={!formData.starts_at}
            />
            <p className="text-xs text-muted-foreground">
              {formData.starts_at
                ? sessionDuration 
                  ? `Session duration: ${sessionDuration} • Auto-ends at scheduled time`
                  : 'Must be at least 30 minutes after start time'
                : 'Set start time first'}
            </p>
          </div>

          {timeError && (
            <div className="p-3 text-sm text-red-700 bg-red-100 rounded-lg dark:bg-red-900/30 dark:text-red-300 border border-red-200 dark:border-red-800/50">
              {timeError}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isCreating}>
            Cancel
          </Button>
          <Button
            onClick={onCreateSession}
            disabled={!formData.title || !formData.starts_at || !!timeError || isCreating}
            className={willAutoStart ? 'bg-green-600 hover:bg-green-700' : ''}
          >
            {isCreating
              ? 'Creating...'
              : willAutoStart
                ? '🎬 Starting Soon'
                : 'Schedule Session'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}