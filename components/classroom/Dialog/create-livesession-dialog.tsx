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

  // Check if start time is within 5 minutes (will auto-start)
  const willAutoStart = React.useMemo(() => {
    if (!formData.starts_at) return false;
    const startTime = new Date(formData.starts_at);
    const now = new Date();
    const diffMinutes = (startTime.getTime() - now.getTime()) / (1000 * 60);
    return diffMinutes <= 5;
  }, [formData.starts_at]);

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
            {willAutoStart && " This session will start immediately!"}
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
            <Label htmlFor="starts_at">Start Time</Label>
            <Input
              id="starts_at"
              type="datetime-local"
              value={formData.starts_at}
              onChange={(e) => onFormDataChange(prev => ({ ...prev, starts_at: e.target.value }))}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ends_at">End Time (Optional)</Label>
            <Input
              id="ends_at"
              type="datetime-local"
              value={formData.ends_at}
              onChange={(e) => onFormDataChange(prev => ({ ...prev, ends_at: e.target.value }))}
              placeholder="Leave empty for open-ended session"
            />
            <p className="text-xs text-muted-foreground">
              Leave empty if you want an open-ended session
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isCreating}>
            Cancel
          </Button>
          <Button 
            onClick={onCreateSession}
            disabled={!formData.title || !formData.starts_at || isCreating}
            className={willAutoStart ? 'bg-green-600 hover:bg-green-700' : ''}
          >
            {isCreating 
              ? 'Creating...' 
              : willAutoStart 
              ? '🎬 Start Live Now' 
              : 'Schedule Session'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}