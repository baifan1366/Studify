import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Authentication Callback | Studify",
  description: "Processing your authentication request with Studify",
  keywords: "authentication, login, callback, studify",
  openGraph: {
    title: "Authentication Callback | Studify",
    description: "Processing your authentication request with Studify",
    type: 'website',
  },
};

// 客户端组件需要单独导出，以便保持 metadata 在服务器端
export { default } from "@/components/auth/auth-callback";
