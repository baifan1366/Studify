'use client';

import { useCourses, useDeleteCourse } from "@/hooks/course/use-courses";
import { useUpdateCourseStatus } from "@/hooks/course/use-course-status";
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
import { Course } from "@/interface";
import { Eye, Edit, Trash2, Settings2, ChevronDown, Send, ArrowDown } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuCheckboxItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useFormat } from "@/hooks/use-format";
import CreateCourse from '@/components/tutor/course-content/create-course';
import EditCourse from '@/components/tutor/course-content/edit-course';
import { useUser } from "@/hooks/profile/use-user";
import Link from "next/link";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel,
    AlertDialogContent, AlertDialogDescription,
    AlertDialogFooter, AlertDialogHeader,
    AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";

interface ColumnVisibility {
    no: boolean;
    title: boolean;
    description: boolean;
    slug: boolean;
    visibility: boolean;
    status: boolean;
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

export default function CourseTable() {
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
        status: true,
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
    
    const { data: user } = useUser();
    const owner_id = user?.profile?.id ? parseInt(user.profile.id) : undefined;
    const { data: courses, isLoading, error } = useCourses(owner_id);
    const deleteCourse = useDeleteCourse();
    const updateCourseStatus = useUpdateCourseStatus();

    // 🔹 State for alert dialog
    const [open, setOpen] = useState(false);
    const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
    const [confirmInput, setConfirmInput] = useState("");

    // 🔹 State for edit dialog
    const [editOpen, setEditOpen] = useState(false);
    const [editCourse, setEditCourse] = useState<Course | null>(null);

    const handleDelete = async (course: Course) => {
        try {
            await deleteCourse.mutateAsync(course);
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

    const handleOpenDeleteDialog = (course: Course) => {
        setSelectedCourse(course);
        setConfirmInput("");
        setOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!selectedCourse) return;
        if (confirmInput.trim() !== selectedCourse.title) {
            toast({
                title: t("error"),
                description: t("titleMismatch"), // Add this key in translations
                variant: "destructive",
            });
            return;
        }
        await handleDelete(selectedCourse);
        setOpen(false);
    };

    const handleEdit = (course: Course) => {
        setEditCourse(course);
        setEditOpen(true);
    };


    const handleSubmitForApproval = async (course: Course) => {
        try {
            await updateCourseStatus.mutateAsync({
                courseId: course.id,
                status: 'pending'
            });
        } catch (error) {
            // Error handling is done in the hook
        }
    };

    const getStatusBadgeVariant = (status: string) => {
        switch (status) {
            case 'active':
                return 'default';
            case 'pending':
                return 'secondary';
            case 'ban':
                return 'destructive';
            default:
                return 'outline';
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active':
                return 'text-green-600 dark:text-green-400';
            case 'pending':
                return 'text-yellow-600 dark:text-yellow-400';
            case 'ban':
                return 'text-white';
            default:
                return 'text-gray-600 dark:text-gray-400';
        }
    };

    const isEditDeleteDisabled = (course: Course) => {
        return course.status === 'active' || course.status === 'inactive' || course.status === 'ban';
    };

    const handleChangeToInactive = async (course: Course) => {
        try {
            await updateCourseStatus.mutateAsync({
                courseId: course.id,
                status: 'inactive'
            });
        } catch (error) {
            // Error handling is done in the hook
        }
    };

    if (isLoading) {
        return (
            <div className="w-full">
                <div className="w-full overflow-x-auto rounded-lg border">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 bg-transparent">
                        <h3 className="text-lg font-semibold">{t('courseManagement')}</h3>
                    </div>
                    <Table className="w-full min-w-full">
                        <TableHeader>
                            <TableRow>
                                {columnVisibility.no && <TableHead className="w-12 sm:w-16 text-center">{t('no')}</TableHead>}
                                {columnVisibility.title && <TableHead className="min-w-[180px] sm:min-w-[220px] lg:min-w-[280px] text-left">{t('title')}</TableHead>}
                                {columnVisibility.description && <TableHead className="min-w-[200px] sm:min-w-[250px] lg:min-w-[300px] text-left hidden lg:table-cell">{t('description')}</TableHead>}
                                {columnVisibility.slug && <TableHead className="min-w-[120px] sm:min-w-[150px] text-center hidden md:table-cell">{t('slug')}</TableHead>}
                                {columnVisibility.visibility && <TableHead className="w-20 sm:w-24 lg:w-28 text-center">{t('visibility')}</TableHead>}
                                {columnVisibility.status && <TableHead className="w-20 sm:w-24 lg:w-28 text-center">{t('status')}</TableHead>}
                                {columnVisibility.level && <TableHead className="w-16 sm:w-20 text-center hidden sm:table-cell">{t('level')}</TableHead>}
                                {columnVisibility.language && <TableHead className="w-16 sm:w-20 text-center hidden md:table-cell">{t('language')}</TableHead>}
                                {columnVisibility.category && <TableHead className="w-20 sm:w-24 text-center hidden lg:table-cell">{t('category')}</TableHead>}
                                {columnVisibility.price && <TableHead className="w-16 sm:w-20 lg:w-24 text-center">{t('price')}</TableHead>}
                                {columnVisibility.totalLessons && <TableHead className="w-14 sm:w-16 text-center hidden sm:table-cell">{t('totalLessons')}</TableHead>}
                                {columnVisibility.duration && <TableHead className="w-16 sm:w-20 text-center hidden md:table-cell">{t('duration')}</TableHead>}
                                {columnVisibility.createdAt && <TableHead className="w-20 sm:w-24 text-center hidden lg:table-cell">{t('createdAt')}</TableHead>}
                                {columnVisibility.updatedAt && <TableHead className="w-20 sm:w-24 text-center hidden xl:table-cell">{t('updatedAt')}</TableHead>}
                                {columnVisibility.tags && <TableHead className="min-w-[120px] sm:min-w-[150px] lg:min-w-[180px] text-center">{t('tags')}</TableHead>}
                                {columnVisibility.actions && <TableHead className="w-24 sm:w-28 lg:w-32 text-center">{t('actions')}</TableHead>}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {Array.from({ length: 5 }).map((_, index) => (
                                <TableRow key={index}>
                                    {columnVisibility.no && <TableCell className="w-12 sm:w-16 text-center"><Skeleton className="h-4 w-6 mx-auto" /></TableCell>}
                                    {columnVisibility.title && <TableCell className="min-w-[180px] sm:min-w-[220px] lg:min-w-[280px] text-left"><div className="space-y-2"><Skeleton className="h-4 w-full max-w-48" /><Skeleton className="h-3 w-3/4 max-w-32" /></div></TableCell>}
                                    {columnVisibility.description && <TableCell className="min-w-[200px] sm:min-w-[250px] lg:min-w-[300px] text-left hidden lg:table-cell"><Skeleton className="h-4 w-full max-w-32" /></TableCell>}
                                    {columnVisibility.slug && <TableCell className="min-w-[120px] sm:min-w-[150px] text-center hidden md:table-cell"><Skeleton className="h-4 w-20 mx-auto" /></TableCell>}
                                    {columnVisibility.visibility && <TableCell className="w-20 sm:w-24 lg:w-28 text-center"><Skeleton className="h-6 w-16 rounded-full mx-auto" /></TableCell>}
                                    {columnVisibility.status && <TableCell className="w-20 sm:w-24 lg:w-28 text-center"><Skeleton className="h-6 w-16 rounded-full mx-auto" /></TableCell>}
                                    {columnVisibility.level && <TableCell className="w-16 sm:w-20 text-center hidden sm:table-cell"><Skeleton className="h-4 w-12 mx-auto" /></TableCell>}
                                    {columnVisibility.language && <TableCell className="w-16 sm:w-20 text-center hidden md:table-cell"><Skeleton className="h-4 w-8 mx-auto" /></TableCell>}
                                    {columnVisibility.category && <TableCell className="w-20 sm:w-24 text-center hidden lg:table-cell"><Skeleton className="h-4 w-16 mx-auto" /></TableCell>}
                                    {columnVisibility.price && <TableCell className="w-16 sm:w-20 lg:w-24 text-center"><Skeleton className="h-4 w-12 mx-auto" /></TableCell>}
                                    {columnVisibility.totalLessons && <TableCell className="w-14 sm:w-16 text-center hidden sm:table-cell"><Skeleton className="h-4 w-6 mx-auto" /></TableCell>}
                                    {columnVisibility.duration && <TableCell className="w-16 sm:w-20 text-center hidden md:table-cell"><Skeleton className="h-4 w-10 mx-auto" /></TableCell>}
                                    {columnVisibility.createdAt && <TableCell className="w-20 sm:w-24 text-center hidden lg:table-cell"><Skeleton className="h-4 w-14 mx-auto" /></TableCell>}
                                    {columnVisibility.updatedAt && <TableCell className="w-20 sm:w-24 text-center hidden xl:table-cell"><Skeleton className="h-4 w-14 mx-auto" /></TableCell>}
                                    {columnVisibility.tags && <TableCell className="min-w-[120px] sm:min-w-[150px] lg:min-w-[180px] text-center"><div className="flex gap-1 justify-center"><Skeleton className="h-5 w-12 rounded-full" /><Skeleton className="h-5 w-16 rounded-full" /></div></TableCell>}
                                    {columnVisibility.actions && <TableCell className="w-24 sm:w-28 lg:w-32 text-center"><div className="flex justify-center gap-1 sm:gap-2"><Skeleton className="h-8 w-8" /><Skeleton className="h-8 w-8" /><Skeleton className="h-8 w-8" /></div></TableCell>}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
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
            <div className="w-full overflow-x-auto rounded-lg border">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 bg-transparent">
                    <h3 className="text-lg font-semibold">{t('courseManagement')}</h3>
                    <div className="flex justify-between gap-2 items-center w-auto">
                        <CreateCourse />
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="default" size="sm">
                                    <Settings2 className="h-4 w-4 mr-2" />
                                    {t('columns')}
                                    <ChevronDown className="h-4 w-4 ml-2" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuCheckboxItem
                                    checked={columnVisibility.no}
                                    onCheckedChange={() => toggleColumn('no')}
                                >
                                    {t('no')}
                                </DropdownMenuCheckboxItem>
                                <DropdownMenuCheckboxItem
                                    checked={columnVisibility.title}
                                    onCheckedChange={() => toggleColumn('title')}
                                    disabled={true}
                                >
                                    {t('title')} ({t('required')})
                                </DropdownMenuCheckboxItem>
                                <DropdownMenuCheckboxItem
                                    checked={columnVisibility.description}
                                    onCheckedChange={() => toggleColumn('description')}
                                >
                                    {t('description')}
                                </DropdownMenuCheckboxItem>
                                <DropdownMenuCheckboxItem
                                    checked={columnVisibility.slug}
                                    onCheckedChange={() => toggleColumn('slug')}
                                >
                                    {t('slug')}
                                </DropdownMenuCheckboxItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuCheckboxItem
                                    checked={columnVisibility.visibility}
                                    onCheckedChange={() => toggleColumn('visibility')}
                                    disabled={true}
                                >
                                    {t('visibility')} ({t('required')})
                                </DropdownMenuCheckboxItem>
                                <DropdownMenuCheckboxItem
                                    checked={columnVisibility.status}
                                    onCheckedChange={() => toggleColumn('status')}
                                    disabled={true}
                                >
                                    {t('status')} ({t('required')})
                                </DropdownMenuCheckboxItem>
                                <DropdownMenuCheckboxItem
                                    checked={columnVisibility.level}
                                    onCheckedChange={() => toggleColumn('level')}
                                >
                                    {t('level')}
                                </DropdownMenuCheckboxItem>
                                <DropdownMenuCheckboxItem
                                    checked={columnVisibility.language}
                                    onCheckedChange={() => toggleColumn('language')}
                                >
                                    {t('language')}
                                </DropdownMenuCheckboxItem>
                                <DropdownMenuCheckboxItem
                                    checked={columnVisibility.category}
                                    onCheckedChange={() => toggleColumn('category')}
                                >
                                    {t('category')}
                                </DropdownMenuCheckboxItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuCheckboxItem
                                    checked={columnVisibility.price}
                                    onCheckedChange={() => toggleColumn('price')}
                                >
                                    {t('price')}
                                </DropdownMenuCheckboxItem>
                                <DropdownMenuCheckboxItem
                                    checked={columnVisibility.totalLessons}
                                    onCheckedChange={() => toggleColumn('totalLessons')}
                                >
                                    {t('totalLessons')}
                                </DropdownMenuCheckboxItem>
                                <DropdownMenuCheckboxItem
                                    checked={columnVisibility.duration}
                                    onCheckedChange={() => toggleColumn('duration')}
                                >
                                    {t('duration')}
                                </DropdownMenuCheckboxItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuCheckboxItem
                                    checked={columnVisibility.createdAt}
                                    onCheckedChange={() => toggleColumn('createdAt')}
                                >
                                    {t('createdAt')}
                                </DropdownMenuCheckboxItem>
                                <DropdownMenuCheckboxItem
                                    checked={columnVisibility.updatedAt}
                                    onCheckedChange={() => toggleColumn('updatedAt')}
                                >
                                    {t('updatedAt')}
                                </DropdownMenuCheckboxItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuCheckboxItem
                                    checked={columnVisibility.tags}
                                    onCheckedChange={() => toggleColumn('tags')}
                                >
                                    {t('tags')}
                                </DropdownMenuCheckboxItem>
                                <DropdownMenuCheckboxItem
                                    checked={columnVisibility.actions}
                                    onCheckedChange={() => toggleColumn('actions')}
                                    disabled={true}
                                >
                                    {t('actions')} ({t('required')})
                                </DropdownMenuCheckboxItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
                <Table className="w-full min-w-full">
                    <TableHeader>
                        <TableRow>
                            {columnVisibility.no && <TableHead className="w-12 sm:w-16 text-center">{t('no')}</TableHead>}
                            {columnVisibility.title && <TableHead className="min-w-[180px] sm:min-w-[220px] lg:min-w-[280px] text-left">{t('title')}</TableHead>}
                            {columnVisibility.description && <TableHead className="min-w-[200px] sm:min-w-[250px] lg:min-w-[300px] text-left hidden lg:table-cell">{t('description')}</TableHead>}
                            {columnVisibility.slug && <TableHead className="min-w-[120px] sm:min-w-[150px] text-center hidden md:table-cell">{t('slug')}</TableHead>}
                            {columnVisibility.visibility && <TableHead className="w-20 sm:w-24 lg:w-28 text-center">{t('visibility')}</TableHead>}
                            {columnVisibility.status && <TableHead className="w-20 sm:w-24 lg:w-28 text-center">{t('status')}</TableHead>}
                            {columnVisibility.level && <TableHead className="w-16 sm:w-20 text-center hidden sm:table-cell">{t('level')}</TableHead>}
                            {columnVisibility.language && <TableHead className="w-16 sm:w-20 text-center hidden md:table-cell">{t('language')}</TableHead>}
                            {columnVisibility.category && <TableHead className="w-20 sm:w-24 text-center hidden lg:table-cell">{t('category')}</TableHead>}
                            {columnVisibility.price && <TableHead className="w-16 sm:w-20 lg:w-24 text-center">{t('price')}</TableHead>}
                            {columnVisibility.totalLessons && <TableHead className="w-14 sm:w-16 text-center hidden sm:table-cell">{t('totalLessons')}</TableHead>}
                            {columnVisibility.duration && <TableHead className="w-16 sm:w-20 text-center hidden md:table-cell">{t('duration')}</TableHead>}
                            {columnVisibility.createdAt && <TableHead className="w-20 sm:w-24 text-center hidden lg:table-cell">{t('createdAt')}</TableHead>}
                            {columnVisibility.updatedAt && <TableHead className="w-20 sm:w-24 text-center hidden xl:table-cell">{t('updatedAt')}</TableHead>}
                            {columnVisibility.tags && <TableHead className="min-w-[120px] sm:min-w-[150px] lg:min-w-[180px] text-center">{t('tags')}</TableHead>}
                            {columnVisibility.actions && <TableHead className="w-24 sm:w-28 lg:w-32 text-center">{t('actions')}</TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {currentCourses.map((course, index) => (
                            <TableRow key={course.id}>
                                {columnVisibility.no && (
                                    <TableCell className="w-12 sm:w-16 text-center">
                                        {startIndex + index + 1}
                                    </TableCell>
                                )}
                                {columnVisibility.title && (
                                    <TableCell className="min-w-[180px] sm:min-w-[220px] lg:min-w-[280px] text-left">
                                        <div className="space-y-1">
                                            <div className="font-medium text-sm sm:text-base truncate pr-2">
                                                <Link 
                                                    href={{
                                                        pathname: `/tutor/teaching/course-content/${course.slug}`,
                                                        query: { id: course.id },
                                                    }}
                                                    key={course.slug}
                                                >
                                                    {course.title}
                                                </Link>
                                            </div>
                                            {course.description && !columnVisibility.description && (
                                                <div className="text-xs sm:text-sm text-gray-500 truncate lg:hidden pr-2">
                                                    {course.description}
                                                </div>
                                            )}
                                        </div>
                                    </TableCell>
                                )}
                                {columnVisibility.description && (
                                    <TableCell className="min-w-[200px] sm:min-w-[250px] lg:min-w-[300px] text-left hidden lg:table-cell">
                                        <div className="text-sm text-gray-600 truncate pr-2">
                                            {course.description || 'No description'}
                                        </div>
                                    </TableCell>
                                )}
                                {columnVisibility.slug && (
                                    <TableCell className="min-w-[120px] sm:min-w-[150px] text-center hidden md:table-cell">
                                        <code className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-2 py-1 rounded break-all">
                                            {course.slug}
                                        </code>
                                    </TableCell>
                                )}
                                {columnVisibility.visibility && (
                                    <TableCell className="w-20 sm:w-24 lg:w-28 text-center">
                                        <Badge 
                                            variant={
                                                course.visibility === 'public' ? 'default' : 
                                                course.visibility === 'private' ? 'secondary' : 
                                                'outline'
                                            }
                                            className="text-xs whitespace-nowrap"
                                        >
                                            {course.visibility}
                                        </Badge>
                                    </TableCell>
                                )}
                                {columnVisibility.status && (
                                    <TableCell className="w-20 sm:w-24 lg:w-28 text-center">
                                        <Badge 
                                            variant={getStatusBadgeVariant(course.status || 'inactive')}
                                            className={`text-xs whitespace-nowrap ${getStatusColor(course.status || 'inactive')}`}
                                        >
                                            {course.status || 'inactive'}
                                        </Badge>
                                    </TableCell>
                                )}
                                {columnVisibility.level && (
                                    <TableCell className="w-16 sm:w-20 text-center hidden sm:table-cell">
                                        <Badge variant="outline" className="text-xs capitalize whitespace-nowrap">
                                            {course.level || 'N/A'}
                                        </Badge>
                                    </TableCell>
                                )}
                                {columnVisibility.language && (
                                    <TableCell className="w-16 sm:w-20 text-center hidden md:table-cell">
                                        <span className="text-xs sm:text-sm uppercase font-medium">
                                            {course.language || 'EN'}
                                        </span>
                                    </TableCell>
                                )}
                                {columnVisibility.category && (
                                    <TableCell className="w-20 sm:w-24 text-center hidden lg:table-cell">
                                        <span className="text-xs sm:text-sm capitalize">
                                            {course.category || 'Other'}
                                        </span>
                                    </TableCell>
                                )}
                                {columnVisibility.price && (
                                    <TableCell className="w-16 sm:w-20 lg:w-24 text-center">
                                        <span className="text-xs sm:text-sm font-medium whitespace-nowrap">
                                            {formatPrice(course.price_cents || 0, course.currency || 'USD', course.is_free || false)}
                                        </span>
                                    </TableCell>
                                )}
                                {columnVisibility.totalLessons && (
                                    <TableCell className="w-14 sm:w-16 text-center hidden sm:table-cell">
                                        <span className="text-xs sm:text-sm">
                                            {course.total_lessons || 0}
                                        </span>
                                    </TableCell>
                                )}
                                {columnVisibility.duration && (
                                    <TableCell className="w-16 sm:w-20 text-center hidden md:table-cell">
                                        <span className="text-xs sm:text-sm whitespace-nowrap">
                                            {formatDuration(course.total_duration_minutes)}
                                        </span>
                                    </TableCell>
                                )}
                                {columnVisibility.createdAt && (
                                    <TableCell className="w-20 sm:w-24 text-center hidden lg:table-cell">
                                        <span className="text-xs text-gray-500 whitespace-nowrap">
                                            {formatCompactDate(course.created_at)}
                                        </span>
                                    </TableCell>
                                )}
                                {columnVisibility.updatedAt && (
                                    <TableCell className="w-20 sm:w-24 text-center hidden xl:table-cell">
                                        <span className="text-xs text-gray-500 whitespace-nowrap">
                                            {formatCompactDate(course.updated_at)}
                                        </span>
                                    </TableCell>
                                )}
                                {columnVisibility.tags && (
                                    <TableCell className="min-w-[120px] sm:min-w-[150px] lg:min-w-[180px] text-center">
                                        <div className="flex flex-wrap gap-1 justify-center">
                                            {course.tags.slice(0, 2).map((tag, tagIndex) => (
                                                <Badge key={tagIndex} variant="outline" className="text-xs whitespace-nowrap">
                                                    {tag}
                                                </Badge>
                                            ))}
                                            {course.tags.length > 2 && (
                                                <Badge variant="outline" className="text-xs whitespace-nowrap">
                                                    +{course.tags.length - 2}
                                                </Badge>
                                            )}
                                        </div>
                                    </TableCell>
                                )}
                                {columnVisibility.actions && (
                                    <TableCell className="w-24 sm:w-28 lg:w-32 text-center">
                                        <div className="flex justify-center gap-1 sm:gap-2">
                                            {course.status === 'inactive' && (
                                                <Button
                                                    variant="default"
                                                    size="sm"
                                                    onClick={() => handleSubmitForApproval(course)}
                                                    title={t('submitForApproval')}
                                                    disabled={updateCourseStatus.isPending}
                                                    className="h-8 w-8 p-0"
                                                >
                                                    <Send className="h-3 w-3 sm:h-4 sm:w-4" />
                                                </Button>
                                            )}
                                            {course.status === 'active' && (
                                                <Button
                                                    variant="default"
                                                    size="sm"
                                                    onClick={() => handleChangeToInactive(course)}
                                                    title={t('changeToInactive')}
                                                    disabled={updateCourseStatus.isPending}
                                                    className="h-8 w-8 p-0"
                                                >
                                                    <ArrowDown className="h-3 w-3 sm:h-4 sm:w-4" />
                                                </Button>
                                            )}
                                            {course.status === 'inactive' && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleEdit(course)}
                                                    title={t('edit')}
                                                    className="h-8 w-8 p-0"
                                                >
                                                    <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                                                </Button>
                                            )}
                                            {course.status === 'inactive' && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleOpenDeleteDialog(course)}
                                                    title={t('delete')}
                                                    disabled={deleteCourse.isPending}
                                                    className="h-8 w-8 p-0"
                                                >
                                                    <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                                                </Button>
                                            )}
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
            {/* 🔹 AlertDialog for delete confirmation */}
            <AlertDialog open={open} onOpenChange={setOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t("confirmDelete")}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t("deleteWarning")} <b>{selectedCourse?.title}</b>.
                            <br />
                            {t("typeToConfirm")}:
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <Input
                        value={confirmInput}
                        onChange={(e) => setConfirmInput(e.target.value)}
                        placeholder={selectedCourse?.title || ""}
                        className="mt-2"
                    />
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleConfirmDelete}
                            disabled={deleteCourse.isPending || confirmInput.trim() !== selectedCourse?.title}
                        >
                            {deleteCourse.isPending ? t("deleting") : t("confirm")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            
            {/* 🔹 EditCourse Dialog */}
            {editCourse && (
                <EditCourse 
                    course={editCourse}
                    isOpen={editOpen}
                    onOpenChange={setEditOpen}
                />
            )}
        </div>
    );
}
