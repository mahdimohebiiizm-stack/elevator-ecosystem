import React from "react";
import type { Metadata } from "next";
import { Header } from "@/components/layout/Header";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { AuthGuard } from "@/components/auth/AuthGuard";

export const metadata: Metadata = {
  title: "پنل مدیریت و راهبری سیستم | آسانرو اطمینان امیر کرمان",
  description: "سامانه یکپارچه مانیتورینگ، مدیریت سفارشات، تایید تراکنش‌ها و قراردادهای آسانرو اطمینان امیر کرمان",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard requireAdmin={true}>
      <div className="min-h-screen bg-slate-50 flex flex-col font-sans" dir="rtl">
        {/* Global sticky header from RootLayout handles top navigation; included here for Unified App Shell contract */}
        <div className="hidden">
          <Header />
        </div>
        <div className="flex-1 flex items-start max-w-[1700px] w-full mx-auto p-4 sm:p-6 lg:p-8 gap-6 lg:gap-8">
          <div className="w-full lg:w-72 flex-shrink-0 lg:sticky lg:top-[175px] z-30">
            <DashboardSidebar />
          </div>
          <main className="flex-1 min-w-0">
            {children}
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
