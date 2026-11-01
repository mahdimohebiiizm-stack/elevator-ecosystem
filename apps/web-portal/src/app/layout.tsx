import React from "react";
import type { Metadata, Viewport } from "next";
import { Vazirmatn } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Providers } from "@/app/providers";
import { ElevatorPreloader } from "@/components/ui/ElevatorPreloader";

const vazirmatn = Vazirmatn({
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-vazirmatn",
  display: "swap",
  adjustFontFallback: true,
});

export const metadata: Metadata = {
  title: "آسانرو اطمینان امیر کرمان | خدمات تخصصی و مهندسی آسانسور و پله برقی",
  description:
    "شرکت آسانرو اطمینان امیر کرمان - نصب، راه‌اندازی، سرویس و نگهداری دوره‌ای، بازسازی کابین و تامین قطعات استاندارد انواع آسانسورهای کششی، گیرلس و هیدرولیک در استان کرمان. مدیریت: محبی ۰۹۱۳۳۹۸۲۶۹۵",
  keywords: [
    "آسانرو اطمینان امیر کرمان",
    "آسانسور کرمان",
    "سرویس آسانسور کرمان",
    "تعمیرات آسانسور",
    "نصب آسانسور گیرلس",
    "استاندارد آسانسور",
    "مدیریت محبی",
    "پله برقی کرمان",
  ],
  authors: [{ name: "آسانرو اطمینان امیر کرمان" }],
  openGraph: {
    title: "آسانرو اطمینان امیر کرمان | قرارداد سرویس و نگهداری آسانسور",
    description: "مرجع تخصصی نصب، سرویس و نگهداری انواع آسانسور در استان کرمان - مدیریت: محبی",
    locale: "fa_IR",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fa" dir="rtl" className={`scroll-smooth ${vazirmatn.variable} ${vazirmatn.className}`}>
      <body
        className={`${vazirmatn.className} font-sans min-h-screen bg-background text-foreground antialiased selection:bg-[#f59e0b] selection:text-slate-950 flex flex-col justify-between`}
      >
        <ElevatorPreloader />
        <Providers>
          {/* Global Sticky Header */}
          <Header />

          {/* Dynamic Route Content */}
          <main className="flex-grow w-full">{children}</main>

          {/* Global Dedicated Footer Component */}
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
