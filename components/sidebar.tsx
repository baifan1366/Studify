"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
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
  Route,
  MessageSquare,
  Trophy,
  Target,
  BookMarked,
  PlusCircle,
  UserPlus,
  Calendar as CalendarIcon,
  Presentation,
  FileQuestion,
  Award,
  TrendingUp,
  Library,
  Search,
  Heart,
  Share2,
  Edit3,
  Folder,
  Star,
  Clock,
  CheckSquare,
  Brain,
} from "lucide-react";

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
    title: "Main",
    items: [
      { id: "home", label: "Home", icon: Home, path: "/home" },
      {
        id: "dashboard",
        label: "Dashboard",
        icon: BarChart3,
        path: "/dashboard",
      },
      {
        id: "notifications",
        label: "Notifications",
        icon: Bell,
        path: "/notifications",
      },
      {
        id: "calendar",
        label: "Calendar",
        icon: CalendarIcon,
        path: "/calendar",
      },
    ],
  },
  {
    title: "Learning",
    items: [
      {
        id: "classroom",
        label: "Classroom",
        icon: Presentation,
        subItems: [
          {
            id: "my-classrooms",
            label: "My Classrooms",
            icon: BookOpen,
            path: "/classroom",
          },
          {
            id: "create-classroom",
            label: "Create Classroom",
            icon: PlusCircle,
            path: "/classroom/create",
          },
          {
            id: "join-classroom",
            label: "Join Classroom",
            icon: UserPlus,
            path: "/classroom/join",
          },
          {
            id: "assignments",
            label: "Assignments",
            icon: ClipboardList,
            path: "/classroom/assignments",
          },
          {
            id: "live-sessions",
            label: "Live Sessions",
            icon: Video,
            path: "/classroom/live-sessions",
          },
          {
            id: "mistake-book",
            label: "Mistake Book",
            icon: FileQuestion,
            path: "/classroom/mistake-book",
          },
        ],
      },
      {
        id: "courses",
        label: "Courses",
        icon: GraduationCap,
        subItems: [
          {
            id: "all-courses",
            label: "All Courses",
            icon: Library,
            path: "/courses",
          },
          {
            id: "my-courses",
            label: "My Courses",
            icon: BookMarked,
            path: "/my/courses",
          },
          {
            id: "favorites",
            label: "Favorites",
            icon: Heart,
            path: "/courses/favorites",
          },
          {
            id: "progress",
            label: "Progress",
            icon: TrendingUp,
            path: "/courses/progress",
          },
        ],
      },
      {
        id: "learning-path",
        label: "Learning Path",
        icon: Route,
        path: "/learning-path",
      },
    ],
  },
  {
    title: "Community",
    items: [
      {
        id: "community",
        label: "Community",
        icon: Users,
        subItems: [
          { id: "groups", label: "Groups", icon: Users, path: "/community" },
          {
            id: "discussions",
            label: "Discussions",
            icon: MessageSquare,
            path: "/community/discussions",
          },
          {
            id: "quizzes",
            label: "Quizzes",
            icon: Brain,
            path: "/community/quizzes",
          },
          {
            id: "achievements",
            label: "Achievements",
            icon: Award,
            path: "/community/achievements",
          },
        ],
      },
      { id: "messages", label: "Messages", icon: Mail, path: "/messages" },
    ],
  },
  {
    title: "Tools",
    items: [
      { id: "documents", label: "Documents", icon: Folder, path: "/documents" },
      { id: "search", label: "Search", icon: Search, path: "/search" },
      { id: "bookmarks", label: "Bookmarks", icon: Star, path: "/bookmarks" },
      { id: "recent", label: "Recent", icon: Clock, path: "/recent" },
      { id: "settings", label: "Settings", icon: Settings, path: "/settings" },
    ],
  },
];

