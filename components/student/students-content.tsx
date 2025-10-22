"use client";

import React, { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { useStudentsByTutor } from '@/hooks/profile/use-students';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/hooks/profile/use-user';

export default function StudentsContent() {
  const t = useTranslations('StudentsContent');
  const { data: user } = useUser();
  const tutorId = user?.profile?.id;
  
  const { data: studentsData, isLoading } = useStudentsByTutor(tutorId || 0);
  const { toast } = useToast();

  const handleViewProfile = (studentId: number) => {
    toast({
      title: t('profile_view') || "Profile View",
      description: t('opening_profile', { studentId }) || `Opening profile for student ${studentId}`,
    });
  };

  const handleSendMessage = (studentId: number) => {
    toast({
      title: t('message') || "Message",
      description: t('opening_message', { studentId }) || `Opening message for student ${studentId}`,
    });
  };

  // Transform enrollment data to student display format
  const students = studentsData?.enrollments.map((enrollment) => ({
    id: enrollment.student_profile.id,
    name: enrollment.student_profile.display_name || enrollment.student_profile.full_name,
    email: enrollment.student_profile.email,
    avatar_url: enrollment.student_profile.avatar_url,
    course: enrollment.course.title,
    enrolledAt: new Date(enrollment.created_at).toLocaleDateString(),
    progress: enrollment.progress?.progress_pct || 0,
    completedLessons: enrollment.progress?.completed_lessons || 0,
    lastAccessed: enrollment.progress?.last_accessed_at 
      ? new Date(enrollment.progress.last_accessed_at).toLocaleDateString()
      : null,
  })) || [];

  return (
    <>
          <div className="text-center">
            <h1 className="text-4xl font-bold text-white/90 mb-4 dark:text-white/90">
              {t('title') || 'Students Management'}
            </h1>
            <p className="text-lg text-white/70 mb-8 dark:text-white/70">
              {t('subtitle') || 'Manage student profiles, track progress, and monitor performance'}
            </p>
          </div>

          {/* Students Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {isLoading ? (
              // Skeleton loading state
              [...Array(6)].map((_, index) => (
                <div key={index} className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                  <div className="flex items-center gap-4 mb-4">
                    <Skeleton className="w-12 h-12 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-2 w-full" />
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Skeleton className="h-8 flex-1" />
                    <Skeleton className="h-8 flex-1" />
                  </div>
                </div>
              ))
            ) : students.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <p className="text-white/70 dark:text-white/70">
                  {t('no_students') || 'No students enrolled yet'}
                </p>
              </div>
            ) : (
              students.map((student, index) => (
                <motion.div
                  key={student.id}
                  className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1, duration: 0.6 }}
                  whileHover={{ scale: 1.02, y: -5 }}
                >
                  <div className="flex items-center gap-4 mb-4">
                    {student.avatar_url ? (
                      <img 
                        src={student.avatar_url} 
                        alt={student.name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold text-sm">
                          {student.name.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                    )}
                    <div>
                      <h3 className="text-white font-semibold dark:text-white">{student.name}</h3>
                      <p className="text-white/60 text-sm dark:text-white/60">{student.course}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-white/70 dark:text-white/70">{t('progress') || 'Progress'}</span>
                      <span className="text-white dark:text-white">{student.progress}%</span>
                    </div>
                    <div className="w-full bg-white/20 rounded-full h-2">
                      <motion.div 
                        className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${student.progress}%` }}
                        transition={{ duration: 1, delay: 0.5 + index * 0.1 }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-white/60 dark:text-white/60">
                      <span>{t('enrolled') || 'Enrolled'}: {student.enrolledAt}</span>
                      {student.lastAccessed && (
                        <span>{t('last_active') || 'Last active'}: {student.lastAccessed}</span>
                      )}
                    </div>
                    {student.completedLessons > 0 && (
                      <p className="text-white/60 text-xs dark:text-white/60">
                        {student.completedLessons} {t('lessons_completed') || 'lessons completed'}
                      </p>
                    )}
                  </div>
                  
                  <div className="mt-4 flex gap-2">
                    <button 
                      onClick={() => handleViewProfile(student.id)}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors"
                    >
                      {t('view_profile') || 'View Profile'}
                    </button>
                    <button 
                      onClick={() => handleSendMessage(student.id)}
                      className="flex-1 bg-white/20 hover:bg-white/30 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors"
                    >
                      {t('message_button') || 'Message'}
                    </button>
                  </div>
                </motion.div>
              ))
            )}
          </div>
    </>
  );
}
