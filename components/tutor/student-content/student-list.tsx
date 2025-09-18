'use client';

import React, { useState, useMemo } from 'react';
import { useEnrolledStudent } from '@/hooks/students/use-student';
import { useTranslations } from 'next-intl';
import { Skeleton } from '@/components/ui/skeleton';
import { useCourses } from '@/hooks/course/use-courses';
import { useUser } from '@/hooks/profile/use-user';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
  Users,
  BookOpen,
  Edit,
  Calendar,
  Mail,
  SortAsc,
  SortDesc,
  Grid,
  List
} from 'lucide-react';
import { Course } from '@/interface/courses/course-interface';
import { Enrollment } from '@/interface/courses/enrollment-interface';
import { Profile } from '@/interface/user/profile-interface';
import EditStudentStatus from './edit-student-status';

type ViewMode = 'courses' | 'students';
type SortBy = 'name' | 'date' | 'progress';
type SortOrder = 'asc' | 'desc';

interface EnhancedEnrollment extends Enrollment {
  student_profile?: Profile;
  course?: Course;
  progress?: number;
}

interface CourseWithStudentCount extends Course {
  studentsCount: number;
}

export default function StudentList() {
  const t = useTranslations('student');
  const { data: user } = useUser();
  const { data: courses, isLoading: coursesLoading } = useCourses();
  const { data: enrollments, isLoading: enrollmentsLoading } = useEnrolledStudent();
  
  // Dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');

  const userId = user?.profile?.id || "";
  const { data: students, isLoading: studentsLoading } = useEnrolledStudent(undefined, Number(userId));
  
  // State management
  const [viewMode, setViewMode] = useState<ViewMode>('courses');
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  const isLoading = coursesLoading || studentsLoading || enrollmentsLoading;

  // Process actual enrollment data
  const enhancedStudents: EnhancedEnrollment[] = useMemo(() => {
    if (!students || !Array.isArray(students)) return [];
    
    return students.map((enrollment: Enrollment) => ({
      ...enrollment,
      progress: Math.floor(Math.random() * 100) // TODO: Replace with actual progress calculation
    } as EnhancedEnrollment));
  }, [students]);

  // Process courses with student counts
  const coursesWithCounts = useMemo((): CourseWithStudentCount[] => {
    if (!courses || !Array.isArray(courses)) return [];
    
    return courses.map((course: Course): CourseWithStudentCount => {
      // Count students enrolled in this specific course
      const studentCount = enhancedStudents.filter(enrollment => 
        enrollment.course_id === course.id && 
        ['active', 'completed'].includes(enrollment.status) // Only count active and completed students
      ).length;
      
      return {
        ...course,
        studentsCount: studentCount
      };
    });
  }, [courses, enhancedStudents]);

  // Filtering and sorting logic
  const filteredAndSortedData = useMemo(() => {
    if (viewMode === 'courses') {
      let courseData = [...coursesWithCounts];
      
      // Search filter for courses
      if (searchQuery) {
        courseData = courseData.filter((course) =>
          course.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          course.description?.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }

      // Sorting for courses
      courseData.sort((a, b) => {
        let aValue, bValue;
        
        switch (sortBy) {
          case 'name':
            aValue = a.title || '';
            bValue = b.title || '';
            break;
          case 'date':
            aValue = new Date(a.created_at);
            bValue = new Date(b.created_at);
            break;
          case 'progress':
            aValue = a.studentsCount || 0;
            bValue = b.studentsCount || 0;
            break;
          default:
            aValue = a.title || '';
            bValue = b.title || '';
        }

        if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });

      return courseData;
    } else {
      let studentData = [...enhancedStudents];
      
      // Search filter for students
      if (searchQuery) {
        studentData = studentData.filter((enrollment) =>
          enrollment.student_profile?.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          enrollment.student_profile?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          enrollment.student_profile?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          enrollment.course?.title?.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }

      // Course filter for students view
      if (selectedCourse) {
        studentData = studentData.filter((enrollment) => 
          enrollment.course_id === Number(selectedCourse)
        );
      }

      // Sorting for students
      studentData.sort((a, b) => {
        let aValue, bValue;
        
        switch (sortBy) {
          case 'name':
            aValue = a.student_profile?.display_name || a.student_profile?.full_name || '';
            bValue = b.student_profile?.display_name || b.student_profile?.full_name || '';
            break;
          case 'date':
            aValue = new Date(a.started_at);
            bValue = new Date(b.started_at);
            break;
          case 'progress':
            aValue = a.progress || 0;
            bValue = b.progress || 0;
            break;
          default:
            aValue = a.student_profile?.display_name || a.student_profile?.full_name || '';
            bValue = b.student_profile?.display_name || b.student_profile?.full_name || '';
        }

        if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });

      return studentData;
    }
  }, [viewMode, coursesWithCounts, enhancedStudents, searchQuery, selectedCourse, sortBy, sortOrder]);

  const totalPages = Math.ceil(filteredAndSortedData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = filteredAndSortedData.slice(startIndex, endIndex);

  // Dialog handlers
  const handleEditStudent = (studentId: string) => {
    setSelectedStudentId(studentId);
    setEditDialogOpen(true);
  };

  const handleStatusUpdate = (status: string) => {
    // Optionally refresh data or show success message
    setEditDialogOpen(false);
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <Skeleton className="h-8 w-48" />
            <div className="flex gap-2">
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 w-32" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-64 w-full rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
              {t('title')}
            </h1>
            <p className="text-muted-foreground mt-1">
              {t('subtitle')}
            </p>
          </div>
          
          {/* View Mode Toggle */}
          <div className="flex items-center gap-2 p-1 bg-muted rounded-lg">
            <Button
              variant={viewMode === 'courses' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => {
                setViewMode('courses');
                setSelectedCourse(null);
                setSelectedStudent(null);
              }}
              className="flex items-center gap-2"
            >
              <Grid size={16} />
              {t('courses_view')}
            </Button>
            <Button
              variant={viewMode === 'students' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => {
                setViewMode('students');
                setSelectedCourse(null);
                setSelectedStudent(null);
              }}
              className="flex items-center gap-2"
            >
              <List size={16} />
              {t('students_view')}
            </Button>
          </div>
        </div>

        {/* Filters and Search */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter size={20} />
              {t('filters')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={16} />
                <Input
                  placeholder={t('search_placeholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Course Filter (for students view) */}
              {viewMode === 'students' && (
                <Select value={selectedCourse || ''} onValueChange={setSelectedCourse}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('select_course')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">{t('all_courses')}</SelectItem>
                    {coursesWithCounts.map((course) => (
                      <SelectItem key={course.id} value={course.id.toString()}>
                        {course.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {/* Sort By */}
              <Select value={sortBy} onValueChange={(value: SortBy) => setSortBy(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">{t('sort_by_name')}</SelectItem>
                  <SelectItem value="date">{t('sort_by_date')}</SelectItem>
                  <SelectItem value="progress">{t('sort_by_progress')}</SelectItem>
                </SelectContent>
              </Select>

              {/* Sort Order */}
              <Button
                variant="outline"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="flex items-center gap-2"
              >
                {sortOrder === 'asc' ? <SortAsc size={16} /> : <SortDesc size={16} />}
                {sortOrder === 'asc' ? t('ascending') : t('descending')}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Main Content */}
        {viewMode === 'courses' ? (
          <CoursesGrid 
            courses={paginatedData as CourseWithStudentCount[]}
            students={enhancedStudents}
            selectedCourse={selectedCourse}
            onSelectCourse={setSelectedCourse}
            onEditStudent={handleEditStudent}
            t={t}
          />
        ) : (
          <StudentsGrid
            students={paginatedData as EnhancedEnrollment[]}
            courses={coursesWithCounts}
            selectedStudent={selectedStudent}
            onSelectStudent={setSelectedStudent}
            onEditStudent={handleEditStudent}
            t={t}
          />
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            >
              {t('previous')}
            </Button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                const page = i + Math.max(1, currentPage - 2);
                if (page > totalPages) return null;
                
                return (
                  <Button
                    key={page}
                    variant={currentPage === page ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </Button>
                );
              })}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
            >
              {t('next')}
            </Button>
          </div>
        )}
      </div>
      </div>

      {/* Edit Student Status Dialog */}
      <EditStudentStatus
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        studentId={selectedStudentId}
        onSave={handleStatusUpdate}
      />
    </>
  );
}

// Courses Grid Component
function CoursesGrid({ 
  courses, 
  students, 
  selectedCourse, 
  onSelectCourse,
  onEditStudent,
  t 
}: {
  courses: CourseWithStudentCount[];
  students: EnhancedEnrollment[];
  selectedCourse: string | null;
  onSelectCourse: (courseId: string | null) => void;
  onEditStudent: (studentId: string) => void;
  t: any;
}) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {courses.map((course) => (
          <Card 
            key={course.id} 
            className={`cursor-pointer transition-all hover:shadow-lg ${
              selectedCourse === course.id.toString() ? 'ring-2 ring-primary' : ''
            }`}
            onClick={() => onSelectCourse(selectedCourse === course.id.toString() ? null : course.id.toString())}
          >
            <CardContent className="p-4">
              <div className="space-y-3">
                {/* Course Thumbnail */}
                <div className="aspect-video bg-gradient-to-br from-primary/10 to-secondary/10 rounded-lg flex items-center justify-center overflow-hidden">
                  {course.thumbnail_url ? (
                    <img
                      src={course.thumbnail_url}
                      alt={course.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <BookOpen size={32} className="text-muted-foreground" />
                  )}
                </div>

                {/* Course Info */}
                <div>
                  <h3 className="font-semibold text-foreground truncate" title={course.title}>
                    {course.title}
                  </h3>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="secondary" className="text-xs">
                      <Users size={12} className="mr-1" />
                      {course.studentsCount || 0} {t('students')}
                    </Badge>
                  </div>
                </div>

                {/* Expand Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full flex items-center gap-2"
                >
                  {selectedCourse === course.id.toString() ? (
                    <>
                      <ChevronUp size={16} />
                      {t('hide_students')}
                    </>
                  ) : (
                    <>
                      <ChevronDown size={16} />
                      {t('show_students')}
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Expanded Course Students */}
      {selectedCourse && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users size={20} />
              {t('enrolled_students')} - {courses.find(c => c.id.toString() === selectedCourse)?.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {students
                .filter(student => student.course_id.toString() === selectedCourse)
                .map((student) => (
                  <StudentCard key={student.id} student={student} t={t} onEditStudent={onEditStudent} />
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Students Grid Component
function StudentsGrid({ 
  students, 
  courses, 
  selectedStudent, 
  onSelectStudent,
  onEditStudent,
  t 
}: {
  students: EnhancedEnrollment[];
  courses: CourseWithStudentCount[];
  selectedStudent: string | null;
  onSelectStudent: (studentId: string | null) => void;
  onEditStudent: (studentId: string) => void;
  t: any;
}) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {students.map((student) => (
          <Card 
            key={student.id}
            className={`cursor-pointer transition-all hover:shadow-lg ${
              selectedStudent === student.id.toString() ? 'ring-2 ring-primary' : ''
            }`}
            onClick={() => onSelectStudent(selectedStudent === student.id.toString() ? null : student.id.toString())}
          >
            <CardContent className="p-4">
              <StudentCard student={student} t={t} showCourse onEditStudent={onEditStudent} />
              
              <Button
                variant="ghost"
                size="sm"
                className="w-full mt-3 flex items-center gap-2"
              >
                {selectedStudent === student.id.toString() ? (
                  <>
                    <ChevronUp size={16} />
                    {t('hide_courses')}
                  </>
                ) : (
                  <>
                    <ChevronDown size={16} />
                    {t('show_courses')}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Expanded Student Courses */}
      {selectedStudent && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen size={20} />
              {t('student_courses')} - {students.find(s => s.id.toString() === selectedStudent)?.student_profile?.display_name || students.find(s => s.id.toString() === selectedStudent)?.student_profile?.full_name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {courses
                .filter(course => students.some(s => s.id.toString() === selectedStudent && s.course_id === course.id))
                .map((course) => {
                  const studentData = students.find(s => s.id.toString() === selectedStudent && s.course_id === course.id);
                  return (
                    <Card key={course.id}>
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          <h4 className="font-semibold truncate">{course.title}</h4>
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">{t('progress')}</span>
                              <span>{studentData?.progress || 0}%</span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-2">
                              <div 
                                className="bg-primary h-2 rounded-full transition-all"
                                style={{ width: `${studentData?.progress || 0}%` }}
                              />
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {t('enrolled_on')}: {new Date(studentData?.started_at || '').toLocaleDateString()}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Student Card Component
function StudentCard({ 
  student, 
  t, 
  showCourse = false,
  onEditStudent 
}: { 
  student: EnhancedEnrollment; 
  t: any; 
  showCourse?: boolean;
  onEditStudent: (studentId: string) => void;
}) {
  const studentName = student.student_profile?.display_name || student.student_profile?.full_name || 'Unknown Student';
  const studentEmail = student.student_profile?.email || 'No email';
  const studentAvatar = student.student_profile?.avatar_url || '';
  
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Avatar>
          <AvatarImage src={studentAvatar} />
          <AvatarFallback>
            {studentName.split(' ').map(n => n[0]).join('').toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <h4 className="font-semibold text-foreground truncate">{studentName}</h4>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Mail size={12} />
            <span className="truncate">{studentEmail}</span>
          </div>
        </div>
      </div>

      {showCourse && student.course && (
        <div>
          <Badge variant="outline" className="text-xs">
            {student.course.title}
          </Badge>
        </div>
      )}

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">{t('progress')}</span>
          <span>{student.progress || 0}%</span>
        </div>
        <div className="w-full bg-muted rounded-full h-2">
          <div 
            className="bg-primary h-2 rounded-full transition-all"
            style={{ width: `${student.progress || 0}%` }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Calendar size={12} />
          <span>{new Date(student.started_at).toLocaleDateString()}</span>
        </div>
        
        <Button 
          size="sm" 
          variant="outline" 
          className="flex items-center gap-1"
          onClick={() => onEditStudent(student.id.toString())}
        >
          <Edit size={12} />
          {t('edit')}
        </Button>
      </div>
    </div>
  );
}