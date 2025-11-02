"use client";

import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Users,
  CheckCircle2,
  Clock,
  Star,
  TrendingUp,
  Calendar,
  GraduationCap,
  Edit3,
} from "lucide-react";
import { useClassroomMembers } from "@/hooks/classroom/use-update-classroom-member";
import { useSubmissions } from "@/hooks/classroom/use-submissions";
import { useAssignmentGrades } from "@/hooks/classroom/use-grades";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ClassroomColor,
  getCardStyling,
  CLASSROOM_COLORS,
} from "@/utils/classroom/color-generator";

interface SubmissionsSummaryProps {
  assignmentId: number;
  classroomSlug: string;
  dueDate: string;
  className?: string;
  userRole?: "owner" | "tutor" | "student";
  classroomColor?: ClassroomColor;
  onGradeSubmission?: (submissionId: number) => void;
}

export function SubmissionsSummary({
  assignmentId,
  classroomSlug,
  dueDate,
  className,
  userRole = "student",
  classroomColor = "#96CEB4",
  onGradeSubmission,
}: SubmissionsSummaryProps) {
  const [showGradingActions, setShowGradingActions] = useState(false);

  // Fetch classroom members to get total students
  const {
    data: membersData,
    isLoading: isMembersLoading,
    error: membersError,
  } = useClassroomMembers(classroomSlug);

  // Fetch submissions for this assignment
  const { data: submissionsData, isLoading: isSubmissionsLoading } =
    useSubmissions(classroomSlug, assignmentId);

  // Fetch grades for this assignment
  const { data: gradesData, isLoading: isGradesLoading } = useAssignmentGrades(
    classroomSlug,
    assignmentId
  );

  // Calculate statistics from API data - filter for students only
  const allMembers = membersData?.members || [];
  const studentMembers = allMembers.filter(
    (member) => member.role === "student"
  );
  const totalStudents = studentMembers.length;
  const submittedCount = submissionsData?.submissions?.length || 0;
  const grades = gradesData?.grades || [];
  const gradedCount = grades.length;
  const averageGrade =
    grades.length > 0
      ? grades.reduce((sum, grade) => sum + grade.score, 0) / grades.length
      : undefined;

  // Check if user can grade (owner or tutor)
  const canGrade = userRole === "owner" || userRole === "tutor";

  const isLoading = isMembersLoading || isSubmissionsLoading || isGradesLoading;
  const submissionRate =
    totalStudents > 0 ? (submittedCount / totalStudents) * 100 : 0;
  const gradingRate =
    submittedCount > 0 ? (gradedCount / submittedCount) * 100 : 0;
  const isOverdue = new Date() > new Date(dueDate);

  // Get classroom color styling
  const validColor =
    classroomColor &&
    CLASSROOM_COLORS.includes(classroomColor as ClassroomColor)
      ? (classroomColor as ClassroomColor)
      : CLASSROOM_COLORS[0];
  const cardStyling = getCardStyling(validColor, "light");

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getGradeColor = (grade: number) => {
    if (grade >= 85) return "text-green-600 bg-green-50";
    if (grade >= 70) return "text-blue-600 bg-blue-50";
    if (grade >= 60) return "text-yellow-600 bg-yellow-50";
    return "text-red-600 bg-red-50";
  };

  // Show error state if classroomSlug is missing
  if (!classroomSlug) {
    return (
      <div className={`space-y-4 ${className}`}>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-red-600 font-medium">
                Missing Classroom Information
              </p>
              <p className="text-red-500 text-sm mt-1">
                Unable to load submission statistics - classroom slug not
                provided
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show loading state while data is being fetched
  if (isLoading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Grading Actions Header for Tutors/Admins */}
      {canGrade && (
        <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-blue-600" />
            <div>
              <h3 className="font-medium text-blue-900 dark:text-blue-100">
                Grading Dashboard
              </h3>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                {submittedCount - gradedCount} submissions pending review
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="border-blue-300 text-blue-700 hover:bg-blue-100"
            onClick={() => setShowGradingActions(!showGradingActions)}
          >
            <Edit3 className="h-4 w-4 mr-2" />
            {showGradingActions ? "Hide" : "Show"} Grading Tools
          </Button>
        </div>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card
          className="border-l-4 hover:shadow-md transition-shadow"
          style={{
            borderLeftColor: validColor,
            backgroundColor: cardStyling.backgroundColor,
            borderColor: cardStyling.borderColor,
          }}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Students
            </CardTitle>
            <Users className="h-4 w-4" style={{ color: validColor }} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isMembersLoading ? "..." : totalStudents}
            </div>
            <p className="text-xs text-muted-foreground">
              {isMembersLoading
                ? "Loading members..."
                : membersError
                ? "Error loading"
                : totalStudents === 0
                ? "No students found"
                : "Enrolled in classroom"}
            </p>
            {membersError && (
              <p className="text-xs text-red-500 mt-1">
                {membersError.message || "Failed to load"}
              </p>
            )}
          </CardContent>
        </Card>

        <Card
          className="border-l-4 hover:shadow-md transition-shadow"
          style={{
            borderLeftColor: validColor,
            backgroundColor: cardStyling.backgroundColor,
            borderColor: cardStyling.borderColor,
          }}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Submissions</CardTitle>
            <FileText className="h-4 w-4" style={{ color: validColor }} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{submittedCount}</div>
            <p className="text-xs text-muted-foreground">
              {isSubmissionsLoading
                ? "Loading..."
                : `${submissionRate.toFixed(1)}% submission rate`}
            </p>
          </CardContent>
        </Card>

        <Card
          className="border-l-4 hover:shadow-md transition-shadow"
          style={{
            borderLeftColor: validColor,
            backgroundColor: cardStyling.backgroundColor,
            borderColor: cardStyling.borderColor,
          }}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Graded</CardTitle>
            <CheckCircle2 className="h-4 w-4" style={{ color: validColor }} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{gradedCount}</div>
            <p className="text-xs text-muted-foreground">
              {isGradesLoading
                ? "Loading..."
                : `${gradingRate.toFixed(1)}% grading progress`}
            </p>
          </CardContent>
        </Card>

        <Card
          className="border-l-4 hover:shadow-md transition-shadow"
          style={{
            borderLeftColor: validColor,
            backgroundColor: cardStyling.backgroundColor,
            borderColor: cardStyling.borderColor,
          }}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Grade</CardTitle>
            <Star className="h-4 w-4" style={{ color: validColor }} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isGradesLoading
                ? "Loading..."
                : averageGrade
                ? `${averageGrade.toFixed(1)}%`
                : "N/A"}
            </div>
            {averageGrade && !isGradesLoading && (
              <Badge variant="outline" className={getGradeColor(averageGrade)}>
                Class Average
              </Badge>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Progress Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card
          className="border-l-4 hover:shadow-md transition-shadow"
          style={{
            borderLeftColor: validColor,
            backgroundColor: cardStyling.backgroundColor,
            borderColor: cardStyling.borderColor,
          }}
        >
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Submission Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Submitted</span>
                <span>
                  {submittedCount}/{totalStudents}
                </span>
              </div>
              <Progress value={submissionRate} className="h-2" />
            </div>

            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" style={{ color: validColor }} />
              <span className="text-sm">Due: {formatDate(dueDate)}</span>
              {isOverdue && (
                <Badge variant="destructive" className="text-xs">
                  Overdue
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card
          className="border-l-4 hover:shadow-md transition-shadow"
          style={{
            borderLeftColor: validColor,
            backgroundColor: cardStyling.backgroundColor,
            borderColor: cardStyling.borderColor,
          }}
        >
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Grading Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Graded</span>
                <span>
                  {gradedCount}/{submittedCount}
                </span>
              </div>
              <Progress value={gradingRate} className="h-2" />
            </div>

            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" style={{ color: validColor }} />
              <span className="text-sm">
                {submittedCount - gradedCount} pending review
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Grading Actions Panel - Only visible to tutors/admins */}
      {canGrade && showGradingActions && (
        <Card
          className="border-l-4 hover:shadow-md transition-shadow"
          style={{
            borderLeftColor: validColor,
            backgroundColor: cardStyling.backgroundColor,
            borderColor: cardStyling.borderColor,
          }}
        >
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Edit3 className="h-4 w-4" style={{ color: validColor }} />
              Quick Grading Actions
            </CardTitle>
            <CardDescription>
              Grade pending submissions for this assignment
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Button
                variant="outline"
                className="justify-start"
                onClick={() => {
                  // Find ungraded submissions and trigger grading for first one
                  const ungradedSubmissions =
                    submissionsData?.submissions?.filter(
                      (sub: any) =>
                        !grades.some(
                          (grade) => grade.user_id === sub.student_id
                        )
                    ) || [];
                  if (ungradedSubmissions.length > 0 && onGradeSubmission) {
                    onGradeSubmission(ungradedSubmissions[0].id);
                  }
                }}
                disabled={submittedCount - gradedCount === 0}
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Grade Next Submission
              </Button>

              <Button
                variant="outline"
                className="justify-start"
                onClick={() => {
                  // Trigger bulk grading view
                  if (onGradeSubmission) {
                    onGradeSubmission(-1); // Use -1 to indicate bulk grading
                  }
                }}
                disabled={submittedCount === 0}
              >
                <Users className="h-4 w-4 mr-2" />
                Bulk Grade ({submittedCount})
              </Button>

              <Button
                variant="outline"
                className="justify-start"
                onClick={() => {
                  // Export grades or submissions
                  console.log("Export functionality would be implemented here");
                }}
                disabled={submittedCount === 0}
              >
                <FileText className="h-4 w-4 mr-2" />
                Export Results
              </Button>
            </div>

            {/* Quick Stats for Grading */}
            <div className="pt-4 border-t border-blue-200">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-lg font-semibold text-green-600">
                    {gradedCount}
                  </div>
                  <div className="text-xs text-muted-foreground">Completed</div>
                </div>
                <div>
                  <div className="text-lg font-semibold text-yellow-600">
                    {submittedCount - gradedCount}
                  </div>
                  <div className="text-xs text-muted-foreground">Pending</div>
                </div>
                <div>
                  <div className="text-lg font-semibold text-blue-600">
                    {averageGrade ? `${averageGrade.toFixed(1)}%` : "N/A"}
                  </div>
                  <div className="text-xs text-muted-foreground">Avg Grade</div>
                </div>
                <div>
                  <div className="text-lg font-semibold text-gray-600">
                    {totalStudents - submittedCount}
                  </div>
                  <div className="text-xs text-muted-foreground">Missing</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status Overview */}
      <Card
        className="border-l-4 hover:shadow-md transition-shadow"
        style={{
          borderLeftColor: validColor,
          backgroundColor: cardStyling.backgroundColor,
          borderColor: cardStyling.borderColor,
        }}
      >
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4" style={{ color: validColor }} />
            Assignment Status
            {canGrade && (
              <Badge variant="secondary" className="ml-auto">
                Tutor View
              </Badge>
            )}
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

          {/* Grade Distribution for Tutors */}
          {canGrade && grades.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <h4 className="text-sm font-medium mb-2">Grade Distribution</h4>
              <div className="grid grid-cols-4 gap-2 text-xs">
                <div className="text-center">
                  <div className="font-medium text-green-600">
                    {grades.filter((g) => g.score >= 85).length}
                  </div>
                  <div className="text-muted-foreground">A (85-100%)</div>
                </div>
                <div className="text-center">
                  <div className="font-medium text-blue-600">
                    {grades.filter((g) => g.score >= 70 && g.score < 85).length}
                  </div>
                  <div className="text-muted-foreground">B (70-84%)</div>
                </div>
                <div className="text-center">
                  <div className="font-medium text-yellow-600">
                    {grades.filter((g) => g.score >= 60 && g.score < 70).length}
                  </div>
                  <div className="text-muted-foreground">C (60-69%)</div>
                </div>
                <div className="text-center">
                  <div className="font-medium text-red-600">
                    {grades.filter((g) => g.score < 60).length}
                  </div>
                  <div className="text-muted-foreground">D (&lt;60%)</div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
