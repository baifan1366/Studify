"use client";

import { useEffect, useRef, useState } from 'react';

interface HCaptchaProps {
  siteKey: string;
  onChange: (token: string | null) => void;
  onError?: () => void;
  onExpired?: () => void;
  theme?: 'light' | 'dark';
  size?: 'normal' | 'compact';
}

declare global {
  interface Window {
    hcaptcha: {
      render: (container: string | Element, parameters: any) => string;
      reset: (widgetId?: string) => void;
      getResponse: (widgetId?: string) => string;
      remove: (widgetId?: string) => void;
    };
  }
}

export default function HCaptchaComponent({
  siteKey,
  onChange,
  onError,
  onExpired,
  theme = 'light',
  size = 'normal'
}: HCaptchaProps) {
  const hcaptchaRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const [isRendered, setIsRendered] = useState(false);

  useEffect(() => {
    // Load hCaptcha script with explicit rendering
    const loadHCaptcha = () => {
      if (window.hcaptcha) {
        setIsScriptLoaded(true);
        return;
      }

      // Check if script already exists
      const existingScript = document.querySelector('script[src*="hcaptcha"]');
      if (existingScript) {
        // If script exists but hcaptcha not ready, wait
        const checkReady = () => {
          if (window.hcaptcha) {
            setIsScriptLoaded(true);
          } else {
            setTimeout(checkReady, 100);
          }
        };
        checkReady();
        return;
      }

      // Set global callback for explicit rendering
      (window as any).hcaptchaOnLoad = () => {
        setIsScriptLoaded(true);
      };

      const script = document.createElement('script');
      script.src = 'https://js.hcaptcha.com/1/api.js?onload=hcaptchaOnLoad&render=explicit';
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    };

    loadHCaptcha();
  }, []);

  // Initialize hCaptcha when script is loaded
  useEffect(() => {
    if (!isScriptLoaded || !hcaptchaRef.current || isRendered || widgetIdRef.current) {
      return;
    }

    const initializeHCaptcha = () => {
      if (window.hcaptcha && hcaptchaRef.current && !isRendered) {
        try {
          // Clear any existing content to prevent rendering errors
          if (hcaptchaRef.current.innerHTML) {
            hcaptchaRef.current.innerHTML = '';
          }

          widgetIdRef.current = window.hcaptcha.render(hcaptchaRef.current, {
            sitekey: siteKey,
            callback: onChange,
            'error-callback': onError,
            'expired-callback': () => {
              onChange(null);
              onExpired?.();
            },
            theme,
            size,
          });
          setIsRendered(true);
        } catch (error) {
          console.error('hCaptcha render error:', error);
          onError?.();
        }
      }
    };

    // Small delay to ensure DOM is ready
    const timer = setTimeout(initializeHCaptcha, 100);

    return () => {
      clearTimeout(timer);
    };
  }, [isScriptLoaded, isRendered, siteKey, onChange, onError, onExpired, theme, size]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (widgetIdRef.current && window.hcaptcha) {
        try {
          window.hcaptcha.remove(widgetIdRef.current);
          widgetIdRef.current = null;
        } catch (e) {
          // Ignore cleanup errors
        }
      }
      
      // Clear container content
      if (hcaptchaRef.current) {
        hcaptchaRef.current.innerHTML = '';
      }
      
      setIsRendered(false);
    };
  }, []);

  const reset = () => {
    if (widgetIdRef.current && window.hcaptcha) {
      try {
        window.hcaptcha.reset(widgetIdRef.current);
        onChange(null); // Clear the token when reset
      } catch (e) {
        // If reset fails, force re-render
        setIsRendered(false);
        widgetIdRef.current = null;
        if (hcaptchaRef.current) {
          hcaptchaRef.current.innerHTML = '';
        }
      }
    }
  };

  const getResponse = () => {
    if (widgetIdRef.current && window.hcaptcha) {
      return window.hcaptcha.getResponse(widgetIdRef.current);
    }
    return '';
  };

  // Expose methods via ref
  useEffect(() => {
    if (hcaptchaRef.current) {
      (hcaptchaRef.current as any).reset = reset;
      (hcaptchaRef.current as any).getResponse = getResponse;
    }
  });

  return (
    <div 
      ref={hcaptchaRef} 
      className="hcaptcha-container flex justify-center my-4"
    />
  );
}
