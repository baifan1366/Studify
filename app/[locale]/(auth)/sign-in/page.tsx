import { AuthForm } from "@/components/auth/auth-form";
import { AuthInput } from "@/components/auth/auth-input";
import { signInAction } from "@/app/actions";

export const metadata = {
  title: "Sign In",
};

export default function SignInPage({ params: { locale } }: { params: { locale: string } }) {
  return (
    <AuthForm
      action={signInAction}
      title="Welcome back"
      subtitle="Sign in to your Studify account"
      buttonText="Sign in"
      footerText="Don't have an account?"
      footerLinkText="Sign up"
      footerLinkHref="/sign-up"
      locale={locale}
    >
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
        forgotPasswordLink
      />
    </AuthForm>
  );
}