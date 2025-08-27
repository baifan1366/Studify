"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Search, Bell, User, Settings, Menu, X } from 'lucide-react';

interface ClassroomHeaderProps {
  title?: string;
  userName?: string;
  onSearchClick?: () => void;
  onNotificationClick?: () => void;
  onProfileClick?: () => void;
  onSettingsClick?: () => void;
  sidebarExpanded?: boolean;
  onMenuToggle?: () => void;
}

export default function ClassroomHeader({
  title = "Classroom",
  userName = "Student",
  onProfileClick,
  sidebarExpanded = false,
  onMenuToggle
}: ClassroomHeaderProps) {
  return (
    <motion.header
      className="fixed top-0 left-0 right-0 h-16 z-30 backdrop-blur-md"
      style={{
        backgroundColor: 'rgba(44, 66, 95, 0.4)', // More transparent for better sphere visibility
        backdropFilter: 'blur(16px) saturate(190%)',
        WebkitBackdropFilter: 'blur(16px) saturate(190%)',
      }}
      initial={{ y: -64 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      <div className="flex items-center justify-between h-full px-6">
        {/* Left side - Menu Button and Title */}
        <div className="flex items-center gap-4">
          {/* Menu Toggle Button */}
          <motion.button
            onClick={onMenuToggle}
            className="p-2 rounded-lg backdrop-blur-sm transition-colors"
            style={{ backgroundColor: 'rgba(44, 66, 95, 0.7)' }}
            whileHover={{
              scale: 1.1,
            }}
            whileTap={{ scale: 0.95 }}
          >
            <motion.div
              animate={{ rotate: sidebarExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              {sidebarExpanded ? <X size={20} className="text-white" /> : <Menu size={20} className="text-white" />}
            </motion.div>
          </motion.button>

          {/* Title */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.3 }}
          >
            <h1 className="text-xl font-bold text-white">
              {title}
            </h1>
          </motion.div>
        </div>

        {/* Right side - Actions */}
        <motion.div
          className="flex items-center space-x-4"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3, duration: 0.3 }}
        >

          {/* Profile Button */}
          <motion.button
            onClick={onProfileClick}
            className="flex items-center space-x-2 p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
              <User size={16} className="text-white" />
            </div>
            <span className="text-sm font-medium text-white hidden sm:block">
              {userName}
            </span>
          </motion.button>
        </motion.div>
      </div>
    </motion.header>
  );
}
