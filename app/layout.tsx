import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "./components/layout/Sidebar";
import AuthProvider from "./components/auth/AuthProvider";

export const metadata: Metadata = {
  title: "Project Nexus",
  description: "Your Personal Digital Hub",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className="antialiased bg-[#0a0a0a] font-sans"
      >
        <div className="relative flex w-full min-h-screen">
          <Sidebar />
          <div className="flex-1 relative">
            {/* 主要内容 */}
            <div className="relative z-10">
              <AuthProvider>
                {children}
              </AuthProvider>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
