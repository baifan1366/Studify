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
import { AlertCircle, Loader2 } from 'lucide-react';

interface CreateGroupFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function CreateGroupForm({ onSuccess, onCancel }: CreateGroupFormProps) {
  const t = useTranslations('CreateGroupForm');
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
    if (!formData.name.trim() || formData.name.length < 2 || formData.name.length > 80) {
      return;
    }
    
    if (!formData.slug.trim()) {
      return;
    }

    createGroup(formData, {
      onSuccess: () => {
        setFormData({ name: '', description: '', slug: '', visibility: 'public' });
        onSuccess?.();
      }
    });
  };

  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader>
        <CardTitle className="text-white">Create New Group</CardTitle>
        <CardDescription className="text-gray-300">
          Create a community group to organize discussions around specific topics
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-white">Group Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g., Machine Learning"
              className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug" className="text-white">URL Slug</Label>
            <Input
              id="slug"
              value={formData.slug}
              onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
              placeholder="machine-learning"
              className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
              required
            />
            <p className="text-xs text-gray-400">
              This will be used in the URL: /community/{formData.slug || 'your-slug'}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-white">Description (Optional)</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe what this group is about..."
              className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 min-h-[100px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="visibility" className="text-white">Visibility</Label>
            <Select
              value={formData.visibility}
              onValueChange={(value: 'public' | 'private') => 
                setFormData(prev => ({ ...prev, visibility: value }))
              }
            >
              <SelectTrigger className="bg-white/10 border-white/20 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-white/20">
                <SelectItem value="public" className="text-white hover:bg-white/10">
                  Public - Anyone can see and join
                </SelectItem>
                <SelectItem value="private" className="text-white hover:bg-white/10">
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
              className="bg-blue-600 hover:bg-blue-700 text-white flex-1"
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
                className="border-white/20 text-white hover:bg-white/10"
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
