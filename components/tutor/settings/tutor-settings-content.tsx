"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Settings, 
  User, 
  Bell, 
  Shield, 
  Palette, 
  Globe, 
  Database,
  CreditCard,
  DollarSign
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import SettingsContent from '@/components/settings/settings-content';
import StripeConnectSetup from '@/components/tutor/stripe-connect-setup';
import { useUser } from '@/hooks/profile/use-user';

type TutorSettingsTab = 'account' | 'notifications' | 'privacy' | 'appearance' | 'language' | 'data' | 'payments' | 'earnings';

export default function TutorSettingsContent() {
  const t = useTranslations('TutorSettingsContent');
  const { data: userData } = useUser();
  const [activeTab, setActiveTab] = useState<TutorSettingsTab>('payments');

  const tutorTabs = [
    { id: 'payments', label: t('payments'), icon: CreditCard },
    { id: 'earnings', label: t('earnings'), icon: DollarSign },
    { id: 'account', label: t('account'), icon: User },
    { id: 'notifications', label: t('notifications'), icon: Bell },
    { id: 'privacy', label: t('privacy'), icon: Shield },
    { id: 'appearance', label: t('appearance'), icon: Palette },
    { id: 'language', label: t('language'), icon: Globe },
    { id: 'data', label: t('data'), icon: Database }
  ] as const;

  const renderTutorTabContent = () => {
    switch (activeTab) {
      case 'payments':
        return (
          <div className="space-y-6">
            <div>
              <h4 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-2">
                <CreditCard size={20} />
                {t('payment_settings')}
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                {t('payment_settings_desc')}
              </p>
            </div>

            {/* Stripe Connect Setup */}
            <StripeConnectSetup />

            {/* Payment Information */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 sm:p-6">
              <h5 className="font-semibold text-blue-900 dark:text-blue-100 mb-3 flex items-center gap-2">
                <DollarSign size={18} />
                {t('how_payments_work')}
              </h5>
              <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-0.5">•</span>
                  <span>{t('payment_info_1')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-0.5">•</span>
                  <span>{t('payment_info_2')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-0.5">•</span>
                  <span>{t('payment_info_3')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-0.5">•</span>
                  <span>{t('payment_info_4')}</span>
                </li>
              </ul>
            </div>
          </div>
        );

      case 'earnings':
        return (
          <div className="space-y-6">
            <div>
              <h4 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-2">
                <DollarSign size={20} />
                {t('earnings_overview')}
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                {t('earnings_overview_desc')}
              </p>
            </div>

            {/* Earnings Dashboard Link */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-xl p-6">
              <h5 className="font-semibold text-green-900 dark:text-green-100 mb-3">
                {t('view_detailed_earnings')}
              </h5>
              <p className="text-sm text-green-800 dark:text-green-200 mb-4">
                {t('earnings_dashboard_desc')}
              </p>
              <motion.a
                href="/tutor/dashboard"
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <DollarSign size={16} />
                {t('go_to_earnings_dashboard')}
              </motion.a>
            </div>

            {/* Earnings Information */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 sm:p-6 border border-gray-200 dark:border-gray-600">
              <h5 className="font-semibold text-gray-900 dark:text-white mb-3">
                {t('earnings_breakdown')}
              </h5>
              <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
                <div className="flex justify-between items-center pb-2 border-b border-gray-200 dark:border-gray-600">
                  <span>{t('platform_commission')}</span>
                  <span className="font-semibold">10%</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-gray-200 dark:border-gray-600">
                  <span>{t('tutor_earnings')}</span>
                  <span className="font-semibold text-green-600 dark:text-green-400">90%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>{t('payout_schedule')}</span>
                  <span className="font-semibold">{t('every_7_days')}</span>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        // For other tabs, use the default SettingsContent component
        return null;
    }
  };

  // If it's a standard settings tab, render the default SettingsContent
  if (!['payments', 'earnings'].includes(activeTab)) {
    return <SettingsContent />;
  }

  return (
    <div className="min-h-screen w-full bg-transparent p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          className="mb-4 sm:mb-6 lg:mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-2">
            {t('page_title')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">
            {t('page_subtitle')}
          </p>
        </motion.div>

        <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 lg:gap-8">
          {/* Settings Navigation */}
          <motion.div
            className="w-full lg:w-80 lg:flex-shrink-0"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-3 sm:p-4 lg:p-6 lg:sticky lg:top-6">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4 flex items-center gap-2">
                <Settings size={18} className="sm:w-5 sm:h-5" />
                {t('settings')}
              </h3>
              
              <nav className="space-y-1 overflow-x-auto lg:overflow-x-visible">
                <div className="flex lg:flex-col gap-2 lg:gap-1 pb-2 lg:pb-0">
                  {tutorTabs.map((tab) => (
                    <motion.button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-2 sm:gap-3 px-3 py-2 sm:py-2.5 rounded-lg text-left transition-all duration-200 whitespace-nowrap lg:w-full ${
                        activeTab === tab.id
                          ? 'bg-blue-500 text-white shadow-md'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                      }`}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <tab.icon size={16} className="sm:w-[18px] sm:h-[18px] flex-shrink-0" />
                      <span className="text-xs sm:text-sm font-medium">{tab.label}</span>
                    </motion.button>
                  ))}
                </div>
              </nav>
            </div>
          </motion.div>

          {/* Settings Content */}
          <motion.div
            className="flex-1 min-w-0"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
          >
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-3 sm:p-4 md:p-6 lg:p-8">
              {renderTutorTabContent()}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
