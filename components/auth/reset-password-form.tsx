"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  Key, 
  Eye, 
  EyeOff, 
  Check, 
  AlertCircle,
  ArrowLeft 
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useResetPassword } from '@/hooks/auth/use-password-reset';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button'

function ResetPasswordFormContent() {
  const t = useTranslations('ResetPassword');
  const searchParams = useSearchParams();
  const router = useRouter();
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isValidToken, setIsValidToken] = useState(true);
  
  const resetPassword = useResetPassword();
  const { toast } = useToast();

  useEffect(() => {
    // Check if user has an authenticated session (they should after callback)
    // If not, they may have an access token in URL fragments
    const tokenParam = searchParams.get('access_token');
    
    // Also check URL fragments (after #) for tokens
    if (typeof window !== 'undefined') {
      const hash = window.location.hash;
      if (hash) {
        const hashParams = new URLSearchParams(hash.substring(1));
        const hashAccessToken = hashParams.get('access_token');
        
        if (hashAccessToken) {
          setToken(hashAccessToken);
          return;
        }
      }
    }
    
    if (tokenParam) {
      setToken(tokenParam);
    } else {
      // No token found - user should be authenticated via session from callback
      // Set a placeholder token to indicate session-based auth
      setToken('session-authenticated');
    }
  }, [searchParams]);

  const passwordRequirements = [
    { text: t('requirement_min_length'), met: newPassword.length >= 8 },
    { text: t('requirement_uppercase'), met: /[A-Z]/.test(newPassword) },
    { text: t('requirement_lowercase'), met: /[a-z]/.test(newPassword) },
    { text: t('requirement_number'), met: /\d/.test(newPassword) },
    { text: t('requirement_special'), met: /[!@#$%^&*(),.?":{}|<>]/.test(newPassword) },
  ];

  const isValidPassword = passwordRequirements.every(req => req.met);
  const passwordsMatch = newPassword === confirmPassword;
  const canSubmit = token && newPassword && confirmPassword && isValidPassword && passwordsMatch;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!canSubmit) return;

    try {
      // Only send token if it's a real access token, not the session placeholder
      const resetData: any = { newPassword };
      if (token && token !== 'session-authenticated') {
        resetData.token = token;
      }
      
      await resetPassword.mutateAsync(resetData);
      
      // Redirect to login with success message
      setTimeout(() => {
        router.push('/sign-in?message=password-reset-success');
      }, 2000);
    } catch (error) {
      console.error('Reset password error:', error);
    }
  };

  if (!isValidToken) {
    return (
      <div className="min-h-screen bg-[#FDF5E6] dark:bg-[#0D1F1A] transition-colors duration-200 w-screen flex items-center justify-center p-4">
        <motion.div
          className="bg-[#FDF5E6] dark:bg-[#0D1F1A] rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-8 max-w-md w-full text-center"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
        >
          <AlertCircle size={48} className="mx-auto text-red-500 mb-4" />
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            {t('invalid_token_title')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {t('invalid_token_description')}
          </p>
          <Button
            onClick={() => router.push('/sign-in')}
          >
            <ArrowLeft size={16} />
            {t('back_to_login')}
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDF5E6] dark:bg-[#0D1F1A] transition-colors duration-200 w-screen flex items-center justify-center p-4">
      <motion.div
        className="bg-[#FDF5E6] dark:bg-[#0D1F1A] rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-8 max-w-md w-full"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
      >
        <div className="text-center mb-8">
          <Key size={48} className="mx-auto text-blue-500 mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {t('title')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {t('subtitle')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* New Password */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('new_password')} {t('required')}
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Password Requirements */}
          {newPassword && (
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('password_requirements')}</h4>
              <div className="space-y-1">
                {passwordRequirements.map((req, index) => (
                  <div key={index} className="flex items-center gap-2 text-xs">
                    {req.met ? (
                      <Check size={12} className="text-green-500" />
                    ) : (
                      <AlertCircle size={12} className="text-red-500" />
                    )}
                    <span className={req.met ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                      {req.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Confirm Password */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('confirm_password')} {t('required')}
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`w-full px-3 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white ${
                  confirmPassword && !passwordsMatch 
                    ? 'border-red-500 dark:border-red-400' 
                    : 'border-gray-300 dark:border-gray-600'
                }`}
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {confirmPassword && !passwordsMatch && (
              <div className="flex items-center gap-1 text-red-600 dark:text-red-400 text-xs">
                <AlertCircle size={12} />
                <span>{t('passwords_mismatch')}</span>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <motion.button
            type="submit"
            disabled={!canSubmit || resetPassword.isPending}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 mt-6"
            whileHover={{ scale: canSubmit ? 1.01 : 1 }}
            whileTap={{ scale: canSubmit ? 0.99 : 1 }}
          >
            {resetPassword.isPending ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Key size={16} />
            )}
            {t('reset_password_button')}
          </motion.button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => router.push('/sign-in')}
            className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 flex items-center justify-center gap-1 mx-auto"
          >
            <ArrowLeft size={14} />
            {t('back_to_login')}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default function ResetPasswordForm() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      </div>
    }>
      <ResetPasswordFormContent />
    </Suspense>
  );
}
