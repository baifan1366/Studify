import * as React from "react";
import { motion } from 'motion/react';
import { cn } from "@/utils/styles";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
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
        
        <input
          type={type}
          className={cn(
            "relative z-20 flex h-10 w-full rounded-md border border-input bg-background/50 px-3 py-2 text-base transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
            "border-gray-200 focus:bg-white/10 dark:border-gray-700 dark:bg-gray-800/50 dark:focus:bg-white/10",
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
  }
);
Input.displayName = "Input";

export { Input };
