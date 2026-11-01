"use client";

import React from "react";
import Link from "next/link";
import { Heart, ShoppingBag, ArrowRight } from "lucide-react";

export default function WishlistPage() {
  return (
    <div className="w-full space-y-6 font-sans text-foreground" dir="rtl">
      {/* Header Bar */}
      <div className="bg-card rounded-3xl p-6 sm:p-7 border border-border shadow-[0_2px_15px_rgba(0,0,0,0.03)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 flex items-center justify-center flex-shrink-0">
            <Heart className="w-6 h-6 fill-rose-500/20" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
              لیست علاقه‌مندی‌ها
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground font-medium mt-0.5">
              قطعات، پکیج‌ها و تجهیزات نشان‌شده شما جهت دسترسی و خرید سریع‌تر
            </p>
          </div>
        </div>

        <Link
          href="/products"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shadow-md transition-all active:scale-95 cursor-pointer"
        >
          <ShoppingBag className="w-4 h-4" />
          <span>مشاهده فروشگاه قطعات</span>
        </Link>
      </div>

      {/* Empty State */}
      <div className="bg-card rounded-3xl p-12 sm:p-16 border border-border shadow-xs text-center space-y-4">
        <div className="w-16 h-16 rounded-3xl bg-rose-500/10 text-rose-600 flex items-center justify-center mx-auto border border-rose-500/20">
          <Heart className="w-8 h-8" />
        </div>
        <div>
          <h3 className="text-base font-black text-foreground">
            لیست علاقه‌مندی‌های شما در حال حاضر خالی است
          </h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1 leading-relaxed">
            می‌توانید با کلیک بر روی آیکون قلب در صفحه کاتالوگ محصولات، قطعات و پکیج‌های مورد نظر
            خود را نشان کنید تا در هر زمان به راحتی به آن‌ها دسترسی داشته باشید.
          </p>
        </div>
        <Link
          href="/products"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shadow-md transition-all active:scale-95 cursor-pointer"
        >
          <span>مشاهده و انتخاب محصولات</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
