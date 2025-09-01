import { redirect } from "next/navigation";
import { supabase } from "@/utils/supabase/server";

export default async function UnauthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Check if we have a session
  const client = await supabase()
  const {
    data: { session },
  } = await client.auth.getSession();

  // If there's a session, redirect to home page
  if (session) {
    redirect("/home");
  }

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-grow flex items-center justify-center bg-[#F8F9FF]">
        {children}
      </main>
    </div>
  );
}
