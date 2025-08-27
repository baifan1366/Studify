"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname, useRouter } from 'next/navigation';
import {
  Home,
  Settings,
  Mail,
  Calendar,
  FileText,
  BarChart3,
  LogOut,
  BookOpen,
  Users,
  GraduationCap,
  Bell
} from 'lucide-react';

interface MenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  path: string; // 添加路径属性
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

const defaultMenuSections: MenuSection[] = [
  {
    title: 'Home',
    items: [
      { id: 'home', label: 'Home', icon: Home, path: '/home' },
      { id: 'notifications', label: 'Notifications', icon: Bell, path: '/notifications' },
      { id: 'messages', label: 'Messages', icon: Mail, path: '/messages' },
      { id: 'calendar', label: 'Calendar', icon: Calendar, path: '/calendar' },
    ]
  },
  {
    title: 'Dashboard',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: BarChart3, path: '/dashboard' },
      { id: 'classroom', label: 'Classroom', icon: BookOpen, path: '/classroom' },
      { id: 'students', label: 'Students', icon: Users, path: '/students' },
      { id: 'courses', label: 'Courses', icon: GraduationCap, path: '/courses' },
      { id: 'documents', label: 'Documents', icon: FileText, path: '/documents' },
      { id: 'settings', label: 'Settings', icon: Settings, path: '/settings' },
    ]
  }
];

export default function AnimatedSidebar({
  menuSections = defaultMenuSections,
  onItemClick,
  activeItem = 'home',
  onExpansionChange,
  isPermanentlyExpanded = false
}: AnimatedSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [currentActiveItem, setCurrentActiveItem] = useState(activeItem);

  // Automatically determine active item based on current route
  useEffect(() => {
    if (pathname?.includes('/home')) {
      setCurrentActiveItem('home');
    } else if (pathname?.includes('/classroom')) {
      setCurrentActiveItem('classroom');
    } else if (pathname?.includes('/students')) {
      setCurrentActiveItem('students');
    } else if (pathname?.includes('/courses')) {
      setCurrentActiveItem('courses');
    } else if (pathname?.includes('/documents')) {
      setCurrentActiveItem('documents');
    } else if (pathname?.includes('/settings')) {
      setCurrentActiveItem('settings');
    } else if (pathname?.includes('/notifications')) {
      setCurrentActiveItem('notifications');
    } else if (pathname?.includes('/messages')) {
      setCurrentActiveItem('messages');
    } else if (pathname?.includes('/calendar')) {
      setCurrentActiveItem('calendar');
    } else {
      setCurrentActiveItem(activeItem);
    }
  }, [pathname, activeItem]);

  // Determine if sidebar should be expanded (permanently or temporarily via hover)
  const isExpanded = isPermanentlyExpanded || hoveredItem !== null;

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

  const handleItemClick = (itemId: string) => {
    setCurrentActiveItem(itemId);

    // Find the menu item to get its path
    const allItems = menuSections.flatMap(section => section.items);
    const clickedItem = allItems.find(item => item.id === itemId);

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
      {/* Sidebar */}
      <motion.div
        variants={sidebarVariants}
        animate={isExpanded ? 'expanded' : 'collapsed'}
        className="fixed left-0 top-16 h-[calc(100vh-4rem)] text-white shadow-2xl z-20 flex flex-col backdrop-blur-md "
        style={{
          backgroundColor: 'rgba(44, 66, 95, 0.4)', // More transparent for better sphere visibility
          backdropFilter: 'blur(16px) saturate(190%)',
          WebkitBackdropFilter: 'blur(16px) saturate(190%)',
        }}
      >
        {/* Navigation */}
        <nav
          className="flex-1 p-4 overflow-y-auto"
          onMouseLeave={() => !isPermanentlyExpanded && setHoveredItem(null)}
        >
          <div className="space-y-6">
            {menuSections.map((section, sectionIndex) => (
              <div key={section.title}>
                {/* Section Title */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.h3
                      variants={textVariants}
                      initial="hidden"
                      animate="visible"
                      exit="hidden"
                      className="text-xs font-semibold text-white/80 uppercase tracking-wider mb-3 px-3 bg-white/15 rounded-lg py-1 backdrop-blur-sm border border-white/10"
                    >
                      {section.title}
                    </motion.h3>
                  )}
                </AnimatePresence>

                {/* Section Items */}
                <ul className="space-y-2">
                  {section.items.map((item) => {
                    const IconComponent = item.icon;
                    const isActive = currentActiveItem === item.id;

                    return (
                      <li key={item.id}>
                        <motion.button
                          variants={itemVariants}
                          animate={isExpanded ? 'expanded' : 'collapsed'}
                          onClick={() => handleItemClick(item.id)}
                          onMouseEnter={() => !isPermanentlyExpanded && setHoveredItem(item.id)}
                          onMouseLeave={() => !isPermanentlyExpanded && setHoveredItem(null)}
                          className={`w-full flex items-center p-3 rounded-xl transition-all duration-200 ${
                            isActive
                              ? 'bg-white/40 text-white shadow-lg backdrop-blur-sm border border-white/30'
                              : 'text-white/90 hover:bg-white/25 hover:text-white hover:backdrop-blur-sm'
                          }`}
                          whileHover={{
                            scale: 1.02,
                            backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.15)'
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
                                {item.label}
                              </motion.span>
                            )}
                          </AnimatePresence>

                          {/* Active indicator */}
                          {isActive && (
                            <motion.div
                              layoutId="activeIndicator"
                              className="ml-auto w-2 h-2 bg-white rounded-full"
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
            variants={itemVariants}
            animate={isExpanded ? 'expanded' : 'collapsed'}
            className="w-full flex items-center p-3 rounded-xl text-white/90 hover:bg-white/25 hover:text-white hover:backdrop-blur-sm transition-all duration-200"
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
                  className="ml-4 font-medium whitespace-nowrap"
                >
                  Logout
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        </div>
      </motion.div>
    </>
  );
}
