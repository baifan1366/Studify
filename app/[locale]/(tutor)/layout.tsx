import LayoutWrapper from "@/components/tutor/layout/layout-wrapper";
import { supabase } from "@/utils/supabase/server";
import { headers } from "next/headers";

function generateTitle(pathname: string | null): string {
  if (!pathname) {
    return "Tutor Dashboard";
  }
  // Example: /en/tutor/my-courses -> my-courses -> My courses
  const pathParts = pathname.split('/').filter(p => p && isNaN(parseInt(p))); // split and remove empty strings and numbers
  const lastPart = pathParts[pathParts.length - 1];
  
  if (!lastPart || lastPart === 'tutor' || lastPart === 'locale') {
    return "Tutor Dashboard";
  }

  // Capitalize first letter and replace dashes with spaces
  return lastPart.charAt(0).toUpperCase() + lastPart.slice(1).replace(/-/g, ' ');
}


export default async function TutorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sb = await supabase();
  const { data: { user } } = await sb.auth.getUser();
  
  const pathname = headers().get("next-url");
  const title = generateTitle(pathname);
  const userName = user?.user_metadata?.full_name || user?.email || "Tutor";

  return (
    <LayoutWrapper title={title} userName={userName}>
      {children}
    </LayoutWrapper>
  );
}
