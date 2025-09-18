"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';

export type FontSize = 'small' | 'medium' | 'large' | 'extra-large';

interface FontSizeContextType {
  fontSize: FontSize;
  setFontSize: (size: FontSize) => void;
  fontSizeClasses: {
    text: string;
    heading: string;
    body: string;
    small: string;
    button: string;
  };
}

const FontSizeContext = createContext<FontSizeContextType | undefined>(undefined);

const fontSizeMap = {
  small: {
    text: 'text-sm',
    heading: 'text-xl',
    body: 'text-sm',
    small: 'text-xs',
    button: 'text-sm',
  },
  medium: {
    text: 'text-base',
    heading: 'text-2xl',
    body: 'text-base',
    small: 'text-sm',
    button: 'text-base',
  },
  large: {
    text: 'text-lg',
    heading: 'text-3xl',
    body: 'text-lg',
    small: 'text-base',
    button: 'text-lg',
  },
  'extra-large': {
    text: 'text-xl',
    heading: 'text-4xl',
    body: 'text-xl',
    small: 'text-lg',
    button: 'text-xl',
  },
};

export function FontSizeProvider({ children }: { children: React.ReactNode }) {
  const [fontSize, setFontSizeState] = useState<FontSize>('medium');

  // Load font size from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('font-size');
    if (saved && ['small', 'medium', 'large', 'extra-large'].includes(saved)) {
      setFontSizeState(saved as FontSize);
    }
  }, []);

  // Apply font size to document root
  useEffect(() => {
    const root = document.documentElement;
    
    // Remove existing font size classes
    root.classList.remove('font-size-small', 'font-size-medium', 'font-size-large', 'font-size-extra-large');
    
    // Add current font size class
    root.classList.add(`font-size-${fontSize}`);

    // Also set CSS custom properties for more flexible sizing
    const sizeValues = {
      small: { base: '14px', scale: 0.875 },
      medium: { base: '16px', scale: 1 },
      large: { base: '18px', scale: 1.125 },
      'extra-large': { base: '20px', scale: 1.25 },
    };

    const { base, scale } = sizeValues[fontSize];
    root.style.setProperty('--font-size-base', base);
    root.style.setProperty('--font-size-scale', scale.toString());
  }, [fontSize]);

  const setFontSize = (size: FontSize) => {
    setFontSizeState(size);
    localStorage.setItem('font-size', size);
  };

  const value: FontSizeContextType = {
    fontSize,
    setFontSize,
    fontSizeClasses: fontSizeMap[fontSize],
  };

  return (
    <FontSizeContext.Provider value={value}>
      {children}
    </FontSizeContext.Provider>
  );
}

export function useFontSize() {
  const context = useContext(FontSizeContext);
  if (!context) {
    throw new Error('useFontSize must be used within a FontSizeProvider');
  }
  return context;
}
