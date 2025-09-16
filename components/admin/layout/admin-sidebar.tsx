// components/admin/layout/admin-sidebar.tsx

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Users,
  Shield,
  BarChart3,
  Settings,
  Bell,
  FileText,
  Activity,
  ChevronDown,
  ChevronRight,
  Home,
  BookOpen,
  MessageSquare,
  Calendar,
  AlertTriangle
} from 'lucide-react';

interface AdminSidebarProps {
  className?: string;
}

interface NavItem {
  title: string;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: NavItem[];
  badge?: string | number;
}

const navigation: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/admin',
    icon: Home,
  },
  {
    title: 'User Management',
    icon: Users,
    children: [
      { title: 'All Users', href: '/admin/users', icon: Users },
      { title: 'Roles & Permissions', href: '/admin/roles', icon: Shield },
      { title: 'Banned Users', href: '/admin/users/banned', icon: Users },
    ],
  },
  {
    title: 'Content Management',
    icon: BookOpen,
    children: [
      { title: 'Courses', href: '/admin/courses', icon: BookOpen },
      { title: 'Community Posts', href: '/admin/community', icon: MessageSquare },
      { title: 'Classrooms', href: '/admin/classrooms', icon: Users },
      { title: 'Reports', href: '/admin/reports', icon: AlertTriangle },
    ],
  },
  {
    title: 'Analytics',
    href: '/admin/analytics',
    icon: BarChart3,
  },
  {
    title: 'Reports',
    icon: FileText,
    children: [
      { title: 'User Reports', href: '/admin/reports/users', icon: FileText },
      { title: 'Content Reports', href: '/admin/reports/content', icon: FileText },
      { title: 'Audit Logs', href: '/admin/reports/audit', icon: Activity },
    ],
  },
  {
    title: 'Announcements',
    href: '/admin/announcements',
    icon: Bell,
  },
  {
    title: 'Settings',
    href: '/admin/settings',
    icon: Settings,
  },
];

export function AdminSidebar({ className }: AdminSidebarProps) {
  const pathname = usePathname();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  const toggleExpanded = (title: string) => {
    setExpandedItems(prev =>
      prev.includes(title)
        ? prev.filter(item => item !== title)
        : [...prev, title]
    );
  };

  const isActive = (href?: string) => {
    if (!href) return false;
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const isParentActive = (children?: NavItem[]) => {
    if (!children) return false;
    return children.some(child => isActive(child.href));
  };

  const renderNavItem = (item: NavItem, level = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.includes(item.title);
    const itemIsActive = isActive(item.href) || isParentActive(item.children);

    if (hasChildren) {
      return (
        <div key={item.title}>
          <button
            onClick={() => toggleExpanded(item.title)}
            className={cn(
              'w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors',
              'hover:bg-gray-100 dark:hover:bg-gray-800',
              itemIsActive && 'bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
              level > 0 && 'ml-4'
            )}
          >
            <div className="flex items-center">
              <item.icon className="mr-3 h-4 w-4" />
              <span>{item.title}</span>
              {item.badge && (
                <span className="ml-2 px-2 py-0.5 text-xs bg-red-100 text-red-600 rounded-full">
                  {item.badge}
                </span>
              )}
            </div>
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
          {isExpanded && (
            <div className="mt-1 space-y-1">
              {item.children?.map(child => renderNavItem(child, level + 1))}
            </div>
          )}
        </div>
      );
    }

    return (
      <Link
        key={item.title}
        href={item.href!}
        className={cn(
          'flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors',
          'hover:bg-gray-100 dark:hover:bg-gray-800',
          itemIsActive && 'bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
          level > 0 && 'ml-4'
        )}
      >
        <item.icon className="mr-3 h-4 w-4" />
        <span>{item.title}</span>
        {item.badge && (
          <span className="ml-auto px-2 py-0.5 text-xs bg-red-100 text-red-600 rounded-full">
            {item.badge}
          </span>
        )}
      </Link>
    );
  };

  return (
    <div className={cn('flex flex-col w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800', className)}>
      <div className="flex items-center h-16 px-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center">
          <Shield className="h-8 w-8 text-blue-600" />
          <span className="ml-2 text-xl font-bold text-gray-900 dark:text-white">
            Admin Panel
          </span>
        </div>
      </div>
      
      <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
        {navigation.map(item => renderNavItem(item))}
      </nav>

      <div className="p-4 border-t border-gray-200 dark:border-gray-800">
        <div className="text-xs text-gray-500 dark:text-gray-400">
          Studify Admin v1.0
        </div>
      </div>
    </div>
  );
}
