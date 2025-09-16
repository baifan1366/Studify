'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Search, Filter, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';

interface EmptyStateProps {
  type: 'no-courses' | 'no-results' | 'no-enrolled';
  searchTerm?: string;
  onReset?: () => void;
  onCreateCourse?: () => void;
}

export default function EmptyState({ type, searchTerm, onReset, onCreateCourse }: EmptyStateProps) {
  const t = useTranslations('CoursesContent');

  const getEmptyStateContent = () => {
    switch (type) {
      case 'no-courses':
        return {
          icon: <BookOpen size={64} className="text-black/30 dark:text-white/30" />,
          title: 'No Courses Available',
          description: 'There are no courses available at the moment. Check back later or create your own course.',
          action: onCreateCourse && (
            <Button onClick={onCreateCourse} className="mt-4">
              Create Your First Course
            </Button>
          )
        };
      
      case 'no-results':
        return {
          icon: <Search size={64} className="text-black/30 dark:text-white/30" />,
          title: `No results for "${searchTerm}"`,
          description: 'Try adjusting your search terms or filters to find what you\'re looking for.',
          action: onReset && (
            <Button onClick={onReset} variant="outline" className="mt-4">
              <RefreshCw size={16} className="mr-2" />
              Clear Filters
            </Button>
          )
        };
      
      case 'no-enrolled':
        return {
          icon: <BookOpen size={64} className="text-black/30 dark:text-white/30" />,
          title: 'No Enrolled Courses',
          description: 'You haven\'t enrolled in any courses yet. Browse our course catalog to get started.',
          action: (
            <Button onClick={() => window.location.href = '/courses'} className="mt-4">
              Browse Courses
            </Button>
          )
        };
      
      default:
        return {
          icon: <BookOpen size={64} className="text-black/30 dark:text-white/30" />,
          title: 'No Content',
          description: 'Nothing to show here.',
          action: null
        };
    }
  };

  const content = getEmptyStateContent();

  return (
    <motion.div
      className="flex flex-col items-center justify-center py-16 px-4 text-center"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="mb-6">
        {content.icon}
      </div>
      
      <h3 className="text-xl font-semibold text-black dark:text-white mb-2">
        {content.title}
      </h3>
      
      <p className="text-black/60 dark:text-white/60 max-w-md mb-6">
        {content.description}
      </p>
      
      {content.action}
    </motion.div>
  );
}
