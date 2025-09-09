'use client';

import React from 'react';
import { FileText, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getCardStyling, ClassroomColor, CLASSROOM_COLORS } from '@/utils/classroom/color-generator';

interface AssignmentsTabProps {
  assignmentsData: any;
  isOwnerOrTutor: boolean;
  classroomSlug: string;
  navigateToSection: (section: string) => void;
  classroom?: any;
}

export function AssignmentsTab({ assignmentsData, isOwnerOrTutor, classroomSlug, navigateToSection, classroom }: AssignmentsTabProps) {
  // Get classroom color
  const classroomColor = (classroom?.color && CLASSROOM_COLORS.includes(classroom.color as ClassroomColor)) 
    ? classroom.color as ClassroomColor 
    : '#6aa84f';
  
  const cardStyling = getCardStyling(classroomColor as ClassroomColor, 'light');
  
  return (
    <Card 
      style={{
        backgroundColor: cardStyling.backgroundColor,
        borderColor: cardStyling.borderColor
      }}
    >
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Assignments</CardTitle>
          <CardDescription>View and manage classroom assignments</CardDescription>
        </div>
        {isOwnerOrTutor && (
          <Button onClick={() => navigateToSection('assignment')}>
            <Plus className="h-4 w-4 mr-2" />
            Create Assignment
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {!assignmentsData?.length ? (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No assignments yet</p>
            {isOwnerOrTutor && (
              <p className="text-sm text-muted-foreground mt-2">
                Create an assignment to get started
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {assignmentsData.slice(0, 5).map((assignment: any) => (
              <div key={assignment.id} className="flex items-center justify-between p-4 bg-gray-100/5 hover:bg-gray-200/8 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <FileText className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium">{assignment.title}</p>
                    <p className="text-sm text-muted-foreground">
                      Due: {assignment.due_on ? new Date(assignment.due_on).toLocaleDateString() : 'No due date'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant={assignment.status === 'published' ? 'default' : 'secondary'}>
                    {assignment.status}
                  </Badge>
                  <Button size="sm" variant="outline">
                    View
                  </Button>
                </div>
              </div>
            ))}
            {assignmentsData.length > 5 && (
              <Button variant="outline" className="w-full" onClick={() => navigateToSection('assignment')}>
                View All Assignments ({assignmentsData.length})
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}