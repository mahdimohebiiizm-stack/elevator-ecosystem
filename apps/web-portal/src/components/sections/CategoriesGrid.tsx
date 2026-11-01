"use client";

import React from "react";
import Link from "next/link";
import {
  Send,
  Sparkles,
  TrendingUp,
  Layers,
  Sliders,
} from "lucide-react";

export interface CategoryItem {
  id: string;
  title: string;
  href: string;
  icon: React.ReactNode;
}

export const defaultCategories: CategoryItem[] = [
  {
    id: "traction",
    title: "آسانسورهای کششی و گیرلس",
    href: "/dashboard/contracts/request",
    icon: <Layers className="w-12 h-12 text-amber-400 group-hover:scale-110 transition-transform duration-500" />,
  },
  {
    id: "hydraulic",
    title: "آسانسورهای هیدرولیک",
    href: "/dashboard/contracts/request",
    icon: <Sliders className="w-12 h-12 text-amber-400 group-hover:scale-110 transition-transform duration-500" />,
  },
  {
    id: "panorama",
    title: "آسانسورهای لوکس پانوراما",
    href: "/dashboard/contracts/request",
    icon: <Sparkles className="w-12 h-12 text-amber-400 group-hover:scale-110 transition-transform duration-500" />,
  },
  {
    id: "escalator",
    title: "پله برقی و پیاده‌رو متحرک",
    href: "/dashboard/contracts/request",
    icon: <TrendingUp className="w-12 h-12 text-amber-400 group-hover:scale-110 transition-transform duration-500" />,
  },
];

export interface CategoriesGridProps {
  categories?: CategoryItem[];
  telegramChannelHandle?: string;
  telegramLink?: string;
}

