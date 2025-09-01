"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { User } from '@supabase/supabase-js';
import AnimatedSidebar from '@/components/sidebar';
import ClassroomHeader from '@/components/header';
import RecommendationPanels from '@/components/home/recommendation-panels';
import { useToast } from '@/hooks/use-toast';
import AnimatedBackground from '@/components/ui/animated-background';
import { useUser } from '@/hooks/use-user';
import { Skeleton } from '@/components/ui/skeleton';

export default function ClassroomContent() {
  const [activeMenuItem, setActiveMenuItem] = useState('classroom');
  const { data, isLoading, error } = useUser();
  const user = data?.user;
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [isPermanentlyExpanded, setIsPermanentlyExpanded] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(80); // Add sidebar width state
  
  const { toast } = useToast();

  // Show error toast if user data fetch fails
  React.useEffect(() => {
    if (error) {
      console.error('Error fetching user:', error);
      toast({
        title: "Error",
        description: "Failed to load user data",
        variant: "destructive",
      });
    }
  }, [error, toast]);



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
    setSidebarWidth(newExpanded ? 280 : 80); // Update sidebar width for synchronization
  };

  return (
    <AnimatedBackground sidebarWidth={sidebarWidth}>
      {/* Header */}
      <ClassroomHeader
        title="Classroom"
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

      {/* Main Content Area - Recommendation Panels */}
      <motion.div
        className="relative z-10 mt-16 p-6 h-full overflow-y-auto"
        style={{
          marginLeft: `${sidebarWidth}px`, // Use shared state for synchronization
          transition: 'margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          width: `calc(100vw - ${sidebarWidth}px)`
        }}
      >
        {/* Welcome Header */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
        >
          <h1 className="text-4xl font-bold text-white/90 mb-2 dark:text-white/90">
            {isLoading ? 'Loading...' : `Welcome to your Classroom, ${user?.email?.split('@')[0] || 'Student'}!`}
          </h1>
          <p className="text-lg text-white/70 dark:text-white/70">
            Explore courses, track progress, and enhance your learning experience
          </p>
        </motion.div>

        {/* Recommendation Panels */}
        <RecommendationPanels user={user} isLoading={isLoading} />
      </motion.div>
    </AnimatedBackground>
  );
}
