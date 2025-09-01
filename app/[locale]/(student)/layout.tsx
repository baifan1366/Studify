"use client";

import React, { useState } from "react";
import ClassroomHeader from "@/components/header";
import AnimatedSidebar from "@/components/sidebar";
import AnimatedBackground from "@/components/ui/animated-background";

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [isPermanentlyExpanded, setIsPermanentlyExpanded] = useState(false);

  const handleMenuToggle = () => {
    setIsPermanentlyExpanded((prev) => !prev);
    setSidebarExpanded((prev) => !prev);
  };

  return (
    <AnimatedBackground className="min-h-screen w-full">
      {/* Header */}
      <ClassroomHeader
        title="Studify"
        sidebarExpanded={isPermanentlyExpanded}
        onMenuToggle={handleMenuToggle}
      />

      {/* Sidebar (shared) */}
      <AnimatedSidebar
        onExpansionChange={setSidebarExpanded}
        isPermanentlyExpanded={isPermanentlyExpanded}
      />

      {/* Main content area */}
      <div
        className="relative z-10 mt-16 p-6 h-full overflow-y-auto"
        style={{
          marginLeft: sidebarExpanded ? "280px" : "80px",
          transition: "margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          width: `calc(100vw - ${sidebarExpanded ? "280px" : "80px"})`,
        }}
      >
        {children}
      </div>
    </AnimatedBackground>
  );
}
