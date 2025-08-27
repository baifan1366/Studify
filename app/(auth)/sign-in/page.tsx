"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";

export default function SignIn() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    // Validate form
    if (!formData.email || !formData.password) {
      setFormError("Please fill in all fields");
      return;
    }

    if (!isLogin && !formData.fullName) {
      setFormError("Please enter your full name");
      return;
    }

    if (!isLogin && formData.password !== formData.confirmPassword) {
      setFormError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      // TODO: Add authentication logic here
      console.log("Form submitted:", formData);
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate API call
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "An unexpected error occurred"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setFormError("");
    setLoading(true);
    try {
      // TODO: Add Google sign-in logic here
      console.log("Google sign in clicked");
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate API call
    } catch (error) {
      setFormError("Google sign-in failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F9FF]">
      <div className="w-[420px] p-6 m-auto">
        {/* Logo and Header */}
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-[#7C3AED] rounded-2xl flex items-center justify-center mb-4">
            <span className="text-white text-2xl font-bold">ST</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {isLogin ? "Welcome back" : "Create account"}
          </h2>
          <p className="text-gray-600 text-sm">
            {isLogin
              ? "Sign in to your Studify account"
              : "Start your learning journey today"}
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-3xl shadow-lg p-8 mt-6">
          {formError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{formError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Full Name Field - Only show for signup */}
            {!isLogin && (
              <div>
                <Label
                  htmlFor="fullName"
                  className="block text-sm mb-2 text-gray-700"
                >
                  Full Name
                </Label>
                <Input
                  id="fullName"
                  name="fullName"
                  type="text"
                  required={!isLogin}
                  value={formData.fullName}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-[#7C3AED] focus:border-[#7C3AED]"
                  placeholder="Enter your full name"
                />
              </div>
            )}

            {/* Email Field */}
            <div>
              <Label
                htmlFor="email"
                className="block text-sm mb-2 text-gray-700"
              >
                Email address
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-[#7C3AED] focus:border-[#7C3AED]"
                placeholder="Enter your email"
              />
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label
                  htmlFor="password"
                  className="block text-sm text-gray-700"
                >
                  Password
                </Label>
                {isLogin && (
                  <Link
                    href="/forgot-password"
                    className="text-sm text-[#7C3AED] hover:text-[#6025DD]"
                  >
                    Forgot password?
                  </Link>
                )}
              </div>
              <Input
                id="password"
                name="password"
                type="password"
                required
                value={formData.password}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-[#7C3AED] focus:border-[#7C3AED]"
                placeholder="Enter your password"
              />
            </div>

            {/* Confirm Password Field (Sign Up only) */}
            {!isLogin && (
              <div>
                <Label
                  htmlFor="confirmPassword"
                  className="block text-sm mb-2 text-gray-700"
                >
                  Confirm Password
                </Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required={!isLogin}
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-[#7C3AED] focus:border-[#7C3AED]"
                  placeholder="Confirm your password"
                />
              </div>
            )}

            {/* Remember Me - Login only */}
            {isLogin && (
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-[#7C3AED] focus:ring-[#7C3AED] border-gray-300 rounded"
                />
                <label
                  htmlFor="remember-me"
                  className="ml-2 block text-sm text-gray-600"
                >
                  Remember me
                </label>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-black text-white py-2.5 rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  {isLogin ? "Signing in..." : "Creating account..."}
                </div>
              ) : isLogin ? (
                "Sign in"
              ) : (
                "Create account"
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">
                Or continue with
              </span>
            </div>
          </div>

          {/* Google Sign-In Button */}
          <button
            onClick={handleGoogleSignIn}
            type="button"
            className="w-full bg-white border border-gray-200 text-gray-700 py-2.5 px-4 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" viewBox="0 0 48 48">
              <path
                fill="#FFC107"
                d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"
              />
              <path
                fill="#FF3D00"
                d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"
              />
              <path
                fill="#4CAF50"
                d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"
              />
              <path
                fill="#1976D2"
                d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"
              />
            </svg>
            Continue with Google
          </button>

          {/* Toggle Login/Signup */}
          <div className="mt-6 text-center text-sm">
            <span className="text-gray-600">
              {isLogin
                ? "Don't have an account? "
                : "Already have an account? "}
            </span>
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-[#7C3AED] hover:text-[#6025DD] font-medium"
            >
              {isLogin ? "Sign up" : "Sign in"}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500 mt-8">
          <p className="mb-2">By continuing, you agree to our</p>
          <div className="space-x-1">
            <Link href="/terms" className="text-[#7C3AED] hover:text-[#6025DD]">
              Terms of Service
            </Link>
            <span className="text-gray-400">•</span>
            <Link
              href="/privacy"
              className="text-[#7C3AED] hover:text-[#6025DD]"
            >
              Privacy Policy
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
