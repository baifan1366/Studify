'use client';

import React from 'react';
import { Clock, Play, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useChapters } from '@/hooks/course/use-course-chapter';

interface CourseChapterContentProps {
  currentLessonId?: number;
  currentTimestamp?: number;
  onSeekTo?: (time: number) => void;
}

export default function CourseChapterContent({ 
  currentLessonId,
  currentTimestamp = 0,
  onSeekTo
}: CourseChapterContentProps) {
  const { data: chapters = [] } = useChapters(currentLessonId || 0);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`;
  };

  const handleSeekToChapter = (startTime: number) => {
    if (onSeekTo) {
      onSeekTo(startTime);
    }
  };

  return (
    <div className="space-y-4">
      {/* Chapters List */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2">
          <BookOpen size={16} />
          Video Chapters
        </h4>
        
        {chapters.length > 0 ? (
          chapters.map((chapter, index) => (
            <div key={chapter.id} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
              {/* Chapter Header */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 font-mono">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <h5 className="font-medium text-gray-900 dark:text-white text-sm">
                      {chapter.title}
                    </h5>
                  </div>
                  {chapter.description && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 ml-8">
                      {chapter.description}
                    </p>
                  )}
                </div>
                
                {/* Jump to Chapter Button */}
                <div className="flex items-center ml-2">
                  {chapter.start_time_sec !== undefined && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSeekToChapter(chapter.start_time_sec!)}
                      className="h-8 w-8 p-0 text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                      title="Jump to chapter"
                    >
                      <Play size={14} />
                    </Button>
                  )}
                </div>
              </div>
              
              {/* Chapter Timeline */}
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 ml-8">
                <Clock size={12} />
                <span>
                  {chapter.start_time_sec !== undefined ? formatTime(chapter.start_time_sec) : '0:00'}
                  {chapter.start_time_sec !== undefined && chapter.end_time_sec !== undefined && 
                    ` - ${formatTime(chapter.end_time_sec)}`
                  }
                </span>
                {chapter.start_time_sec !== undefined && chapter.end_time_sec !== undefined && (
                  <span className="text-gray-400">
                    ({formatTime(chapter.end_time_sec - chapter.start_time_sec)} duration)
                  </span>
                )}
              </div>
            </div>
          ))
        ) : (
          <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-4">
            No chapters available for this video.
          </p>
        )}
      </div>
    </div>
  );
}
