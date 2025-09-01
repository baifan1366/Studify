"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/utils/supabase/client';
 
import RecommendationPanels from '@/components/home/recommendation-panels';
import { useToast } from '@/hooks/use-toast';
import AnimatedBackground from '@/components/ui/animated-background';

export default function ClassroomContent() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const { toast } = useToast();

  // Fetch user authentication data
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();

        if (error) {
          console.error('Error fetching user:', error);
        } else {
          setUser(user);
        }
      } catch (error) {
        console.error('Error in fetchUser:', error);
        toast({
          title: "Error",
          description: "Failed to load user data",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        setIsLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, [toast]);

  const handleHeaderAction = (action: string) => {
    console.log('Header action:', action);
  };

  return (
    <AnimatedBackground>
      {/* Main Content */}
      <div>
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
      </div>
    </AnimatedBackground>
  );
}
