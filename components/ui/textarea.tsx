'use client';

import * as React from 'react';
import { motion } from 'motion/react';
import { cn } from '@/utils/styles';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => {
  const [isFocused, setIsFocused] = React.useState(false);

  return (
    <div className="relative">
      {isFocused && (
        <>
          {/* Loading spinner border */}
          <div className="absolute inset-[-2px] rounded-md overflow-hidden z-0">
            <motion.div
              className="absolute inset-0 rounded-md"
              style={{
                willChange: 'transform',
                background: `conic-gradient(from 270deg, transparent 0deg, transparent 270deg, rgb(255, 107, 0) 360deg)`,
              }}
              animate={{
                rotate: 360,
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "linear",
              }}
            />
            
            {/* Inner mask to create border effect */}
            <div className="absolute inset-[2px] rounded-md bg-white dark:bg-gray-900 z-10" />
          </div>
        </>
      )}
      
      <textarea
        className={cn(
          "relative z-20 flex min-h-[80px] w-full rounded-md border border-input bg-white/50 px-3 py-2 text-sm transition-colors placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50",
          "border-gray-200 focus:bg-white/10 dark:border-gray-700 dark:bg-gray-800/50 dark:focus:bg-white/10",
          className
        )}
        ref={ref}
        onFocus={(e) => {
          setIsFocused(true);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setIsFocused(false);
          props.onBlur?.(e);
        }}
        {...props}
      />
    </div>
  );
});

Textarea.displayName = 'Textarea';

export { Textarea };