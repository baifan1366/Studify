'use client';

import React, { useState, useMemo } from 'react';
import { useStudentsByTutorId } from '@/hooks/students/use-student';
import { useTranslations } from 'next-intl';
import { Skeleton } from '@/components/ui/skeleton';
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
  List,
  Settings
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

interface CourseWithStudentCount {
  id: number;
  title: string;
  studentsCount: number;
}

export default function StudentList() {
  const t = useTranslations('student');
  const { data: user } = useUser();
  const userId = user?.profile?.id || "";
  
  // Get tutor's students data using the new hook
  const { data: tutorData, isLoading } = useStudentsByTutorId(Number(userId));
  
  // Dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [selectedStudentCourseId, setSelectedStudentCourseId] = useState<string>('');
  
  // State management
  const [viewMode, setViewMode] = useState<ViewMode>('courses');
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // Process enrollment data with progress simulation
  const enhancedStudents: EnhancedEnrollment[] = useMemo(() => {
    if (!tutorData?.enrollments || !Array.isArray(tutorData.enrollments)) return [];
    
    return tutorData.enrollments.map((enrollment: Enrollment) => ({
      ...enrollment,
      progress: Math.floor(Math.random() * 100) // TODO: Replace with actual progress calculation
    } as EnhancedEnrollment));
  }, [tutorData?.enrollments]);

  // Process courses with student counts from API data
  const coursesWithCounts = useMemo((): CourseWithStudentCount[] => {
    if (!tutorData?.courses || !Array.isArray(tutorData.courses)) return [];
    
    return tutorData.courses.map((course): CourseWithStudentCount => {
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
  }, [tutorData?.courses, enhancedStudents]);

  // Filtering and sorting logic
  const filteredAndSortedData = useMemo(() => {
    if (viewMode === 'courses') {
      let courseData = [...coursesWithCounts];
      
      // Search filter for courses
      if (searchQuery) {
        courseData = courseData.filter((course) =>
          course.title?.toLowerCase().includes(searchQuery.toLowerCase())
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
            // Since simplified course structure doesn't have created_at, sort by course ID as proxy
            aValue = a.id || 0;
            bValue = b.id || 0;
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
      if (selectedCourse && selectedCourse !== 'all') {
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
  const handleEditStudent = (userId: string, courseId: string) => {
    
    // Verify the enrollment exists in our local data
    const enrollment = enhancedStudents.find(e => 
      e.user_id.toString() === userId && e.course_id.toString() === courseId
    );
    
    if (!enrollment) {
      console.error('❌ [EditStudent] Enrollment not found in local data!');
      alert('Error: Cannot find this enrollment. Please refresh and try again.');
      return;
    }
    
    setSelectedStudentId(userId);
    setSelectedStudentCourseId(courseId);
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

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Input
              placeholder={t('search_placeholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filters Dropdown */}
          <Select value="filters" onValueChange={() => {}}>
            <SelectTrigger className="w-[200px]">
              <div className="flex items-center gap-2">
                <Settings size={16} />
                <span>{t('filters')}</span>
              </div>
            </SelectTrigger>
            <SelectContent className="w-[300px]">
              <div className="p-4 space-y-4">
                {/* Course Filter (for students view) */}
                {viewMode === 'students' && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t('course_filter')}</label>
                    <Select value={selectedCourse || 'all'} onValueChange={(value) => setSelectedCourse(value === 'all' ? null : value)}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('select_course')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('all_courses')}</SelectItem>
                        {coursesWithCounts.map((course) => (
                          <SelectItem key={course.id} value={course.id.toString()}>
                            {course.title} ({course.studentsCount} {t('students')})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Sort By */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('sort_by')}</label>
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
                </div>

                {/* Sort Order */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('sort_order')}</label>
                  <Button
                    variant="outline"
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    className="w-full flex items-center justify-between"
                  >
                    <span>{sortOrder === 'asc' ? t('ascending') : t('descending')}</span>
                    {sortOrder === 'asc' ? <SortAsc size={16} /> : <SortDesc size={16} />}
                  </Button>
                </div>
              </div>
            </SelectContent>
          </Select>
        </div>

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
        courseId={selectedStudentCourseId}
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
  onEditStudent: (studentId: string, courseId: string) => void;
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
                  <BookOpen size={32} className="text-muted-foreground" />
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
        <Card className="bg-transparent p-2">
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

// Interface for grouped student data
interface GroupedStudent {
  user_id: number;
  student_profile?: Profile;
  enrollments: EnhancedEnrollment[];
  totalCourses: number;
  avgProgress: number;
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
  onEditStudent: (userId: string, courseId: string) => void;
  t: any;
}) {
  // Group students by user_id
  const groupedStudents = useMemo((): GroupedStudent[] => {
    const groups = new Map<number, GroupedStudent>();
    
    students.forEach(enrollment => {
      const userId = enrollment.user_id;
      
      if (!groups.has(userId)) {
        groups.set(userId, {
          user_id: userId,
          student_profile: enrollment?.student_profile,
          enrollments: [],
          totalCourses: 0,
          avgProgress: 0
        });
      }
      
      const group = groups.get(userId)!;
      group.enrollments.push(enrollment);
    });
    
    // Calculate stats for each group
    groups.forEach(group => {
      group.totalCourses = group.enrollments.length;
      const totalProgress = group.enrollments.reduce((sum, enrollment) => sum + (enrollment.progress || 0), 0);
      group.avgProgress = group.totalCourses > 0 ? Math.round(totalProgress / group.totalCourses) : 0;
    });
    
    return Array.from(groups.values());
  }, [students]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {groupedStudents.map((groupedStudent) => {
          const studentId = groupedStudent.user_id.toString();
          const isSelected = selectedStudent === studentId;
          
          return (
            <Card 
              key={groupedStudent.user_id}
              className={`cursor-pointer transition-all hover:shadow-lg ${
                isSelected ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => onSelectStudent(isSelected ? null : studentId)}
            >
              <CardContent className="p-4">
                <GroupedStudentCard 
                  groupedStudent={groupedStudent} 
                  t={t} 
                  onEditStudent={onEditStudent} 
                />
                
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full mt-3 flex items-center gap-2"
                >
                  {isSelected ? (
                    <>
                      <ChevronUp size={16} />
                      {t('hide_courses')}
                    </>
                  ) : (
                    <>
                      <ChevronDown size={16} />
                      {t('show_courses')} ({groupedStudent.totalCourses})
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Expanded Student Courses */}
      {selectedStudent && (
        <Card className="bg-transparent p-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen size={20} />
              {t('student_courses')} - {groupedStudents.find(s => s.user_id.toString() === selectedStudent)?.student_profile?.display_name || groupedStudents.find(s => s.user_id.toString() === selectedStudent)?.student_profile?.full_name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {groupedStudents
                .find(s => s.user_id.toString() === selectedStudent)
                ?.enrollments.map((enrollment) => {
                  const course = courses.find(c => c.id === enrollment.course_id);
                  if (!course) return null;
                  
                  return (
                    <Card key={enrollment.id}>
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between">
                            <h4 className="font-semibold truncate flex-1">{course.title}</h4>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="ml-2 flex items-center gap-1"
                              onClick={(e) => {
                                e.stopPropagation();
                                onEditStudent(enrollment.user_id.toString(), enrollment.course_id.toString());
                              }}
                            >
                              <Edit size={12} />
                              {t('edit')}
                            </Button>
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">{t('progress')}</span>
                              <span>{enrollment.progress || 0}%</span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-2">
                              <div 
                                className="bg-primary h-2 rounded-full transition-all"
                                style={{ width: `${enrollment.progress || 0}%` }}
                              />
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Calendar size={12} />
                              <span>{new Date(enrollment.started_at).toLocaleDateString()}</span>
                            </div>
                            <Badge 
                              variant={enrollment.status === 'active' ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              {t(`status_${enrollment.status}`)}
                            </Badge>
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

// Grouped Student Card Component  
function GroupedStudentCard({ 
  groupedStudent, 
  t, 
  onEditStudent 
}: { 
  groupedStudent: GroupedStudent; 
  t: any; 
  onEditStudent: (userId: string, courseId: string) => void;
}) {
  const studentName = groupedStudent.student_profile?.display_name || groupedStudent.student_profile?.full_name || 'Unknown Student';
  const studentEmail = groupedStudent.student_profile?.email || 'No email';
  const studentAvatar = groupedStudent.student_profile?.avatar_url || '';
  
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

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <div className="text-xs font-medium text-muted-foreground">{t('enrolled_courses')}</div>
          <Badge variant="outline" className="text-xs">
            <BookOpen size={12} className="mr-1" />
            {groupedStudent.totalCourses} {t('courses')}
          </Badge>
        </div>
        
        <div className="space-y-1">
          <div className="text-xs font-medium text-muted-foreground">{t('avg_progress')}</div>
          <div className="text-sm font-medium">{groupedStudent.avgProgress}%</div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">{t('overall_progress')}</span>
          <span>{groupedStudent.avgProgress}%</span>
        </div>
        <div className="w-full bg-muted rounded-full h-2">
          <div 
            className="bg-primary h-2 rounded-full transition-all"
            style={{ width: `${groupedStudent.avgProgress}%` }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          {t('first_enrolled')}: {new Date(Math.min(...groupedStudent.enrollments.map(e => new Date(e.started_at).getTime()))).toLocaleDateString()}
        </div>
      </div>
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
  onEditStudent: (studentId: string, courseId: string) => void;
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
          onClick={() => onEditStudent(student.user_id.toString(), student.course_id.toString())}
        >
          <Edit size={12} />
          {t('edit')}
        </Button>
      </div>
    </div>
  );
}