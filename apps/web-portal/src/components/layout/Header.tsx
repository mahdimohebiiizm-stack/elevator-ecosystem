"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronDown,
  Menu,
  User,
  X,
  PhoneCall,
  ShieldCheck,
  Wrench,
  Sparkles,
  LogOut,
  ShoppingCart,
  MessageSquare,
  Bell,
  CheckCheck,
} from "lucide-react";
import { useCartStore } from "@/store/useCartStore";
import { useAuthStore } from "@/store/useAuthStore";
import { CartDrawer } from "@/components/layout/CartDrawer";
import {
  fetchMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  NotificationDto,
} from "@/lib/api";
import { toPersianDigits } from "@/lib/utils";

export const Header: React.FC = () => {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { toggleCart, getTotalItems } = useCartStore();
  const { user, isAuthenticated, logout, toggleLoginModal } = useAuthStore();

  const [notifications, setNotifications] = useState<NotificationDto[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isNotifOpen, setIsNotifOpen] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
    // Lazy fetch notifications on mount ONLY - NO polling
    if (isAuthenticated) {
      fetchMyNotifications()
        .then((res) => {
          setNotifications(res.data?.items || []);
          setUnreadCount(res.data?.unread_count || 0);
        })
        .catch(() => {});
    }
  }, [isAuthenticated]);

  const handleMarkRead = async (id: string) => {
    try {
      await markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {}
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch {}
  };

  const totalItems = mounted ? getTotalItems() : 0;

  const navLinks = [
    { title: "کاتالوگ و فروشگاه", href: "/products", hasDropdown: false },
    { title: "خدمات تخصصی", href: "/#services", hasDropdown: true },
    { title: "پکیج‌ها و قطعات", href: "/#packages", hasDropdown: false },
    { title: "چرا ما؟", href: "/#why-us", hasDropdown: false },
    { title: "درباره شرکت", href: "/#about", hasDropdown: false },
    { title: "مقالات تخصصی", href: "/#blog", hasDropdown: false },
    { title: "تماس با ما", href: "/#contact", hasDropdown: false },
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-white border-b border-slate-200 shadow-md" dir="rtl">
      {/* Top Notification Bar with direct phone & management info - Perfectly Symmetrical max-w-6xl */}
      <div className="w-full bg-slate-950 text-slate-200 py-2 px-4 text-xs sm:text-sm font-bold border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 w-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-amber-400">
              <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 shrink-0" />
              <span>مجری رسمی استاندارد و بیمه آسانسور در استان کرمان</span>
            </span>
            <span className="hidden sm:inline text-slate-600">|</span>
            <span className="hidden sm:inline text-slate-300">مدیریت: مهندس محبی</span>
          </div>

          <div className="flex items-center gap-2 text-amber-400 hover:text-amber-300">
            <PhoneCall className="w-4 h-4 text-amber-400 shrink-0" />
            <a href="tel:09133982695" className="font-mono font-black tracking-wider text-xs sm:text-sm md:text-base">
              ۰۹۱۳۳۹۸۲۶۹۵
            </a>
            <span className="hidden md:inline text-slate-400 font-medium text-xs">(پاسخگویی و امداد ۲۴ ساعته)</span>
          </div>
        </div>
      </div>

      {/* Main Header Container - Masterclass in RTL Symmetry and Extreme Boundaries */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 w-full flex items-center justify-between min-h-[96px] md:min-h-[116px] py-3 md:py-4 gap-4 lg:gap-8">
        {/* FAR RIGHT (RTL Start): Sizable Logo & Brand Identity on the Physical Right Edge */}
        <div className="flex items-center gap-3 md:gap-4 flex-shrink-0">
          <Link href="/" className="flex items-center gap-3 md:gap-4 group flex-shrink-0">
            <div className="relative w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 flex-shrink-0 border-2 border-amber-500/80 p-1 shadow-lg rounded-full overflow-hidden bg-slate-900 group-hover:scale-105 transition-transform duration-300">
              <img
                src="/images/elevator-logo.png"
                alt="آسانرو اطمینان امیر کرمان"
                className="w-full h-full object-cover rounded-full"
              />
            </div>
            <div className="flex flex-col text-right">
              <span className="text-base sm:text-xl md:text-2xl font-black text-slate-900 leading-tight tracking-tight group-hover:text-amber-600 transition-colors whitespace-nowrap">
                آسانرو اطمینان امیر کرمان
              </span>
              <span className="text-xs sm:text-sm font-bold text-slate-500 mt-1 whitespace-nowrap">
                خدمات تخصصی و مهندسی آسانسور
              </span>
            </div>
          </Link>
        </div>

        {/* Center: Navigation Links with Enhanced Readability & Large Scale */}
        <nav className="hidden lg:flex items-center justify-center gap-4 xl:gap-7 flex-1">
          {navLinks.map((link) => (
            <div key={link.title} className="relative group">
              <Link
                href={link.href}
                className="flex items-center gap-1.5 text-sm md:text-base lg:text-[17px] font-extrabold text-slate-800 hover:text-amber-600 py-3 tracking-wide transition-colors whitespace-nowrap"
              >
                <span>{link.title}</span>
                {link.hasDropdown && (
                  <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-amber-600 transition-transform group-hover:rotate-180" />
                )}
              </Link>

              {link.hasDropdown && (
                <div className="absolute top-full right-0 w-72 rounded-2xl bg-white shadow-2xl border border-slate-100 p-3 opacity-0 translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto transition-all duration-200 z-50">
                  <Link
                    href="/#services"
                    className="flex items-center justify-between px-3.5 py-3 text-sm font-bold text-slate-800 hover:bg-amber-50 hover:text-amber-700 rounded-xl transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <Wrench className="w-4 h-4 text-amber-600" />
                      <span>نصب و راه‌اندازی آسانسور</span>
                    </div>
                    <span className="text-[11px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md font-bold">
                      تخصصی
                    </span>
                  </Link>
                  <Link
                    href="/#services"
                    className="block px-3.5 py-2.5 text-xs font-bold text-slate-700 hover:bg-amber-50 hover:text-amber-700 rounded-xl transition-colors"
                  >
                    سرویس و نگهداری دوره‌ای (قرارداد ماهانه)
                  </Link>
                  <Link
                    href="/#services"
                    className="block px-3.5 py-2.5 text-xs font-bold text-slate-700 hover:bg-amber-50 hover:text-amber-700 rounded-xl transition-colors"
                  >
                    بازسازی، نوسازی و تزئینات لوکس کابین
                  </Link>
                  <Link
                    href="/#services"
                    className="block px-3.5 py-2.5 text-xs font-bold text-slate-700 hover:bg-amber-50 hover:text-amber-700 rounded-xl transition-colors"
                  >
                    اخذ تاییدیه و استاندارد ادواری آسانسور
                  </Link>
                  <Link
                    href="/#services"
                    className="block px-3.5 py-2.5 text-xs font-bold text-slate-700 hover:bg-amber-50 hover:text-amber-700 rounded-xl transition-colors"
                  >
                    تامین قطعات اورجینال (موتور، تابلو، ریل)
                  </Link>
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* FAR LEFT (RTL End): Cart Button + CTA Button + Luxury User Profile Pill on Physical Left Edge */}
        <div className="flex items-center gap-2.5 sm:gap-3 flex-shrink-0">
          {/* Cart Icon Button with Notification Badge */}
          <button
            type="button"
            onClick={() => toggleCart()}
            className="relative p-2.5 sm:p-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-amber-400 border border-amber-500/40 hover:border-amber-400 shadow-md transition-all active:scale-95 flex items-center justify-center group"
            aria-label="سبد استعلام قطعات"
          >
            <ShoppingCart className="w-5 h-5 group-hover:scale-110 transition-transform" />
            {mounted && totalItems > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 rounded-full bg-amber-500 text-slate-950 font-black text-[11px] font-mono flex items-center justify-center shadow-lg animate-pulse border-2 border-slate-900">
                {totalItems}
              </span>
            )}
          </button>

          {/* Notification Bell Button & Dropdown (Event-Driven, Zero Polling) */}
          {mounted && isAuthenticated && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                className="relative p-2.5 sm:p-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 shadow-xs transition-all active:scale-95 flex items-center justify-center cursor-pointer"
                aria-label="اعلان‌ها"
              >
                <Bell className="w-5 h-5 text-slate-800" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white font-black text-[10px] font-mono flex items-center justify-center shadow-md animate-pulse border-2 border-white">
                    {toPersianDigits(unreadCount)}
                  </span>
                )}
              </button>

              {/* Notification Dropdown Menu */}
              {isNotifOpen && (
                <div className="absolute left-0 top-full mt-2 w-80 sm:w-96 rounded-2xl bg-white shadow-2xl border border-slate-200 p-4 text-right z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-2">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-amber-600" />
                      <span className="text-xs font-black text-slate-900">اعلان‌ها و رویدادها</span>
                      {unreadCount > 0 && (
                        <span className="text-[10px] bg-rose-100 text-rose-700 font-bold px-1.5 py-0.5 rounded-md">
                          {toPersianDigits(unreadCount)} جدید
                        </span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={handleMarkAllRead}
                        className="inline-flex items-center gap-1 text-[11px] text-amber-600 hover:text-amber-700 font-bold cursor-pointer"
                      >
                        <CheckCheck className="w-3.5 h-3.5" />
                        <span>خواندن همه</span>
                      </button>
                    )}
                  </div>

                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 space-y-1">
                    {notifications.length === 0 ? (
                      <div className="py-8 text-center text-slate-400 text-xs font-medium">
                        هیچ اعلانی برای شما ثبت نشده است.
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => !n.is_read && handleMarkRead(n.id)}
                          className={`p-2.5 rounded-xl transition-colors cursor-pointer text-xs ${
                            n.is_read
                              ? "bg-white hover:bg-slate-50 text-slate-600"
                              : "bg-amber-50/60 hover:bg-amber-50 text-slate-900 font-bold border-r-4 border-amber-500"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-slate-900 text-xs">{n.title}</span>
                            {!n.is_read && (
                              <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                            )}
                          </div>
                          <p className="text-[11px] text-slate-600 font-normal leading-relaxed">
                            {n.message}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Primary CTA Button "درخواست مشاوره" */}
          <Link
            href="/dashboard/contracts/request"
            className="hidden sm:inline-flex items-center gap-2 py-2.5 px-4 md:py-3 md:px-5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs sm:text-sm font-black shadow-md hover:shadow-lg transition-all active:scale-95 whitespace-nowrap"
          >
            <Sparkles className="w-4 h-4 text-slate-950 shrink-0" />
            <span>درخواست مشاوره</span>
          </Link>

          {/* User Profile Pill / Login CTA */}
          {mounted && !isAuthenticated ? (
            <button
              type="button"
              onClick={() => toggleLoginModal(true)}
              className="flex items-center gap-2 py-2 px-3.5 sm:px-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs sm:text-sm font-black shadow-sm transition-all active:scale-95 whitespace-nowrap cursor-pointer"
            >
              <User className="w-4 h-4 text-slate-950" />
              <span>ورود / ثبت‌نام</span>
            </button>
          ) : mounted && isAuthenticated ? (
            <div className="relative group">
              <Link
                href="/dashboard"
                className="flex items-center gap-2.5 px-3 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 border border-slate-200 shadow-sm backdrop-blur-md transition-all cursor-pointer"
              >
                <div className="w-9 h-9 rounded-xl bg-slate-900 text-amber-400 font-black text-xs flex items-center justify-center border border-amber-500/40 shadow-inner shrink-0">
                  {user?.name ? user.name.slice(0, 2) : "مح"}
                </div>
                <div className="hidden md:flex flex-col text-right leading-tight min-w-0">
                  <span className="text-xs font-black text-slate-900 truncate">
                    {user?.name || "کاربر"}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono truncate">
                    {user?.role === "ADMIN" ? "مدیر سیستم" : "مشتری"} • {user?.phone || ""}
                  </span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-600 transition-transform group-hover:rotate-180 hidden sm:block" />
              </Link>

              {/* Hover Dropdown Menu */}
              <div className="absolute left-0 top-full pt-2 w-56 opacity-0 translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto transition-all duration-200 z-50">
                <div className="rounded-2xl bg-white shadow-2xl border border-slate-100 p-2 text-right">
                  <div className="p-2.5 border-b border-slate-100 mb-1">
                    <p className="text-xs font-black text-slate-900 truncate">{user?.name || "کاربر"}</p>
                    <p className="text-[10px] text-slate-400 font-mono truncate">{user?.phone || ""}</p>
                  </div>
                  {user?.role === "ADMIN" && (
                    <Link
                      href="/admin/orders"
                      className="flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors mb-1 bg-rose-50/60 border border-rose-200"
                    >
                      <ShieldCheck className="w-4 h-4 text-rose-600" />
                      <span>پنل مدیریت ارشد (Admin)</span>
                    </Link>
                  )}
                  <Link
                    href="/dashboard"
                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-amber-50 hover:text-amber-700 rounded-xl transition-colors"
                  >
                    <User className="w-4 h-4 text-amber-600" />
                    <span>حساب کاربری و داشبورد</span>
                  </Link>
                  <Link
                    href="/dashboard/contracts/request"
                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-amber-50 hover:text-amber-700 rounded-xl transition-colors"
                  >
                    <Wrench className="w-4 h-4 text-amber-600" />
                    <span>درخواست سرویس و بازدید</span>
                  </Link>
                  <Link
                    href="/dashboard/tickets"
                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-amber-50 hover:text-amber-700 rounded-xl transition-colors"
                  >
                    <MessageSquare className="w-4 h-4 text-amber-600" />
                    <span>تیکت‌ها و پشتیبانی</span>
                  </Link>
                  <div className="my-1 border-t border-slate-100" />
                  <button
                    type="button"
                    onClick={() => {
                      logout();
                      window.location.href = "/";
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors text-right cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 text-rose-500" />
                    <span>خروج از حساب</span>
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {/* Mobile Menu Hamburger */}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2.5 rounded-xl text-slate-800 hover:bg-slate-100 transition-colors"
            aria-label="منو"
          >
            {isMobileMenuOpen ? <X className="w-7 h-7" /> : <Menu className="w-7 h-7" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {isMobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white px-5 py-5 space-y-3 shadow-xl animate-in fade-in slide-in-from-top-2">
          {navLinks.map((link) => (
            <Link
              key={link.title}
              href={link.href}
              onClick={() => setIsMobileMenuOpen(false)}
              className="block px-4 py-3 text-base font-black text-slate-800 hover:bg-amber-50 hover:text-amber-600 rounded-xl text-right transition-colors"
            >
              {link.title}
            </Link>
          ))}
          <div className="pt-4 border-t border-slate-100 flex flex-col gap-3">
            {mounted && !isAuthenticated ? (
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  toggleLoginModal(true);
                }}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-amber-500 text-slate-950 font-black text-sm shadow-sm"
              >
                <User className="w-4 h-4 text-slate-950" />
                <span>ورود / ثبت‌نام</span>
              </button>
            ) : (
              <>
                <Link
                  href="/dashboard"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold text-sm transition-colors"
                >
                  <User className="w-4 h-4 text-amber-600" />
                  <span>{user?.name || "پنل کاربری"}</span>
                </Link>
                <Link
                  href="/dashboard/tickets"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-sm transition-colors"
                >
                  <MessageSquare className="w-4 h-4 text-amber-600" />
                  <span>تیکت‌ها و پشتیبانی</span>
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    window.location.href = "/";
                  }}
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-rose-600 hover:bg-rose-50 text-xs font-bold transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>خروج از حساب</span>
                </button>
              </>
            )}
            <a
              href="tel:09133982695"
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-slate-900 text-amber-400 font-black text-base shadow-sm"
            >
              <PhoneCall className="w-5 h-5 text-amber-400" />
              <span className="font-mono text-base">۰۹۱۳۳۹۸۲۶۹۵</span>
              <span className="text-xs text-slate-300 font-bold">(تماس فوری)</span>
            </a>
            <div className="flex items-center justify-between text-xs text-slate-500 font-bold px-2">
              <span>مدیریت: مهندس محبی</span>
              <span>استان کرمان</span>
            </div>
          </div>
        </div>
      )}
      {/* Global Luxury Cart Drawer */}
      <CartDrawer />
    </header>
  );
};

export default Header;