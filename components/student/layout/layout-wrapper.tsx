"use client";

import { useState } from "react";
import AnimatedSidebar from "./sidebar";
import ClassroomHeader from "./header";
import AnimatedBackground from "@/components/ui/animated-background";
import { usePathname } from "next/navigation";

function generateTitle(pathname: string | null): string {
  if (!pathname) {
    return "Home";
  }

  const parts = pathname.split("/").filter(Boolean);
  const lastSegment = parts[parts.length - 1];

  if (!lastSegment || lastSegment.toLowerCase() === "home") {
    return "Home";
  }

  return lastSegment
    .split("-")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const pathname = usePathname();
  const title = generateTitle(pathname);

  return (
    <AnimatedBackground useGlobalCSSVariable={true}>
      <ClassroomHeader
        title={title}
        onMenuToggle={() => setSidebarExpanded(!sidebarExpanded)}
        sidebarExpanded={sidebarExpanded}
      />
      <AnimatedSidebar isPermanentlyExpanded={sidebarExpanded} />
      <div
        style={{ marginLeft: "var(--sidebar-width)" }}
        className="transition-all duration-300 ease-in-out h-full"
      >
        <main className="pt-16 h-full w-full">
          <div className="h-full w-full overflow-y-auto">{children}</div>
        </main>
      </div>
    </AnimatedBackground>
  );
}
