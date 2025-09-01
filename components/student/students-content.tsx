"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User } from '@supabase/supabase-js';
import { useStudents } from '@/hooks/use-students';
import AnimatedSidebar from '@/components/sidebar';
import ClassroomHeader from '@/components/header';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import AnimatedBackground from '@/components/ui/animated-background';

export default function StudentsContent() {
  const [activeMenuItem, setActiveMenuItem] = useState('students');
  const [user, setUser] = useState<User | null>(null);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [isPermanentlyExpanded, setIsPermanentlyExpanded] = useState(false);
  
  const { isLoading } = useStudents();
  const { toast } = useToast();
  const [sidebarWidth, setSidebarWidth] = useState(80);

  // Fetch user authentication data
  useEffect(() => {
    const fetchUser = async () => {
      try {
        // This should be replaced with actual API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        setUser({
          id: '1',
          email: 'student@example.com',
          created_at: new Date().toISOString(),
          app_metadata: {},
          user_metadata: {},
          aud: 'authenticated',
          confirmation_sent_at: new Date().toISOString()
        });
      } catch (error) {
        console.error('Error fetching user:', error);
        toast({
          title: "Error",
          description: "Failed to load user data",
          variant: "destructive",
        });
      }
    };

    fetchUser();
  }, [toast]);



  const handleMenuItemClick = (itemId: string) => {
    setActiveMenuItem(itemId);
    console.log('Menu item clicked:', itemId);
  };

  const handleHeaderAction = (action: string) => {
    console.log('Header action:', action);
  };

  const handleMenuToggle = () => {
    const newExpanded = !isPermanentlyExpanded;
    setIsPermanentlyExpanded(newExpanded);
    setSidebarExpanded(newExpanded);
    setSidebarWidth(newExpanded ? 280 : 80);
  };

  const handleViewProfile = (studentId: number) => {
    toast({
      title: "Profile View",
      description: `Opening profile for student ${studentId}`,
    });
  };

  const handleSendMessage = (studentId: number) => {
    toast({
      title: "Message",
      description: `Opening message for student ${studentId}`,
    });
  };

  // Mock student data - should come from API
  const mockStudents = [
    { id: 1, name: "Alice Johnson", grade: "Grade 10", progress: 85 },
    { id: 2, name: "Bob Smith", grade: "Grade 11", progress: 72 },
    { id: 3, name: "Carol Davis", grade: "Grade 10", progress: 91 },
    { id: 4, name: "David Wilson", grade: "Grade 12", progress: 68 },
    { id: 5, name: "Emma Brown", grade: "Grade 11", progress: 79 },
    { id: 6, name: "Frank Miller", grade: "Grade 10", progress: 94 },
  ];

  return (
    <AnimatedBackground sidebarWidth={sidebarWidth}>
      {/* Header */}
      <ClassroomHeader
        title="Students"
        userName={user?.email?.split('@')[0] || 'Student'}
        onProfileClick={() => handleHeaderAction('profile')}
        sidebarExpanded={isPermanentlyExpanded}
        onMenuToggle={handleMenuToggle}
      />

      {/* Sidebar */}
      <AnimatedSidebar
        activeItem={activeMenuItem}
        onItemClick={handleMenuItemClick}
        onExpansionChange={setSidebarExpanded}
        isPermanentlyExpanded={isPermanentlyExpanded}
      />

      {/* Main Content Area */}
      <motion.div
        className="relative z-10 mt-16 p-6 h-full overflow-y-auto"
        style={{
          marginLeft: `${sidebarWidth}px`, // Use shared state for synchronization
          transition: 'margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          width: `calc(100vw - ${sidebarWidth}px)`
        }}
      >

        {/* Students Content */}
        <motion.div
          className="relative z-10 space-y-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
        >
          <div className="text-center">
            <h1 className="text-4xl font-bold text-white/90 mb-4 dark:text-white/90">
              Students Management
            </h1>
            <p className="text-lg text-white/70 mb-8 dark:text-white/70">
              Manage student profiles, track progress, and monitor performance
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
            ) : (
              mockStudents.map((student, index) => (
                <motion.div
                  key={student.id}
                  className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1, duration: 0.6 }}
                  whileHover={{ scale: 1.02, y: -5 }}
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-sm">
                        {student.name.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-white font-semibold dark:text-white">{student.name}</h3>
                      <p className="text-white/60 text-sm dark:text-white/60">{student.grade}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-white/70 dark:text-white/70">Progress</span>
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
                  </div>
                  
                  <div className="mt-4 flex gap-2">
                    <button 
                      onClick={() => handleViewProfile(student.id)}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors"
                    >
                      View Profile
                    </button>
                    <button 
                      onClick={() => handleSendMessage(student.id)}
                      className="flex-1 bg-white/20 hover:bg-white/30 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors"
                    >
                      Message
                    </button>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatedBackground>
  );
}
