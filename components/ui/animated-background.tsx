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
  sphereColor = "radial-gradient(circle, rgba(255,165,0,0.6) 0%, rgba(255,69,0,0.4) 50%, rgba(255,140,0,0.2) 100%)",
  glassOpacity = 0.05,
  sphereSize = 384, // 96 * 4 (w-96 = 384px)
  enableMouseTracking = true,
  sidebarWidth = 80, // Default collapsed width
  useGlobalCSSVariable = false // Default to shared state approach
}: AnimatedBackgroundProps) {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // Mouse tracking for animated background
  useEffect(() => {
    if (!enableMouseTracking) return;

    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [enableMouseTracking]);

  return (
    <div className={`relative w-full h-screen overflow-hidden bg-gray-900 ${className}`}>
      {/* Animated Orange Gradient Sphere - GPU optimized */}
      {enableMouseTracking && (
        <motion.div
          className="absolute rounded-full pointer-events-none"
          style={{
            width: sphereSize,
            height: sphereSize,
            background: sphereColor,
            left: -sphereSize / 2,
            top: -sphereSize / 2,
            filter: 'blur(64px)', // Reduced blur for better performance
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
            background: sphereColor,
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            filter: 'blur(64px)', // Reduced blur for better performance
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
            background: `rgba(255, 255, 255, ${glassOpacity})`,
            backdropFilter: 'blur(8px)', // Reduced blur for better performance
            WebkitBackdropFilter: 'blur(8px)',
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
    sphereColor: "radial-gradient(circle, rgba(255,165,0,0.7) 0%, rgba(255,69,0,0.5) 50%, rgba(255,140,0,0.3) 180%)",
    glassOpacity: 0.5
  },

  // Blue gradient for classroom/learning themes
  blue: {
    sphereColor: "radial-gradient(circle, rgba(59,130,246,0.9) 0%, rgba(37,99,235,0.7) 50%, rgba(29,78,216,0.5) 100%)",
    glassOpacity: 0.05
  },

  // Purple gradient for creative/design themes
  purple: {
    sphereColor: "radial-gradient(circle, rgba(147,51,234,0.9) 0%, rgba(126,34,206,0.7) 50%, rgba(107,33,168,0.5) 100%)",
    glassOpacity: 0.05
  },

  // Green gradient for success/nature themes
  green: {
    sphereColor: "radial-gradient(circle, rgba(34,197,94,0.9) 0%, rgba(22,163,74,0.7) 50%, rgba(21,128,61,0.5) 100%)",
    glassOpacity: 0.05
  },

  // Red gradient for urgent/important themes
  red: {
    sphereColor: "radial-gradient(circle, rgba(239,68,68,0.9) 0%, rgba(220,38,38,0.7) 50%, rgba(185,28,28,0.5) 100%)",
    glassOpacity: 0.05
  },
  
  // Subtle variant with less opacity
  subtle: {
    sphereColor: "radial-gradient(circle, rgba(255,165,0,0.4) 0%, rgba(255,69,0,0.3) 50%, rgba(255,140,0,0.2) 100%)",
    glassOpacity: 0.03
  },
  
  // High contrast variant
  vibrant: {
    sphereColor: "radial-gradient(circle, rgba(255,165,0,1) 0%, rgba(255,69,0,0.8) 50%, rgba(255,140,0,0.6) 100%)",
    glassOpacity: 0.08
  }
};

// Convenience components for common use cases
export function ClassroomBackground({ children, className, sidebarWidth, useGlobalCSSVariable }: { 
  children: React.ReactNode; 
  className?: string; 
  sidebarWidth?: number;
  useGlobalCSSVariable?: boolean;
}) {
  return (
    <AnimatedBackground 
      {...BackgroundPresets.blue} 
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
  return (
    <AnimatedBackground 
      {...BackgroundPresets.orange} 
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
  return (
    <AnimatedBackground 
      {...BackgroundPresets.green} 
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
  return (
    <AnimatedBackground 
      {...BackgroundPresets.purple} 
      className={className}
      sidebarWidth={sidebarWidth}
      useGlobalCSSVariable={useGlobalCSSVariable}
    >
      {children}
    </AnimatedBackground>
  );
}