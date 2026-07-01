'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useGroups } from '@/hooks/community/use-community';
import { toast } from 'sonner';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface CreateGroupFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function CreateGroupForm({ onSuccess, onCancel }: CreateGroupFormProps) {
  const t = useTranslations('CreateGroupForm');
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    slug: '',
    visibility: 'public' as 'public' | 'private'
  });

  const { createGroup, isCreatingGroup, createGroupError } = useGroups();

  const handleNameChange = (name: string) => {
    // Validate name length
    if (name.length > 80) {
      return;
    }
    
    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
      .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
      .substring(0, 50);
    
    setFormData(prev => ({ ...prev, name, slug }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.name.trim()) {
      toast.error('Please enter a group name');
      return;
    }

    if (formData.name.length < 2 || formData.name.length > 80) {
      toast.error('Group name must be between 2 and 80 characters');
      return;
    }

    if (!formData.slug.trim()) {
      toast.error('Please provide a slug');
      return;
    }

    createGroup(formData, {
      onSuccess: () => {
        setFormData({ name: '', description: '', slug: '', visibility: 'public' });
        toast.success('Group created successfully! 🎉');
        onSuccess?.();
        router.back();
      },
      onError: (error: any) => {
        toast.error(error?.message || 'Failed to create group');
      }
    });
  };

  return (
    <Card className="border-border bg-card text-card-foreground shadow-sm">
      <CardHeader>
        <CardTitle className="text-foreground">Create New Group</CardTitle>
        <CardDescription className="text-muted-foreground">
          Create a community group to organize discussions around specific topics
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Group Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g., Machine Learning"
              className="border-input bg-background text-foreground placeholder:text-muted-foreground"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">URL Slug</Label>
            <Input
              id="slug"
              value={formData.slug}
              onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
              placeholder="machine-learning"
              className="border-input bg-background text-foreground placeholder:text-muted-foreground"
              required
            />
            <p className="text-xs text-muted-foreground">
              This will be used in the URL: /community/{formData.slug || 'your-slug'}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe what this group is about..."
              className="min-h-[100px] border-input bg-background text-foreground placeholder:text-muted-foreground"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="visibility">Visibility</Label>
            <Select
              value={formData.visibility}
              onValueChange={(value: 'public' | 'private') => 
                setFormData(prev => ({ ...prev, visibility: value }))
              }
            >
              <SelectTrigger className="border-input bg-background text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">
                  Public - Anyone can see and join
                </SelectItem>
                <SelectItem value="private">
                  Private - Members only
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {createGroupError && (
            <Alert className="border-red-400 bg-red-400/10">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-red-400">
                {createGroupError.message}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              disabled={isCreatingGroup || !formData.name.trim() || !formData.slug.trim()}
              className="flex-1 bg-orange-500 text-white hover:bg-orange-600"
            >
              {isCreatingGroup && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isCreatingGroup ? 'Creating...' : 'Create Group'}
            </Button>
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isCreatingGroup}
                className="border-border hover:bg-muted"
              >
                Cancel
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
