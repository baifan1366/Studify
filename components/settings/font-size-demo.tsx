"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { useResponsiveFont } from '@/hooks/use-responsive-font';
import { BookOpen, MessageCircle, Settings, User } from 'lucide-react';
import { useTranslations } from 'next-intl';

/**
 * Demo component to show how font sizes affect different UI elements
 */
export function FontSizeDemo() {
  const { getResponsiveClass, getResponsiveStyle } = useResponsiveFont();
  const t = useTranslations('FontSizeDemo');

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
            {t('sample_heading')}
          </h3>
          <p className={`text-white/70 ${getResponsiveClass('small')}`}>
            {t('heading_description')}
          </p>
        </div>

        {/* Body Text Example */}
        <div>
          <p className={`text-white ${getResponsiveClass('body')}`}>
            {t('body_text_description')}
          </p>
        </div>

        {/* UI Elements Example */}
        <div className="flex flex-wrap gap-2">
          <motion.button 
            className={`px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors ${getResponsiveClass('button')}`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {t('sample_button')}
          </motion.button>
          
          <div className={`px-3 py-1.5 bg-white/10 text-white/80 rounded-md ${getResponsiveClass('small')}`}>
            {t('small_text_label')}
          </div>
        </div>

        {/* Navigation Example */}
        <div className="flex items-center gap-4 p-2 bg-white/5 rounded-md">
          {[
            { icon: BookOpen, label: t('nav_courses') },
            { icon: MessageCircle, label: t('nav_messages') },
            { icon: Settings, label: t('nav_settings') },
            { icon: User, label: t('nav_profile') },
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
            {t('list_title')}
          </h4>
          <ul className="space-y-1">
            {[t('list_item_1'), t('list_item_2'), t('list_item_3')].map((item, index) => (
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
