import React from "react";
import type { Metadata } from "next";
import { AuthGuard } from "@/components/auth/AuthGuard";

export const metadata: Metadata = {
  title: "پیشخوان راهبری و مدیریت سیستم (ERP) | آسانرو اطمینان امیر",
  description: "سامانه یکپارچه مدیریت سفارشات، تیکت‌ها، قراردادهای سرویس و ارتباط مستقیم با مشتریان",
};

export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthGuard requireAdmin={true}>{children}</AuthGuard>;
}
