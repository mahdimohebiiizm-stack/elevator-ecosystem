import React from "react";
import type { Metadata } from "next";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { AuthGuard } from "@/components/auth/AuthGuard";

export const metadata: Metadata = {
  title: "پیشخوان کاربری | آسانرو اطمینان امیر کرمان",
  description: "مدیریت حساب کاربری، قراردادهای سرویس و نگهداری آسانسور، فاکتورها و درخواست‌های کارشناسی آسانرو اطمینان امیر کرمان",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-slate-50 py-6 sm:py-8 md:py-10" dir="rtl">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
          <div className="flex flex-col lg:flex-row gap-5 lg:gap-6 items-start">
            {/* 1. Persistent Floating Navy Blue RTL Sidebar (Strictly on the RIGHT side in RTL) */}
            <div className="w-full lg:w-64 xl:w-72 flex-shrink-0 lg:sticky lg:top-[175px] z-30">
              <DashboardSidebar />
            </div>

            {/* 2. Main Route Content (Strictly on the LEFT side in RTL) */}
            <main className="flex-1 w-full min-w-0">{children}</main>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
