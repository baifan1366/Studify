"use client";

import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Eye, EyeOff, Mail, Lock, User } from "lucide-react";
import { cn } from "@/utils/styles";

interface AuthInputProps {
  name: string;
  label: string;
  type: string;
  placeholder: string;
  required?: boolean;
  forgotPasswordLink?: boolean;
  className?: string;
  props?: any;
  isSignIn?: boolean;
}

export function AuthInput({
  name,
  label,
  type,
  placeholder,
  required = false,
  forgotPasswordLink = false,
  className,
  props,
  isSignIn,
}: AuthInputProps) {
  const t = useTranslations('AuthSignInPage');
  const [showPassword, setShowPassword] = useState(false);

  const isPasswordField = type === "password" || name.toLowerCase().includes("password");
  const actualType = isPasswordField ? (showPassword ? "text" : "password") : type;

  // Determine left icon based on input name
  const renderLeftIcon = () => {
    const iconClass = "absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-muted-foreground/70 z-30 pointer-events-none transition-colors duration-200 group-focus-within:text-primary";
    if (name === "email") {
      return <Mail className={iconClass} />;
    } else if (name.toLowerCase().includes("password")) {
      return <Lock className={iconClass} />;
    } else if (name === "fullName") {
      return <User className={iconClass} />;
    }
    return null;
  };

  return (
    <div className="space-y-2 group">
      <div className="flex items-center justify-between">
        <Label htmlFor={name} className="block text-sm font-semibold text-gray-700 dark:text-gray-200 transition-colors group-focus-within:text-primary">
          {label}
        </Label>
        {forgotPasswordLink && (
          <Link href="/forgot-password" className="text-xs font-medium text-[#FF6B00] hover:text-[#E55F00] dark:text-[#FF8C42] dark:hover:text-[#FF6B00] transition-colors">
            {t('forgot_password_link')}
          </Link>
        )}
      </div>

      <div className="relative">
        {/* Left Side Icon */}
        {renderLeftIcon()}

        {/* The Input field */}
        <Input
          id={name}
          name={name}
          type={actualType}
          required={required}
          placeholder={placeholder}
          className={cn(
            "pl-10 text-sm py-5 transition-all duration-300",
            isPasswordField && "pr-10",
            "border-gray-200 hover:border-gray-300 dark:border-gray-700/60 dark:hover:border-gray-600 focus:ring-1 focus:ring-primary/20",
            className
          )}
          {...props}
        />

        {/* Right Side Password Visibility Toggle button */}
        {isPasswordField && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 h-8 w-8 rounded-md flex items-center justify-center text-muted-foreground/70 hover:text-foreground hover:bg-muted/30 z-30 transition cursor-pointer active:scale-90"
          >
            {showPassword ? (
              <EyeOff className="h-4.5 w-4.5" />
            ) : (
              <Eye className="h-4.5 w-4.5" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}
