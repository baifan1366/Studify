"use client";

import { ThemeProvider } from "@/components/providers/theme-provider";
import { PWAProvider } from "@/components/providers/pwa-provider";
import "./globals.css";
import "@livekit/components-styles";
import { setupNotification } from "@/utils/notification/notifications-setup";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  setupNotification();
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#3b82f6" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Studify" />
        <link rel="apple-touch-icon" href="/favicon.png" />
      </head>
      <body className="antialiased min-h-screen bg-background" data-lk-theme="default">
        <ThemeProvider>
          <PWAProvider>
            {children}
          </PWAProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
