"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname, useRouter } from 'next/navigation';
import {
  Home,
  Settings,
  Mail,
  Calendar,
  FileText,
  BarChart3,
  PackageOpen,
  LogOut,
  BookOpen,
  Users,
  GraduationCap,
  Bell,
  ChevronDown,
  UserCheck,
  ClipboardList,
  Video,
  Route,
  MessageCircle,
  Brain,
  Award,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useLogout } from '@/hooks/profile/use-logout';

interface MenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  path?: string; // Optional for parent items with sub-items
  subItems?: MenuItem[]; // Sub-navigation items
}

interface AnimatedSidebarProps {
  menuSections?: MenuSection[];
  onItemClick?: (itemId: string) => void;
  activeItem?: string;
  onExpansionChange?: (isExpanded: boolean) => void;
  isPermanentlyExpanded?: boolean;
}

interface MenuSection {
  title: string;
  items: MenuItem[];
}

interface RouteConfigItem {
  pathFragment: string;
  id: string;
  expands: string | undefined;
}

const defaultMenuSections: MenuSection[] = [
  {
    title: 'Home',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: Home, path: '/tutor/dashboard' },
      { id: 'notifications', label: 'Notifications', icon: Bell, path: '/tutor/notification' },
      { id: 'storage', label: 'Storage', icon: PackageOpen, path: '/tutor/storage' },
    ]
  },
  {
    title: 'Dashboard',
    items: [
      {
        id: 'teaching',
        label: 'Teaching',
        icon: BookOpen,
        path: '/tutor/teaching/quiz-content',
        subItems: [
          { id: 'quiz-content', label: 'Quiz Content', icon: ClipboardList, path: '/tutor/teaching/quiz-content' },
          { id: 'course-content', label: 'Course Content', icon: Video, path: '/tutor/teaching/course-content' },
        ]
      },
      { id: 'classroom', label: 'Classroom', icon: Users, path: '/tutor/classroom' },
      { id: 'students', label: 'Students', icon: GraduationCap, path: '/tutor/student' },
    ]
  },{
    title: "Community",
    items: [
      {
        id: "community",
        label: "Community",
        icon: Users,
        subItems: [
          { id: "groups", label: "Groups", icon: Users, path: "/tutor/community" },
          {
            id: "quizzes",
            label: "Quizzes",
            icon: Brain,
            path: "/tutor/community/quizzes",
          },
          {
            id: "achievements",
            label: "Achievements",
            icon: Award,
            path: "/tutor/community/achievements",
          },
        ],
      },
      { id: "chat", label: "Chat", icon: MessageCircle, path: "/tutor/chat" },
    ],
  },
];

