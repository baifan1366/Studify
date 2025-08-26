import React from "react";
import { cn } from "@/utils/styles";

export function Spinner({
  className,
  isLoading = true,
  variant = "default",
}: {
  className?: string;
  isLoading?: boolean;
  variant?: "default" | "primary";
}) {
  if (!isLoading) return null;

  const variantClasses = {
    default: "border-foreground/20 border-t-muted-foreground",
    primary: "border-secondary/40 border-t-secondary",
  };

  return (
    <div
      className={cn(
        "animate-spin rounded-full w-[16px] h-[16px] border-[0.15em]",
        variantClasses[variant],
        className
      )}
      role="status"
      aria-label="Loading"
    />
  );
}
