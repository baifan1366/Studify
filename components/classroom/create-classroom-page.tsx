'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useUser } from '@/hooks/profile/use-user';
import { ArrowLeft, Save, Eye, EyeOff } from 'lucide-react';
import { useCreateClassroom } from '@/hooks/classroom/use-create-classroom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

export function CreateClassroomPage() {
  const router = useRouter();
  const { toast } = useToast();
  const t = useTranslations('CreateClassroom');
  const { data: currentUser } = useUser();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    visibility: 'public' as 'public' | 'private',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);

  const createClassroomMutation = useCreateClassroom();

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "Classroom name is required",
        variant: "destructive",
      });
      return;
    }

    if (formData.visibility === 'private' && !formData.password.trim()) {
      toast({
        title: "Error",
        description: "Password is required for private classrooms",
        variant: "destructive",
      });
      return;
    }

    try {
      const result = await createClassroomMutation.mutateAsync(formData);
      toast({
        title: "Success",
        description: `Classroom "${result.classroom.name}" created successfully!`,
      });
      const isTutor = currentUser?.profile?.role === 'tutor';
      const route = isTutor 
        ? `/tutor/classroom/${result.classroom.slug}`
        : `/classroom/${result.classroom.slug}`;
      router.push(route);
    } catch (error: any) {
      console.error('Classroom creation error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create classroom. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <div className="container mx-auto py-8 max-w-2xl">
      <div className="mb-8">
        <Button variant="ghost" onClick={handleBack} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Classrooms
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Create New Classroom</h1>
        <p className="text-muted-foreground">
          Set up a new classroom for your students
        </p>
      </div>

      <Card className="bg-transparent p-2">
        <CardHeader>
          <CardTitle>Classroom Details</CardTitle>
          <CardDescription>
            Provide basic information about your classroom
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Classroom Name *</Label>
              <Input
                id="name"
                placeholder="Enter classroom name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe what this classroom is about (optional)"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="visibility">Visibility</Label>
              <Select
                value={formData.visibility}
                onValueChange={(value) => handleInputChange('visibility', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select visibility" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">
                    <div className="flex flex-col">
                      <span>Public</span>
                      <span className="text-xs text-muted-foreground">
                        Anyone can see and join this classroom
                      </span>
                    </div>
                  </SelectItem>
                  <SelectItem value="private">
                    <div className="flex flex-col">
                      <span>Private</span>
                      <span className="text-xs text-muted-foreground">
                        Only members can see this classroom
                      </span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.visibility === 'private' && (
              <div className="space-y-2">
                <Label htmlFor="password">
                  Classroom Password *
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter a password for this classroom"
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    className="pl-10 pr-10"
                    required={formData.visibility === 'private'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Students will need this password to join the classroom
                </p>
              </div>
            )}

            <div className="flex justify-end space-x-4 pt-6">
              <Button type="button" variant="outline" onClick={handleBack}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createClassroomMutation.isPending || !formData.name.trim()}
              >
                {createClassroomMutation.isPending ? (
                  <>Creating...</>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Create Classroom
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg">What happens next?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• A unique class code will be generated for students to join</p>
          <p>• You'll be automatically set as the classroom owner</p>
          <p>• You can start creating assignments, quizzes, and live sessions</p>
          <p>• Students can join using the class code you share with them</p>
        </CardContent>
      </Card>
    </div>
  );
}
