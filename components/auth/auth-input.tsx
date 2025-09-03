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
  showPassword?: boolean;
  togglePasswordVisibility?: () => void;
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
  showPassword,
  togglePasswordVisibility,
}: AuthInputProps) {
  const t = useTranslations('AuthSignInPage');
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor={name} className="block text-sm font-medium text-gray-700 dark:text-gray-200">
          {label}
        </Label>
        {forgotPasswordLink && (
          <Link href="/forgot-password" className="text-xs text-[#FF6B00] hover:text-[#E55F00] dark:text-[#FF8C42] dark:hover:text-[#FF6B00]">
            {t('forgot_password_link')}
          </Link>
        )}
      </div>
      <Input
        id={name}
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
      />
    </div>
  );
}
