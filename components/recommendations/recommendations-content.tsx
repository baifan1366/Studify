'use client';

import { useTranslations } from 'next-intl';
import { useRecommendations } from '@/hooks/recommendations/use-recommendations';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Star, Clock, Users, TrendingUp, BookOpen, Target } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function RecommendationsContent() {
  const t = useTranslations('Recommendations');
  const { data: recommendations, isLoading, error } = useRecommendations();

  if (isLoading) {
    return <RecommendationsLoading />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {t('error_title')}
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {t('error_message')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          {t('page_title')}
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          {t('page_subtitle')}
        </p>
      </div>

      {/* Top Recommendations */}
      {recommendations?.recommendations && recommendations.recommendations.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-6">
            <Target className="h-5 w-5 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {t('top_recommendations')}
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recommendations.recommendations.slice(0, 6).map((course, index) => (
              <motion.div
                key={course.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <CourseRecommendationCard course={course} />
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* Category Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Continue Learning */}
        {recommendations?.categories.continue_learning && recommendations.categories.continue_learning.length > 0 && (
          <CategorySection
            title={t('continue_learning')}
            icon={<BookOpen className="h-5 w-5 text-green-600" />}
            courses={recommendations.categories.continue_learning}
            type="progress"
          />
        )}

        {/* Similar to Completed */}
        {recommendations?.categories.similar_to_completed && recommendations.categories.similar_to_completed.length > 0 && (
          <CategorySection
            title={t('similar_to_completed')}
            icon={<Star className="h-5 w-5 text-yellow-600" />}
            courses={recommendations.categories.similar_to_completed}
            type="recommendation"
          />
        )}

        {/* Trending */}
        {recommendations?.categories.trending && recommendations.categories.trending.length > 0 && (
          <CategorySection
            title={t('trending')}
            icon={<TrendingUp className="h-5 w-5 text-red-600" />}
            courses={recommendations.categories.trending}
            type="recommendation"
          />
        )}

        {/* For You */}
        {recommendations?.categories.for_you && recommendations.categories.for_you.length > 0 && (
          <CategorySection
            title={t('for_you')}
            icon={<Users className="h-5 w-5 text-purple-600" />}
            courses={recommendations.categories.for_you}
            type="recommendation"
          />
        )}
      </div>
    </div>
  );
}

function CourseRecommendationCard({ course }: { course: any }) {
  const t = useTranslations('Recommendations');
  
  return (
    <Card className="group hover:shadow-lg transition-all duration-200 border-0 shadow-sm">
      <CardContent className="p-0">
        <div className="relative">
          <div className="aspect-video relative overflow-hidden rounded-t-lg">
            <Image
              src={course.thumbnail_url || '/placeholder-course.jpg'}
              alt={course.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-200"
            />
          </div>
          <div className="absolute top-2 right-2">
            <Badge variant="secondary" className="bg-black/70 text-white">
              {course.recommendation_score}% {t('match')}
            </Badge>
          </div>
        </div>
        
        <div className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className="text-xs">
              {course.level}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {course.category}
            </Badge>
          </div>
          
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2">
            {course.title}
          </h3>
          
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
            {course.description}
          </p>
          
          {course.recommendation_reasons && course.recommendation_reasons.length > 0 && (
            <div className="mb-3">
              <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1">
                {t('why_recommended')}:
              </p>
              <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                {course.recommendation_reasons.map((reason: string, index: number) => (
                  <li key={index} className="flex items-start gap-1">
                    <span className="text-blue-600 mt-0.5">•</span>
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {course.profiles?.display_name}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {course.price > 0 ? (
                <span className="font-semibold text-gray-900 dark:text-white">
                  ${course.price}
                </span>
              ) : (
                <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                  {t('free')}
                </Badge>
              )}
            </div>
          </div>
          
          <Link href={`/courses/${course.id}`}>
            <Button className="w-full mt-3" size="sm">
              {t('view_course')}
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

function CategorySection({ 
  title, 
  icon, 
  courses, 
  type 
}: { 
  title: string; 
  icon: React.ReactNode; 
  courses: any[]; 
  type: 'progress' | 'recommendation';
}) {
  const t = useTranslations('Recommendations');
  
  return (
    <Card className="bg-transparent p-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {courses.map((course, index) => (
            <div key={course.id || index} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <div className="w-12 h-12 relative rounded overflow-hidden flex-shrink-0">
                <Image
                  src={course.thumbnail_url || course.course?.thumbnail_url || '/placeholder-course.jpg'}
                  alt={course.title || course.course?.title}
                  fill
                  className="object-cover"
                />
              </div>
              
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-gray-900 dark:text-white truncate">
                  {course.title || course.course?.title}
                </h4>
                <div className="flex items-center gap-2 mt-1">
                  {type === 'progress' && course.progress_pct !== undefined && (
                    <div className="flex items-center gap-1">
                      <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-600 transition-all duration-300"
                          style={{ width: `${course.progress_pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-600 dark:text-gray-400">
                        {course.progress_pct}%
                      </span>
                    </div>
                  )}
                  <Badge variant="outline" className="text-xs">
                    {course.level || course.course?.level}
                  </Badge>
                </div>
              </div>
              
              <Link href={`/courses/${course.id || course.course_id}`}>
                <Button variant="ghost" size="sm">
                  {type === 'progress' ? t('continue') : t('view')}
                </Button>
              </Link>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function RecommendationsLoading() {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <Skeleton className="h-8 w-64 mx-auto mb-2" />
        <Skeleton className="h-4 w-96 mx-auto" />
      </div>
      
      <div>
        <Skeleton className="h-6 w-48 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-0">
                <Skeleton className="aspect-video w-full rounded-t-lg" />
                <div className="p-4 space-y-3">
                  <div className="flex gap-2">
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-5 w-20" />
                  </div>
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-8 w-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
