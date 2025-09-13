import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { PWAProvider } from "@/components/providers/pwa-provider";
import "./globals.css";
import "@livekit/components-styles";

export const metadata: Metadata = {
  title: "Studify - Smart Learning Platform",
  description: "AI-powered intelligent learning and education platform with course management, online classrooms, and community features",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Studify",
  },
  icons: {
    icon: "/favicon.png",
    apple: "/favicon.png",
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
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