export default function AnimatedSidebar({
  menuSections = defaultMenuSections,
  onItemClick,
  activeItem = 'dashboard',
  onExpansionChange,
  isPermanentlyExpanded = false
}: AnimatedSidebarProps) {
  const t = useTranslations('Sidebar');
  const pathname = usePathname();
  const router = useRouter();
  const logoutMutation = useLogout();
  const [isHovered, setIsHovered] = useState(false);
  const [currentActiveItem, setCurrentActiveItem] = useState(activeItem);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  const routeConfig = useMemo((): RouteConfigItem[] => {
    const config = menuSections.flatMap(section =>
      section.items.flatMap(item => {
        const items: {
            pathFragment: string | undefined;
            id: string;
            expands: string | undefined;
        }[] = [];
        // Add parent item itself, if it's a link
        if (item.path) {
          items.push({ pathFragment: item.path, id: item.id, expands: undefined });
        }
        // Add any sub-items
        if (item.subItems) {
          items.push(...item.subItems.map(subItem => ({
            pathFragment: subItem.path,
            id: subItem.id,
            expands: item.id
          })));
        }
        return items;
      })
    );
    
    const validConfig = config.filter((i): i is RouteConfigItem => !!i.pathFragment);

    // Sort by path length descending to match specific paths first
    return validConfig.sort((a, b) => b.pathFragment.length - a.pathFragment.length);
  }, [menuSections]);

  const getLabelForItem = (id: string) => {
    switch (id) {
      case "dashboard":
        return t("dashboard_label");
      case "notifications":
        return t("notifications_label");
      case "storage":
        return t("storage_label");
      case "teaching":
        return t("teaching_label");
      case "quiz-content":
        return t("quiz_content_label");
      case "course-content":
        return t("course_content_label");
      case "classroom":
        return t("classroom_label");
      case "students":
        return t("students_label");
      case "community":
        return t("community_label");
      case "groups":
        return t("groups_label");
      case "quizzes":
        return t("quizzes_label");
      case "achievements":
        return t("achievements_label");
      case "chat":
        return t("chat_label");
      default:
        return "";
    }
  };

  // Automatically determine active item based on current route
  useEffect(() => {
    const currentPath = pathname || '';
    const activeRoute = routeConfig.find(route => route.pathFragment && currentPath.includes(route.pathFragment));

    setCurrentActiveItem(activeRoute?.id || activeItem);

    if (activeRoute && typeof activeRoute.expands === 'string') {
      setExpandedSections(prev => ({ ...prev, [activeRoute.expands as string]: true }));
    }
  }, [pathname, activeItem, routeConfig]);

  // Auto-close expanded sections when sidebar is collapsed
  useEffect(() => {
    if (!isPermanentlyExpanded && !isHovered) {
      // Add a small delay to prevent immediate closing when moving mouse
      const timer = setTimeout(() => {
        setExpandedSections({});
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isPermanentlyExpanded, isHovered]);

  // Determine if sidebar should be expanded (permanently or temporarily via hover)
  const isExpanded = isPermanentlyExpanded || isHovered;

  // Notify parent of expansion state changes and set CSS variable for content positioning
  useEffect(() => {
    onExpansionChange?.(isExpanded);
    // Set CSS variable for precise content positioning
    const sidebarWidth = isExpanded ? 280 : 80;
    document.documentElement.style.setProperty('--sidebar-width', `${sidebarWidth}px`);
  }, [isExpanded, onExpansionChange]);

  const sidebarVariants = {
    collapsed: {
      width: '80px',
      transition: {
        type: 'spring' as const,
        stiffness: 300,
        damping: 30
      }
    },
    expanded: {
      width: '280px',
      transition: {
        type: 'spring' as const,
        stiffness: 300,
        damping: 30
      }
    }
  };

  const itemVariants = {
    collapsed: {
      justifyContent: 'center',
      transition: { duration: 0.2 }
    },
    expanded: {
      justifyContent: 'flex-start',
      transition: { duration: 0.2 }
    }
  };

  const textVariants = {
    hidden: {
      opacity: 0,
      x: -10,
      transition: { duration: 0.1 }
    },
    visible: {
      opacity: 1,
      x: 0,
      transition: { delay: 0.1, duration: 0.2 }
    }
  };

  const iconVariants = {
    collapsed: {
      rotate: 0,
      scale: 1
    },
    expanded: {
      rotate: 0,
      scale: 1.1
    }
  };

  const toggleSectionExpansion = (sectionId: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  // Define primary navigation items for mobile bottom bar
  // Use the same IDs as the desktop sidebar sub-items to ensure proper navigation
  const mobileNavItems = [
    { id: "dashboard", label: "Home", icon: Home, path: "/tutor/dashboard" },
    { id: "quiz-content", label: "Teaching", icon: BookOpen, path: "/tutor/teaching/quiz-content" },
    { id: "classroom", label: "Classroom", icon: Users, path: "/tutor/classroom" },
    { id: "groups", label: "Community", icon: MessageCircle, path: "/tutor/community" },
    { id: "students", label: "Students", icon: GraduationCap, path: "/tutor/student" },
  ];

  const handleItemClick = (itemId: string) => {
    setCurrentActiveItem(itemId);

    // Find the menu item to get its path (including sub-items and mobile nav items)
    const allItems = menuSections.flatMap(section =>
      section.items.flatMap(item =>
        item.subItems ? [item, ...item.subItems] : [item]
      )
    );
    const clickedItem = allItems.find(item => item.id === itemId) || 
                        mobileNavItems.find(item => item.id === itemId);

    if (clickedItem?.path) {
      // Get current locale from pathname
      const currentLocale = pathname?.split('/')[1] || 'en';
      const fullPath = `/${currentLocale}${clickedItem.path}`;

      // Navigate to the page
      router.push(fullPath);
    }

    // Call the parent's onItemClick if provided
    if (onItemClick) {
      onItemClick(itemId);
    }
  };

  return (
    <>
      {/* Sidebar - Hidden on mobile */}
      <motion.div
        variants={sidebarVariants}
        animate={isExpanded ? 'expanded' : 'collapsed'}
        className="hidden md:flex fixed left-0 top-16 h-[calc(100vh-4rem)] shadow-lg z-20 flex-col backdrop-blur-md"
        style={{
          backgroundColor: 'hsl(var(--sidebar))',
          color: 'hsl(var(--sidebar-foreground))',
        }}
      >
        {/* Navigation */}
        <nav
          className="flex-1 p-4 overflow-y-auto scrollbar-hide"
          onMouseEnter={() => !isPermanentlyExpanded && setIsHovered(true)}
          onMouseLeave={() => !isPermanentlyExpanded && setIsHovered(false)}
          style={{
            scrollbarWidth: 'none', /* Firefox */
            msOverflowStyle: 'none', /* Internet Explorer 10+ */
          }}
        >
          <div className="space-y-6">
            {menuSections.map((section, sectionIndex) => (
              <div key={section.title}>

                {/* Section Items */}
                <ul className="space-y-2">
                  {section.items.map((item) => {
                    const IconComponent = item.icon;
                    const isActive = currentActiveItem === item.id;
                    const hasSubItems = item.subItems && item.subItems.length > 0;
                    const isDropdownExpanded = expandedSections[item.id] || false;

                    if (hasSubItems) {
                      return (
                        <li key={item.id}>
                          <div>
                            <motion.button
                              variants={itemVariants}
                              animate={isExpanded ? 'expanded' : 'collapsed'}
                              onClick={() => {
                                if (!isExpanded) {
                                  // If sidebar is collapsed, navigate to the main page
                                  handleItemClick(item.id);
                                } else {
                                  // If sidebar is expanded, toggle dropdown
                                  toggleSectionExpansion(item.id);
                                }
                              }}
                              
                              className={`w-full flex items-center p-3 rounded-xl transition-all duration-200 ${
                                isActive
                                  ? 'bg-transparent dark:bg-transparent text-foreground border-l-4 border-orange-500 dark:border-green-900'
                                  : 'hover:bg-transparent dark:bg-transparent text-foreground border-l-4 border-transparent hover:border-orange-400 dark:hover:border-green-600'
                              }`}
                              whileHover={{
                                scale: 1.02
                              }}
                              whileTap={{ scale: 0.98 }}
                            >
                                <motion.div
                                  variants={iconVariants}
                                  animate={isExpanded ? 'expanded' : 'collapsed'}
                                  className="flex-shrink-0"
                                >
                                  <IconComponent size={24} />
                                </motion.div>

                              <AnimatePresence>
                                {isExpanded && (
                                  <motion.span
                                    variants={textVariants}
                                    initial="hidden"
                                    animate="visible"
                                    exit="hidden"
                                    className="ml-4 font-medium whitespace-nowrap "
                                  >
                                    {getLabelForItem(item.id)}
                                  </motion.span>
                                )}
                              </AnimatePresence>

                              {/* Dropdown indicator */}
                              {isExpanded && (
                                <motion.div
                                  animate={{ rotate: isDropdownExpanded ? 180 : 0 }}
                                  transition={{ duration: 0.2 }}
                                  className="ml-auto"
                                >
                                  <ChevronDown size={16} className="dark:text-white/60 text-gray-800" />
                                </motion.div>
                              )}

                              {/* Active indicator */}
                              {isActive && !isExpanded && (
                                <motion.div
                                  layoutId="activeIndicator"
                                  className="ml-auto w-2 h-2 bg-orange-500 dark:bg-green-900 rounded-full"
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                />
                              )}
                              {isActive && isExpanded && !isDropdownExpanded && (
                                <motion.div
                                  layoutId="activeIndicator"
                                  className="ml-2 w-2 h-2 bg-orange-500 dark:bg-green-900 rounded-full"
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                />
                              )}
                            </motion.button>

                            {/* Sub-items dropdown */}
                            <AnimatePresence>
                              {isDropdownExpanded && isExpanded && (
                                <motion.div
                                  className="ml-6 mt-2 space-y-1"
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  exit={{ opacity: 0, height: 0 }}
                                  transition={{ duration: 0.2 }}
                                  
                                >
                                  {item.subItems?.map((subItem) => {
                                    const SubIconComponent = subItem.icon;
                                    const isSubActive = currentActiveItem === subItem.id;

                                    return (
                                      <motion.button
                                        key={subItem.id}
                                        onClick={() => handleItemClick(subItem.id)}
                                        
                                        className="flex items-center py-1 px-2 rounded-md hover:bg-transparent text-foreground cursor-pointer transition-colors duration-200 border-l-2 border-transparent hover:border-orange-300 dark:hover:border-green-600"
                                        whileHover={{ scale: 1.02, x: 4 }}
                                        whileTap={{ scale: 0.98 }}
                                      >
                                        <div className="flex-shrink-0">
                                          <SubIconComponent size={18} />
                                        </div>
                                        <span className="ml-3 font-medium whitespace-nowrap">
                                          {getLabelForItem(subItem.id)}
                                        </span>
                                        {isSubActive && (
                                          <motion.div
                                            layoutId="subActiveIndicator"
                                            className="ml-auto w-1.5 h-1.5 bg-orange-400 dark:bg-green-900 rounded-full"
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                          />
                                        )}
                                      </motion.button>
                                    );
                                  })}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </li>
                      );
                    }

                    // Regular menu item without sub-items
                    return (
                      <li key={item.id}>
                        <motion.button
                          variants={itemVariants}
                          animate={isExpanded ? 'expanded' : 'collapsed'}
                          onClick={() => handleItemClick(item.id)}
                          
                          className={`w-full flex items-center p-3 rounded-xl transition-all duration-200 ${
                            isActive
                              ? 'bg-transparent dark:bg-transparent text-foreground border-l-4 border-orange-500 dark:border-green-900'
                              : 'hover:bg-transparent dark:hover:bg-transparent text-foreground border-l-4 border-transparent hover:border-orange-300 dark:hover:border-green-600'
                          }`}
                          whileHover={{
                            scale: 1.02
                          }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <motion.div
                            variants={iconVariants}
                            animate={isExpanded ? 'expanded' : 'collapsed'}
                            className="flex-shrink-0"
                          >
                            <IconComponent size={24} />
                          </motion.div>

                          <AnimatePresence>
                            {isExpanded && (
                              <motion.span
                                variants={textVariants}
                                initial="hidden"
                                animate="visible"
                                exit="hidden"
                                className="ml-4 font-medium whitespace-nowrap"
                              >
                                {getLabelForItem(item.id)}
                              </motion.span>
                            )}
                          </AnimatePresence>

                          {/* Active indicator */}
                          {isActive && (
                            <motion.div
                              layoutId="activeIndicator"
                              className="ml-auto w-2 h-2 bg-orange-500 dark:bg-green-900 rounded-full"
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                            />
                          )}
                        </motion.button>
                      </li>
                    );
                  })}
                </ul>

                {/* Section Separator */}
                {sectionIndex < menuSections.length - 1 && (
                  <div className="mt-4 border-b border-white/10" />
                )}
              </div>
            ))}
          </div>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-white/20">
          <motion.button
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
            variants={itemVariants}
            animate={isExpanded ? 'expanded' : 'collapsed'}
            className="w-full flex items-center p-3 rounded-xl hover:bg-transparent dark:hover:bg-transparent text-foreground transition-all duration-200 border-l-4 border-transparent hover:border-orange-400 dark:hover:border-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <motion.div
              variants={iconVariants}
              animate={isExpanded ? 'expanded' : 'collapsed'}
              className="flex-shrink-0"
            >
              <LogOut size={24} />
            </motion.div>

            <AnimatePresence>
              {isExpanded && (
                <motion.span
                  variants={textVariants}
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                  className="ml-4 font-medium whitespace-nowrap hover:bg-transparent bg-transparent hover:border-orange-400 dark:hover:border-green-600"
                >
                  {t('logout_button')}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        </div>
      </motion.div>

      {/* Mobile Bottom Tab Bar - Only visible on mobile with CSS */}
            {/* Mobile Bottom Tab Bar - Visible only on mobile */}
<div
  className="fixed bottom-0 left-0 right-0 z-50 md:hidden shadow-lg border-t border-gray-200 dark:border-neutral-800 backdrop-blur supports-[backdrop-filter]:bg-white/90 dark:supports-[backdrop-filter]:bg-neutral-900/90"
  style={{
    backgroundColor: "#0D1F1A",
    color: "hsl(var(--foreground))",
    borderColor: "hsl(var(--border))",
    paddingBottom: "env(safe-area-inset-bottom)",
  }}
>
  <nav className="flex items-center justify-around px-2 py-3" style={{ minHeight: "60px" }}>
    {mobileNavItems.map((item) => {
      const IconComponent = item.icon;
      const isActive = currentActiveItem === item.id;

      return (
        <motion.button
          key={item.id}
          onClick={() => handleItemClick(item.id)}
          className={`flex flex-col items-center justify-center flex-1 gap-1 py-2 rounded-xl transition-all duration-200 ${
            isActive
              ? "text-orange-500 dark:text-green-600"
              : "text-foreground hover:text-orange-400 dark:hover:text-green-400"
          }`}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <IconComponent size={22} />
        </motion.button>
      );
    })}
  </nav>
</div>
          </>
        );
      }
      