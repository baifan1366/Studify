'use client';

import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Clock, Users, Star, Zap, Filter, ChevronDown } from 'lucide-react';
import { useCourses } from '@/hooks/course/use-courses';
import { useEnrolledCoursesByUserId } from '@/hooks/course/use-enrolled-courses';
import { usePurchaseCourse } from '@/hooks/course/use-course-purchase';
import { useUser } from '@/hooks/profile/use-user';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { useTranslations, useLocale } from 'next-intl';
import { formatCurrency } from '@/lib/formatters';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useRouter } from 'next/navigation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function CoursesContent() {
  const { data: user } = useUser();
  const { data: courses, isLoading } = useCourses();
  const userId = user?.profile?.id || 0;
  const { data: enrolledCourses } = useEnrolledCoursesByUserId(userId as number);
  const { toast } = useToast();
  const purchaseCourse = usePurchaseCourse();
  const [isBuyingNow, setIsBuyingNow] = useState(false);
  const t = useTranslations('CoursesContent');
  const locale = useLocale();
  const [currency, setCurrency] = useState('MYR');
  const router = useRouter();

  // Filter states
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [priceFilter, setPriceFilter] = useState('all');
  const [durationFilter, setDurationFilter] = useState('all');
  const [instructorFilter, setInstructorFilter] = useState('all');

  // Categorize courses based on enrollment
  const { enrolledCourseIds, availableCourses, enrolledCoursesData } = useMemo(() => {
    const enrolledIds = new Set((enrolledCourses ?? []).map(ec => ec.course_id));
    const available = (courses ?? []).filter(c => !enrolledIds.has(c.id));
    const enrolled = (courses ?? []).filter(c => enrolledIds.has(c.id));

    return {
      enrolledCourseIds: enrolledIds,
      availableCourses: available,
      enrolledCoursesData: enrolled
    };
  }, [courses, enrolledCourses]);

  const uiCourses = useMemo(() => {
    return (courses ?? []).map((c, idx) => {
      const isEnrolled = enrolledCourseIds.has(c.id);
      return {
        id: c.public_id,
        title: c.title,
        instructor: `Instructor`, // TODO: Fetch actual instructor info from owner_id
        duration: c.total_duration_minutes
          ? `${c.total_duration_minutes} mins`
          : '—',
        durationMinutes: c.total_duration_minutes || 0,
        students: c.total_students ?? 0,
        rating: c.average_rating ?? 0,
        price: c.price_cents ? formatCurrency(c.price_cents / 100, currency) : 'Free',
        priceCents: c.price_cents || 0,
        isFree: !c.price_cents || c.price_cents === 0,
        points: Math.max(100, Math.floor((c.price_cents || 0) / 10)), // Calculate points based on price
        thumbnailUrl: c.thumbnail_url,
        level: c.level || 'beginner',
        category: c.category || 'General',
        isEnrolled,
        slug: c.slug,
        color: [
          'from-blue-500 to-cyan-500',
          'from-purple-500 to-pink-500',
          'from-green-500 to-teal-500',
          'from-orange-500 to-red-500',
          'from-indigo-500 to-purple-500',
          'from-cyan-500 to-blue-500',
        ][idx % 6],
      };
    });
  }, [courses, currency, enrolledCourseIds]);

  const handleBuyNow = async (courseId: string | number) => {
    setIsBuyingNow(true);
    try {
      const result = await purchaseCourse.mutateAsync({
        courseId: String(courseId)
      });
      
      // The purchaseCourse hook now handles all navigation and enrollment
      // No need for manual enrollment creation here as the API handles it
      
    } catch (error) {
      toast({
        title: t('purchase_failed'),
        description: t('error_processing_purchase'),
        variant: 'destructive',
      });
    } finally {
      setIsBuyingNow(false);
    }
  };

  // Filter and search logic
  const filteredCourses = useMemo(() => {
    let filtered = [...uiCourses];

    // Apply main filter
    switch (activeFilter) {
      case 'enrolled':
        filtered = filtered.filter(course => course.isEnrolled);
        break;
      case 'available':
        filtered = filtered.filter(course => !course.isEnrolled);
        break;
      case 'free':
        filtered = filtered.filter(course => course.isFree);
        break;
      case 'paid':
        filtered = filtered.filter(course => !course.isFree);
        break;
      default: // 'all'
        break;
    }

    // Apply search term
    if (searchTerm) {
      filtered = filtered.filter(course =>
        course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course.instructor.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply level filter
    if (selectedLevel !== 'all') {
      filtered = filtered.filter(course => course.level === selectedLevel);
    }

    // Apply category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(course => course.category === selectedCategory);
    }

    // Apply price filter
    if (priceFilter !== 'all') {
      switch (priceFilter) {
        case 'under-50':
          filtered = filtered.filter(course => course.priceCents < 5000);
          break;
        case '50-100':
          filtered = filtered.filter(course => course.priceCents >= 5000 && course.priceCents < 10000);
          break;
        case 'over-100':
          filtered = filtered.filter(course => course.priceCents >= 10000);
          break;
      }
    }

    // Apply duration filter
    if (durationFilter !== 'all') {
      switch (durationFilter) {
        case 'short':
          filtered = filtered.filter(course => course.durationMinutes < 60);
          break;
        case 'medium':
          filtered = filtered.filter(course => course.durationMinutes >= 60 && course.durationMinutes < 180);
          break;
        case 'long':
          filtered = filtered.filter(course => course.durationMinutes >= 180);
          break;
      }
    }

    // Apply instructor filter
    if (instructorFilter !== 'all') {
      filtered = filtered.filter(course => course.instructor === instructorFilter);
    }

    return filtered;
  }, [uiCourses, activeFilter, searchTerm, selectedLevel, selectedCategory, priceFilter, durationFilter, instructorFilter]);

  // Get unique values for filter options
  const filterOptions = useMemo(() => {
    const levels = [...new Set(uiCourses.map(c => c.level).filter(Boolean))];
    const categories = [...new Set(uiCourses.map(c => c.category).filter(Boolean))];
    const instructors = [...new Set(uiCourses.map(c => c.instructor).filter(Boolean))];

    return { levels, categories, instructors };
  }, [uiCourses]);

  const handleGoToCourse = (courseSlug: string) => {
    router.push(`/${locale}/courses/${courseSlug}`);
  };

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedLevel('all');
    setSelectedCategory('all');
    setPriceFilter('all');
    setDurationFilter('all');
    setInstructorFilter('all');
  };

  return (
    <motion.div
      className="space-y-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.6 }}
    >
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-black/90 mb-4 dark:text-white/90">
          {t('explore_courses')}
        </h1>
        <p className="text-lg text-black/70 mb-8 dark:text-white/70">
          {t('find_your_next_learning_adventure_from_our_curated_collection')}
        </p>

        {/* Currency Selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="ml-2">
              {t('change_currency')}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>{t('change_currency')}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setCurrency('MYR')}>{t('MYR')}</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setCurrency('USD')}>{t('USD')}</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setCurrency('EUR')}>{t('EUR')}</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setCurrency('GBP')}>{t('GBP')}</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setCurrency('SGD')}>{t('SGD')}</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setCurrency('PHP')}>{t('PHP')}</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setCurrency('THB')}>{t('THB')}</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setCurrency('IDR')}>{t('IDR')}</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setCurrency('VND')}>{t('VND')}</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setCurrency('CNY')}>{t('CNY')}</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setCurrency('JPY')}>{t('JPY')}</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setCurrency('KRW')}>{t('KRW')}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Filter Tabs */}
      <Tabs value={activeFilter} onValueChange={setActiveFilter} className="mb-6">
        <TabsList className="grid w-full grid-cols-5 bg-white/10 backdrop-blur-sm">
          <TabsTrigger value="all" className="data-[state=active]:bg-white/20">
            {t('all_courses')}
            <Badge variant="secondary" className="ml-2">{uiCourses.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="enrolled" className="data-[state=active]:bg-white/20">
            {t('enrolled')}
            <Badge variant="secondary" className="ml-2">{enrolledCoursesData.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="available" className="data-[state=active]:bg-white/20">
            {t('available')}
            <Badge variant="secondary" className="ml-2">{availableCourses.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="free" className="data-[state=active]:bg-white/20">
            {t('free')}
            <Badge variant="secondary" className="ml-2">{uiCourses.filter(c => c.isFree).length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="paid" className="data-[state=active]:bg-white/20">
            {t('paid')}
            <Badge variant="secondary" className="ml-2">{uiCourses.filter(c => !c.isFree).length}</Badge>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Search and Advanced Filters */}
      <div className="bg-white/5 backdrop-blur-md rounded-xl p-6 border border-white/20 mb-6">
        <div className="flex items-center gap-4 mb-4">
          <Filter size={20} className="text-black/70 dark:text-white/70" />
          <h3 className="text-lg font-semibold text-black dark:text-white">Filters & Search</h3>
          <Button variant="ghost" size="sm" onClick={resetFilters} className="ml-auto">
            {t('reset_all')}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div>
            <label className="text-sm font-medium text-black/70 dark:text-white/70 mb-2 block">
              {t('search_courses')}
            </label>
            <Input
              placeholder={t('search_courses')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-white/10 border-white/20"
            />
          </div>

          {/* Level Filter */}
          <div>
            <label className="text-sm font-medium text-black/70 dark:text-white/70 mb-2 block">
              {t('level')}
            </label>
            <Select value={selectedLevel} onValueChange={setSelectedLevel}>
              <SelectTrigger className="bg-white/10 border-white/20">
                <SelectValue placeholder={t('select_level')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('all_levels')}</SelectItem>
                {filterOptions.levels.map(level => (
                  <SelectItem key={level} value={level}>
                    {level.charAt(0).toUpperCase() + level.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Category Filter */}
          <div>
            <label className="text-sm font-medium text-black/70 dark:text-white/70 mb-2 block">
              {t('category')}
            </label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="bg-white/10 border-white/20">
                <SelectValue placeholder={t('select_category')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('all_categories')}</SelectItem>
                {filterOptions.categories.map(category => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Price Filter */}
          <div>
            <label className="text-sm font-medium text-black/70 dark:text-white/70 mb-2 block">
              {t('price_range')}
            </label>
            <Select value={priceFilter} onValueChange={setPriceFilter}>
              <SelectTrigger className="bg-white/10 border-white/20">
                <SelectValue placeholder={t('select_price_range')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('all_prices')}</SelectItem>
                <SelectItem value="under-50">{t('under_50')}</SelectItem>
                <SelectItem value="50-100">{t('50_100')}</SelectItem>
                <SelectItem value="over-100">{t('over_100')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Duration Filter */}
          <div>
            <label className="text-sm font-medium text-black/70 dark:text-white/70 mb-2 block">
              {t('duration')}
            </label>
            <Select value={durationFilter} onValueChange={setDurationFilter}>
              <SelectTrigger className="bg-white/10 border-white/20">
                <SelectValue placeholder={t('select_duration')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('all_durations')}</SelectItem>
                <SelectItem value="short">{t('short_2_hours')}</SelectItem>
                <SelectItem value="medium">{t('medium_2_3_hours')}</SelectItem>
                <SelectItem value="long">{t('long_3_hours')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Instructor Filter */}
          <div>
            <label className="text-sm font-medium text-black/70 dark:text-white/70 mb-2 block">
              {t('instructor')}
            </label>
            <Select value={instructorFilter} onValueChange={setInstructorFilter}>
              <SelectTrigger className="bg-white/10 border-white/20">
                <SelectValue placeholder={t('select_instructor')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('all_instructors')}</SelectItem>
                {filterOptions.instructors.map(instructor => (
                  <SelectItem key={instructor} value={instructor}>
                    {instructor}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Results Count */}
        <div className="mt-4 text-center">
          <p className="text-sm text-black/60 dark:text-white/60">
            {t('showing_courses', { count: filteredCourses.length, total: uiCourses.length })}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {isLoading
          ? [...Array(8)].map((_, index) => (
              <div
                key={index}
                className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20"
              >
                <Skeleton className="w-full h-32 rounded-lg mb-4" />
                <Skeleton className="h-5 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2 mb-4" />
                <div className="flex justify-between items-center mb-4">
                  <Skeleton className="h-4 w-1/4" />
                  <Skeleton className="h-4 w-1/4" />
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-9 flex-1" />
                  <Skeleton className="h-9 flex-1" />
                </div>
              </div>
            ))
          : filteredCourses.map((course, index) => (
              <motion.div
                key={String(course.id)}
                className="bg-white/5 backdrop-blur-md rounded-2xl overflow-hidden border border-white/20 flex flex-col h-full hover:bg-white/10 transition-all duration-300"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05, duration: 0.5 }}
                whileHover={{ y: -5 }}
              >
                <div className="relative">
                  <div
                    className={`w-full h-36 bg-gradient-to-r ${course.color} flex items-center justify-center`}
                  >
                    {course.thumbnailUrl ? (
                      <img
                        src={course.thumbnailUrl}
                        alt={course.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <BookOpen size={48} className="text-black/80 dark:text-white/80" />
                    )}
                  </div>
                  <div className="absolute top-2 right-2 bg-black/50 dark:bg-white/50 text-black dark:text-white px-2 py-1 rounded-md text-xs font-bold">
                    {course.level?.toUpperCase() || 'ALL LEVELS'}
                  </div>
                </div>

                <div className="p-4 flex flex-col flex-grow">
                  <h3 className="text-black dark:text-white font-bold text-lg mb-2 truncate">
                    {course.title}
                  </h3>
                  <p className="text-black/60 dark:text-white/60 text-sm mb-3">
                    {course.instructor}
                  </p>

                  <div className="flex items-center gap-4 text-sm text-black/80 dark:text-white/80 mb-3">
                    <div className="flex items-center gap-1.5">
                      <Clock size={14} />
                      <span>{course.duration}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Users size={14} />
                      <span>{course.students}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-yellow-400 font-bold text-sm">
                      {course.rating.toFixed(1)}
                    </span>
                    <div className="flex items-center">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          size={14}
                          className={
                            i < Math.round(course.rating)
                              ? 'text-yellow-400 fill-current'
                              : 'text-black/30 dark:text-white/30'
                          }
                        />
                      ))}
                    </div>
                  </div>

                  <div className="mt-auto pt-4 border-t border-black/10 dark:border-white/10">
                    <div className="flex justify-between items-center mb-4">
                      <p className="text-xl font-bold text-black dark:text-white">
                        {course.price}
                      </p>
                      <div className="flex items-center gap-1 text-yellow-400">
                        <Zap size={16} />
                        <span className="font-semibold">
                          {course.points} pts
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {course.isEnrolled ? (
                        <Button
                          onClick={() => handleGoToCourse(course.slug)}
                          variant="default"
                          className="w-full"
                        >
                          <BookOpen size={16} className="mr-2" />
                          {t('go_to_course')}
                        </Button>
                      ) : (
                        <>
                          <Button
                            onClick={() => handleGoToCourse(course.slug)}
                            variant="outline"
                            className="flex-1"
                          >
                            {t('view_details')}
                          </Button>
                          <Button
                            onClick={() => handleBuyNow(course.id)}
                            variant="default"
                            className="flex-1"
                            disabled={isBuyingNow}
                          >
                            {isBuyingNow ? t('buying_now') : t('buy_now')}
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
      </div>
    </motion.div>
  );
}