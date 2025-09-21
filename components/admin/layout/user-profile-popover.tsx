"use client";

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Settings, LogOut, ChevronRight, UserCircle, Users, Check } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useUser } from '@/hooks/profile/use-user';
import { useLogout } from '@/hooks/profile/use-logout';
import Image from 'next/image';

interface UserProfilePopoverProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
}

export default function UserProfilePopover({ isOpen, onClose, triggerRef }: UserProfilePopoverProps) {
  const t = useTranslations('UserProfile');
  const router = useRouter();
  const { data: userData } = useUser();
  const logoutMutation = useLogout();
  const popoverRef = useRef<HTMLDivElement>(null);
  const [showAccountSwitcher, setShowAccountSwitcher] = useState(false);

  const user = userData;
  const profile = user?.profile;
  const userDisplayName = profile?.display_name || user?.user_metadata?.full_name || '';
  const userEmail = user?.email || '';
  const userName = userDisplayName || userEmail?.split('@')[0] || 'Unknown User';
  const userAvatar = profile?.avatar_url || user?.user_metadata?.avatar_url || '';


  // Mock data for switched accounts - in real app, this would come from localStorage or API
  const switchedAccounts = [
    {
      id: user?.id || 'current',
      email: userEmail,
      name: userName,
      avatar: userAvatar,
      isCurrent: true
    }
    // Add other accounts from localStorage if they exist
  ];

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose, triggerRef]);

  const handleProfileClick = () => {
    router.push('/admin/profile');
    onClose();
  };

  const handleSettingsClick = () => {
    router.push('/admin/settings');
    onClose();
  };

  const handleLogout = () => {
    logoutMutation.mutate();
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={popoverRef}
          className="absolute top-full right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50"
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          {/* User Info Section */}
          <div className="p-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-full overflow-hidden bg-white/20 flex items-center justify-center">
                {userAvatar ? (
                  <Image
                    src={userAvatar}
                    alt="Profile"
                    width={48}
                    height={48}
                    className="w-full h-full object-cover rounded-full"
                  />
                ) : (
                  <UserCircle size={32} className="text-white" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                {userDisplayName && userDisplayName.trim() && userDisplayName !== 'x' ? (
                  <>
                    <h3 className="font-semibold text-lg truncate">{userDisplayName}</h3>
                    <p className="text-white/80 text-sm truncate">{userEmail}</p>
                  </>
                ) : (
                  <>
                    <h3 className="font-semibold text-lg truncate">{userEmail?.split('@')[0] || 'User'}</h3>
                    <p className="text-white/80 text-sm truncate">{userEmail}</p>
                  </>
                )}
                {profile?.role && (
                  <span className="inline-block px-2 py-1 bg-white/20 rounded-full text-xs font-medium mt-1 capitalize">
                    {profile.role}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="py-2">
            {/* Profile */}
            <motion.button
              onClick={handleProfileClick}
              className="w-full flex items-center justify-between px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              whileHover={{ x: 4 }}
              transition={{ duration: 0.1 }}
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                  <User size={16} className="text-blue-600 dark:text-blue-400" />
                </div>
                <span className="font-medium">{t('profile')}</span>
              </div>
              <ChevronRight size={16} className="text-gray-400 dark:text-gray-500" />
            </motion.button>

            {/* Settings */}
            <motion.button
              onClick={handleSettingsClick}
              className="w-full flex items-center justify-between px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              whileHover={{ x: 4 }}
              transition={{ duration: 0.1 }}
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                  <Settings size={16} className="text-gray-600 dark:text-gray-400" />
                </div>
                <span className="font-medium">{t('settings')}</span>
              </div>
              <ChevronRight size={16} className="text-gray-400 dark:text-gray-500" />
            </motion.button>

            {/* Divider */}
            <div className="my-2 border-t border-gray-100 dark:border-gray-700"></div>

            {/* Logout */}
            <motion.button
              onClick={handleLogout}
              className="w-full flex items-center justify-between px-4 py-3 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              whileHover={{ x: 4 }}
              transition={{ duration: 0.1 }}
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/50 flex items-center justify-center">
                  <LogOut size={16} className="text-red-600 dark:text-red-400" />
                </div>
                <span className="font-medium">{logoutMutation.isPending ? t('signing_out') : t('sign_out')}</span>
              </div>
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
