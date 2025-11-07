"use client";

import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Search, Bell, User, Settings, Menu, X } from 'lucide-react';
import { ThemeSwitcher } from '@/components/ui/theme-switcher';
import { useUser } from '@/hooks/profile/use-user';
import Image from 'next/image';
import UserProfilePopover from '@/components/tutor/layout/user-profile-popover';
import MegaImage from '@/components/attachment/mega-blob-image';

interface ClassroomHeaderProps {
  title?: string;
  onSearchClick?: () => void;
  onNotificationClick?: () => void;
  onProfileClick?: () => void;
  onSettingsClick?: () => void;
  sidebarExpanded?: boolean;
  onMenuToggle?: () => void;
}

export default function ClassroomHeader({
  title,
  onProfileClick,
  sidebarExpanded = false,
  onMenuToggle
}: ClassroomHeaderProps) {
  const { data: userData, isLoading, error } = useUser();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const profileButtonRef = useRef<HTMLButtonElement>(null);
  
  
  const resolvedUserName = userData?.profile?.display_name || userData?.email || 'User';
  const userAvatar = userData?.profile?.avatar_url || '';

  const handleProfileClick = () => {
    if (onProfileClick) {
      onProfileClick();
    } else {
      setIsPopoverOpen(!isPopoverOpen);
    }
  };
  return (
    <motion.header
      className="fixed top-0 left-0 right-0 h-16 z-30 backdrop-blur-md border-b border-border/40 dark:bg-[#0D1F1A]/80 bg-[#FDF5E6]/80 text-foreground"
      style={{
        backdropFilter: 'blur(16px) saturate(180%)',
        WebkitBackdropFilter: 'blur(16px) saturate(180%)',
      }}
      initial={{ y: -64 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      <div className="flex items-center justify-between h-full px-6">
        {/* Left side - Menu Button and Title */}
        <div className="flex items-center gap-4">
          {/* Menu Toggle Button - Hidden on mobile */}
          <motion.button
            onClick={onMenuToggle}
            className="hidden md:block p-2 rounded-lg transition-colors hover:bg-accent/50"
            style={{
              backdropFilter: 'blur(16px) saturate(180%)',
              WebkitBackdropFilter: 'blur(16px) saturate(180%)',
            }}
            whileHover={{
              scale: 1.1,
            }}
            whileTap={{ scale: 0.95 }}
          >
            <motion.div
              animate={{ rotate: sidebarExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              {sidebarExpanded ? <X size={20} className="dark:text-white text-gray-800" /> : <Menu size={20} className="dark:text-white text-gray-800" />}
            </motion.div>
          </motion.button>

          {/* Title */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.3 }}
          >
            <div className="flex items-center gap-3">
              <img 
                src="/favicon.png" 
                alt="Studify Logo" 
                className="w-8 h-8 rounded-md"
              />
              <h1 className="text-xl font-bold text-foreground truncate max-w-md">
                {title}
              </h1>
            </div>
          </motion.div>
        </div>
        {/* <div className="flex items-center gap-4">
          <ThemeSwitcher />
        </div> */}
        {/* Right side - Actions */}
        <motion.div
          className="flex items-center space-x-4"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3, duration: 0.3 }}
        >

          {/* Profile Button */}
          <div className="relative">
            <motion.button
              ref={profileButtonRef}
              onClick={handleProfileClick}
              className="flex items-center space-x-2 p-2 rounded-lg text-foreground/80 hover:text-foreground hover:bg-background/80 transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary overflow-hidden">
                {userAvatar ? (
                  userAvatar.includes('mega.nz') ? (
                    <MegaImage
                      megaUrl={userAvatar}
                      alt="Profile"
                      className="w-full h-full object-cover rounded-full"
                    />
                  ) : (
                    <Image
                      src={userAvatar}
                      alt="Profile"
                      width={32}
                      height={32}
                      className="w-full h-full object-cover rounded-full"
                    />
                  )
                ) : (
                  <User size={16} className="text-white" />
                )}
              </div>
              <span className="text-sm font-medium text-foreground hidden sm:block">
                {resolvedUserName}
              </span>
            </motion.button>
            
            <UserProfilePopover
              isOpen={isPopoverOpen}
              onClose={() => setIsPopoverOpen(false)}
              triggerRef={profileButtonRef}
            />
          </div>
        </motion.div>
      </div>
    </motion.header>
  );
}