export default function AnimatedSidebar({
  menuSections = defaultMenuSections,
  onItemClick,
  activeItem = "home",
  onExpansionChange,
  isPermanentlyExpanded = false,
}: AnimatedSidebarProps) {
  const t = useTranslations("Sidebar");
  const pathname = usePathname();
  const router = useRouter();
  const [isHovered, setIsHovered] = useState(false);
  const [currentActiveItem, setCurrentActiveItem] = useState(activeItem);
  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({});
  const [showSequentialAnimation, setShowSequentialAnimation] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const routeConfig = useMemo((): RouteConfigItem[] => {
    const config = menuSections.flatMap((section) =>
      section.items.flatMap((item) => {
        const items: {
          pathFragment: string | undefined;
          id: string;
          expands: string | undefined;
        }[] = [];
        // Add parent item itself, if it's a link
        if (item.path) {
          items.push({
            pathFragment: item.path,
            id: item.id,
            expands: undefined,
          });
        }
        // Add any sub-items
        if (item.subItems) {
          items.push(
            ...item.subItems.map((subItem) => ({
              pathFragment: subItem.path,
              id: subItem.id,
              expands: item.id,
            }))
          );
        }
        return items;
      })
    );

    const validConfig = config.filter(
      (i): i is RouteConfigItem => !!i.pathFragment
    );

    // Sort by path length descending to match specific paths first
    return validConfig.sort(
      (a, b) => b.pathFragment.length - a.pathFragment.length
    );
  }, [menuSections]);

  const getLabelForItem = (id: string) => {
    switch (id) {
      case "home":
        return t("home_label");
      case "dashboard":
        return t("dashboard_label");
      case "notifications":
        return t("notifications_label");
      case "calendar":
        return t("calendar_label");
      case "classroom":
        return t("classroom_label");
      case "my-classrooms":
        return t("my_classrooms_label");
      case "create-classroom":
        return t("create_classroom_label");
      case "join-classroom":
        return t("join_classroom_label");
      case "assignments":
        return t("assignments_label");
      case "live-sessions":
        return t("live_sessions_label");
      case "mistake-book":
        return t("mistake_book_label");
      case "courses":
        return t("courses_label");
      case "all-courses":
        return t("all_courses_label");
      case "my-courses":
        return t("my_courses_label");
      case "favorites":
        return t("favorites_label");
      case "progress":
        return t("progress_label");
      case "learning-path":
        return t("learning_path_label");
      case "community":
        return t("community_label");
      case "groups":
        return t("groups_label");
      case "discussions":
        return t("discussions_label");
      case "quizzes":
        return t("quizzes_label");
      case "achievements":
        return t("achievements_label");
      case "messages":
        return t("messages_label");
      case "documents":
        return t("documents_label");
      case "search":
        return t("search_label");
      case "bookmarks":
        return t("bookmarks_label");
      case "recent":
        return t("recent_label");
      case "settings":
        return t("settings_label");
      default:
        return "";
    }
  };

  const handleMouseEnter = () => {
    if (!isPermanentlyExpanded) {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
      setIsHovered(true);
    }
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    if (!isPermanentlyExpanded) {
      setIsHovered(false);
    }
  };

  // Trigger sequential animation when permanently expanded
  useEffect(() => {
    if (isPermanentlyExpanded) {
      setShowSequentialAnimation(true);
    } else {
      setShowSequentialAnimation(false);
    }
  }, [isPermanentlyExpanded]);

  // Automatically determine active item based on current route
  useEffect(() => {
    const currentPath = pathname || "";
    const activeRoute = routeConfig.find(
      (route) => route.pathFragment && currentPath.includes(route.pathFragment)
    );

    setCurrentActiveItem(activeRoute?.id || activeItem);

    if (activeRoute && typeof activeRoute.expands === "string") {
      setExpandedSections((prev) => ({
        ...prev,
        [activeRoute.expands as string]: true,
      }));
    }
  }, [pathname, activeItem, routeConfig]);

  // Auto-close expanded sections when sidebar is collapsed
  useEffect(() => {
    if (!isPermanentlyExpanded && !isHovered) {
      const timer = setTimeout(() => {
        setExpandedSections({});
      }, 150);
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
    document.documentElement.style.setProperty(
      "--sidebar-width",
      `${sidebarWidth}px`
    );
  }, [isExpanded, onExpansionChange]);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  // Get button index for sequential animation
  const getButtonIndex = (sectionIndex: number, itemIndex: number): number => {
    let index = 0;
    for (let i = 0; i < sectionIndex; i++) {
      index += menuSections[i].items.length;
    }
    return index + itemIndex;
  };

  const sidebarVariants = {
    collapsed: {
      width: "80px",
      transition: {
        type: "spring" as const,
        stiffness: 300,
        damping: 35,
        mass: 0.8,
        velocity: 2,
      },
    },
    expanded: {
      width: "280px",
      transition: {
        ease: [0.25, 0.46, 0.45, 0.94] as const,
      },
    },
  };

  const sequentialFloatVariants = {
    hidden: {
      opacity: 0,
      x: -50,
      scale: 0.8,
    },
    visible: {
      opacity: 1,
      x: 0,
      scale: 1,
      transition: {
        delay: 0,
        duration: 0.6,
        ease: [0.25, 0.46, 0.45, 0.94] as const,
        type: "spring" as const,
        stiffness: 200,
        damping: 20,
      },
    },
  };

  const itemVariants = {
    collapsed: {
      justifyContent: "center",
      transition: {
        duration: 1,
        ease: [0.25, 0.46, 0.45, 0.94] as const,
      },
    },
    expanded: {
      justifyContent: "flex-start",
      transition: {
        duration: 1,
      },
    },
  };

  const textVariants = {
    hidden: {
      opacity: 0,
      x: -15,
      transition: {
        duration: 1,
        ease: "easeOut" as const,
      },
    },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        delay: 0.02,
        duration: 1,
        ease: [0.25, 0.46, 0.45, 0.94] as const,
      },
    },
  };

  const iconVariants = {
    collapsed: {
      scale: 1,
      transition: {
        duration: 1,
        ease: "easeOut" as const,
      },
    },
    expanded: {
      scale: 1.05,
      transition: {
        duration: 1,
        ease: "easeOut" as const,
      },
    },
  };

  const toggleSectionExpansion = (sectionId: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

  const handleItemClick = (itemId: string) => {
    setCurrentActiveItem(itemId);

    // Find the menu item to get its path (including sub-items)
    const allItems = menuSections.flatMap((section) =>
      section.items.flatMap((item) =>
        item.subItems ? [item, ...item.subItems] : [item]
      )
    );
    const clickedItem = allItems.find((item) => item.id === itemId);

    if (clickedItem?.path) {
      // Get current locale from pathname
      const currentLocale = pathname?.split("/")[1] || "en";
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
        animate={isExpanded ? "expanded" : "collapsed"}
        className="fixed left-0 top-16 h-[calc(100vh-4rem)] shadow-lg z-20 flex flex-col backdrop-blur-md overflow-hidden"
        style={{
          backgroundColor: "hsl(var(--sidebar))",
          color: "hsl(var(--sidebar-foreground))",
        }}
      >
        {/* Navigation */}
        <nav
          className="flex-1 p-4 overflow-y-auto scrollbar-hide"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          style={{
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
        >
          <div className="space-y-6">
            {menuSections.map((section, sectionIndex) => (
              <div key={section.title}>
                {/* Section Items */}
                <ul className="space-y-2">
                  {section.items.map((item, itemIndex) => {
                    const IconComponent = item.icon;
                    const isActive = currentActiveItem === item.id;
                    const hasSubItems =
                      item.subItems && item.subItems.length > 0;
                    const isDropdownExpanded =
                      expandedSections[item.id] || false;
                    const buttonIndex = getButtonIndex(sectionIndex, itemIndex);

                    if (hasSubItems) {
                      return (
                        <li key={item.id}>
                          <div>
                            <motion.button
                              variants={
                                showSequentialAnimation
                                  ? sequentialFloatVariants
                                  : itemVariants
                              }
                              animate={
                                showSequentialAnimation
                                  ? "visible"
                                  : isExpanded
                                  ? "expanded"
                                  : "collapsed"
                              }
                              custom={buttonIndex}
                              initial={
                                showSequentialAnimation ? "hidden" : undefined
                              }
                              onClick={() => {
                                if (!isExpanded) {
                                  // If sidebar is collapsed, navigate to the main page
                                  handleItemClick(item.id);
                                } else {
                                  // If sidebar is expanded, toggle dropdown
                                  toggleSectionExpansion(item.id);
                                }
                              }}
                              className={`w-full flex items-center p-3 rounded-xl transition-all duration-100 ${
                                isActive
                                  ? "bg-transparent dark:bg-transparent text-foreground border-l-4 border-orange-500 dark:border-green-900"
                                  : "hover:bg-transparent dark:bg-transparent text-foreground border-l-4 border-transparent hover:border-orange-400 dark:hover:border-green-600"
                              }`}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                            >
                              <motion.div
                                variants={iconVariants}
                                animate={isExpanded ? "expanded" : "collapsed"}
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
                                    className="ml-4 font-medium whitespace-nowrap overflow-hidden"
                                  >
                                    {getLabelForItem(item.id)}
                                  </motion.span>
                                )}
                              </AnimatePresence>

                              {/* Dropdown indicator */}
                              {isExpanded && (
                                <motion.div
                                  animate={{
                                    rotate: isDropdownExpanded ? 180 : 0,
                                  }}
                                  transition={{ duration: 0.2 }}
                                  className="ml-auto"
                                >
                                  <ChevronDown
                                    size={16}
                                    className="dark:text-white/60 text-gray-800"
                                  />
                                </motion.div>
                              )}

                              {isActive && (
                                <motion.div
                                  layoutId="activeIndicator"
                                  className={`${
                                    isExpanded ? "ml-2" : "ml-auto"
                                  } w-2 h-2 bg-orange-500 dark:bg-green-900 rounded-full`}
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  transition={{
                                    type: "spring",
                                    stiffness: 500,
                                    damping: 30,
                                  }}
                                />
                              )}
                            </motion.button>

                            {/* Sub-items dropdown */}
                            <AnimatePresence>
                              {isDropdownExpanded && isExpanded && (
                                <motion.div
                                  className="ml-6 mt-2 space-y-1 overflow-hidden"
                                  variants={{
                                    hidden: {
                                      opacity: 0,
                                      height: 0,
                                      scaleY: 0.8,
                                      transition: {
                                        duration: 0.3,
                                        ease: "easeOut" as const,
                                      },
                                    },
                                    visible: {
                                      opacity: 1,
                                      height: "auto",
                                      scaleY: 1,
                                      transition: {
                                        duration: 0.3,
                                        ease: [0.25, 0.46, 0.45, 0.94] as const,
                                      },
                                    },
                                  }}
                                  initial="hidden"
                                  animate="visible"
                                  exit="hidden"
                                >
                                  {item.subItems?.map((subItem) => {
                                    const SubIconComponent = subItem.icon;
                                    const isSubActive =
                                      currentActiveItem === subItem.id;

                                    return (
                                      <motion.button
                                        key={subItem.id}
                                        onClick={() =>
                                          handleItemClick(subItem.id)
                                        }
                                        className="flex items-center w-full py-1 px-2 rounded-md hover:bg-transparent text-foreground cursor-pointer transition-all duration-150 border-l-2 border-transparent hover:border-orange-300 dark:hover:border-green-600"
                                        whileHover={{ scale: 1.02, x: 4 }}
                                        whileTap={{ scale: 0.98 }}
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{
                                          delay: 0.01,
                                          duration: 0.3,
                                        }}
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
                                            transition={{
                                              type: "spring",
                                              stiffness: 500,
                                              damping: 30,
                                            }}
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
                          variants={
                            showSequentialAnimation
                              ? sequentialFloatVariants
                              : itemVariants
                          }
                          animate={
                            showSequentialAnimation
                              ? "visible"
                              : isExpanded
                              ? "expanded"
                              : "collapsed"
                          }
                          custom={buttonIndex}
                          initial={
                            showSequentialAnimation ? "hidden" : undefined
                          }
                          onClick={() => handleItemClick(item.id)}
                          className={`w-full flex items-center p-3 rounded-xl transition-all duration-100 ${
                            isActive
                              ? "bg-transparent dark:bg-transparent text-foreground border-l-4 border-orange-500 dark:border-green-900"
                              : "hover:bg-transparent dark:hover:bg-transparent text-foreground border-l-4 border-transparent hover:border-orange-300 dark:hover:border-green-600"
                          }`}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <motion.div
                            variants={iconVariants}
                            animate={isExpanded ? "expanded" : "collapsed"}
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
                                className="ml-4 font-medium whitespace-nowrap overflow-hidden"
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
                              transition={{
                                type: "spring",
                                stiffness: 500,
                                damping: 30,
                              }}
                            />
                          )}
                        </motion.button>
                      </li>
                    );
                  })}
                </ul>

                {sectionIndex < menuSections.length - 1 && (
                  <motion.div
                    className="mt-4 border-b border-white/10"
                    animate={{ opacity: isExpanded ? 0.3 : 0.1 }}
                    transition={{ duration: 1 }}
                  />
                )}
              </div>
            ))}
          </div>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-white/20">
          <motion.button
            variants={
              showSequentialAnimation ? sequentialFloatVariants : itemVariants
            }
            animate={
              showSequentialAnimation
                ? "visible"
                : isExpanded
                ? "expanded"
                : "collapsed"
            }
            custom={menuSections.reduce(
              (total, section) => total + section.items.length,
              0
            )} // Last button index
            initial={showSequentialAnimation ? "hidden" : undefined}
            className="w-full flex items-center p-3 rounded-xl hover:bg-transparent dark:hover:bg-transparent text-foreground transition-all duration-100 border-l-4 border-transparent hover:border-orange-400 dark:hover:border-green-600"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <motion.div
              variants={iconVariants}
              animate={isExpanded ? "expanded" : "collapsed"}
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
                  className="ml-4 font-medium whitespace-nowrap overflow-hidden"
                >
                  {t("logout_button")}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        </div>
      </motion.div>
    </>
  );
}
