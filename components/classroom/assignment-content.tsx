"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { User } from '@supabase/supabase-js';
import { ClipboardList, Calendar, Clock, CheckCircle, AlertTriangle, FileText, Upload } from 'lucide-react';
import { useUser } from '@/hooks/use-user';
import AnimatedSidebar from '@/components/sidebar';
import ClassroomHeader from '@/components/header';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import AnimatedBackground from '@/components/ui/animated-background';
import { useTranslation } from 'react-i18next';

export default function AssignmentContent() {
  const [activeMenuItem, setActiveMenuItem] = useState('assignment');
  const [user, setUser] = useState<User | null>(null);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [isPermanentlyExpanded, setIsPermanentlyExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('pending');
  
  const { toast } = useToast();
  const { t } = useTranslation();

  // Mock assignments data
  const assignments = [
    {
      id: 1,
      title: "Calculus Problem Set #3",
      course: "Advanced Mathematics",
      dueDate: "2024-01-15",
      dueTime: "11:59 PM",
      status: "pending",
      priority: "high",
      description: "Complete problems 1-15 from Chapter 8",
      submissionType: "PDF Upload",
      maxPoints: 100,
      timeRemaining: "2 days",
      color: "from-blue-500 to-cyan-500"
    },
    {
      id: 2,
      title: "Lab Report: Chemical Reactions",
      course: "Chemistry Lab",
      dueDate: "2024-01-12",
      dueTime: "5:00 PM",
      status: "submitted",
      priority: "medium",
      description: "Analyze the results from last week's experiment",
      submissionType: "Document + Images",
      maxPoints: 75,
      submittedDate: "2024-01-10",
      grade: 68,
      color: "from-green-500 to-teal-500"
    },
    {
      id: 3,
      title: "Physics Quiz #2",
      course: "Physics Fundamentals",
      dueDate: "2024-01-18",
      dueTime: "2:00 PM",
      status: "pending",
      priority: "medium",
      description: "Online quiz covering Newton's Laws",
      submissionType: "Online Quiz",
      maxPoints: 50,
      timeRemaining: "5 days",
      color: "from-purple-500 to-pink-500"
    },
    {
      id: 4,
      title: "Programming Project",
      course: "Computer Science",
      dueDate: "2024-01-08",
      dueTime: "11:59 PM",
      status: "overdue",
      priority: "high",
      description: "Implement a binary search tree",
      submissionType: "Code Repository",
      maxPoints: 150,
      timeRemaining: "5 days overdue",
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
          title: t("assignmentContent.toastErrorTitle"),
          description: t("assignmentContent.toastErrorDescription"),
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

  const handleSubmitAssignment = (assignmentId: number) => {
    toast({
      title: t("assignmentContent.submitAssignmentToastTitle"),
      description: t("assignmentContent.submitAssignmentToastDescription", { assignmentId }),
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock size={16} className="text-yellow-400" />;
      case 'submitted':
        return <CheckCircle size={16} className="text-green-400" />;
      case 'overdue':
        return <AlertTriangle size={16} className="text-red-400" />;
      default:
        return <ClipboardList size={16} className="text-gray-400" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return t("assignmentContent.statusPending");
      case 'submitted':
        return t("assignmentContent.statusSubmitted");
      case 'overdue':
        return t("assignmentContent.statusOverdue");
      default:
        return t("assignmentContent.statusUnknown");
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-400';
      case 'medium':
        return 'text-yellow-400';
      case 'low':
        return 'text-green-400';
      default:
        return 'text-gray-400';
    }
  };

  const filteredAssignments = assignments.filter(assignment => {
    if (selectedTab === 'pending') return assignment.status === 'pending' || assignment.status === 'overdue';
    if (selectedTab === 'submitted') return assignment.status === 'submitted';
    return true;
  });

  return (
    <AnimatedBackground>
      {/* Header */}
      <ClassroomHeader
        title={t("assignmentContent.headerTitle")}
        userName={user?.email?.split('@')[0] || t("assignmentContent.studentFallback")}
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

        {/* Assignment Content */}
        <motion.div
          className="relative z-10 space-y-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
        >
          <div className="text-center">
            <h1 className="text-4xl font-bold text-white/90 mb-4 dark:text-white/90">
              {t("assignmentContent.myAssignmentsTitle")}
            </h1>
            <p className="text-lg text-white/70 mb-8 dark:text-white/70">
              {t("assignmentContent.myAssignmentsSubtitle")}
            </p>
          </div>

          {/* Assignment Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <motion.div
              className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
            >
              <div className="text-center">
                <div className="text-3xl font-bold text-white mb-2">{assignments.length}</div>
                <div className="text-white/70 text-sm">{t("assignmentContent.totalAssignments")}</div>
              </div>
            </motion.div>

            <motion.div
              className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.6 }}
            >
              <div className="text-center">
                <div className="text-3xl font-bold text-yellow-400 mb-2">
                  {assignments.filter(a => a.status === 'pending').length}
                </div>
                <div className="text-white/70 text-sm">{t("assignmentContent.pendingAssignments")}</div>
              </div>
            </motion.div>

            <motion.div
              className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.6 }}
            >
              <div className="text-center">
                <div className="text-3xl font-bold text-green-400 mb-2">
                  {assignments.filter(a => a.status === 'submitted').length}
                </div>
                <div className="text-white/70 text-sm">{t("assignmentContent.submittedAssignments")}</div>
              </div>
            </motion.div>

            <motion.div
              className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.6 }}
            >
              <div className="text-center">
                <div className="text-3xl font-bold text-red-400 mb-2">
                  {assignments.filter(a => a.status === 'overdue').length}
                </div>
                <div className="text-white/70 text-sm">{t("assignmentContent.overdueAssignments")}</div>
              </div>
            </motion.div>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-4 mb-6">
            {['pending', 'submitted', 'all'].map((tab) => (
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

          {/* Assignments List */}
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
              filteredAssignments.map((assignment, index) => (
                <motion.div
                  key={assignment.id}
                  className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1, duration: 0.6 }}
                  whileHover={{ scale: 1.01, y: -2 }}
                >
                  {/* Assignment Header */}
                  <div className="flex items-center gap-4 mb-4">
                    <div className={`w-12 h-12 bg-gradient-to-r ${assignment.color} rounded-lg flex items-center justify-center`}>
                      <ClipboardList size={24} className="text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-white font-semibold text-lg dark:text-white">{assignment.title}</h3>
                      <p className="text-white/60 text-sm dark:text-white/60">{assignment.course}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(assignment.status)}
                      <span className="text-xs text-white/70">{getStatusText(assignment.status)}</span>
                    </div>
                    <div className={`text-xs font-medium ${getPriorityColor(assignment.priority)}`}>
                      {assignment.priority.toUpperCase()}
                    </div>
                  </div>

                  {/* Assignment Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-white/70">
                        <Calendar size={16} />
                        <span className="text-sm">{t("assignmentContent.dueDate", { dueDate: assignment.dueDate, dueTime: assignment.dueTime })}</span>
                      </div>
                      <div className="flex items-center gap-2 text-white/70">
                        <Clock size={16} />
                        <span className="text-sm">{assignment.timeRemaining}</span>
                      </div>
                      <div className="flex items-center gap-2 text-white/70">
                        <FileText size={16} />
                        <span className="text-sm">{assignment.submissionType}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-white/70 text-sm">
                        <span className="font-medium">{t("assignmentContent.pointsLabel")}:</span> {assignment.maxPoints}
                      </div>
                      {assignment.status === 'submitted' && assignment.grade && (
                        <div className="text-white/70 text-sm">
                          <span className="font-medium">{t("assignmentContent.gradeLabel")}:</span> {assignment.grade}/{assignment.maxPoints}
                        </div>
                      )}
                      {assignment.submittedDate && (
                        <div className="text-white/70 text-sm">
                          <span className="font-medium">{t("assignmentContent.submittedLabel")}:</span> {assignment.submittedDate}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  <div className="mb-4 p-3 bg-white/5 rounded-lg">
                    <div className="text-white/80 text-sm">{assignment.description}</div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    {assignment.status === 'pending' || assignment.status === 'overdue' ? (
                      <>
                        <button 
                          onClick={() => handleSubmitAssignment(assignment.id)}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                        >
                          <Upload size={16} />
                          {t("assignmentContent.submitAssignmentButton")}
                        </button>
                        <button className="bg-white/20 hover:bg-white/30 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors">
                          {t("assignmentContent.viewDetailsButton")}
                        </button>
                      </>
                    ) : (
                      <>
                        <button className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors">
                          {t("assignmentContent.viewSubmissionButton")}
                        </button>
                        <button className="bg-white/20 hover:bg-white/30 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors">
                          {t("assignmentContent.feedbackButton")}
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

export default function AssignmentContent() {
  const [activeMenuItem, setActiveMenuItem] = useState('assignment');
  const { data, isLoading, error } = useUser();
  const user = data?.user;
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [isPermanentlyExpanded, setIsPermanentlyExpanded] = useState(false);
  const [selectedTab, setSelectedTab] = useState('pending');
  const [sidebarWidth, setSidebarWidth] = useState(80); // Add sidebar width state
  
  const { toast } = useToast();

  // Mock assignments data
  const assignments = [
    {
      id: 1,
      title: "Calculus Problem Set #3",
      course: "Advanced Mathematics",
      dueDate: "2024-01-15",
      dueTime: "11:59 PM",
      status: "pending",
      priority: "high",
      description: "Complete problems 1-15 from Chapter 8",
      submissionType: "PDF Upload",
      maxPoints: 100,
      timeRemaining: "2 days",
      color: "from-blue-500 to-cyan-500"
    },
    {
      id: 2,
      title: "Lab Report: Chemical Reactions",
      course: "Chemistry Lab",
      dueDate: "2024-01-12",
      dueTime: "5:00 PM",
      status: "submitted",
      priority: "medium",
      description: "Analyze the results from last week's experiment",
      submissionType: "Document + Images",
      maxPoints: 75,
      submittedDate: "2024-01-10",
      grade: 68,
      color: "from-green-500 to-teal-500"
    },
    {
      id: 3,
      title: "Physics Quiz #2",
      course: "Physics Fundamentals",
      dueDate: "2024-01-18",
      dueTime: "2:00 PM",
      status: "pending",
      priority: "medium",
      description: "Online quiz covering Newton's Laws",
      submissionType: "Online Quiz",
      maxPoints: 50,
      timeRemaining: "5 days",
      color: "from-purple-500 to-pink-500"
    },
    {
      id: 4,
      title: "Programming Project",
      course: "Computer Science",
      dueDate: "2024-01-08",
      dueTime: "11:59 PM",
      status: "overdue",
      priority: "high",
      description: "Implement a binary search tree",
      submissionType: "Code Repository",
      maxPoints: 150,
      timeRemaining: "5 days overdue",
      color: "from-orange-500 to-red-500"
    }
  ];

  

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

  const handleSubmitAssignment = (assignmentId: string) => {
    toast({
      title: "Submit Assignment",
      description: `Opening submission form for assignment ${assignmentId}...`,
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock size={16} className="text-yellow-400" />;
      case 'submitted':
        return <CheckCircle size={16} className="text-green-400" />;
      case 'overdue':
        return <AlertTriangle size={16} className="text-red-400" />;
      default:
        return <ClipboardList size={16} className="text-gray-400" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'submitted':
        return 'Submitted';
      case 'overdue':
        return 'Overdue';
      default:
        return 'Unknown';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-400';
      case 'medium':
        return 'text-yellow-400';
      case 'low':
        return 'text-green-400';
      default:
        return 'text-gray-400';
    }
  };

  const filteredAssignments = assignments.filter(assignment => {
    if (selectedTab === 'pending') return assignment.status === 'pending' || assignment.status === 'overdue';
    if (selectedTab === 'submitted') return assignment.status === 'submitted';
    return true;
  });

  return (
    <AnimatedBackground sidebarWidth={sidebarWidth}>
      {/* Header */}
      <ClassroomHeader
        title="Assignments"
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

        {/* Assignment Content */}
        <motion.div
          className="relative z-10 space-y-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
        >
          <div className="text-center">
            <h1 className="text-4xl font-bold text-white/90 mb-4 dark:text-white/90">
              My Assignments
            </h1>
            <p className="text-lg text-white/70 mb-8 dark:text-white/70">
              Track and submit your assignments on time
            </p>
          </div>

          {/* Assignment Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <motion.div
              className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
            >
              <div className="text-center">
                <div className="text-3xl font-bold text-white mb-2">{assignments.length}</div>
                <div className="text-white/70 text-sm">Total Assignments</div>
              </div>
            </motion.div>

            <motion.div
              className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.6 }}
            >
              <div className="text-center">
                <div className="text-3xl font-bold text-yellow-400 mb-2">
                  {assignments.filter(a => a.status === 'pending').length}
                </div>
                <div className="text-white/70 text-sm">Pending</div>
              </div>
            </motion.div>

            <motion.div
              className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.6 }}
            >
              <div className="text-center">
                <div className="text-3xl font-bold text-green-400 mb-2">
                  {assignments.filter(a => a.status === 'submitted').length}
                </div>
                <div className="text-white/70 text-sm">Submitted</div>
              </div>
            </motion.div>

            <motion.div
              className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.6 }}
            >
              <div className="text-center">
                <div className="text-3xl font-bold text-red-400 mb-2">
                  {assignments.filter(a => a.status === 'overdue').length}
                </div>
                <div className="text-white/70 text-sm">Overdue</div>
              </div>
            </motion.div>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-4 mb-6">
            {['pending', 'submitted', 'all'].map((tab) => (
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

          {/* Assignments List */}
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
              filteredAssignments.map((assignment, index) => (
                <motion.div
                  key={assignment.id}
                  className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1, duration: 0.6 }}
                  whileHover={{ scale: 1.01, y: -2 }}
                >
                  {/* Assignment Header */}
                  <div className="flex items-center gap-4 mb-4">
                    <div className={`w-12 h-12 bg-gradient-to-r ${assignment.color} rounded-lg flex items-center justify-center`}>
                      <ClipboardList size={24} className="text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-white font-semibold text-lg dark:text-white">{assignment.title}</h3>
                      <p className="text-white/60 text-sm dark:text-white/60">{assignment.course}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(assignment.status)}
                      <span className="text-xs text-white/70">{getStatusText(assignment.status)}</span>
                    </div>
                    <div className={`text-xs font-medium ${getPriorityColor(assignment.priority)}`}>
                      {assignment.priority.toUpperCase()}
                    </div>
                  </div>

                  {/* Assignment Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-white/70">
                        <Calendar size={16} />
                        <span className="text-sm">Due: {assignment.dueDate} at {assignment.dueTime}</span>
                      </div>
                      <div className="flex items-center gap-2 text-white/70">
                        <Clock size={16} />
                        <span className="text-sm">{assignment.timeRemaining}</span>
                      </div>
                      <div className="flex items-center gap-2 text-white/70">
                        <FileText size={16} />
                        <span className="text-sm">{assignment.submissionType}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-white/70 text-sm">
                        <span className="font-medium">Points:</span> {assignment.maxPoints}
                      </div>
                      {assignment.status === 'submitted' && assignment.grade && (
                        <div className="text-white/70 text-sm">
                          <span className="font-medium">Grade:</span> {assignment.grade}/{assignment.maxPoints}
                        </div>
                      )}
                      {assignment.submittedDate && (
                        <div className="text-white/70 text-sm">
                          <span className="font-medium">Submitted:</span> {assignment.submittedDate}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  <div className="mb-4 p-3 bg-white/5 rounded-lg">
                    <div className="text-white/80 text-sm">{assignment.description}</div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    {assignment.status === 'pending' || assignment.status === 'overdue' ? (
                      <>
                        <button 
                          onClick={() => handleSubmitAssignment(assignment.id.toString())}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                        >
                          <Upload size={16} />
                          Submit Assignment
                        </button>
                        <button className="bg-white/20 hover:bg-white/30 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors">
                          View Details
                        </button>
                      </>
                    ) : (
                      <>
                        <button className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors">
                          View Submission
                        </button>
                        <button className="bg-white/20 hover:bg-white/30 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors">
                          Feedback
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
