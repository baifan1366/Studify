import { AuthForm } from "@/components/auth/auth-form";
import { AuthInput } from "@/components/auth/auth-input";
import { signUpAction } from "@/app/actions";

export const metadata = {
  title: "Tutor Sign Up",
};

export default function SignUpTutorPage({ params: { locale } }: { params: { locale: string } }) {
  return (
    <AuthForm
      action={signUpAction}
      title="Tutor Sign Up"
      subtitle="Start your teaching journey today"
      buttonText="Create account"
      footerText="Already have an account?"
      footerLinkText="Sign in"
      footerLinkHref="/sign-in"
      locale={locale}
    >
      <input type="hidden" name="role" value="tutor" />
      <AuthInput
        name="fullName"
        label="Full Name"
        type="text"
        placeholder="Enter your full name"
        required
      />
      <AuthInput
        name="email"
        label="Email address"
        type="email"
        placeholder="Enter your email"
        required
      />
      <AuthInput
        name="password"
        label="Password"
        type="password"
        placeholder="Enter your password"
        required
      />
      <AuthInput
        name="confirmPassword"
        label="Confirm Password"
        type="password"
        placeholder="Confirm your password"
        required
      />
    </AuthForm>
  );
}