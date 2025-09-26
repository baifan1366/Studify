"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Mail, 
  ArrowLeft,
  Loader2,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRequestPasswordReset } from '@/hooks/auth/use-password-reset';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import HCaptchaComponent from '@/components/auth/hcaptcha-component';

export default function ForgotPasswordForm() {
  const t = useTranslations('ForgotPassword');
  const [email, setEmail] = useState('');
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');
  
  const requestReset = useRequestPasswordReset();

  // Get hCaptcha site key from environment
  const HCAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY || '10000000-ffff-ffff-ffff-000000000001'; // Test key

  const handleCaptchaChange = (token: string | null) => {
    setCaptchaToken(token);
    setError(''); // Clear error when CAPTCHA is completed
  };

  const handleCaptchaError = () => {
    setError(t('captcha_failed'));
    setCaptchaToken(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!email) {
      setError(t('email_required'));
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError(t('invalid_email'));
      return;
    }

    if (!captchaToken) {
      setError(t('captcha_required'));
      return;
    }

    try {
      await requestReset.mutateAsync({ 
        email, 
        captchaToken, 
        captchaType: 'hcaptcha' 
      });
      setIsSubmitted(true);
    } catch (error: any) {
      setError(error.message || t('request_failed'));
      setCaptchaToken(null); // Reset CAPTCHA on error
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDF5E6] dark:bg-[#0D1F1A] transition-colors duration-200 w-screen">
        <div className="max-w-md w-full space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
              <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="mt-6 text-3xl font-bold text-gray-900 dark:text-white">
              {t('email_sent_title')}
            </h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              {t('email_sent_description')}
            </p>
            <p className="mt-4 text-xs text-gray-500 dark:text-gray-500">
              {t('check_spam_folder')}
            </p>
          </motion.div>

          <div className="mt-8 space-y-4">
            <Link href="/sign-in">
              <Button
                variant="default" 
                className="w-full flex items-center justify-center"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                {t('back_to_login')}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FDF5E6] dark:bg-[#0D1F1A] transition-colors duration-200 w-screen">
      <div className="max-w-md w-full space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900">
            <Mail className="h-8 w-8 text-orange-600 dark:text-orange-400" />
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900 dark:text-white">
            {t('title')}
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {t('description')}
          </p>
        </motion.div>

        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mt-8 space-y-6"
          onSubmit={handleSubmit}
        >
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                {t('email_label')}
              </label>
              <div className="mt-1 relative">
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('email_placeholder')}
                  className={`${error ? 'border-red-500 focus:border-red-500' : ''}`}
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
              </div>
              {error && (
                <div className="mt-2 flex items-center text-sm text-red-600 dark:text-red-400">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {error}
                </div>
              )}
            </div>
          </div>

          {/* hCaptcha */}
          <div className="flex justify-center">
            <HCaptchaComponent
              siteKey={HCAPTCHA_SITE_KEY}
              onChange={handleCaptchaChange}
              onError={handleCaptchaError}
              theme="light"
              size="normal"
            />
          </div>

          <div className="space-y-4">
            <Button
              type="submit"
              disabled={requestReset.isPending || !captchaToken}
              className="w-full flex justify-center"
            >
              {requestReset.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('sending_button')}
                </>
              ) : (
                t('send_reset_link')
              )}
            </Button>

            <Link href="/sign-in">
              <Button
                variant="ghost" 
                className="w-full flex items-center justify-center"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                {t('back_to_login')}
              </Button>
            </Link>
          </div>
        </motion.form>
      </div>
    </div>
  );
}
