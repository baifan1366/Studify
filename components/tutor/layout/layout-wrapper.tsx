"use client";

import { useState } from "react";
import AnimatedSidebar from "./sidebar";
import ClassroomHeader from "./header";
import AnimatedBackground from "@/components/ui/animated-background";

export default function LayoutWrapper({
  children,
  title,
  userName,
}: {
  children: React.ReactNode;
  title?: string;
  userName?: string;
}) {
  const [sidebarExpanded, setSidebarExpanded] = useState(false);

  return (
    <AnimatedBackground>
      <ClassroomHeader
        title={title}
        userName={userName}
        onMenuToggle={() => setSidebarExpanded(!sidebarExpanded)}
        sidebarExpanded={sidebarExpanded}
      />
      <AnimatedSidebar isPermanentlyExpanded={sidebarExpanded} />
      <div style={{ marginLeft: 'var(--sidebar-width)' }} className="transition-all duration-300 ease-in-out h-full">
        <main className="pt-16 h-full">
          <div className="p-8 h-full overflow-y-auto">
            {children}
          </div>
        </main>
      </div>
    </AnimatedBackground>
  );
}
