"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Star, 
  Users, 
  Clock, 
  Play, 
  BookOpen, 
  Award,
  ShoppingCart,
  Eye,
  CheckCircle
} from 'lucide-react';

export interface Course {
  id: string;
  title: string;
  instructor: {
    name: string;
    avatar: string;
  };
  coverImage: string;
  rating: number;
  studentCount: number;
  price: number;
  isFree: boolean;
  tags: string[];
  duration: string;
  progress?: number;
  isEnrolled?: boolean;
  syllabus?: string[];
  category: 'exam-prep' | 'tutoring' | 'interest-exploration';
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
}

interface CourseCardProps {
  course: Course;
  onEnroll?: (courseId: string) => void;
  onPreview?: (courseId: string) => void;
  onContinue?: (courseId: string) => void;
  showProgress?: boolean;
}

export default function CourseCard({ 
  course, 
  onEnroll, 
  onPreview, 
  onContinue,
  showProgress = false 
}: CourseCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'exam-prep': return '🎯';
      case 'tutoring': return '📚';
      case 'interest-exploration': return '🌱';
      default: return '📖';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'exam-prep': return 'bg-red-500/20 text-red-300';
      case 'tutoring': return 'bg-blue-500/20 text-blue-300';
      case 'interest-exploration': return 'bg-green-500/20 text-green-300';
      default: return 'bg-gray-500/20 text-gray-300';
    }
  };

  const handleAction = () => {
    if (course.isEnrolled && course.progress !== undefined) {
      onContinue?.(course.id);
    } else if (course.isEnrolled) {
      onContinue?.(course.id);
    } else {
      onEnroll?.(course.id);
    }
  };

  return (
    <motion.div
      className="relative bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 overflow-hidden group"
      whileHover={{ scale: 1.02, y: -5 }}
      transition={{ duration: 0.2 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Cover Image */}
      <div className="relative h-48 overflow-hidden">
        <img 
          src={course.coverImage} 
          alt={course.title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
        />
        
        {/* Category Badge */}
        <div className={`absolute top-3 left-3 px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(course.category)}`}>
          {getCategoryIcon(course.category)} {course.category.replace('-', ' ').toUpperCase()}
        </div>

        {/* Price Badge */}
        <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-sm px-2 py-1 rounded-full">
          <span className="text-white text-sm font-bold">
            {course.isFree ? 'FREE' : `$${course.price}`}
          </span>
        </div>

        {/* Play Button Overlay */}
        <AnimatePresence>
          {isHovered && (
            <motion.div
              className="absolute inset-0 bg-black/40 flex items-center justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.button
                className="bg-white/20 backdrop-blur-sm p-4 rounded-full text-white hover:bg-white/30 transition-colors"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onPreview?.(course.id)}
              >
                <Play size={24} fill="currentColor" />
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Tags */}
        <div className="flex flex-wrap gap-1 mb-2">
          {course.tags.slice(0, 3).map((tag, index) => (
            <span 
              key={index}
              className="px-2 py-1 bg-white/10 text-white/70 text-xs rounded-full"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Title */}
        <h3 className="text-lg font-semibold text-white mb-2 line-clamp-2">
          {course.title}
        </h3>

        {/* Instructor */}
        <div className="flex items-center gap-2 mb-3">
          <img 
            src={course.instructor.avatar} 
            alt={course.instructor.name}
            className="w-6 h-6 rounded-full"
          />
          <span className="text-white/70 text-sm">{course.instructor.name}</span>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 mb-3 text-sm text-white/70">
          <div className="flex items-center gap-1">
            <Star size={14} className="text-yellow-400" fill="currentColor" />
            <span>{course.rating}</span>
          </div>
          <div className="flex items-center gap-1">
            <Users size={14} />
            <span>{course.studentCount.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock size={14} />
            <span>{course.duration}</span>
          </div>
        </div>

        {/* Progress Bar (if enrolled) */}
        {showProgress && course.progress !== undefined && (
          <div className="mb-3">
            <div className="flex justify-between text-sm text-white/70 mb-1">
              <span>Progress</span>
              <span>{course.progress}%</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-2">
              <motion.div 
                className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${course.progress}%` }}
                transition={{ duration: 1, delay: 0.5 }}
              />
            </div>
          </div>
        )}

        {/* Action Button */}
        <motion.button
          className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
            course.isEnrolled 
              ? 'bg-green-600 hover:bg-green-700 text-white' 
              : course.isFree 
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-orange-600 hover:bg-orange-700 text-white'
          }`}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleAction}
        >
          <div className="flex items-center justify-center gap-2">
            {course.isEnrolled ? (
              <>
                <CheckCircle size={16} />
                {course.progress !== undefined && course.progress > 0 ? 'Continue Learning' : 'Start Learning'}
              </>
            ) : course.isFree ? (
              <>
                <BookOpen size={16} />
                Enroll Free
              </>
            ) : (
              <>
                <ShoppingCart size={16} />
                Add to Cart
              </>
            )}
          </div>
        </motion.button>

        {/* Preview Button */}
        <motion.button
          className="w-full mt-2 py-2 px-4 rounded-lg font-medium bg-white/10 hover:bg-white/20 text-white transition-colors"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onPreview?.(course.id)}
        >
          <div className="flex items-center justify-center gap-2">
            <Eye size={16} />
            Preview Course
          </div>
        </motion.button>
      </div>

      {/* Syllabus Preview Overlay */}
      <AnimatePresence>
        {isHovered && course.syllabus && (
          <motion.div
            className="absolute inset-0 bg-black/90 backdrop-blur-sm p-4 flex flex-col"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.2 }}
          >
            <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
              <BookOpen size={16} />
              Course Syllabus
            </h4>
            <div className="flex-1 overflow-y-auto">
              {course.syllabus.slice(0, 6).map((item, index) => (
                <div key={index} className="flex items-center gap-2 text-white/80 text-sm mb-2">
                  <div className="w-1.5 h-1.5 bg-blue-400 rounded-full flex-shrink-0" />
                  {item}
                </div>
              ))}
              {course.syllabus.length > 6 && (
                <div className="text-white/60 text-sm">
                  +{course.syllabus.length - 6} more topics...
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
