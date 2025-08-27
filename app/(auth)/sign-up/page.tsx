import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Sign Up",
};

export default function SignUpPage() {
  // ✅ Server Action
  async function handleSignUp(formData: FormData) {
    "use server";

    const fullName = formData.get("fullName") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (!fullName || !email || !password) {
      redirect(`/sign-up?error=${encodeURIComponent("Missing fields")}`);
    }

    if (password !== confirmPassword) {
      redirect(
        `/sign-up?error=${encodeURIComponent("Passwords do not match")}`
      );
    }

    const supabaseClient = await supabase();
    const { error } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) {
      redirect(`/sign-up?error=${encodeURIComponent(error.message)}`);
    }

    // ✅ 提示用户去邮箱验证，而不是直接登录
    redirect("/check-email");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F9FF]">
      <div className="w-[420px] p-6 m-auto">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-[#7C3AED] rounded-2xl flex items-center justify-center mb-4">
            <span className="text-white text-2xl font-bold">ST</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Create account
          </h2>
          <p className="text-gray-600 text-sm">
            Start your learning journey today
          </p>
        </div>

        <div className="bg-white rounded-3xl shadow-lg p-8 mt-6">
          <form action={handleSignUp} className="space-y-5">
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
                required
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-[#7C3AED] focus:border-[#7C3AED]"
                placeholder="Enter your full name"
              />
            </div>

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
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-[#7C3AED] focus:border-[#7C3AED]"
                placeholder="Enter your email"
              />
            </div>

            <div>
              <Label
                htmlFor="password"
                className="block text-sm mb-2 text-gray-700"
              >
                Password
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-[#7C3AED] focus:border-[#7C3AED]"
                placeholder="Enter your password"
              />
            </div>

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
                required
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-[#7C3AED] focus:border-[#7C3AED]"
                placeholder="Confirm your password"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-black text-white py-2.5 rounded-lg font-medium hover:bg-gray-800 transition-colors"
            >
              Create account
            </button>
          </form>

          <div className="mt-6 text-center text-sm">
            <span className="text-gray-600">Already have an account? </span>
            <Link
              href="/sign-in"
              className="text-[#7C3AED] hover:text-[#6025DD] font-medium"
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
