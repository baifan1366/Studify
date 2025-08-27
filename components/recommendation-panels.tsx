"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  Clock, 
  Target, 
  Users, 
  BookOpen, 
  Award,
  Zap,
  ChevronRight,
  Trophy,
  UserCheck,
  Calendar,
  Brain
} from 'lucide-react';
import CourseCard, { Course } from './course-card';

interface RecommendationPanelsProps {
  user: any;
  isLoading: boolean;
}

// Mock data - In real implementation, this would come from LangChain + user data
const mockCourses: Course[] = [
  {
    id: '1',
    title: 'Advanced Calculus for SAT Math Level 2',
    instructor: { name: 'Dr. Sarah Chen', avatar: '/api/placeholder/32/32' },
    coverImage: '/api/placeholder/300/200',
    rating: 4.8,
    studentCount: 2847,
    price: 89,
    isFree: false,
    tags: ['Math', 'SAT Prep', 'Calculus'],
    duration: '12 hours',
    progress: 65,
    isEnrolled: true,
    category: 'exam-prep',
    difficulty: 'Advanced',
    syllabus: [
      'Limits and Continuity',
      'Derivatives and Applications',
      'Integration Techniques',
      'Series and Sequences',
      'Practice Tests',
      'Problem-Solving Strategies'
    ]
  },
  {
    id: '2',
    title: 'Physics Fundamentals: Mechanics & Thermodynamics',
    instructor: { name: 'Prof. Michael Rodriguez', avatar: '/api/placeholder/32/32' },
    coverImage: '/api/placeholder/300/200',
    rating: 4.9,
    studentCount: 1923,
    price: 0,
    isFree: true,
    tags: ['Physics', 'Mechanics', 'Thermodynamics'],
    duration: '8 hours',
    category: 'tutoring',
    difficulty: 'Intermediate',
    syllabus: [
      'Newton\'s Laws of Motion',
      'Energy and Work',
      'Heat and Temperature',
      'Thermodynamic Processes',
      'Lab Simulations'
    ]
  },
  {
    id: '3',
    title: 'Introduction to Machine Learning with Python',
    instructor: { name: 'Alex Kim', avatar: '/api/placeholder/32/32' },
    coverImage: '/api/placeholder/300/200',
    rating: 4.7,
    studentCount: 5621,
    price: 129,
    isFree: false,
    tags: ['AI', 'Python', 'Machine Learning'],
    duration: '20 hours',
    category: 'interest-exploration',
    difficulty: 'Beginner',
    syllabus: [
      'Python Basics for ML',
      'Data Preprocessing',
      'Supervised Learning',
      'Unsupervised Learning',
      'Neural Networks',
      'Real-world Projects'
    ]
  }
];

const mockLearningPaths = [
  {
    id: '1',
    title: 'SAT Math Mastery Path',
    description: 'Complete preparation for SAT Math sections',
    courses: 4,
    exercises: 150,
    estimatedTime: '6 weeks',
    icon: '🎯',
    category: 'exam-prep'
  },
  {
    id: '2',
    title: 'Programming Fundamentals Journey',
    description: 'From zero to building your first app',
    courses: 6,
    exercises: 200,
    estimatedTime: '12 weeks',
    icon: '💻',
    category: 'interest-exploration'
  },
  {
    id: '3',
    title: 'Chemistry Excellence Track',
    description: 'Master chemistry concepts and problem-solving',
    courses: 5,
    exercises: 180,
    estimatedTime: '8 weeks',
    icon: '🧪',
    category: 'tutoring'
  }
];

const mockRealtimeData = {
  currentlyStudying: 1247,
  newCoursesThisWeek: 8,
  teacherRecommendations: 3
};

