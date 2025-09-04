'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Plus, 
  Calendar, 
  Clock, 
  Users, 
  FileText,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { useClassrooms } from '@/hooks/classroom/use-create-live-session';
import { useAssignments } from '@/hooks/classroom/use-assignments';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';

interface ClassroomAssignmentsPageProps {
  classroomSlug: string;
}

interface Assignment {
  id: string;
  title: string;
  description: string;
  due_date: string;
  total_points: number;
  status: 'draft' | 'published' | 'closed';
  created_at: string;
  submissions_count: number;
  total_students: number;
}

export function ClassroomAssignmentsPage({ classroomSlug }: ClassroomAssignmentsPageProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [classroom, setClassroom] = useState<any>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    due_date: '',
    total_points: 100,
    status: 'draft' as 'draft' | 'published' | 'closed'
  });

  // Mock assignments data - replace with actual API call
  const [assignments, setAssignments] = useState<Assignment[]>([
    {
      id: '1',
      title: 'Math Problem Set 1',
      description: 'Complete exercises 1-20 from chapter 3',
      due_date: '2024-01-15T23:59:00Z',
      total_points: 100,
      status: 'published',
      created_at: '2024-01-01T10:00:00Z',
      submissions_count: 15,
      total_students: 25
    },
    {
      id: '2',
      title: 'Science Lab Report',
      description: 'Write a detailed report on the chemistry experiment',
      due_date: '2024-01-20T23:59:00Z',
      total_points: 150,
      status: 'published',
      created_at: '2024-01-05T14:00:00Z',
      submissions_count: 8,
      total_students: 25
    },
    {
      id: '3',
      title: 'History Essay Draft',
      description: 'First draft of your research essay on World War II',
      due_date: '2024-01-25T23:59:00Z',
      total_points: 200,
      status: 'draft',
      created_at: '2024-01-08T09:00:00Z',
      submissions_count: 0,
      total_students: 25
    }
  ]);

  const { data: classroomsData } = useClassrooms();

  useEffect(() => {
    if (classroomsData?.classrooms) {
      const foundClassroom = classroomsData.classrooms.find(c => c.slug === classroomSlug);
      setClassroom(foundClassroom);
    }
  }, [classroomsData, classroomSlug]);

  const handleBack = () => {
    router.push(`/classroom/${classroomSlug}`);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      due_date: '',
      total_points: 100,
      status: 'draft'
    });
    setEditingAssignment(null);
  };

  const handleCreateAssignment = async () => {
    try {
      const newAssignment: Assignment = {
        id: Date.now().toString(),
        title: formData.title,
        description: formData.description,
        due_date: formData.due_date,
        total_points: formData.total_points,
        status: formData.status,
        created_at: new Date().toISOString(),
        submissions_count: 0,
        total_students: 25 // This would come from classroom data
      };

      setAssignments(prev => [...prev, newAssignment]);
      
      toast({
        title: "Success",
        description: "Assignment created successfully",
      });
      
      setIsCreateDialogOpen(false);
      resetForm();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create assignment",
        variant: "destructive",
      });
    }
  };

  const handleEditAssignment = (assignment: Assignment) => {
    setEditingAssignment(assignment);
    setFormData({
      title: assignment.title,
      description: assignment.description,
      due_date: new Date(assignment.due_date).toISOString().slice(0, 16),
      total_points: assignment.total_points,
      status: assignment.status
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateAssignment = async () => {
    if (!editingAssignment) return;

    try {
      setAssignments(prev => prev.map(assignment => 
        assignment.id === editingAssignment.id 
          ? {
              ...assignment,
              title: formData.title,
              description: formData.description,
              due_date: formData.due_date,
              total_points: formData.total_points,
              status: formData.status
            }
          : assignment
      ));
      
      toast({
        title: "Success",
        description: "Assignment updated successfully",
      });
      
      setIsEditDialogOpen(false);
      resetForm();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update assignment",
        variant: "destructive",
      });
    }
  };

  const handleDeleteAssignment = async (assignmentId: string) => {
    try {
      setAssignments(prev => prev.filter(a => a.id !== assignmentId));
      
      toast({
        title: "Success",
        description: "Assignment deleted successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete assignment",
        variant: "destructive",
      });
    }
  };

  const handleViewSubmissions = (assignmentId: string) => {
    // Navigate to submissions page
    router.push(`/classroom/${classroomSlug}/assignment/${assignmentId}/submissions`);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'published':
        return 'default';
      case 'draft':
        return 'secondary';
      case 'closed':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'published':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'draft':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      case 'closed':
        return <XCircle className="h-4 w-4 text-gray-600" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date();
  };

  const canManageAssignments = classroom?.user_role === 'owner' || classroom?.user_role === 'tutor';

  if (!classroom) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
        </div>
      </div>
    );
  }

  const publishedAssignments = assignments.filter(a => a.status === 'published');
  const draftAssignments = assignments.filter(a => a.status === 'draft');
  const closedAssignments = assignments.filter(a => a.status === 'closed');

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <Button variant="ghost" onClick={handleBack} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Assignments</h1>
            <p className="text-muted-foreground">
              Manage assignments for {classroom.name}
            </p>
          </div>
          {canManageAssignments && (
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Assignment
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Create Assignment</DialogTitle>
                  <DialogDescription>
                    Create a new assignment for your classroom.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Assignment title"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Assignment description"
                      rows={3}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="due_date">Due Date</Label>
                    <Input
                      id="due_date"
                      type="datetime-local"
                      value={formData.due_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="total_points">Total Points</Label>
                    <Input
                      id="total_points"
                      type="number"
                      value={formData.total_points}
                      onChange={(e) => setFormData(prev => ({ ...prev, total_points: parseInt(e.target.value) || 0 }))}
                      min="1"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="status">Status</Label>
                    <Select value={formData.status} onValueChange={(value: any) => setFormData(prev => ({ ...prev, status: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="published">Published</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleCreateAssignment}
                    disabled={!formData.title || !formData.due_date}
                  >
                    Create Assignment
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <div className="grid gap-6">
        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Assignments</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{assignments.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Published</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{publishedAssignments.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Drafts</CardTitle>
              <AlertCircle className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{draftAssignments.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Submission Rate</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {publishedAssignments.length > 0 
                  ? Math.round((publishedAssignments.reduce((acc, a) => acc + a.submissions_count, 0) / (publishedAssignments.length * 25)) * 100)
                  : 0}%
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Assignments List */}
        <Card>
          <CardHeader>
            <CardTitle>All Assignments</CardTitle>
            <CardDescription>
              View and manage classroom assignments
            </CardDescription>
          </CardHeader>
          <CardContent>
            {assignments.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">No assignments yet</h3>
                <p className="text-muted-foreground">
                  {canManageAssignments ? 'Create your first assignment' : 'No assignments have been created'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {assignments.map((assignment) => (
                  <div
                    key={assignment.id}
                    className={`p-4 border rounded-lg ${isOverdue(assignment.due_date) && assignment.status === 'published' ? 'border-red-200 bg-red-50' : ''}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {getStatusIcon(assignment.status)}
                          <h3 className="font-semibold">{assignment.title}</h3>
                          <Badge variant={getStatusBadgeVariant(assignment.status)}>
                            {assignment.status.toUpperCase()}
                          </Badge>
                          {isOverdue(assignment.due_date) && assignment.status === 'published' && (
                            <Badge variant="destructive">OVERDUE</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">{assignment.description}</p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Due:</span>
                            <p className="font-medium">
                              {new Date(assignment.due_date).toLocaleDateString()} at{' '}
                              {new Date(assignment.due_date).toLocaleTimeString()}
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Points:</span>
                            <p className="font-medium">{assignment.total_points}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Submissions:</span>
                            <p className="font-medium">
                              {assignment.submissions_count}/{assignment.total_students}
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Progress:</span>
                            <Progress 
                              value={(assignment.submissions_count / assignment.total_students) * 100} 
                              className="mt-1"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        {assignment.status === 'published' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewSubmissions(assignment.id)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Submissions
                          </Button>
                        )}
                        {canManageAssignments && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEditAssignment(assignment)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit Assignment
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDeleteAssignment(assignment.id)}
                                className="text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Assignment
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Assignment Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Assignment</DialogTitle>
            <DialogDescription>
              Update the assignment details.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Assignment title"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Assignment description"
                rows={3}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-due_date">Due Date</Label>
              <Input
                id="edit-due_date"
                type="datetime-local"
                value={formData.due_date}
                onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-total_points">Total Points</Label>
              <Input
                id="edit-total_points"
                type="number"
                value={formData.total_points}
                onChange={(e) => setFormData(prev => ({ ...prev, total_points: parseInt(e.target.value) || 0 }))}
                min="1"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-status">Status</Label>
              <Select value={formData.status} onValueChange={(value: any) => setFormData(prev => ({ ...prev, status: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleUpdateAssignment}
              disabled={!formData.title || !formData.due_date}
            >
              Update Assignment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
