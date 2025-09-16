'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Clock, Users, Star, ShoppingCart, Zap, Heart, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useTranslations } from 'next-intl';

interface CourseCardProps {
  course: {
    id: string;
    title: string;
    instructor: string;
    duration: string;
    students: number;
    rating: number;
    price: string;
    priceCents: number;
    isFree: boolean;
    points: number;
    thumbnailUrl?: string;
    level: string;
    category: string;
    isEnrolled: boolean;
    slug: string;
    color: string;
  };
  index: number;
  onAddToCart: (courseId: string) => void;
  onBuyNow: (courseId: string) => void;
  onGoToCourse: (slug: string) => void;
  isAddingToCart: boolean;
  isBuyingNow: boolean;
}

export default function CourseCardEnhanced({
  course,
  index,
  onAddToCart,
  onBuyNow,
  onGoToCourse,
  isAddingToCart,
  isBuyingNow
}: CourseCardProps) {
  const { toast } = useToast();
  const t = useTranslations('CoursesContent');

  const handleWishlist = () => {
    toast({
      title: "Added to Wishlist",
      description: `${course.title} has been added to your wishlist`,
    });
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: course.title,
          text: `Check out this course: ${course.title}`,
          url: window.location.origin + `/course/${course.slug}`,
        });
      } catch (error) {
        // Fallback to clipboard
        navigator.clipboard.writeText(window.location.origin + `/course/${course.slug}`);
        toast({
          title: "Link Copied",
          description: "Course link copied to clipboard",
        });
      }
    } else {
      navigator.clipboard.writeText(window.location.origin + `/course/${course.slug}`);
      toast({
        title: "Link Copied",
        description: "Course link copied to clipboard",
      });
    }
  };

  return (
    <motion.div
      className="bg-white/5 backdrop-blur-md rounded-2xl overflow-hidden border border-white/20 flex flex-col h-full hover:bg-white/10 transition-all duration-300 group"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.5 }}
      whileHover={{ y: -5 }}
    >
      <div className="relative">
        <div
          className={`w-full h-36 bg-gradient-to-r ${course.color} flex items-center justify-center relative overflow-hidden`}
        >
          {course.thumbnailUrl ? (
            <img
              src={course.thumbnailUrl}
              alt={course.title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <BookOpen size={48} className="text-black/80 dark:text-white/80" />
          )}
          
          {/* Overlay actions */}
          <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <Button
              size="sm"
              variant="secondary"
              className="h-8 w-8 p-0 bg-black/20 hover:bg-black/40 backdrop-blur-sm"
              onClick={handleWishlist}
            >
              <Heart size={14} />
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="h-8 w-8 p-0 bg-black/20 hover:bg-black/40 backdrop-blur-sm"
              onClick={handleShare}
            >
              <Share2 size={14} />
            </Button>
          </div>
        </div>
        
        <div className="absolute top-2 left-2 flex gap-2">
          <Badge variant="secondary" className="bg-black/50 text-white text-xs">
            {course.level?.toUpperCase() || 'ALL LEVELS'}
          </Badge>
          {course.isFree && (
            <Badge variant="secondary" className="bg-green-500 text-white text-xs">
              FREE
            </Badge>
          )}
        </div>
      </div>

      <div className="p-4 flex flex-col flex-grow">
        <div className="mb-2">
          <Badge variant="outline" className="text-xs mb-2">
            {course.category}
          </Badge>
        </div>
        
        <h3 className="text-black dark:text-white font-bold text-lg mb-2 line-clamp-2 min-h-[3.5rem]">
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
            <span>{course.students.toLocaleString()}</span>
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
          <span className="text-xs text-black/50 dark:text-white/50 ml-1">
            ({course.students})
          </span>
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
                onClick={() => onGoToCourse(course.slug)}
                variant="default"
                className="w-full"
              >
                <BookOpen size={16} className="mr-2" />
                {t('go_to_course')}
              </Button>
            ) : (
              <>
                <Button
                  onClick={() => onAddToCart(course.id)}
                  variant="outline"
                  disabled={isAddingToCart}
                  className="flex-1"
                >
                  <ShoppingCart size={16} className="mr-1" />
                  {isAddingToCart ? t('adding_to_cart') : t('add_to_cart')}
                </Button>
                <Button
                  onClick={() => onBuyNow(course.id)}
                  variant="default"
                  disabled={isBuyingNow}
                  className="flex-1"
                >
                  {isBuyingNow ? t('buying_now') : t('buy_now')}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
