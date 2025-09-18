import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "./components/Sidebar";
import AuthProvider from "./components/AuthProvider";

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
        className="antialiased bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 min-h-screen font-sans"
      >
        <div className="relative flex w-full h-full">
          <Sidebar />
          <div className="flex-1 relative overflow-y-auto">
            {/* 背景装饰 */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
              <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl animate-pulse delay-2000"></div>
            </div>

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
