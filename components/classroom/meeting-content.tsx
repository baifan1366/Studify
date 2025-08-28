"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User } from '@supabase/supabase-js';
import { Video, Calendar, Clock, Users, Play, VideoOff } from 'lucide-react';
import { supabase } from '@/utils/supabase/client';
import AnimatedSidebar from '@/components/sidebar';
import ClassroomHeader from '@/components/header';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import AnimatedBackground from '@/components/ui/animated-background';

export default function MeetingContent() {
  const [activeMenuItem, setActiveMenuItem] = useState('meeting');
  const [user, setUser] = useState<User | null>(null);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [isPermanentlyExpanded, setIsPermanentlyExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('upcoming');
  
  const { toast } = useToast();

  // Mock meetings data
  const meetings = [
    {
      id: 1,
      title: "Advanced Mathematics - Office Hours",
      instructor: "Dr. Sarah Johnson",
      course: "Advanced Mathematics",
      date: "2024-01-15",
      time: "2:00 PM - 3:00 PM",
      duration: "60 minutes",
      status: "upcoming",
      type: "office_hours",
      participants: 8,
      maxParticipants: 15,
      meetingLink: "https://meet.studify.com/math-office-hours",
      description: "Weekly office hours for questions and additional help",
      color: "from-blue-500 to-cyan-500"
    },
    {
      id: 2,
      title: "Physics Lab Session",
      instructor: "Prof. Michael Chen",
      course: "Physics Fundamentals",
      date: "2024-01-16",
      time: "10:00 AM - 11:30 AM",
      duration: "90 minutes",
      status: "upcoming",
      type: "lab_session",
      participants: 12,
      maxParticipants: 20,
      meetingLink: "https://meet.studify.com/physics-lab",
      description: "Virtual lab session: Newton's Laws demonstration",
      color: "from-purple-500 to-pink-500"
    },
    {
      id: 3,
      title: "Chemistry Study Group",
      instructor: "Dr. Emily Davis",
      course: "Chemistry Lab",
      date: "2024-01-12",
      time: "3:00 PM - 4:00 PM",
      duration: "60 minutes",
      status: "completed",
      type: "study_group",
      participants: 15,
      maxParticipants: 15,
      recordingLink: "https://recordings.studify.com/chem-study-group-012",
      description: "Group discussion on chemical reactions",
      color: "from-green-500 to-teal-500"
    },
    {
      id: 4,
      title: "Computer Science Lecture",
      instructor: "Mr. David Lee",
      course: "Computer Science",
      date: "2024-01-14",
      time: "1:00 PM - 2:30 PM",
      duration: "90 minutes",
      status: "live",
      type: "lecture",
      participants: 25,
      maxParticipants: 30,
      meetingLink: "https://meet.studify.com/cs-lecture",
      description: "Data Structures and Algorithms",
      color: "from-orange-500 to-red-500"
    }
  ];

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

  const handleJoinMeeting = (meetingId: number) => {
    toast({
      title: "Join Meeting",
      description: `Joining meeting ${meetingId}...`,
    });
  };

  const handleWatchRecording = (meetingId: number) => {
    toast({
      title: "Watch Recording",
      description: `Opening recording for meeting ${meetingId}...`,
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'upcoming':
        return <Clock size={16} className="text-blue-400" />;
      case 'live':
        return <Video size={16} className="text-red-400" />;
      case 'completed':
        return <VideoOff size={16} className="text-gray-400" />;
      default:
        return <Video size={16} className="text-gray-400" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'upcoming':
        return 'Upcoming';
      case 'live':
        return 'Live Now';
      case 'completed':
        return 'Completed';
      default:
        return 'Unknown';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'lecture':
        return <Video size={20} className="text-blue-400" />;
      case 'office_hours':
        return <Users size={20} className="text-green-400" />;
      case 'lab_session':
        return <Play size={20} className="text-purple-400" />;
      case 'study_group':
        return <Users size={20} className="text-orange-400" />;
      default:
        return <Video size={20} className="text-gray-400" />;
    }
  };

  const filteredMeetings = meetings.filter(meeting => {
    if (selectedTab === 'upcoming') return meeting.status === 'upcoming';
    if (selectedTab === 'live') return meeting.status === 'live';
    if (selectedTab === 'completed') return meeting.status === 'completed';
    return true;
  });

  return (
    <AnimatedBackground>
      {/* Header */}
      <ClassroomHeader
        title="Meetings"
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
        {/* Meeting Content */}
        <motion.div
          className="relative z-10 space-y-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
        >
          <div className="text-center">
            <h1 className="text-4xl font-bold text-white/90 mb-4 dark:text-white/90">
              My Meetings
            </h1>
            <p className="text-lg text-white/70 mb-8 dark:text-white/70">
              Join live sessions and access recorded meetings
            </p>
          </div>

          {/* Meeting Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <motion.div
              className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
            >
              <div className="text-center">
                <div className="text-3xl font-bold text-white mb-2">{meetings.length}</div>
                <div className="text-white/70 text-sm">Total Meetings</div>
              </div>
            </motion.div>

            <motion.div
              className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.6 }}
            >
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-400 mb-2">
                  {meetings.filter(m => m.status === 'upcoming').length}
                </div>
                <div className="text-white/70 text-sm">Upcoming</div>
              </div>
            </motion.div>

            <motion.div
              className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.6 }}
            >
              <div className="text-center">
                <div className="text-3xl font-bold text-red-400 mb-2">
                  {meetings.filter(m => m.status === 'live').length}
                </div>
                <div className="text-white/70 text-sm">Live Now</div>
              </div>
            </motion.div>

            <motion.div
              className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.6 }}
            >
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-400 mb-2">
                  {meetings.filter(m => m.status === 'completed').length}
                </div>
                <div className="text-white/70 text-sm">Completed</div>
              </div>
            </motion.div>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-4 mb-6">
            {['upcoming', 'live', 'completed', 'all'].map((tab) => (
              <button
                key={tab}
                onClick={() => setSelectedTab(tab)}
                className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                  selectedTab === tab
                    ? 'bg-white/20 text-white border border-white/30'
                    : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {/* Meetings List */}
          <div className="space-y-4">
            {isLoading ? (
              // Skeleton loading state
              [...Array(3)].map((_, index) => (
                <div key={index} className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                  <div className="flex items-center gap-4 mb-4">
                    <Skeleton className="w-12 h-12 rounded-lg" />
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
              filteredMeetings.map((meeting, index) => (
                <motion.div
                  key={meeting.id}
                  className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1, duration: 0.6 }}
                  whileHover={{ scale: 1.01, y: -2 }}
                >
                  {/* Meeting Header */}
                  <div className="flex items-center gap-4 mb-4">
                    <div className={`w-12 h-12 bg-gradient-to-r ${meeting.color} rounded-lg flex items-center justify-center`}>
                      {getTypeIcon(meeting.type)}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-white font-semibold text-lg dark:text-white">{meeting.title}</h3>
                      <p className="text-white/60 text-sm dark:text-white/60">{meeting.course} • {meeting.instructor}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(meeting.status)}
                      <span className="text-xs text-white/70">{getStatusText(meeting.status)}</span>
                    </div>
                    {meeting.status === 'live' && (
                      <div className="bg-red-500 text-white px-3 py-1 rounded-full text-xs font-medium animate-pulse">
                        LIVE
                      </div>
                    )}
                  </div>

                  {/* Meeting Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-white/70">
                        <Calendar size={16} />
                        <span className="text-sm">{meeting.date}</span>
                      </div>
                      <div className="flex items-center gap-2 text-white/70">
                        <Clock size={16} />
                        <span className="text-sm">{meeting.time} ({meeting.duration})</span>
                      </div>
                      <div className="flex items-center gap-2 text-white/70">
                        <Users size={16} />
                        <span className="text-sm">{meeting.participants}/{meeting.maxParticipants} participants</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-white/70 text-sm">
                        <span className="font-medium">Type:</span> {meeting.type.replace('_', ' ').toUpperCase()}
                      </div>
                      <div className="text-white/70 text-sm">
                        <span className="font-medium">Instructor:</span> {meeting.instructor}
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="mb-4 p-3 bg-white/5 rounded-lg">
                    <div className="text-white/80 text-sm">{meeting.description}</div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    {meeting.status === 'upcoming' || meeting.status === 'live' ? (
                      <>
                        <button 
                          onClick={() => handleJoinMeeting(meeting.id)}
                          className={`flex-1 ${
                            meeting.status === 'live' 
                              ? 'bg-red-600 hover:bg-red-700' 
                              : 'bg-blue-600 hover:bg-blue-700'
                          } text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2`}
                        >
                          <Video size={16} />
                          {meeting.status === 'live' ? 'Join Live Meeting' : 'Join Meeting'}
                        </button>
                        <button className="bg-white/20 hover:bg-white/30 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors">
                          Add to Calendar
                        </button>
                      </>
                    ) : (
                      <>
                        <button 
                          onClick={() => handleWatchRecording(meeting.id)}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                        >
                          <Play size={16} />
                          Watch Recording
                        </button>
                        <button className="bg-white/20 hover:bg-white/30 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors">
                          Download
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
