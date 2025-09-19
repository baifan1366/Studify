"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { useResponsiveFont } from '@/hooks/use-responsive-font';
import { BookOpen, MessageCircle, Settings, User } from 'lucide-react';

/**
 * Demo component to show how font sizes affect different UI elements
 */
export function FontSizeDemo() {
  const { getResponsiveClass, getResponsiveStyle } = useResponsiveFont();

  return (
    <motion.div 
      className="p-4 bg-white/5 rounded-lg border border-white/10"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="space-y-4">
        {/* Heading Example */}
        <div>
          <h3 className={`font-semibold text-white ${getResponsiveClass('heading')}`}>
            Sample Heading
          </h3>
          <p className={`text-white/70 ${getResponsiveClass('small')}`}>
            This is how headings will appear
          </p>
        </div>

        {/* Body Text Example */}
        <div>
          <p className={`text-white ${getResponsiveClass('body')}`}>
            This is regular body text that you'll see throughout the application. 
            It includes paragraphs, descriptions, and most readable content.
          </p>
        </div>

        {/* UI Elements Example */}
        <div className="flex flex-wrap gap-2">
          <motion.button 
            className={`px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors ${getResponsiveClass('button')}`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Sample Button
          </motion.button>
          
          <div className={`px-3 py-1.5 bg-white/10 text-white/80 rounded-md ${getResponsiveClass('small')}`}>
            Small Text Label
          </div>
        </div>

        {/* Navigation Example */}
        <div className="flex items-center gap-4 p-2 bg-white/5 rounded-md">
          {[
            { icon: BookOpen, label: 'Courses' },
            { icon: MessageCircle, label: 'Messages' },
            { icon: Settings, label: 'Settings' },
            { icon: User, label: 'Profile' },
          ].map((item, index) => (
            <div key={index} className="flex items-center gap-2 text-white/80">
              <item.icon size={16} />
              <span className={getResponsiveClass('text')}>{item.label}</span>
            </div>
          ))}
        </div>

        {/* List Example */}
        <div>
          <h4 className={`font-medium text-white mb-2 ${getResponsiveClass('text')}`}>
            Sample List Items:
          </h4>
          <ul className="space-y-1">
            {['First item in the list', 'Second item with more text', 'Third item'].map((item, index) => (
              <li key={index} className={`text-white/70 ${getResponsiveClass('body')}`}>
                • {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </motion.div>
  );
}
