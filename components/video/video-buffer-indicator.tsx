"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wifi, WifiOff, Download, CheckCircle, AlertCircle } from 'lucide-react';

interface VideoBufferIndicatorProps {
  bufferHealth: number;
  isPreloading: boolean;
  preloadProgress: number;
  estimatedBandwidth: number;
  show?: boolean;
}

export function VideoBufferIndicator({
  bufferHealth,
  isPreloading,
  preloadProgress,
  estimatedBandwidth,
  show = true,
}: VideoBufferIndicatorProps) {
  if (!show) return null;

  const formatBandwidth = (bytesPerSecond: number): string => {
    const mbps = (bytesPerSecond * 8) / (1024 * 1024);
    return `${mbps.toFixed(1)} Mbps`;
  };

  const getHealthColor = (health: number): string => {
    if (health >= 80) return 'text-green-400';
    if (health >= 50) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getHealthIcon = (health: number) => {
    if (health >= 80) return <CheckCircle className="w-4 h-4" />;
    if (health >= 50) return <Wifi className="w-4 h-4" />;
    return <AlertCircle className="w-4 h-4" />;
  };

  return (
    <AnimatePresence>
      {(isPreloading || bufferHealth < 100) && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="absolute top-16 right-4 bg-black/80 backdrop-blur-md rounded-lg p-3 border border-white/10 z-20 min-w-[200px]"
        >
          {/* Buffer Health */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className={getHealthColor(bufferHealth)}>
                {getHealthIcon(bufferHealth)}
              </span>
              <span className="text-white text-xs font-medium">
                Buffer Health
              </span>
            </div>
            <span className={`text-xs font-bold ${getHealthColor(bufferHealth)}`}>
              {Math.round(bufferHealth)}%
            </span>
          </div>

          {/* Buffer Health Bar */}
          <div className="w-full bg-white/20 rounded-full h-1.5 mb-3 overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${
                bufferHealth >= 80
                  ? 'bg-green-500'
                  : bufferHealth >= 50
                  ? 'bg-yellow-500'
                  : 'bg-red-500'
              }`}
              initial={{ width: 0 }}
              animate={{ width: `${bufferHealth}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>

          {/* Preload Progress */}
          {isPreloading && (
            <div className="flex items-center gap-2 mb-2">
              <Download className="w-3 h-3 text-blue-400 animate-pulse" />
              <span className="text-white/70 text-xs">
                Preloading... {Math.round(preloadProgress)}%
              </span>
            </div>
          )}

          {/* Network Speed */}
          {estimatedBandwidth > 0 && (
            <div className="flex items-center justify-between pt-2 border-t border-white/10">
              <div className="flex items-center gap-2">
                {estimatedBandwidth > 1024 * 1024 ? (
                  <Wifi className="w-3 h-3 text-green-400" />
                ) : (
                  <WifiOff className="w-3 h-3 text-yellow-400" />
                )}
                <span className="text-white/70 text-xs">Network</span>
              </div>
              <span className="text-white text-xs font-medium">
                {formatBandwidth(estimatedBandwidth)}
              </span>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Compact buffer indicator for the progress bar
 */
export function CompactBufferIndicator({
  bufferHealth,
  isPreloading,
}: {
  bufferHealth: number;
  isPreloading: boolean;
}) {
  if (bufferHealth >= 100 && !isPreloading) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className="flex items-center gap-1.5 px-2 py-1 bg-black/60 rounded-full"
    >
      {isPreloading && (
        <Download className="w-3 h-3 text-blue-400 animate-pulse" />
      )}
      <span
        className={`text-xs font-medium ${
          bufferHealth >= 80
            ? 'text-green-400'
            : bufferHealth >= 50
            ? 'text-yellow-400'
            : 'text-red-400'
        }`}
      >
        {Math.round(bufferHealth)}%
      </span>
    </motion.div>
  );
}