export default function RecommendationPanels({ user, isLoading }: RecommendationPanelsProps) {
  const [activeTab, setActiveTab] = useState('continue');
  const [realtimeStats, setRealtimeStats] = useState(mockRealtimeData);

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setRealtimeStats(prev => ({
        ...prev,
        currentlyStudying: prev.currentlyStudying + Math.floor(Math.random() * 10) - 5
      }));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleCourseAction = (action: string, courseId: string) => {
    console.log(`${action} course:`, courseId);
  };

  const handlePathSelect = (pathId: string) => {
    console.log('Selected learning path:', pathId);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-white/70">Loading recommendations...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Personalized Recommendation Panel */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6"
      >
        <div className="flex items-center gap-3 mb-6">
          <Brain className="text-blue-400" size={24} />
          <h2 className="text-2xl font-bold text-white">Personalized for You</h2>
          <span className="text-sm text-white/60 bg-white/10 px-2 py-1 rounded-full">
            Powered by AI
          </span>
        </div>

        {/* Recommendation Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {[
            { id: 'continue', label: 'Continue Learning', icon: Clock },
            { id: 'mistakes', label: 'Practice from Mistakes', icon: Target },
            { id: 'peers', label: 'Popular Among Peers', icon: Users }
          ].map((tab) => {
            const IconComponent = tab.icon;
            return (
              <motion.button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                  activeTab === tab.id 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <IconComponent size={16} />
                {tab.label}
              </motion.button>
            );
          })}
        </div>

        {/* Course Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mockCourses.map((course, index) => (
            <motion.div
              key={course.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * index }}
            >
              <CourseCard
                course={course}
                onEnroll={(id) => handleCourseAction('enroll', id)}
                onPreview={(id) => handleCourseAction('preview', id)}
                onContinue={(id) => handleCourseAction('continue', id)}
                showProgress={activeTab === 'continue'}
              />
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* Learning Paths Panel */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6"
      >
        <div className="flex items-center gap-3 mb-6">
          <Award className="text-purple-400" size={24} />
          <h2 className="text-2xl font-bold text-white">Learning Paths</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {mockLearningPaths.map((path, index) => (
            <motion.div
              key={path.id}
              className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 p-6 cursor-pointer group"
              whileHover={{ scale: 1.02, y: -5 }}
              transition={{ duration: 0.2 }}
              onClick={() => handlePathSelect(path.id)}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * index }}
            >
              <div className="text-4xl mb-4">{path.icon}</div>
              <h3 className="text-lg font-semibold text-white mb-2">{path.title}</h3>
              <p className="text-white/70 text-sm mb-4">{path.description}</p>
              
              <div className="space-y-2 text-sm text-white/60">
                <div className="flex justify-between">
                  <span>Courses:</span>
                  <span>{path.courses}</span>
                </div>
                <div className="flex justify-between">
                  <span>Exercises:</span>
                  <span>{path.exercises}</span>
                </div>
                <div className="flex justify-between">
                  <span>Est. Time:</span>
                  <span>{path.estimatedTime}</span>
                </div>
              </div>

              <motion.button
                className="w-full mt-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Start Path
                <ChevronRight size={16} />
              </motion.button>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* Dynamic Panel */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6"
      >
        <div className="flex items-center gap-3 mb-6">
          <Zap className="text-yellow-400" size={24} />
          <h2 className="text-2xl font-bold text-white">Live Activity</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Real-time Activity */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 p-4">
            <div className="flex items-center gap-3 mb-3">
              <TrendingUp className="text-green-400" size={20} />
              <h3 className="font-semibold text-white">Currently Studying</h3>
            </div>
            <div className="text-3xl font-bold text-green-400 mb-2">
              {realtimeStats.currentlyStudying.toLocaleString()}
            </div>
            <p className="text-white/60 text-sm">Students online now</p>
          </div>

          {/* New Courses */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 p-4">
            <div className="flex items-center gap-3 mb-3">
              <BookOpen className="text-blue-400" size={20} />
              <h3 className="font-semibold text-white">New This Week</h3>
            </div>
            <div className="text-3xl font-bold text-blue-400 mb-2">
              {realtimeStats.newCoursesThisWeek}
            </div>
            <p className="text-white/60 text-sm">Fresh courses added</p>
          </div>

          {/* Teacher Recommendations */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 p-4">
            <div className="flex items-center gap-3 mb-3">
              <UserCheck className="text-purple-400" size={20} />
              <h3 className="font-semibold text-white">From Your Teacher</h3>
            </div>
            <div className="text-3xl font-bold text-purple-400 mb-2">
              {realtimeStats.teacherRecommendations}
            </div>
            <p className="text-white/60 text-sm">Recommendations waiting</p>
          </div>
        </div>
      </motion.section>

      {/* Social & Interaction Panel */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6"
      >
        <div className="flex items-center gap-3 mb-6">
          <Trophy className="text-orange-400" size={24} />
          <h2 className="text-2xl font-bold text-white">Community & Progress</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Study Groups */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 p-4">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <Users size={20} />
              Recommended Study Groups
            </h3>
            <div className="space-y-3">
              {['SAT Math Prep Group', 'Physics Problem Solvers', 'AI Enthusiasts'].map((group, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-white/80">{group}</span>
                  <button className="text-blue-400 hover:text-blue-300 text-sm">Join</button>
                </div>
              ))}
            </div>
          </div>

          {/* Leaderboard */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 p-4">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <Trophy size={20} />
              Weekly Leaderboard
            </h3>
            <div className="space-y-3">
              {[
                { name: 'Alex Chen', points: 2847, rank: 1 },
                { name: 'You', points: 2156, rank: 2 },
                { name: 'Sarah Kim', points: 1923, rank: 3 }
              ].map((user, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      user.rank === 1 ? 'bg-yellow-500' : user.rank === 2 ? 'bg-gray-400' : 'bg-orange-500'
                    }`}>
                      {user.rank}
                    </span>
                    <span className={`${user.name === 'You' ? 'text-blue-400 font-semibold' : 'text-white/80'}`}>
                      {user.name}
                    </span>
                  </div>
                  <span className="text-white/60">{user.points} pts</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.section>
    </div>
  );
}
