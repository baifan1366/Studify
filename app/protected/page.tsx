import { Metadata } from "next";
import { createSupabaseClient } from "@/utils/supabase/server";
import AuthPageSignOutButton from "@/components/auth-sign-out-button";

export const metadata: Metadata = {
  title: "Protected - Studify",
  description: "protected page for authenticated users only",
  keywords: ["protected", "authentication", "user account", "education"],
  openGraph: {
    title: "Protected - Studify",
    description: "No access without authentication",
    type: "website",
  },
};

export default async function ProtectedPage() {
  const client = await createSupabaseClient();
  const {
    data: { user },
  } = await client.auth.getUser();

  if (!user) {
    return (
      <div>There was an error loading your account. Please try again.</div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <h1 className="text-2xl font-medium">Account</h1>
          <p className="text-muted-foreground mt-2">
            Manage your account settings
          </p>
        </div>
        <AuthPageSignOutButton />
      </div>

      <div className="space-y-6">
        <div className="border rounded-lg p-6 space-y-4">
          <h2 className="font-medium">User Information</h2>
          <div className="grid gap-2 text-sm">
            <div className="grid grid-cols-[120px_1fr]">
              <div className="text-muted-foreground">Email</div>
              <div>{user?.email}</div>
            </div>
            <div className="grid grid-cols-[120px_1fr]">
              <div className="text-muted-foreground">User ID</div>
              <div className="font-mono">{user?.id}</div>
            </div>
            <div className="grid grid-cols-[120px_1fr]">
              <div className="text-muted-foreground">Last Sign In</div>
              <div>
                {user.last_sign_in_at
                  ? new Date(user.last_sign_in_at).toLocaleString()
                  : "Never"}
              </div>
            </div>
          </div>
        </div>

        <div className="border rounded-lg p-6 space-y-4">
          <h2 className="font-medium">Authentication Status</h2>
          <div className="grid gap-2 text-sm">
            <div className="grid grid-cols-[120px_1fr]">
              <div className="text-muted-foreground">Status</div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                Authenticated
              </div>
            </div>
            <div className="grid grid-cols-[120px_1fr]">
              <div className="text-muted-foreground">Providers</div>
              <div>
                {user.identities
                  ?.map((identity) => identity.provider)
                  .join(", ") || "Email"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
