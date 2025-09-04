"use client";

import { useState } from "react";
import AnimatedSidebar from "./sidebar";
import ClassroomHeader from "./header";
import { HomeBackground } from "@/components/ui/animated-background";
import { useUser } from "@/hooks/profile/use-user";
import { usePathname } from "next/navigation";

function generateTitle(pathname: string | null): string {
  if (!pathname) {
    return "Dashboard";
  }

  const parts = pathname.split("/").filter(Boolean);
  const lastSegment = parts[parts.length - 1];

  if (!lastSegment || lastSegment.toLowerCase() === "dashboard") {
    return "Dashboard";
  }

  return lastSegment
    .split("-")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const { data: userData } = useUser(); 
  const pathname = usePathname();
  const title = generateTitle(pathname);

  return (
    <HomeBackground useGlobalCSSVariable={true}>
      <ClassroomHeader
        title={title}
        userName={userData?.user?.user_metadata?.full_name || userData?.user?.email || "Tutor"} 
        onMenuToggle={() => setSidebarExpanded(!sidebarExpanded)}
        sidebarExpanded={sidebarExpanded}
      />
      <AnimatedSidebar isPermanentlyExpanded={sidebarExpanded} />
      <div
        style={{ marginLeft: "var(--sidebar-width)" }}
        className="transition-all duration-300 ease-in-out h-full"
      >
        <main className="pt-16 h-full">
          <div className="p-8 h-full overflow-y-auto">{children}</div>
        </main>
      </div>
    </HomeBackground>
  );
}
