'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Filter, X, ChevronDown, Search, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useTranslations } from 'next-intl';

interface FilterOptions {
  levels: string[];
  categories: string[];
  instructors: string[];
}

interface CourseFiltersProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  selectedLevel: string;
  setSelectedLevel: (level: string) => void;
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
  priceFilter: string;
  setPriceFilter: (filter: string) => void;
  durationFilter: string;
  setDurationFilter: (filter: string) => void;
  instructorFilter: string;
  setInstructorFilter: (filter: string) => void;
  filterOptions: FilterOptions;
  onReset: () => void;
  resultsCount: number;
  totalCount: number;
}

export default function CourseFiltersEnhanced({
  searchTerm,
  setSearchTerm,
  selectedLevel,
  setSelectedLevel,
  selectedCategory,
  setSelectedCategory,
  priceFilter,
  setPriceFilter,
  durationFilter,
  setDurationFilter,
  instructorFilter,
  setInstructorFilter,
  filterOptions,
  onReset,
  resultsCount,
  totalCount
}: CourseFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const t = useTranslations('CoursesContent');

  const activeFiltersCount = [
    selectedLevel !== 'all',
    selectedCategory !== 'all',
    priceFilter !== 'all',
    durationFilter !== 'all',
    instructorFilter !== 'all',
    searchTerm.length > 0
  ].filter(Boolean).length;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim() && !searchHistory.includes(searchTerm.trim())) {
      setSearchHistory(prev => [searchTerm.trim(), ...prev.slice(0, 4)]);
    }
  };

  const handleSearchHistoryClick = (term: string) => {
    setSearchTerm(term);
  };

  const clearSearch = () => {
    setSearchTerm('');
  };

  const getActiveFilters = () => {
    const filters = [];
    if (selectedLevel !== 'all') filters.push({ key: 'level', value: selectedLevel, clear: () => setSelectedLevel('all') });
    if (selectedCategory !== 'all') filters.push({ key: 'category', value: selectedCategory, clear: () => setSelectedCategory('all') });
    if (priceFilter !== 'all') filters.push({ key: 'price', value: priceFilter, clear: () => setPriceFilter('all') });
    if (durationFilter !== 'all') filters.push({ key: 'duration', value: durationFilter, clear: () => setDurationFilter('all') });
    if (instructorFilter !== 'all') filters.push({ key: 'instructor', value: instructorFilter, clear: () => setInstructorFilter('all') });
    return filters;
  };

  return (
    <div className="bg-white/5 backdrop-blur-md rounded-xl p-6 border border-white/20 mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={20} className="text-black/70 dark:text-white/70" />
            <h3 className="text-lg font-semibold text-black dark:text-white">
              Filters & Search
            </h3>
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {activeFiltersCount}
              </Badge>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {activeFiltersCount > 0 && (
            <Button variant="ghost" size="sm" onClick={onReset}>
              <X size={16} className="mr-1" />
              Clear All
            </Button>
          )}
          <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm">
                <ChevronDown 
                  size={16} 
                  className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                />
                {isExpanded ? 'Less' : 'More'} Filters
              </Button>
            </CollapsibleTrigger>
          </Collapsible>
        </div>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearchSubmit} className="relative mb-4">
        <div className="relative">
          <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-black/50 dark:text-white/50" />
          <Input
            placeholder={t('search_courses')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-white/10 border-white/20 pl-10 pr-10"
          />
          {searchTerm && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearSearch}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
            >
              <X size={14} />
            </Button>
          )}
        </div>
        
        {/* Search History */}
        {searchHistory.length > 0 && searchTerm === '' && (
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="text-xs text-black/60 dark:text-white/60">Recent searches:</span>
            {searchHistory.map((term, index) => (
              <Button
                key={index}
                variant="ghost"
                size="sm"
                onClick={() => handleSearchHistoryClick(term)}
                className="h-6 px-2 text-xs"
              >
                {term}
              </Button>
            ))}
          </div>
        )}
      </form>

      {/* Active Filters */}
      <AnimatePresence>
        {getActiveFilters().length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4"
          >
            <div className="flex flex-wrap gap-2">
              <span className="text-sm text-black/60 dark:text-white/60 self-center">Active filters:</span>
              {getActiveFilters().map((filter, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="flex items-center gap-1 cursor-pointer hover:bg-red-500/20"
                  onClick={filter.clear}
                >
                  {filter.key}: {filter.value}
                  <X size={12} />
                </Badge>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Basic Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
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
      </div>

      {/* Advanced Filters */}
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleContent>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-white/10"
          >
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
          </motion.div>
        </CollapsibleContent>
      </Collapsible>

      {/* Results Count */}
      <div className="mt-4 text-center">
        <p className="text-sm text-black/60 dark:text-white/60">
          Showing <span className="font-semibold text-black dark:text-white">{resultsCount}</span> of{' '}
          <span className="font-semibold text-black dark:text-white">{totalCount}</span> courses
        </p>
      </div>
    </div>
  );
}
