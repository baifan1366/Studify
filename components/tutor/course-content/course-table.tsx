'use client';

import { useCourses, useDeleteCourse } from "@/hooks/course/use-courses";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useTranslations } from "next-intl";
import { 
    Pagination, 
    PaginationContent, 
    PaginationItem, 
    PaginationLink, 
    PaginationNext, 
    PaginationPrevious 
} from "@/components/ui/pagination";
import { useState } from "react";
import { Course } from "@/interface/courses/course-interface";
import { Eye, Edit, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface CourseTableProps {
    owner_id?: string;
}

export default function CourseTable({ owner_id }: CourseTableProps) {
    const t = useTranslations('CourseTable');
    const { toast } = useToast();
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const { data: courses, isLoading, error } = useCourses("1");
    const deleteCourse = useDeleteCourse();

    const handleDelete = async (courseId: string) => {
        try {
            await deleteCourse.mutateAsync(courseId);
            toast({
                title: t('success'),
                description: t('courseDeleted'),
            });
        } catch (error) {
            toast({
                title: t('error'),
                description: t('deleteError'),
                variant: "destructive",
            });
        }
    };

    const handlePreview = (course: Course) => {
        // Navigate to course preview
        window.open(`/courses/${course.public_id}`, '_blank');
    };

    const handleEdit = (course: Course) => {
        // Navigate to course edit page
        window.location.href = `/tutor/courses/${course.public_id}/edit`;
    };

    if (isLoading) {
        return (
            <div className="space-y-4">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-8">{t('no')}</TableHead>
                            <TableHead className="text-center w-[200px]">{t('title')}</TableHead>
                            <TableHead className="text-center w-24">{t('visibility')}</TableHead>
                            <TableHead className="text-center w-[150px]">{t('tags')}</TableHead>
                            <TableHead className="text-center w-32">{t('actions')}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {Array.from({ length: 5 }).map((_, index) => (
                            <TableRow key={index}>
                                <TableCell>
                                    <Skeleton className="h-4 w-8" />
                                </TableCell>
                                <TableCell>
                                    <div className="space-y-2">
                                        <Skeleton className="h-4 w-48" />
                                        <Skeleton className="h-3 w-32" />
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Skeleton className="h-6 w-16 rounded-full" />
                                </TableCell>
                                <TableCell>
                                    <div className="flex gap-1">
                                        <Skeleton className="h-5 w-12 rounded-full" />
                                        <Skeleton className="h-5 w-16 rounded-full" />
                                        <Skeleton className="h-5 w-10 rounded-full" />
                                    </div>
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex justify-end gap-2">
                                        <Skeleton className="h-8 w-8" />
                                        <Skeleton className="h-8 w-8" />
                                        <Skeleton className="h-8 w-8" />
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        );
    }

    if (error) {
        return <div className="text-red-500 p-4">{t('error')}</div>;
    }

    if (!courses || courses.length === 0) {
        return <div className="text-center p-8 text-gray-500">{t('noCourses')}</div>;
    }

    // Pagination logic
    const totalPages = Math.ceil(courses.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentCourses = courses.slice(startIndex, endIndex);

    return (
        <div className="w-full space-y-4">
            <div className="w-full overflow-x-auto">
                <Table className="w-full">
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-8">{t('no')}</TableHead>
                            <TableHead className="text-center w-[200px]">{t('title')}</TableHead>
                            <TableHead className="text-center w-24">{t('visibility')}</TableHead>
                            <TableHead className="text-center w-[150px]">{t('tags')}</TableHead>
                            <TableHead className="text-center w-32">{t('actions')}</TableHead>
                        </TableRow>
                    </TableHeader>
                <TableBody>
                    {currentCourses.map((course, index) => (
                        <TableRow key={course.public_id}>
                            <TableCell className="font-medium w-8">
                                {startIndex + index + 1}
                            </TableCell>
                            <TableCell className="w-[200px] truncate">
                                <div>
                                    <div className="font-medium">{course.title}</div>
                                    {course.description && (
                                        <div className="text-sm text-gray-500 truncate max-w-xs">
                                            {course.description}
                                        </div>
                                    )}
                                </div>
                            </TableCell>
                            <TableCell className="text-center w-24">
                                <Badge 
                                    variant={
                                        course.visibility === 'public' ? 'default' : 
                                        course.visibility === 'private' ? 'secondary' : 
                                        'outline'
                                    }
                                >
                                    {course.visibility}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-center w-[150px] truncate">
                                <div className="flex flex-wrap gap-1">
                                    {course.tags.slice(0, 3).map((tag, tagIndex) => (
                                        <Badge key={tagIndex} variant="outline" className="text-xs">
                                            {tag}
                                        </Badge>
                                    ))}
                                    {course.tags.length > 3 && (
                                        <Badge variant="outline" className="text-xs">
                                            +{course.tags.length - 3}
                                        </Badge>
                                    )}
                                </div>
                            </TableCell>
                            <TableCell className="text-center w-32">
                                <div className="flex justify-center gap-2">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handlePreview(course)}
                                        title={t('preview')}
                                    >
                                        <Eye className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleEdit(course)}
                                        title={t('edit')}
                                    >
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDelete(course.public_id)}
                                        title={t('delete')}
                                        disabled={deleteCourse.isPending}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
                </Table>
            </div>

            {totalPages > 1 && (
                <Pagination>
                    <PaginationContent>
                        <PaginationItem>
                            <PaginationPrevious 
                                href="#"
                                onClick={(e) => {
                                    e.preventDefault();
                                    if (currentPage > 1) {
                                        setCurrentPage(currentPage - 1);
                                    }
                                }}
                                className={currentPage <= 1 ? "pointer-events-none opacity-50" : ""}
                            />
                        </PaginationItem>
                        
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                            <PaginationItem key={page}>
                                <PaginationLink
                                    href="#"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        setCurrentPage(page);
                                    }}
                                    isActive={currentPage === page}
                                >
                                    {page}
                                </PaginationLink>
                            </PaginationItem>
                        ))}
                        
                        <PaginationItem>
                            <PaginationNext 
                                href="#"
                                onClick={(e) => {
                                    e.preventDefault();
                                    if (currentPage < totalPages) {
                                        setCurrentPage(currentPage + 1);
                                    }
                                }}
                                className={currentPage >= totalPages ? "pointer-events-none opacity-50" : ""}
                            />
                        </PaginationItem>
                    </PaginationContent>
                </Pagination>
            )}
        </div>
    );
}
