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
import { Eye, Edit, Trash2, Settings2, ChevronDown } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuCheckboxItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useFormat } from "@/hooks/use-format";

interface CourseTableProps {
    owner_id?: string;
}

interface ColumnVisibility {
    no: boolean;
    title: boolean;
    description: boolean;
    slug: boolean;
    visibility: boolean;
    level: boolean;
    language: boolean;
    category: boolean;
    price: boolean;
    totalLessons: boolean;
    duration: boolean;
    createdAt: boolean;
    updatedAt: boolean;
    tags: boolean;
    actions: boolean;
}

export default function CourseTable({ owner_id }: CourseTableProps) {
    const t = useTranslations('CourseTable');
    const { toast } = useToast();
    const { formatPrice, formatDuration, formatCompactDate } = useFormat();
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    
    // Column visibility state - hide less important columns by default
    const [columnVisibility, setColumnVisibility] = useState<ColumnVisibility>({
        no: true,
        title: true,
        description: false, // Hidden by default
        slug: false, // Hidden by default
        visibility: true,
        level: true,
        language: false,
        category: false,
        price: true,
        totalLessons: false,
        duration: false,
        createdAt: false,
        updatedAt: false,
        tags: true,
        actions: true
    });
    
    const toggleColumn = (column: keyof ColumnVisibility) => {
        setColumnVisibility(prev => ({
            ...prev,
            [column]: !prev[column]
        }));
    };
    

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
                                {columnVisibility.no && <TableCell><Skeleton className="h-4 w-8" /></TableCell>}
                                {columnVisibility.title && <TableCell><div className="space-y-2"><Skeleton className="h-4 w-48" /><Skeleton className="h-3 w-32" /></div></TableCell>}
                                {columnVisibility.description && <TableCell><Skeleton className="h-4 w-32" /></TableCell>}
                                {columnVisibility.slug && <TableCell><Skeleton className="h-4 w-24" /></TableCell>}
                                {columnVisibility.visibility && <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>}
                                {columnVisibility.level && <TableCell><Skeleton className="h-4 w-16" /></TableCell>}
                                {columnVisibility.language && <TableCell><Skeleton className="h-4 w-12" /></TableCell>}
                                {columnVisibility.category && <TableCell><Skeleton className="h-4 w-16" /></TableCell>}
                                {columnVisibility.price && <TableCell><Skeleton className="h-4 w-12" /></TableCell>}
                                {columnVisibility.totalLessons && <TableCell><Skeleton className="h-4 w-8" /></TableCell>}
                                {columnVisibility.duration && <TableCell><Skeleton className="h-4 w-12" /></TableCell>}
                                {columnVisibility.createdAt && <TableCell><Skeleton className="h-4 w-16" /></TableCell>}
                                {columnVisibility.updatedAt && <TableCell><Skeleton className="h-4 w-16" /></TableCell>}
                                {columnVisibility.tags && <TableCell><div className="flex gap-1"><Skeleton className="h-5 w-12 rounded-full" /><Skeleton className="h-5 w-16 rounded-full" /></div></TableCell>}
                                {columnVisibility.actions && <TableCell className="text-right"><div className="flex justify-end gap-2"><Skeleton className="h-8 w-8" /><Skeleton className="h-8 w-8" /><Skeleton className="h-8 w-8" /></div></TableCell>}
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
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">Course Management</h3>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                                <Settings2 className="h-4 w-4 mr-2" />
                                Columns
                                <ChevronDown className="h-4 w-4 ml-2" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuCheckboxItem
                                checked={columnVisibility.no}
                                onCheckedChange={() => toggleColumn('no')}
                            >
                                No.
                            </DropdownMenuCheckboxItem>
                            <DropdownMenuCheckboxItem
                                checked={columnVisibility.title}
                                onCheckedChange={() => toggleColumn('title')}
                            >
                                Title
                            </DropdownMenuCheckboxItem>
                            <DropdownMenuCheckboxItem
                                checked={columnVisibility.description}
                                onCheckedChange={() => toggleColumn('description')}
                            >
                                Description
                            </DropdownMenuCheckboxItem>
                            <DropdownMenuCheckboxItem
                                checked={columnVisibility.slug}
                                onCheckedChange={() => toggleColumn('slug')}
                            >
                                Slug
                            </DropdownMenuCheckboxItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuCheckboxItem
                                checked={columnVisibility.visibility}
                                onCheckedChange={() => toggleColumn('visibility')}
                            >
                                Visibility
                            </DropdownMenuCheckboxItem>
                            <DropdownMenuCheckboxItem
                                checked={columnVisibility.level}
                                onCheckedChange={() => toggleColumn('level')}
                            >
                                Level
                            </DropdownMenuCheckboxItem>
                            <DropdownMenuCheckboxItem
                                checked={columnVisibility.language}
                                onCheckedChange={() => toggleColumn('language')}
                            >
                                Language
                            </DropdownMenuCheckboxItem>
                            <DropdownMenuCheckboxItem
                                checked={columnVisibility.category}
                                onCheckedChange={() => toggleColumn('category')}
                            >
                                Category
                            </DropdownMenuCheckboxItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuCheckboxItem
                                checked={columnVisibility.price}
                                onCheckedChange={() => toggleColumn('price')}
                            >
                                Price
                            </DropdownMenuCheckboxItem>
                            <DropdownMenuCheckboxItem
                                checked={columnVisibility.totalLessons}
                                onCheckedChange={() => toggleColumn('totalLessons')}
                            >
                                Lessons
                            </DropdownMenuCheckboxItem>
                            <DropdownMenuCheckboxItem
                                checked={columnVisibility.duration}
                                onCheckedChange={() => toggleColumn('duration')}
                            >
                                Duration
                            </DropdownMenuCheckboxItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuCheckboxItem
                                checked={columnVisibility.createdAt}
                                onCheckedChange={() => toggleColumn('createdAt')}
                            >
                                Created
                            </DropdownMenuCheckboxItem>
                            <DropdownMenuCheckboxItem
                                checked={columnVisibility.updatedAt}
                                onCheckedChange={() => toggleColumn('updatedAt')}
                            >
                                Updated
                            </DropdownMenuCheckboxItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuCheckboxItem
                                checked={columnVisibility.tags}
                                onCheckedChange={() => toggleColumn('tags')}
                            >
                                Tags
                            </DropdownMenuCheckboxItem>
                            <DropdownMenuCheckboxItem
                                checked={columnVisibility.actions}
                                onCheckedChange={() => toggleColumn('actions')}
                            >
                                Actions
                            </DropdownMenuCheckboxItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
                <Table className="w-full">
                    <TableHeader>
                        <TableRow>
                            {columnVisibility.no && <TableHead className="w-8">{t('no')}</TableHead>}
                            {columnVisibility.title && <TableHead className="text-center min-w-[200px]">{t('title')}</TableHead>}
                            {columnVisibility.description && <TableHead className="text-center min-w-[250px]">Description</TableHead>}
                            {columnVisibility.slug && <TableHead className="text-center min-w-[150px]">Slug</TableHead>}
                            {columnVisibility.visibility && <TableHead className="text-center w-24">{t('visibility')}</TableHead>}
                            {columnVisibility.level && <TableHead className="text-center w-20">Level</TableHead>}
                            {columnVisibility.language && <TableHead className="text-center w-20">Language</TableHead>}
                            {columnVisibility.category && <TableHead className="text-center w-24">Category</TableHead>}
                            {columnVisibility.price && <TableHead className="text-center w-20">Price</TableHead>}
                            {columnVisibility.totalLessons && <TableHead className="text-center w-16">Lessons</TableHead>}
                            {columnVisibility.duration && <TableHead className="text-center w-20">Duration</TableHead>}
                            {columnVisibility.createdAt && <TableHead className="text-center w-24">Created</TableHead>}
                            {columnVisibility.updatedAt && <TableHead className="text-center w-24">Updated</TableHead>}
                            {columnVisibility.tags && <TableHead className="text-center min-w-[150px]">{t('tags')}</TableHead>}
                            {columnVisibility.actions && <TableHead className="text-center w-32">{t('actions')}</TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {currentCourses.map((course, index) => (
                            <TableRow key={course.public_id}>
                                {columnVisibility.no && (
                                    <TableCell className="font-medium w-8">
                                        {startIndex + index + 1}
                                    </TableCell>
                                )}
                                {columnVisibility.title && (
                                    <TableCell className="min-w-[200px]">
                                        <div>
                                            <div className="font-medium truncate">{course.title}</div>
                                            {course.description && columnVisibility.description && (
                                                <div className="text-sm text-gray-500 truncate max-w-xs mt-1">
                                                    {course.description}
                                                </div>
                                            )}
                                        </div>
                                    </TableCell>
                                )}
                                {columnVisibility.description && !columnVisibility.title && (
                                    <TableCell className="min-w-[250px]">
                                        <div className="text-sm text-gray-600 truncate">
                                            {course.description || 'No description'}
                                        </div>
                                    </TableCell>
                                )}
                                {columnVisibility.slug && (
                                    <TableCell className="text-center min-w-[150px]">
                                        <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                                            {course.slug}
                                        </code>
                                    </TableCell>
                                )}
                                {columnVisibility.visibility && (
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
                            )}
                            {columnVisibility.level && (
                                <TableCell className="text-center w-20">
                                    <Badge variant="outline" className="text-xs capitalize">
                                        {course.level || 'N/A'}
                                    </Badge>
                                </TableCell>
                            )}
                            {columnVisibility.language && (
                                <TableCell className="text-center w-20">
                                    <span className="text-sm uppercase">
                                        {course.language || 'EN'}
                                    </span>
                                </TableCell>
                            )}
                            {columnVisibility.category && (
                                <TableCell className="text-center w-24">
                                    <span className="text-sm capitalize">
                                        {course.category || 'Other'}
                                    </span>
                                </TableCell>
                            )}
                            {columnVisibility.price && (
                                <TableCell className="text-center w-20">
                                    <span className="text-sm font-medium">
                                        {formatPrice(course.price_cents || 0, course.currency || 'USD', course.is_free || false)}
                                    </span>
                                </TableCell>
                            )}
                            {columnVisibility.totalLessons && (
                                <TableCell className="text-center w-16">
                                    <span className="text-sm">
                                        {course.total_lessons || 0}
                                    </span>
                                </TableCell>
                            )}
                            {columnVisibility.duration && (
                                <TableCell className="text-center w-20">
                                    <span className="text-sm">
                                        {formatDuration(course.total_duration_minutes)}
                                    </span>
                                </TableCell>
                            )}
                            {columnVisibility.createdAt && (
                                <TableCell className="text-center w-24">
                                    <span className="text-xs text-gray-500">
                                        {formatCompactDate(course.created_at)}
                                    </span>
                                </TableCell>
                            )}
                            {columnVisibility.updatedAt && (
                                <TableCell className="text-center w-24">
                                    <span className="text-xs text-gray-500">
                                        {formatCompactDate(course.updated_at)}
                                    </span>
                                </TableCell>
                            )}
                            {columnVisibility.tags && (
                                <TableCell className="text-center min-w-[150px]">
                                    <div className="flex flex-wrap gap-1 justify-center">
                                        {course.tags.slice(0, 2).map((tag, tagIndex) => (
                                            <Badge key={tagIndex} variant="outline" className="text-xs">
                                                {tag}
                                            </Badge>
                                        ))}
                                        {course.tags.length > 2 && (
                                            <Badge variant="outline" className="text-xs">
                                                +{course.tags.length - 2}
                                            </Badge>
                                        )}
                                    </div>
                                </TableCell>
                            )}
                            {columnVisibility.actions && (
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
                            )}
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
