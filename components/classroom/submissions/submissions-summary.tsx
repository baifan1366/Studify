'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  FileText, 
  Users, 
  CheckCircle2, 
  Clock, 
  Star,
  TrendingUp,
  Calendar
} from 'lucide-react';

interface SubmissionsSummaryProps {
  assignmentId: number;
  totalStudents: number;
  submittedCount: number;
  gradedCount: number;
  averageGrade?: number;
  dueDate: string;
  className?: string;
}

export function SubmissionsSummary({
  assignmentId,
  totalStudents,
  submittedCount,
  gradedCount,
  averageGrade,
  dueDate,
  className
}: SubmissionsSummaryProps) {
  const submissionRate = totalStudents > 0 ? (submittedCount / totalStudents) * 100 : 0;
  const gradingRate = submittedCount > 0 ? (gradedCount / submittedCount) * 100 : 0;
  const isOverdue = new Date() > new Date(dueDate);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getGradeColor = (grade: number) => {
    if (grade >= 85) return 'text-green-600 bg-green-50';
    if (grade >= 70) return 'text-blue-600 bg-blue-50';
    if (grade >= 60) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStudents}</div>
            <p className="text-xs text-muted-foreground">
              Enrolled in classroom
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Submissions</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{submittedCount}</div>
            <p className="text-xs text-muted-foreground">
              {submissionRate.toFixed(1)}% submission rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Graded</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{gradedCount}</div>
            <p className="text-xs text-muted-foreground">
              {gradingRate.toFixed(1)}% grading progress
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Grade</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {averageGrade ? `${averageGrade.toFixed(1)}%` : 'N/A'}
            </div>
            {averageGrade && (
              <Badge variant="outline" className={getGradeColor(averageGrade)}>
                Class Average
              </Badge>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Progress Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Submission Progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Submitted</span>
                <span>{submittedCount}/{totalStudents}</span>
              </div>
              <Progress value={submissionRate} className="h-2" />
            </div>
            
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Due: {formatDate(dueDate)}</span>
              {isOverdue && (
                <Badge variant="destructive" className="text-xs">
                  Overdue
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Grading Progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Graded</span>
                <span>{gradedCount}/{submittedCount}</span>
              </div>
              <Progress value={gradingRate} className="h-2" />
            </div>
            
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                {submittedCount - gradedCount} pending review
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Assignment Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              {submittedCount} Submitted
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              {gradedCount} Graded
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1">
              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
              {submittedCount - gradedCount} Pending
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1">
              <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
              {totalStudents - submittedCount} Not Submitted
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
