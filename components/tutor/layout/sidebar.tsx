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
  LogOut,
  BookOpen,
  Users,
  GraduationCap,
  Bell,
  ChevronDown,
  UserCheck,
  ClipboardList,
  Video,
  Route
} from 'lucide-react';

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
      { id: 'dashboard', label: 'Dashboard', icon: Home, path: '/dashboard' },
      { id: 'notifications', label: 'Notifications', icon: Bell, path: '/notifications' },
      { id: 'messages', label: 'Messages', icon: Mail, path: '/messages' },
      { id: 'calendar', label: 'Calendar', icon: Calendar, path: '/calendar' },
    ]
  },
  {
    title: 'Dashboard',
    items: [
      {
        id: 'teaching',
        label: 'Teaching',
        icon: BookOpen,
        path: '/teaching',
        subItems: [
          { id: 'schedule', label: 'Schedule', icon: UserCheck, path: '/teaching/schedule' },
          { id: 'assignment-&-exams', label: 'Assignments & Exams', icon: ClipboardList, path: '/teaching/assignments-exams' },
          { id: 'course-content', label: 'Course Content', icon: Video, path: '/teaching/course-content' },
        ]
      },
      { id: 'classroom', label: 'Classroom', icon: Users, path: '/classroom' },
      { id: 'students', label: 'Students', icon: GraduationCap, path: '/student' },
      { id: 'ai-assistant', label: 'AI Assistant', icon: BookOpen, path: '/ai-assistant' },
      { id: 'insights', label: 'Insights', icon: FileText, path: '/insights' },
      { id: 'settings', label: 'Settings', icon: Settings, path: '/settings' },
    ]
  }
];

export default function AnimatedSidebar({
  menuSections = defaultMenuSections,
  onItemClick,
  activeItem = 'dashboard',
  onExpansionChange,
  isPermanentlyExpanded = false
}: AnimatedSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
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

  const handleItemClick = (itemId: string) => {
    setCurrentActiveItem(itemId);

    // Find the menu item to get its path (including sub-items)
    const allItems = menuSections.flatMap(section =>
      section.items.flatMap(item =>
        item.subItems ? [item, ...item.subItems] : [item]
      )
    );
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
          backgroundColor: 'rgba(29,87,72, 0.4)', 
          backdropFilter: 'blur(16px) saturate(190%)',
          WebkitBackdropFilter: 'blur(16px) saturate(190%)',
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
                                    className="ml-4 font-medium whitespace-nowrap "
                                  >
                                    {item.label}
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
                                  <ChevronDown size={16} className="text-white/60" />
                                </motion.div>
                              )}

                              {/* Active indicator */}
                              {isActive && !isExpanded && (
                                <motion.div
                                  layoutId="activeIndicator"
                                  className="ml-auto w-2 h-2 bg-white rounded-full"
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                />
                              )}
                              {isActive && isExpanded && !isDropdownExpanded && (
                                <motion.div
                                  layoutId="activeIndicator"
                                  className="ml-2 w-2 h-2 bg-white rounded-full"
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
                                        
                                        className={`w-full flex items-center p-2 rounded-lg transition-all duration-200 text-sm ${
                                          isSubActive
                                            ? 'bg-white/30 text-white shadow-md'
                                            : 'text-white/80 hover:bg-white/20 hover:text-white'
                                        }`}
                                        whileHover={{ scale: 1.02, x: 4 }}
                                        whileTap={{ scale: 0.98 }}
                                      >
                                        <div className="flex-shrink-0">
                                          <SubIconComponent size={18} />
                                        </div>
                                        <span className="ml-3 font-medium whitespace-nowrap">
                                          {subItem.label}
                                        </span>
                                        {isSubActive && (
                                          <motion.div
                                            layoutId="subActiveIndicator"
                                            className="ml-auto w-1.5 h-1.5 bg-white rounded-full"
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
