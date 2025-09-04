"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface AnimatedBackgroundProps {
  children: React.ReactNode;
  className?: string;
  sphereColor?: string;
  glassOpacity?: number;
  sphereSize?: number;
  enableMouseTracking?: boolean;
  sidebarWidth?: number; // Shared state approach
  useGlobalCSSVariable?: boolean; // Global CSS variable approach
}

export default function AnimatedBackground({
  children,
  className = "",
  sphereColor,
  glassOpacity,
  sphereSize = 384, // 96 * 4 (w-96 = 384px)
  enableMouseTracking = true,
  sidebarWidth = 80, // Default collapsed width
  useGlobalCSSVariable = false // Default to shared state approach
}: AnimatedBackgroundProps) {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Check for dark mode preference (CSS class takes precedence over system preference)
  useEffect(() => {
    const checkDarkMode = () => {
      // Check if dark class is applied to html or body
      const isDarkClass = document.documentElement.classList.contains('dark') || document.body.classList.contains('dark');
      if (isDarkClass !== undefined) {
        setIsDarkMode(isDarkClass);
        return;
      }
      
      // Fallback to system preference
      const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      setIsDarkMode(darkModeMediaQuery.matches);
    };
    
    // Initial check
    checkDarkMode();
    
    // Listen for system preference changes
    const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => checkDarkMode();
    darkModeMediaQuery.addEventListener('change', handleChange);
    
    // Listen for class changes on document
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    
    return () => {
      darkModeMediaQuery.removeEventListener('change', handleChange);
      observer.disconnect();
    };
  }, []);

  // Mouse tracking for animated background
  useEffect(() => {
    if (!enableMouseTracking) return;

    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [enableMouseTracking]);

  // Get theme-appropriate colors
  const getThemeColors = () => {
    if (isDarkMode) {
      return {
        sphereColor: sphereColor || "radial-gradient(circle, rgba(255,107,0,0.8) 0%, rgba(255,69,0,0.6) 30%, rgba(31,41,55,0.4) 70%, rgba(13,31,26,0.2) 100%)",
        glassOpacity: glassOpacity || 0.08,
        backgroundColor: '#0D1F1A' // Deep green-black
      };
    } else {
      return {
        sphereColor: sphereColor || "radial-gradient(circle, rgba(255,107,0,0.4) 0%, rgba(255,140,0,0.3) 30%, rgba(253,245,230,0.6) 70%, rgba(250,243,224,0.8) 100%)",
        glassOpacity: glassOpacity || 0.03,
        backgroundColor: '#FDF5E6' // Rice yellow
      };
    }
  };

  const themeColors = getThemeColors();

  return (
    <div className={`relative w-full h-screen overflow-hidden ${className}`} style={{ backgroundColor: themeColors.backgroundColor }}>
      {/* Animated Orange Gradient Sphere - GPU optimized */}
      {enableMouseTracking && (
        <motion.div
          className="absolute rounded-full pointer-events-none"
          style={{
            width: sphereSize,
            height: sphereSize,
            background: themeColors.sphereColor,
            left: -sphereSize / 2,
            top: -sphereSize / 2,
            filter: isDarkMode ? 'blur(80px)' : 'blur(120px)', // More blur for light mode for softer effect
            willChange: 'transform', // GPU optimization hint
          }}
          animate={{
            x: mousePosition.x,
            y: mousePosition.y,
            scale: [1, 1.1, 1], // Reduced scale variation
            opacity: [0.6, 0.8, 0.6], // Reduced opacity variation
          }}
          transition={{
            x: { type: "spring", stiffness: 50, damping: 20 },
            y: { type: "spring", stiffness: 50, damping: 20 },
            scale: { duration: 3, repeat: Infinity, ease: "easeInOut" }, // Slower animation
            opacity: { duration: 3, repeat: Infinity, ease: "easeInOut" }
          }}
        />
      )}

      {/* Static gradient sphere when mouse tracking is disabled - GPU optimized */}
      {!enableMouseTracking && (
        <motion.div
          className="absolute rounded-full pointer-events-none"
          style={{
            width: sphereSize,
            height: sphereSize,
            background: themeColors.sphereColor,
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            filter: isDarkMode ? 'blur(80px)' : 'blur(120px)', // More blur for light mode for softer effect
            willChange: 'transform', // GPU optimization hint
          }}
          animate={{
            scale: [1, 1.1, 1], // Reduced scale variation
            opacity: [0.6, 0.8, 0.6], // Reduced opacity variation
          }}
          transition={{
            duration: 3, // Slower animation
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      )}

      

      {/* Content with Frosted Glass Overlay */}
      <div className="relative z-10 w-full h-full">
        {/* Frosted Glass Overlay */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: isDarkMode 
              ? `rgba(31, 41, 55, ${themeColors.glassOpacity})` // Slate overlay for dark mode
              : `rgba(255, 255, 255, ${themeColors.glassOpacity})`, // White overlay for light mode
            backdropFilter: isDarkMode ? 'blur(12px)' : 'blur(8px)', // More blur in dark mode
            WebkitBackdropFilter: isDarkMode ? 'blur(12px)' : 'blur(8px)',
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.8 }}
        />

        {/* Content */}
        <div className="relative z-10 w-full h-full">
          {children}
        </div>
      </div>
    </div>
  );
}

// Preset configurations for different use cases
export const BackgroundPresets = {
  // Orange gradient (default)
  orange: {
    light: {
      sphereColor: "radial-gradient(circle, rgba(255,107,0,0.4) 0%, rgba(255,140,0,0.3) 30%, rgba(253,245,230,0.6) 70%, rgba(250,243,224,0.8) 100%)",
      glassOpacity: 0.03
    },
    dark: {
      sphereColor: "radial-gradient(circle, rgba(255,107,0,0.8) 0%, rgba(255,69,0,0.6) 30%, rgba(31,41,55,0.4) 70%, rgba(13,31,26,0.2) 100%)",
      glassOpacity: 0.08
    }
  },

  // Blue gradient for classroom/learning themes
  blue: {
    light: {
      sphereColor: "radial-gradient(circle, rgba(59,130,246,0.4) 0%, rgba(37,99,235,0.3) 30%, rgba(253,245,230,0.6) 70%, rgba(250,243,224,0.8) 100%)",
      glassOpacity: 0.03
    },
    dark: {
      sphereColor: "radial-gradient(circle, rgba(59,130,246,0.8) 0%, rgba(37,99,235,0.6) 30%, rgba(31,41,55,0.4) 70%, rgba(13,31,26,0.2) 100%)",
      glassOpacity: 0.08
    }
  },

  // Purple gradient for creative/design themes
  purple: {
    light: {
      sphereColor: "radial-gradient(circle, rgba(147,51,234,0.4) 0%, rgba(126,34,206,0.3) 30%, rgba(253,245,230,0.6) 70%, rgba(250,243,224,0.8) 100%)",
      glassOpacity: 0.03
    },
    dark: {
      sphereColor: "radial-gradient(circle, rgba(147,51,234,0.8) 0%, rgba(126,34,206,0.6) 30%, rgba(31,41,55,0.4) 70%, rgba(13,31,26,0.2) 100%)",
      glassOpacity: 0.08
    }
  },

  // Green gradient for success/nature themes
  green: {
    light: {
      sphereColor: "radial-gradient(circle, rgba(34,197,94,0.4) 0%, rgba(22,163,74,0.3) 30%, rgba(253,245,230,0.6) 70%, rgba(250,243,224,0.8) 100%)",
      glassOpacity: 0.03
    },
    dark: {
      sphereColor: "radial-gradient(circle, rgba(34,197,94,0.8) 0%, rgba(22,163,74,0.6) 30%, rgba(31,41,55,0.4) 70%, rgba(13,31,26,0.2) 100%)",
      glassOpacity: 0.08
    }
  },

  // Red gradient for urgent/important themes
  red: {
    light: {
      sphereColor: "radial-gradient(circle, rgba(239,68,68,0.4) 0%, rgba(220,38,38,0.3) 30%, rgba(253,245,230,0.6) 70%, rgba(250,243,224,0.8) 100%)",
      glassOpacity: 0.03
    },
    dark: {
      sphereColor: "radial-gradient(circle, rgba(239,68,68,0.8) 0%, rgba(220,38,38,0.6) 30%, rgba(31,41,55,0.4) 70%, rgba(13,31,26,0.2) 100%)",
      glassOpacity: 0.08
    }
  },
  
  // Subtle variant with less opacity
  subtle: {
    light: {
      sphereColor: "radial-gradient(circle, rgba(255,107,0,0.2) 0%, rgba(255,140,0,0.15) 30%, rgba(253,245,230,0.4) 70%, rgba(250,243,224,0.6) 100%)",
      glassOpacity: 0.02
    },
    dark: {
      sphereColor: "radial-gradient(circle, rgba(255,107,0,0.5) 0%, rgba(255,69,0,0.4) 30%, rgba(31,41,55,0.3) 70%, rgba(13,31,26,0.1) 100%)",
      glassOpacity: 0.05
    }
  },
  
  // High contrast variant
  vibrant: {
    light: {
      sphereColor: "radial-gradient(circle, rgba(255,107,0,0.7) 0%, rgba(255,69,0,0.5) 30%, rgba(253,245,230,0.8) 70%, rgba(250,243,224,1) 100%)",
      glassOpacity: 0.05
    },
    dark: {
      sphereColor: "radial-gradient(circle, rgba(255,107,0,1) 0%, rgba(255,69,0,0.8) 30%, rgba(31,41,55,0.6) 70%, rgba(13,31,26,0.4) 100%)",
      glassOpacity: 0.12
    }
  }
};

// Convenience components for common use cases
export function ClassroomBackground({ children, className, sidebarWidth, useGlobalCSSVariable }: { 
  children: React.ReactNode; 
  className?: string; 
  sidebarWidth?: number;
  useGlobalCSSVariable?: boolean;
}) {
  const [isDarkMode, setIsDarkMode] = React.useState(false);
  
  React.useEffect(() => {
    const checkDarkMode = () => {
      const isDarkClass = document.documentElement.classList.contains('dark') || document.body.classList.contains('dark');
      setIsDarkMode(isDarkClass || window.matchMedia('(prefers-color-scheme: dark)').matches);
    };
    
    checkDarkMode();
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    
    return () => observer.disconnect();
  }, []);
  
  const preset = isDarkMode ? BackgroundPresets.blue.dark : BackgroundPresets.blue.light;
  
  return (
    <AnimatedBackground 
      {...preset}
      className={className}
      sidebarWidth={sidebarWidth}
      useGlobalCSSVariable={useGlobalCSSVariable}
    >
      {children}
    </AnimatedBackground>
  );
}

export function HomeBackground({ children, className, sidebarWidth, useGlobalCSSVariable }: { 
  children: React.ReactNode; 
  className?: string; 
  sidebarWidth?: number;
  useGlobalCSSVariable?: boolean;
}) {
  const [isDarkMode, setIsDarkMode] = React.useState(false);
  
  React.useEffect(() => {
    const checkDarkMode = () => {
      const isDarkClass = document.documentElement.classList.contains('dark') || document.body.classList.contains('dark');
      setIsDarkMode(isDarkClass || window.matchMedia('(prefers-color-scheme: dark)').matches);
    };
    
    checkDarkMode();
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    
    return () => observer.disconnect();
  }, []);
  
  const preset = isDarkMode ? BackgroundPresets.orange.dark : BackgroundPresets.orange.light;
  
  return (
    <AnimatedBackground 
      {...preset}
      className={className}
      sidebarWidth={sidebarWidth}
      useGlobalCSSVariable={useGlobalCSSVariable}
    >
      {children}
    </AnimatedBackground>
  );
}

export function SuccessBackground({ children, className, sidebarWidth, useGlobalCSSVariable }: { 
  children: React.ReactNode; 
  className?: string; 
  sidebarWidth?: number;
  useGlobalCSSVariable?: boolean;
}) {
  const [isDarkMode, setIsDarkMode] = React.useState(false);
  
  React.useEffect(() => {
    const checkDarkMode = () => {
      const isDarkClass = document.documentElement.classList.contains('dark') || document.body.classList.contains('dark');
      setIsDarkMode(isDarkClass || window.matchMedia('(prefers-color-scheme: dark)').matches);
    };
    
    checkDarkMode();
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    
    return () => observer.disconnect();
  }, []);
  
  const preset = isDarkMode ? BackgroundPresets.green.dark : BackgroundPresets.green.light;
  
  return (
    <AnimatedBackground 
      {...preset}
      className={className}
      sidebarWidth={sidebarWidth}
      useGlobalCSSVariable={useGlobalCSSVariable}
    >
      {children}
    </AnimatedBackground>
  );
}

export function CreativeBackground({ children, className, sidebarWidth, useGlobalCSSVariable }: { 
  children: React.ReactNode; 
  className?: string; 
  sidebarWidth?: number;
  useGlobalCSSVariable?: boolean;
}) {
  const [isDarkMode, setIsDarkMode] = React.useState(false);
  
  React.useEffect(() => {
    const checkDarkMode = () => {
      const isDarkClass = document.documentElement.classList.contains('dark') || document.body.classList.contains('dark');
      setIsDarkMode(isDarkClass || window.matchMedia('(prefers-color-scheme: dark)').matches);
    };
    
    checkDarkMode();
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    
    return () => observer.disconnect();
  }, []);
  
  const preset = isDarkMode ? BackgroundPresets.purple.dark : BackgroundPresets.purple.light;
  
  return (
    <AnimatedBackground 
      {...preset}
      className={className}
      sidebarWidth={sidebarWidth}
      useGlobalCSSVariable={useGlobalCSSVariable}
    >
      {children}
    </AnimatedBackground>
  );
}