import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";

interface AuthInputProps {
  name: string;
  label: string;
  type: string;
  placeholder: string;
  required?: boolean;
  forgotPasswordLink?: boolean;
}

export function AuthInput({ name, label, type, placeholder, required = false, forgotPasswordLink = false }: AuthInputProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <Label htmlFor={name} className="block text-sm text-gray-700">
          {label}
        </Label>
        {forgotPasswordLink && (
          <Link href="/forgot-password" className="text-sm text-[#7C3AED] hover:text-[#6025DD]">
            Forgot password?
          </Link>
        )}
      </div>
      <Input
        id={name}
        name={name}
        type={type}
        required={required}
        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-[#7C3AED] focus:border-[#7C3AED]"
        placeholder={placeholder}
      />
    </div>
  );
}
