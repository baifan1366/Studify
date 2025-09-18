"use client";

import { useEffect, useState } from "react";
import { Timer, AlertTriangle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuizTimerProps {
  remainingSeconds: number | null;
  isExpired: boolean;
  className?: string;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export default function QuizTimer({ 
  remainingSeconds, 
  isExpired, 
  className,
  showIcon = true,
  size = 'md'
}: QuizTimerProps) {
  const [displayTime, setDisplayTime] = useState<string>("");
  const [isWarning, setIsWarning] = useState(false);
  const [isCritical, setIsCritical] = useState(false);

  // 格式化时间显示
  const formatTime = (seconds: number): string => {
    if (seconds <= 0) return "00:00";
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
  };

  useEffect(() => {
    if (remainingSeconds === null) {
      setDisplayTime("∞"); // 无时间限制
      setIsWarning(false);
      setIsCritical(false);
      return;
    }

    if (isExpired || remainingSeconds <= 0) {
      setDisplayTime("00:00");
      setIsCritical(true);
      setIsWarning(false);
      return;
    }

    setDisplayTime(formatTime(remainingSeconds));
    
    // 设置警告状态
    // 少于5分钟时显示警告
    setIsWarning(remainingSeconds <= 300 && remainingSeconds > 60);
    // 少于1分钟时显示严重警告
    setIsCritical(remainingSeconds <= 60);
  }, [remainingSeconds, isExpired]);

  // 如果没有时间限制，不显示计时器
  if (remainingSeconds === null && !isExpired) {
    return null;
  }

  const sizeClasses = {
    sm: "text-sm px-2 py-1",
    md: "text-lg px-3 py-1.5", 
    lg: "text-xl px-4 py-2"
  };

  const iconSizes = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6"
  };

  return (
    <div className={cn(
      "flex items-center gap-2 rounded-lg font-bold transition-all duration-300",
      sizeClasses[size],
      {
        // 正常状态 - 蓝色背景
        "bg-blue-600 text-white": !isWarning && !isCritical && !isExpired,
        // 警告状态 - 黄色背景
        "bg-yellow-500 text-black animate-pulse": isWarning,
        // 严重警告状态 - 红色背景，闪烁
        "bg-red-600 text-white animate-pulse": isCritical && !isExpired,
        // 过期状态 - 深红色背景
        "bg-red-800 text-white": isExpired,
      },
      className
    )}>
      {showIcon && (
        <>
          {isExpired ? (
            <AlertTriangle className={cn(iconSizes[size], "text-red-200")} />
          ) : isCritical ? (
            <AlertTriangle className={cn(iconSizes[size], "text-white animate-bounce")} />
          ) : (
            <Timer className={cn(iconSizes[size])} />
          )}
        </>
      )}
      
      <span className="font-mono">
        {isExpired ? "时间到!" : displayTime}
      </span>
      
      {/* 状态文本 */}
      {isExpired && (
        <span className="text-xs opacity-90">已自动提交</span>
      )}
    </div>
  );
}

// 简化版本的计时器，只显示时间
export function SimpleQuizTimer({ remainingSeconds }: { remainingSeconds: number | null }) {
  if (remainingSeconds === null) return null;
  
  const formatTime = (seconds: number): string => {
    if (seconds <= 0) return "00:00";
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-1 text-sm font-mono">
      <Clock className="h-4 w-4" />
      {formatTime(remainingSeconds)}
    </div>
  );
}
