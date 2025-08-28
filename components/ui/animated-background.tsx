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
}

export default function AnimatedBackground({
  children,
  className = "",
  sphereColor = "radial-gradient(circle, rgba(255,165,0,0.8) 0%, rgba(255,69,0,0.6) 50%, rgba(255,140,0,0.4) 100%)",
  glassOpacity = 0.05,
  sphereSize = 384, // 96 * 4 (w-96 = 384px)
  enableMouseTracking = true
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
      {/* Animated Orange Gradient Sphere */}
      {enableMouseTracking && (
        <motion.div
          className="absolute rounded-full opacity-60 blur-3xl pointer-events-none"
          style={{
            width: sphereSize,
            height: sphereSize,
            background: sphereColor,
            left: mousePosition.x - sphereSize / 2,
            top: mousePosition.y - sphereSize / 2,
          }}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.6, 0.8, 0.6],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      )}

      {/* Static gradient sphere when mouse tracking is disabled */}
      {!enableMouseTracking && (
        <motion.div
          className="absolute rounded-full opacity-60 blur-3xl pointer-events-none"
          style={{
            width: sphereSize,
            height: sphereSize,
            background: sphereColor,
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
          }}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.6, 0.8, 0.6],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      )}

      {/* Content with Frosted Glass Overlay */}
      <div className="relative z-10 w-full h-full">
        {/* Frosted Glass Overlay */}
        <motion.div
          className="absolute inset-0 rounded-2xl border border-white/20 pointer-events-none"
          style={{
            background: `rgba(255, 255, 255, ${glassOpacity})`,
            backdropFilter: 'blur(16px) saturate(150%)',
            WebkitBackdropFilter: 'blur(16px) saturate(150%)',
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
    sphereColor: "radial-gradient(circle, rgba(255,165,0,0.8) 0%, rgba(255,69,0,0.6) 50%, rgba(255,140,0,0.4) 100%)",
    glassOpacity: 0.05
  },
  
  // Blue gradient for classroom/learning themes
  blue: {
    sphereColor: "radial-gradient(circle, rgba(59,130,246,0.8) 0%, rgba(37,99,235,0.6) 50%, rgba(29,78,216,0.4) 100%)",
    glassOpacity: 0.05
  },
  
  // Purple gradient for creative/design themes
  purple: {
    sphereColor: "radial-gradient(circle, rgba(147,51,234,0.8) 0%, rgba(126,34,206,0.6) 50%, rgba(107,33,168,0.4) 100%)",
    glassOpacity: 0.05
  },
  
  // Green gradient for success/nature themes
  green: {
    sphereColor: "radial-gradient(circle, rgba(34,197,94,0.8) 0%, rgba(22,163,74,0.6) 50%, rgba(21,128,61,0.4) 100%)",
    glassOpacity: 0.05
  },
  
  // Red gradient for urgent/important themes
  red: {
    sphereColor: "radial-gradient(circle, rgba(239,68,68,0.8) 0%, rgba(220,38,38,0.6) 50%, rgba(185,28,28,0.4) 100%)",
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
export function ClassroomBackground({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <AnimatedBackground 
      {...BackgroundPresets.blue} 
      className={className}
    >
      {children}
    </AnimatedBackground>
  );
}

export function HomeBackground({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <AnimatedBackground 
      {...BackgroundPresets.orange} 
      className={className}
    >
      {children}
    </AnimatedBackground>
  );
}

export function SuccessBackground({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <AnimatedBackground 
      {...BackgroundPresets.green} 
      className={className}
    >
      {children}
    </AnimatedBackground>
  );
}

export function CreativeBackground({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <AnimatedBackground 
      {...BackgroundPresets.purple} 
      className={className}
    >
      {children}
    </AnimatedBackground>
  );
}