export const CategoriesGrid: React.FC<CategoriesGridProps> = ({
  categories = defaultCategories,
  telegramChannelHandle = "@EtminanAmirKerman",
  telegramLink = "https://t.me/parspremium",
}) => {
  const tractionCard = categories.find((c) => c.id === "traction") || categories[0];
  const hydraulicCard = categories.find((c) => c.id === "hydraulic") || categories[1];
  const panoramaCard = categories.find((c) => c.id === "panorama") || categories[2];
  const escalatorCard = categories.find((c) => c.id === "escalator") || categories[3];

  return (
    <section className="w-full max-w-6xl mx-auto px-4 sm:px-6 my-16" dir="rtl">
      {/* Clean Minimal Section Heading */}
      <div className="flex flex-col items-center text-center mb-10">
        <span className="text-amber-600 text-xs sm:text-sm tracking-[0.2em] font-extrabold uppercase mb-1 font-mono">
          CATEGORIES
        </span>
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight">
          دسته‌بندی آسانسورها
        </h2>
      </div>

      {/* Proven 3-Column Masonry Grid on Desktop */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
        {/* Right Column: 2 Cards (کششی و هیدرولیک) */}
        <div className="flex flex-col gap-6 order-2 md:order-1">
          {/* Card 1: آسانسورهای کششی و گیرلس */}
          <Link
            href={tractionCard.href}
            className="group rounded-3xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 hover:border-amber-500/50 shadow-xl hover:shadow-2xl hover:shadow-amber-900/20 hover:-translate-y-2 transition-all duration-500 flex-1 flex flex-col items-center justify-center p-8 min-h-[195px] text-center"
          >
            <div className="w-20 h-20 rounded-2xl bg-slate-950/80 border border-amber-500/30 flex items-center justify-center mb-4 shadow-lg group-hover:border-amber-400/80 group-hover:shadow-amber-500/20 transition-all duration-500">
              {tractionCard.icon}
            </div>
            <h3 className="text-lg sm:text-xl font-black text-white group-hover:text-amber-400 transition-colors">
              {tractionCard.title}
            </h3>
          </Link>

          {/* Card 2: آسانسورهای هیدرولیک */}
          <Link
            href={hydraulicCard.href}
            className="group rounded-3xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 hover:border-amber-500/50 shadow-xl hover:shadow-2xl hover:shadow-amber-900/20 hover:-translate-y-2 transition-all duration-500 flex-1 flex flex-col items-center justify-center p-8 min-h-[195px] text-center"
          >
            <div className="w-20 h-20 rounded-2xl bg-slate-950/80 border border-amber-500/30 flex items-center justify-center mb-4 shadow-lg group-hover:border-amber-400/80 group-hover:shadow-amber-500/20 transition-all duration-500">
              {hydraulicCard.icon}
            </div>
            <h3 className="text-lg sm:text-xl font-black text-white group-hover:text-amber-400 transition-colors">
              {hydraulicCard.title}
            </h3>
          </Link>
        </div>

        {/* Center Column: Tall Advisory & Contact Banner Spanning 2 Rows */}
        <div className="order-1 md:order-2">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 border-2 border-amber-500 shadow-xl h-full min-h-[420px] flex flex-col justify-between p-8 text-center">
            {/* Top Logo & Telegram Handle */}
            <div className="flex flex-col items-center space-y-3">
              <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-amber-400 shadow-lg bg-slate-950 flex items-center justify-center flex-shrink-0">
                <img
                  src="/images/elevator-logo.png"
                  alt="آسانرو اطمینان امیر کرمان"
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-white/10 text-xs font-mono font-bold text-amber-400 border border-amber-500/30">
                <Send className="w-3.5 h-3.5" />
                <span>{telegramChannelHandle}</span>
              </div>
            </div>

            {/* Central Information */}
            <div className="space-y-3 py-4">
              <h3 className="text-xl sm:text-2xl font-black text-white leading-snug">
                مشاوره فنی و اطلاع‌رسانی <br />
                <span className="text-amber-400">سرویس و استاندارد</span>
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed font-bold">
                جهت استعلام آنلاین تعرفه سرویس و نگهداری، قوانین استاندارد ادواری و نمونه پروژه‌های اجرایی در کرمان
              </p>

              <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-amber-500/20 text-xs text-slate-200 space-y-1.5 text-right">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">مدیریت:</span>
                  <span className="font-bold text-amber-300">مهندس محبی</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">تماس مستقیم:</span>
                  <a href="tel:09133982695" className="font-mono font-black text-white hover:text-amber-400 transition-colors">
                    ۰۹۱۳۳۹۸۲۶۹۵
                  </a>
                </div>
              </div>
            </div>

            {/* CTA Button */}
            <div className="pt-2">
              <a
                href={telegramLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 w-full py-3.5 px-6 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm shadow-lg shadow-amber-500/25 transition-all active:scale-95"
              >
                <span>عضویت در کانال اطلاع‌رسانی</span>
                <Send className="w-4 h-4 -scale-x-100" />
              </a>
            </div>
          </div>
        </div>

        {/* Left Column: 2 Cards (پانوراما و پله برقی) */}
        <div className="flex flex-col gap-6 order-3">
          {/* Card 3: آسانسورهای لوکس پانوراما */}
          <Link
            href={panoramaCard.href}
            className="group rounded-3xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 hover:border-amber-500/50 shadow-xl hover:shadow-2xl hover:shadow-amber-900/20 hover:-translate-y-2 transition-all duration-500 flex-1 flex flex-col items-center justify-center p-8 min-h-[195px] text-center"
          >
            <div className="w-20 h-20 rounded-2xl bg-slate-950/80 border border-amber-500/30 flex items-center justify-center mb-4 shadow-lg group-hover:border-amber-400/80 group-hover:shadow-amber-500/20 transition-all duration-500">
              {panoramaCard.icon}
            </div>
            <h3 className="text-lg sm:text-xl font-black text-white group-hover:text-amber-400 transition-colors">
              {panoramaCard.title}
            </h3>
          </Link>

          {/* Card 4: پله برقی و پیاده‌رو متحرک */}
          <Link
            href={escalatorCard.href}
            className="group rounded-3xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 hover:border-amber-500/50 shadow-xl hover:shadow-2xl hover:shadow-amber-900/20 hover:-translate-y-2 transition-all duration-500 flex-1 flex flex-col items-center justify-center p-8 min-h-[195px] text-center"
          >
            <div className="w-20 h-20 rounded-2xl bg-slate-950/80 border border-amber-500/30 flex items-center justify-center mb-4 shadow-lg group-hover:border-amber-400/80 group-hover:shadow-amber-500/20 transition-all duration-500">
              {escalatorCard.icon}
            </div>
            <h3 className="text-lg sm:text-xl font-black text-white group-hover:text-amber-400 transition-colors">
              {escalatorCard.title}
            </h3>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default CategoriesGrid;