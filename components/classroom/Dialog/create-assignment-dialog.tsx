'use client';

import React, { useState } from 'react';
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
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { apiSend } from '@/lib/api-config';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface CreateAssignmentDialogProps {
  classroomSlug: string;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onAssignmentCreated?: () => void;
  trigger?: React.ReactNode;
  showTrigger?: boolean;
}

interface CreateAssignmentData {
  title: string;
  description: string;
  due_date: string;
}

export function CreateAssignmentDialog({
  classroomSlug,
  isOpen: controlledOpen,
  onOpenChange,
  onAssignmentCreated,
  trigger,
  showTrigger = true
}: CreateAssignmentDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [formData, setFormData] = useState<CreateAssignmentData>({
    title: '',
    description: '',
    due_date: ''
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Use controlled state if provided, otherwise use internal state
  const isDialogOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setDialogOpen = onOpenChange || setInternalOpen;

  // Create assignment mutation
  const createAssignmentMutation = useMutation({
    mutationFn: async (data: CreateAssignmentData) => {
      return await apiSend({
        url: `/api/classroom/${classroomSlug}/assignments`,
        method: 'POST',
        body: data
      });
    },
    onSuccess: () => {
      // Invalidate and refetch assignments
      queryClient.invalidateQueries({ queryKey: ['classroom-assignments', classroomSlug] });
      
      toast({
        title: "Success",
        description: "Assignment created successfully",
      });
      
      setDialogOpen(false);
      resetForm();
      
      // Notify parent component
      if (onAssignmentCreated) {
        onAssignmentCreated();
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create assignment",
        variant: "destructive",
      });
    }
  });

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      due_date: ''
    });
  };

  const handleCreateAssignment = async () => {
    if (!formData.title || !formData.description || !formData.due_date) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    createAssignmentMutation.mutate(formData);
  };

  const handleOpenChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      resetForm();
    }
  };

  const defaultTrigger = (
    <Button>
      <Plus className="mr-2 h-4 w-4" />
      Create Assignment
    </Button>
  );

  const dialogContent = (
    <DialogContent className="sm:max-w-[500px]">
      <DialogHeader>
        <DialogTitle>Create Assignment</DialogTitle>
        <DialogDescription>
          Create a new assignment for your classroom.
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        <div className="grid gap-2">
          <Label htmlFor="title">
            Title <span className="text-red-500">*</span>
          </Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            placeholder="Assignment title"
            disabled={createAssignmentMutation.isPending}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="description">
            Description <span className="text-red-500">*</span>
          </Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Assignment description and instructions"
            rows={4}
            disabled={createAssignmentMutation.isPending}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="due_date">
            Due Date <span className="text-red-500">*</span>
          </Label>
          <Input
            id="due_date"
            type="datetime-local"
            value={formData.due_date}
            onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
            min={new Date().toISOString().slice(0, 16)}
            disabled={createAssignmentMutation.isPending}
          />
        </div>
      </div>
      <DialogFooter>
        <Button 
          variant="outline" 
          onClick={() => handleOpenChange(false)}
          disabled={createAssignmentMutation.isPending}
        >
          Cancel
        </Button>
        <Button 
          onClick={handleCreateAssignment}
          disabled={!formData.title || !formData.description || !formData.due_date || createAssignmentMutation.isPending}
        >
          {createAssignmentMutation.isPending ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Creating...
            </>
          ) : (
            'Create Assignment'
          )}
        </Button>
      </DialogFooter>
    </DialogContent>
  );

  // If showTrigger is false, return just the dialog content without trigger
  if (!showTrigger) {
    return (
      <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
        {dialogContent}
      </Dialog>
    );
  }

  // Return dialog with trigger
  return (
    <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      {dialogContent}
    </Dialog>
  );
}
