"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User } from '@supabase/supabase-js';
import { Route, CheckCircle, Circle, Lock, Star, Trophy, Target } from 'lucide-react';
import { supabase } from '@/utils/supabase/client';
import AnimatedSidebar from '@/components/sidebar';
import ClassroomHeader from '@/components/header';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import AnimatedBackground from '@/components/ui/animated-background';

export default function LearningPathContent() {
  const [activeMenuItem, setActiveMenuItem] = useState('learning-path');
  const [user, setUser] = useState<User | null>(null);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [isPermanentlyExpanded, setIsPermanentlyExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const { toast } = useToast();

  // Mock learning path data
  const learningPath = {
    title: "Computer Science Fundamentals",
    description: "Master the core concepts of computer science through structured learning",
    totalMilestones: 8,
    completedMilestones: 3,
    estimatedDuration: "6 months",
    difficulty: "Intermediate",
    milestones: [
      {
        id: 1,
        title: "Programming Basics",
        description: "Learn fundamental programming concepts and syntax",
        status: "completed",
        progress: 100,
        estimatedTime: "2 weeks",
        courses: ["Introduction to Programming", "Basic Algorithms"],
        skills: ["Variables", "Functions", "Loops", "Conditionals"],
        color: "from-green-500 to-teal-500"
      },
      {
        id: 2,
        title: "Data Structures",
        description: "Understand arrays, linked lists, stacks, and queues",
        status: "completed",
        progress: 100,
        estimatedTime: "3 weeks",
        courses: ["Data Structures Fundamentals", "Array Manipulation"],
        skills: ["Arrays", "Linked Lists", "Stacks", "Queues"],
        color: "from-green-500 to-teal-500"
      },
      {
        id: 3,
        title: "Object-Oriented Programming",
        description: "Master classes, objects, inheritance, and polymorphism",
        status: "in_progress",
        progress: 65,
        estimatedTime: "4 weeks",
        courses: ["OOP Concepts", "Design Patterns"],
        skills: ["Classes", "Inheritance", "Polymorphism", "Encapsulation"],
        color: "from-blue-500 to-cyan-500"
      },
      {
        id: 4,
        title: "Algorithms & Complexity",
        description: "Learn sorting, searching, and algorithm analysis",
        status: "locked",
        progress: 0,
        estimatedTime: "5 weeks",
        courses: ["Algorithm Design", "Complexity Analysis"],
        skills: ["Sorting", "Searching", "Big O Notation", "Recursion"],
        color: "from-gray-500 to-gray-600"
      },
      {
        id: 5,
        title: "Database Fundamentals",
        description: "Understand relational databases and SQL",
        status: "locked",
        progress: 0,
        estimatedTime: "3 weeks",
        courses: ["Database Design", "SQL Fundamentals"],
        skills: ["SQL", "Database Design", "Normalization", "Queries"],
        color: "from-gray-500 to-gray-600"
      },
      {
        id: 6,
        title: "Web Development",
        description: "Build dynamic web applications",
        status: "locked",
        progress: 0,
        estimatedTime: "6 weeks",
        courses: ["HTML/CSS", "JavaScript", "React Basics"],
        skills: ["HTML", "CSS", "JavaScript", "React"],
        color: "from-gray-500 to-gray-600"
      },
      {
        id: 7,
        title: "Software Engineering",
        description: "Learn software development lifecycle and best practices",
        status: "locked",
        progress: 0,
        estimatedTime: "4 weeks",
        courses: ["Software Design", "Testing", "Version Control"],
        skills: ["Git", "Testing", "Design Patterns", "Agile"],
        color: "from-gray-500 to-gray-600"
      },
      {
        id: 8,
        title: "Final Project",
        description: "Apply all learned concepts in a comprehensive project",
        status: "locked",
        progress: 0,
        estimatedTime: "4 weeks",
        courses: ["Capstone Project"],
        skills: ["Project Management", "Full-Stack Development"],
        color: "from-purple-500 to-pink-500"
      }
    ]
  };

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
        console.error('Error fetching user:', error);
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



  const handleMenuItemClick = (itemId: string) => {
    setActiveMenuItem(itemId);
  };

  const handleHeaderAction = (action: string) => {
    console.log('Header action:', action);
  };

  const handleMenuToggle = () => {
    setIsPermanentlyExpanded(!isPermanentlyExpanded);
    setSidebarExpanded(!isPermanentlyExpanded);
  };

  const handleStartMilestone = (milestoneId: number) => {
    toast({
      title: "Start Milestone",
      description: `Starting milestone ${milestoneId}...`,
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle size={24} className="text-green-400" />;
      case 'in_progress':
        return <Circle size={24} className="text-blue-400" />;
      case 'locked':
        return <Lock size={24} className="text-gray-400" />;
      default:
        return <Circle size={24} className="text-gray-400" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'in_progress':
        return 'In Progress';
      case 'locked':
        return 'Locked';
      default:
        return 'Unknown';
    }
  };

  const overallProgress = Math.round((learningPath.completedMilestones / learningPath.totalMilestones) * 100);

  return (
    <AnimatedBackground>
      {/* Header */}
      <ClassroomHeader
        title="Learning Path"
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
          marginLeft: sidebarExpanded ? '280px' : '80px',
          transition: 'margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          width: `calc(100vw - ${sidebarExpanded ? '280px' : '80px'})`
        }}
      >

        {/* Learning Path Content */}
        <motion.div
          className="relative z-10 space-y-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
        >
          {/* Header Section */}
          <div className="text-center">
            <h1 className="text-4xl font-bold text-white/90 mb-4 dark:text-white/90">
              {learningPath.title}
            </h1>
            <p className="text-lg text-white/70 mb-8 dark:text-white/70">
              {learningPath.description}
            </p>
          </div>

          {/* Progress Overview */}
          <motion.div
            className="bg-white/10 backdrop-blur-sm rounded-xl p-8 border border-white/20 mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
          >
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-white mb-2">{overallProgress}%</div>
                <div className="text-white/70 text-sm">Overall Progress</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-400 mb-2">{learningPath.completedMilestones}</div>
                <div className="text-white/70 text-sm">Completed Milestones</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-400 mb-2">{learningPath.estimatedDuration}</div>
                <div className="text-white/70 text-sm">Estimated Duration</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-400 mb-2">{learningPath.difficulty}</div>
                <div className="text-white/70 text-sm">Difficulty Level</div>
              </div>
            </div>

            {/* Overall Progress Bar */}
            <div className="mt-6">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-white/70">Learning Path Progress</span>
                <span className="text-white">{overallProgress}%</span>
              </div>
              <div className="w-full bg-white/20 rounded-full h-3">
                <motion.div
                  className="bg-gradient-to-r from-purple-500 to-pink-500 h-3 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${overallProgress}%` }}
                  transition={{ duration: 1.5, delay: 0.5 }}
                />
              </div>
            </div>
          </motion.div>

          {/* Milestones */}
          <div className="space-y-6">
            {isLoading ? (
              // Skeleton loading state
              [...Array(4)].map((_, index) => (
                <div key={index} className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                  <div className="flex items-center gap-4 mb-4">
                    <Skeleton className="w-12 h-12 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                    <Skeleton className="h-8 w-20" />
                  </div>
                  <Skeleton className="h-16 w-full mb-4" />
                  <div className="flex gap-2">
                    <Skeleton className="h-8 flex-1" />
                    <Skeleton className="h-8 w-24" />
                  </div>
                </div>
              ))
            ) : (
              learningPath.milestones.map((milestone, index) => (
                <motion.div
                  key={milestone.id}
                  className={`bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 transition-all duration-300 ${
                    milestone.status === 'locked' ? 'opacity-60' : 'hover:bg-white/15'
                  }`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1, duration: 0.6 }}
                  whileHover={milestone.status !== 'locked' ? { scale: 1.01, y: -2 } : {}}
                >
                  {/* Milestone Header */}
                  <div className="flex items-center gap-4 mb-4">
                    <div className="relative">
                      <div className={`w-12 h-12 bg-gradient-to-r ${milestone.color} rounded-full flex items-center justify-center`}>
                        {getStatusIcon(milestone.status)}
                      </div>
                      {milestone.status === 'completed' && (
                        <div className="absolute -top-1 -right-1 w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center">
                          <Star size={12} className="text-white" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-white font-semibold text-lg dark:text-white">{milestone.title}</h3>
                      <p className="text-white/60 text-sm dark:text-white/60">{milestone.description}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-white/70 mb-1">{getStatusText(milestone.status)}</div>
                      <div className="text-xs text-white/60">{milestone.estimatedTime}</div>
                    </div>
                  </div>

                  {/* Progress Bar (for in-progress milestones) */}
                  {milestone.status === 'in_progress' && (
                    <div className="mb-4">
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-white/70">Progress</span>
                        <span className="text-white">{milestone.progress}%</span>
                      </div>
                      <div className="w-full bg-white/20 rounded-full h-2">
                        <motion.div
                          className={`bg-gradient-to-r ${milestone.color} h-2 rounded-full`}
                          initial={{ width: 0 }}
                          animate={{ width: `${milestone.progress}%` }}
                          transition={{ duration: 1, delay: 0.5 + index * 0.1 }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Milestone Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <div className="text-white/70 text-sm mb-2">Courses:</div>
                      <div className="space-y-1">
                        {milestone.courses.map((course, courseIndex) => (
                          <div key={courseIndex} className="text-white/80 text-sm">• {course}</div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="text-white/70 text-sm mb-2">Skills to Learn:</div>
                      <div className="flex flex-wrap gap-2">
                        {milestone.skills.map((skill, skillIndex) => (
                          <span
                            key={skillIndex}
                            className="px-2 py-1 bg-white/10 rounded-md text-xs text-white/80"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    {milestone.status === 'completed' ? (
                      <>
                        <button className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2">
                          <Trophy size={16} />
                          Completed
                        </button>
                        <button className="bg-white/20 hover:bg-white/30 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors">
                          Review
                        </button>
                      </>
                    ) : milestone.status === 'in_progress' ? (
                      <>
                        <button 
                          onClick={() => handleStartMilestone(milestone.id)}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                        >
                          <Target size={16} />
                          Continue Learning
                        </button>
                        <button className="bg-white/20 hover:bg-white/30 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors">
                          View Progress
                        </button>
                      </>
                    ) : (
                      <>
                        <button 
                          disabled
                          className="flex-1 bg-gray-600 text-white/50 py-2 px-4 rounded-lg text-sm font-medium cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          <Lock size={16} />
                          Locked
                        </button>
                        <button 
                          disabled
                          className="bg-white/10 text-white/50 py-2 px-4 rounded-lg text-sm font-medium cursor-not-allowed"
                        >
                          Preview
                        </button>
                      </>
                    )}
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
