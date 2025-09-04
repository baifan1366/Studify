'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, MoreVertical } from 'lucide-react';

interface SidebarProps {
  onSelectChannel: (channel: string) => void;
  activeChannel: string;
}

export function MSidebar({ onSelectChannel, activeChannel }: SidebarProps) {
  const [showHidden, setShowHidden] = useState(false);

  return (
    <div className="w-[200px] min-w-[200px] bg-gray-850 text-gray-100 border-r border-gray-700 flex flex-col">
      {/* 返回按钮 */}
      <div className="p-3 border-b border-gray-700 text-sm text-purple-400 cursor-pointer hover:underline">
        ‹ All teams
      </div>

      {/* 信息 */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <div className="flex items-center space-x-3">
          <div className="bg-orange-600 text-white font-bold text-lg h-12 w-12 flex items-center justify-center rounded">
            L2
          </div>
          <div>
            <div className="font-semibold">ClassID</div>
          </div>
        </div>
        <MoreVertical size={18} className="text-gray-400 cursor-pointer" />
      </div>

      {/* 内导航 */}
      <div className="flex space-x-4 px-4 py-3 text-sm border-b border-gray-700 overflow-x-auto scrollbar-hide">
        {['Home page', 'Class Notebook', 'Classwork', 'Assignments', 'Grades', 'Reflect'].map((tab) => (
          <button
            key={tab}
            className="whitespace-nowrap text-gray-300 hover:text-white"
          >
            {tab}
          </button>
        ))}
      </div>

      {/* 频道列表 */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-2 text-xs uppercase text-gray-400">Main Channels</div>
        <div
          onClick={() => onSelectChannel('General')}
          className={`flex justify-between items-center px-4 py-2 text-sm cursor-pointer rounded-md ${
            activeChannel === 'General' ? 'bg-gray-700' : 'hover:bg-gray-800'
          }`}
        >
          <span>General</span>
          <MoreVertical size={16} className="text-gray-400" />
        </div>
        <div
          onClick={() => onSelectChannel('Notes')}
          className={`flex justify-between items-center px-4 py-2 text-sm cursor-pointer rounded-md ${
            activeChannel === 'Notes' ? 'bg-gray-700' : 'hover:bg-gray-800'
          }`}
        >
          <span>Notes</span>
        </div>

        {/* Hidden Channels */}
        <div
          onClick={() => setShowHidden(!showHidden)}
          className="flex items-center px-4 py-2 text-sm text-gray-400 hover:text-white cursor-pointer"
        >
          <ChevronDown
            size={16}
            className={`mr-2 transition-transform ${!showHidden ? '-rotate-90' : ''}`}
          />
          Hidden channels
        </div>
        <AnimatePresence>
          {showHidden && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="pl-6"
            >
              <div className="py-1 text-sm text-gray-300">Private Chat</div>
              <div className="py-1 text-sm text-gray-300">Archived</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
