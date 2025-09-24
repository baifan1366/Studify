'use client';

import React, { useState, useEffect } from 'react';
import { useUser } from '@/hooks/profile/use-user';
import { useClassroomMembers } from '@/hooks/classroom/use-update-classroom-member';
import { AssignmentSubmissions } from './assignment-submissions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

interface Assignment {
  id: number;
  title: string;
  description: string;
  due_date: string;
  classroom_id: number;
}

interface AssignmentSubmissionsPageProps {
  assignmentId: number;
  classroomSlug: string;
}

export function AssignmentSubmissionsPageComponent({ 
  assignmentId, 
  classroomSlug 
}: AssignmentSubmissionsPageProps) {
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { data: userData } = useUser();
  const { data: membersData } = useClassroomMembers(classroomSlug);
  const router = useRouter();

  useEffect(() => {
    const fetchAssignment = async () => {
      try {
        setLoading(true);
        const apiUrl = `/api/classroom/${classroomSlug}/assignments/${assignmentId}`;
        console.log('Fetching assignment from:', apiUrl);
        
        const response = await fetch(apiUrl);
        
        if (!response.ok) {
          const errorData = await response.text();
          console.error('API Error Response:', response.status, errorData);
          
          if (response.status === 404) {
            throw new Error('Assignment not found. Please check the assignment ID and classroom slug.');
          }
          throw new Error(`Failed to fetch assignment: ${response.status} - ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('Assignment data received:', data);
        setAssignment(data.assignment);
      } catch (err) {
        console.error('Error fetching assignment:', err);
        setError(err instanceof Error ? err.message : 'Failed to load assignment');
      } finally {
        setLoading(false);
      }
    };

    if (assignmentId && classroomSlug) {
      fetchAssignment();
    }
  }, [assignmentId, classroomSlug]);

  const handleBack = () => {
    router.push(`/classroom/${classroomSlug}`);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
        </div>
        
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </CardContent>
        </Card>
        
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div>
                      <Skeleton className="h-5 w-32 mb-1" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                  </div>
                  <Skeleton className="h-6 w-16" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="text-center space-y-4">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Assignment</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={handleBack}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Classroom
              </Button>
              <Button onClick={() => window.location.reload()}>
                Try Again
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="text-center space-y-4">
          <AlertCircle className="h-12 w-12 text-gray-500 mx-auto" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Assignment Not Found</h2>
            <p className="text-gray-600 mb-4">The requested assignment could not be found.</p>
            <Button variant="outline" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Classroom
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Determine user role from classroom membership
  const currentUserId = userData?.id ? Number(userData.id) : undefined;
  const userEmail = userData?.email;
  
  // Try multiple ways to match the current user
  const currentMember = membersData?.members?.find((member: any) => {
    // Try matching by profile ID
    if (member.profiles?.id === currentUserId) return true;
    // Try matching by user_id if available
    if (member.user_id === currentUserId) return true;
    // Try matching by email
    if (member.profiles?.email === userEmail) return true;
    return false;
  });
  
  // Determine user role from classroom membership
  const userRole = currentMember?.role || 'tutor';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{assignment.title}</h1>
          <p className="text-muted-foreground">Assignment Submissions</p>
        </div>
      </div>
      
      <AssignmentSubmissions 
        assignment={assignment}
        classroomSlug={classroomSlug}
        userRole={userRole}
        currentUserId={currentUserId}
      />
    </div>
  );
}
