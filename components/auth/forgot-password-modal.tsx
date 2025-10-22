"use client";

import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  Mail, 
  X,
  Loader2,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRequestPasswordReset } from '@/hooks/auth/use-password-reset';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import HCaptchaComponent from './hcaptcha-component';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultEmail?: string;
}

export default function ForgotPasswordModal({
  isOpen,
  onClose,
  defaultEmail = ''
}: ForgotPasswordModalProps) {
  const t = useTranslations('ForgotPassword');
  const [email, setEmail] = useState(defaultEmail);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');
  
  const requestReset = useRequestPasswordReset();

  // Get hCaptcha site key from environment
  const HCAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY || '10000000-ffff-ffff-ffff-000000000001'; // Test key

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
      setCaptchaToken(null);
    }
  };

  const handleClose = () => {
    setIsSubmitted(false);
    setError('');
    setCaptchaToken(null);
    onClose();
  };

  const handleCaptchaChange = (token: string | null) => {
    setCaptchaToken(token);
    setError(''); // Clear error when CAPTCHA is completed
  };

  const handleCaptchaError = () => {
    setError(t('captcha_failed'));
    setCaptchaToken(null);
  };

  if (isSubmitted) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              {t('email_sent_title')}
            </DialogTitle>
          </DialogHeader>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-4"
          >
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('email_sent_description')}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500">
              {t('check_spam_folder')}
            </p>
            
            <div className="flex justify-end pt-4">
              <Button onClick={handleClose} variant="outline">
                {t('close')}
              </Button>
            </div>
          </motion.div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            {t('title')}
          </DialogTitle>
        </DialogHeader>
        
        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-4"
          onSubmit={handleSubmit}
        >
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {t('description')}
            </p>
            
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
              {t('email_label')}
            </label>
            <div className="relative">
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

          {error && (
            <div className="flex items-center text-sm text-red-600 dark:text-red-400">
              <AlertCircle className="h-4 w-4 mr-1" />
              {error}
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="flex-1"
            >
              {t('cancel')}
            </Button>
            <Button
              type="submit"
              disabled={requestReset.isPending || !captchaToken}
              className="flex-1"
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
          </div>
        </motion.form>
      </DialogContent>
    </Dialog>
  );
}
