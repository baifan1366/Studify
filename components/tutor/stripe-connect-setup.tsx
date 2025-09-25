"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { CreditCard, Settings, Check, BarChart2, Loader2 } from 'lucide-react';
import { useStripeConnectAccount, useCreateStripeConnectAccount, useGetOnboardingLink, useGetDashboardLink, isAccountFullySetup, getAccountStatusText, getAccountStatusColor } from '@/hooks/tutor/use-stripe-connect';

interface StripeConnectSetupProps {
  className?: string;
}

export default function StripeConnectSetup({ className = '' }: StripeConnectSetupProps) {
  const { data: stripeConnectData, isLoading: stripeLoading } = useStripeConnectAccount();
  const createStripeAccount = useCreateStripeConnectAccount();
  const getOnboardingLink = useGetOnboardingLink();
  const getDashboardLink = useGetDashboardLink();

  const handleCreateStripeAccount = () => {
    const currentUrl = window.location.origin + window.location.pathname;
    createStripeAccount.mutate({
      return_url: `${currentUrl}?stripe=complete`,
      refresh_url: `${currentUrl}?stripe=refresh`,
    });
  };

  const handleCompleteOnboarding = () => {
    const currentUrl = window.location.origin + window.location.pathname;
    getOnboardingLink.mutate({
      return_url: `${currentUrl}?stripe=complete`,
      refresh_url: `${currentUrl}?stripe=refresh`,
    });
  };

  const handleOpenStripeDashboard = () => {
    getDashboardLink.mutate();
  };

  return (
    <div className={`bg-gradient-to-br from-green-600/20 via-emerald-600/20 to-teal-500/20 rounded-2xl border border-white/20 backdrop-blur-sm p-4 sm:p-6 overflow-hidden ${className}`}>
      {/* Animated Background Elements */}
      <motion.div
        className="absolute top-4 right-4 w-12 h-12 sm:w-16 sm:h-16 bg-green-500/30 rounded-full blur-xl pointer-events-none"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.6, 0.3],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />

      <div className="relative z-10">
        <h3 className="text-lg sm:text-xl font-semibold text-white mb-4 sm:mb-6 flex items-center gap-2">
          <CreditCard size={18} className="sm:w-5 sm:h-5" />
          Payment Setup
        </h3>

        {stripeLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 size={24} className="animate-spin text-white/60" />
          </div>
        ) : !stripeConnectData?.account_exists ? (
          // No Stripe account - Show setup
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CreditCard size={32} className="text-red-400" />
            </div>
            <h4 className="text-xl font-semibold text-white mb-2">Payment Setup Required</h4>
            <p className="text-white/70 mb-6 max-w-md mx-auto">
              Set up your Stripe account to receive payments from students who purchase your courses. 
              You'll receive 90% of each sale, with 10% going to the platform.
            </p>
            <motion.button
              onClick={handleCreateStripeAccount}
              disabled={createStripeAccount.isPending}
              className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg hover:shadow-green-500/25 flex items-center gap-2 mx-auto"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {createStripeAccount.isPending ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <CreditCard size={16} />
              )}
              {createStripeAccount.isPending ? 'Setting up...' : 'Set Up Payments'}
            </motion.button>
          </div>
        ) : !isAccountFullySetup(stripeConnectData.account) ? (
          // Account exists but not fully set up
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Settings size={32} className="text-yellow-400" />
            </div>
            <h4 className="text-xl font-semibold text-white mb-2">Complete Your Setup</h4>
            <p className="text-white/70 mb-2">
              Status: <span className={`font-medium text-${getAccountStatusColor(stripeConnectData.account)}-400`}>
                {getAccountStatusText(stripeConnectData.account)}
              </span>
            </p>
            <p className="text-white/60 mb-6 max-w-md mx-auto">
              Complete your account setup to start receiving payments from your course sales.
            </p>
            <motion.button
              onClick={handleCompleteOnboarding}
              disabled={getOnboardingLink.isPending}
              className="px-4 py-2 bg-gradient-to-r from-yellow-600 to-amber-600 hover:from-yellow-700 hover:to-amber-700 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg hover:shadow-yellow-500/25 flex items-center gap-2 mx-auto"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {getOnboardingLink.isPending ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Settings size={16} />
              )}
              {getOnboardingLink.isPending ? 'Loading...' : 'Complete Setup'}
            </motion.button>
          </div>
        ) : (
          // Account is fully set up
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check size={32} className="text-green-400" />
            </div>
            <h4 className="text-xl font-semibold text-white mb-2">✅ Payment Setup Complete</h4>
            <p className="text-white/70 mb-6">
              Your Stripe account is active and ready to receive payments. You'll earn 90% of each course sale!
            </p>
            
            {/* Account Details */}
            <div className="bg-white/5 rounded-lg p-4 mb-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-white/60">Charges:</span>
                  <span className="text-green-400 ml-2">✓ Enabled</span>
                </div>
                <div>
                  <span className="text-white/60">Payouts:</span>
                  <span className="text-green-400 ml-2">✓ Enabled</span>
                </div>
                <div>
                  <span className="text-white/60">Country:</span>
                  <span className="text-white ml-2">{stripeConnectData.account?.country || 'MY'}</span>
                </div>
                <div>
                  <span className="text-white/60">Currency:</span>
                  <span className="text-white ml-2">{(stripeConnectData.account?.default_currency || 'myr').toUpperCase()}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3 justify-center">
              <motion.button
                onClick={handleOpenStripeDashboard}
                disabled={getDashboardLink.isPending}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg hover:shadow-blue-500/25 flex items-center gap-2"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {getDashboardLink.isPending ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <BarChart2 size={16} />
                )}
                {getDashboardLink.isPending ? 'Opening...' : 'Stripe Dashboard'}
              </motion.button>
              <motion.button
                onClick={handleCompleteOnboarding}
                disabled={getOnboardingLink.isPending}
                className="px-4 py-2 bg-gradient-to-r from-gray-600 to-slate-600 hover:from-gray-700 hover:to-slate-700 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg hover:shadow-gray-500/25 flex items-center gap-2"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {getOnboardingLink.isPending ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Settings size={16} />
                )}
                {getOnboardingLink.isPending ? 'Loading...' : 'Account Settings'}
              </motion.button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
