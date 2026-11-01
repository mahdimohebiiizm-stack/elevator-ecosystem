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
    <header className="sticky top-0 z-40 w-full bg-white border-b border-slate-200 shadow-xs" dir="rtl">
      {/* Top Notification Bar with direct phone & management info */}
      <div className="w-full bg-slate-950 text-slate-200 py-1.5 sm:py-2 px-3 sm:px-4 text-[11px] sm:text-xs md:text-sm font-bold border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-2 sm:px-4 md:px-6 w-full flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 sm:gap-3 truncate">
            <span className="inline-flex items-center gap-1 sm:gap-1.5 text-amber-400 truncate">
              <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 shrink-0" />
              <span className="truncate">مجری استاندارد و بیمه آسانسور در کرمان</span>
            </span>
            <span className="hidden md:inline text-slate-600">|</span>
            <span className="hidden md:inline text-slate-300">مدیریت: مهندس محبی</span>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 text-amber-400 hover:text-amber-300 shrink-0">
            <PhoneCall className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 shrink-0" />
            <a href="tel:09133982695" className="font-mono font-black tracking-wider text-xs sm:text-sm">
              ۰۹۱۳۳۹۸۲۶۹۵
            </a>
            <span className="hidden lg:inline text-slate-400 font-medium text-xs">(امداد ۲۴ ساعته)</span>
          </div>
        </div>
      </div>

      {/* Main Header Container - Fully Responsive Mobile-First */}
      <div className="max-w-6xl mx-auto px-3 sm:px-4 md:px-6 w-full flex items-center justify-between min-h-[64px] sm:min-h-[80px] md:min-h-[96px] py-2 sm:py-3 gap-2 sm:gap-4 lg:gap-8">
        {/* Right (Brand & Identity) */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Link href="/" className="flex items-center gap-2 sm:gap-3 group min-w-0">
            <div className="relative w-10 h-10 sm:w-14 sm:h-14 md:w-18 md:h-18 shrink-0 border-2 border-amber-500/80 p-0.5 sm:p-1 shadow-md rounded-full overflow-hidden bg-slate-900 group-hover:scale-105 transition-transform duration-300">
              <img
                src="/images/elevator-logo.png"
                alt="آسانرو اطمینان امیر کرمان"
                className="w-full h-full object-cover rounded-full"
              />
            </div>
            <div className="flex flex-col text-right min-w-0">
              <span className="text-xs sm:text-base md:text-xl font-black text-slate-900 leading-tight tracking-tight group-hover:text-amber-600 transition-colors truncate">
                آسانرو اطمینان امیر
              </span>
              <span className="hidden sm:block text-[11px] sm:text-xs font-bold text-slate-500 mt-0.5 truncate">
                خدمات تخصصی و مهندسی آسانسور
              </span>
            </div>
          </Link>
        </div>

        {/* Center: Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center justify-center gap-3 xl:gap-6 flex-1">
          {navLinks.map((link) => (
            <div key={link.title} className="relative group">
              <Link
                href={link.href}
                className="flex items-center gap-1 text-sm lg:text-[15px] font-extrabold text-slate-800 hover:text-amber-600 py-3 tracking-wide transition-colors whitespace-nowrap"
              >
                <span>{link.title}</span>
                {link.hasDropdown && (
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-600 transition-transform group-hover:rotate-180" />
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

        {/* Left: Action Buttons (Cart, Notification, User, Menu) */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Cart Icon Button */}
          <button
            type="button"
            onClick={() => toggleCart()}
            className="relative p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-slate-900 hover:bg-slate-800 text-amber-400 border border-amber-500/40 hover:border-amber-400 shadow-xs transition-all active:scale-95 flex items-center justify-center cursor-pointer"
            aria-label="سبد استعلام قطعات"
          >
            <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5" />
            {mounted && totalItems > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[18px] sm:min-w-[20px] h-4.5 sm:h-5 px-1 rounded-full bg-amber-500 text-slate-950 font-black text-[10px] sm:text-[11px] font-mono flex items-center justify-center shadow-md animate-pulse border border-slate-900">
                {totalItems}
              </span>
            )}
          </button>

          {/* Notification Bell Button */}
          {mounted && isAuthenticated && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                className="relative p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 shadow-xs transition-all active:scale-95 flex items-center justify-center cursor-pointer"
                aria-label="اعلان‌ها"
              >
                <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-slate-800" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-rose-600 text-white font-black text-[9px] sm:text-[10px] font-mono flex items-center justify-center shadow-sm animate-pulse border border-white">
                    {toPersianDigits(unreadCount)}
                  </span>
                )}
              </button>

              {/* Notification Dropdown Menu */}
              {isNotifOpen && (
                <div className="fixed inset-x-4 top-20 sm:absolute sm:inset-auto sm:left-0 sm:top-full mt-2 sm:w-96 rounded-2xl bg-white shadow-2xl border border-slate-200 p-3.5 sm:p-4 text-right z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 mb-2">
                    <div className="flex items-center gap-1.5">
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

                  <div className="max-h-64 sm:max-h-72 overflow-y-auto divide-y divide-slate-100 space-y-1">
                    {notifications.length === 0 ? (
                      <div className="py-6 text-center text-slate-400 text-xs font-medium">
                        هیچ اعلانی برای شما ثبت نشده است.
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => !n.is_read && handleMarkRead(n.id)}
                          className={`p-2 rounded-xl transition-colors cursor-pointer text-xs ${
                            n.is_read
                              ? "bg-white hover:bg-slate-50 text-slate-600"
                              : "bg-amber-50/60 hover:bg-amber-50 text-slate-900 font-bold border-r-4 border-amber-500"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="font-bold text-slate-900 text-xs truncate">{n.title}</span>
                            {!n.is_read && (
                              <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0 mr-1" />
                            )}
                          </div>
                          <p className="text-[11px] text-slate-600 font-normal leading-relaxed line-clamp-2">
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

          {/* Consultation CTA (Hidden on small mobile) */}
          <Link
            href="/dashboard/contracts/request"
            className="hidden md:inline-flex items-center gap-1.5 py-2 px-3 lg:px-4 rounded-xl sm:rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shadow-xs transition-all active:scale-95 whitespace-nowrap"
          >
            <Sparkles className="w-3.5 h-3.5 text-slate-950 shrink-0" />
            <span>درخواست مشاوره</span>
          </Link>

          {/* User Profile Pill / Login */}
          {mounted && !isAuthenticated ? (
            <button
              type="button"
              onClick={() => toggleLoginModal(true)}
              className="flex items-center gap-1.5 py-1.5 px-2.5 sm:py-2 sm:px-3.5 rounded-xl sm:rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shadow-xs transition-all active:scale-95 whitespace-nowrap cursor-pointer"
            >
              <User className="w-3.5 h-3.5 text-slate-950" />
              <span>ورود</span>
            </button>
          ) : mounted && isAuthenticated ? (
            <div className="relative group">
              <Link
                href="/dashboard"
                className="flex items-center gap-1.5 sm:gap-2 p-1 sm:px-2.5 sm:py-1.5 rounded-xl sm:rounded-2xl bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-all cursor-pointer"
              >
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-slate-900 text-amber-400 font-black text-xs flex items-center justify-center border border-amber-500/40 shrink-0">
                  {user?.name ? user.name.slice(0, 2) : "مح"}
                </div>
                <div className="hidden lg:flex flex-col text-right leading-tight min-w-0 max-w-[90px]">
                  <span className="text-xs font-black text-slate-900 truncate">
                    {user?.name || "کاربر"}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono truncate">
                    {user?.role === "ADMIN" ? "مدیر" : "مشتری"}
                  </span>
                </div>
                <ChevronDown className="w-3 h-3 text-slate-400 hidden sm:block" />
              </Link>

              {/* Hover Dropdown Menu */}
              <div className="absolute left-0 top-full pt-2 w-52 opacity-0 translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto transition-all duration-200 z-50">
                <div className="rounded-2xl bg-white shadow-2xl border border-slate-100 p-2 text-right">
                  <div className="p-2 border-b border-slate-100 mb-1">
                    <p className="text-xs font-black text-slate-900 truncate">{user?.name || "کاربر"}</p>
                    <p className="text-[10px] text-slate-400 font-mono truncate">{user?.phone || ""}</p>
                  </div>
                  {user?.role === "ADMIN" && (
                    <Link
                      href="/admin/orders"
                      className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors mb-1 bg-rose-50/60 border border-rose-200"
                    >
                      <ShieldCheck className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>پنل مدیریت ارشد</span>
                    </Link>
                  )}
                  <Link
                    href="/dashboard"
                    className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-amber-50 hover:text-amber-700 rounded-xl transition-colors"
                  >
                    <User className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>داشبورد کاربری</span>
                  </Link>
                  <Link
                    href="/dashboard/contracts/request"
                    className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-amber-50 hover:text-amber-700 rounded-xl transition-colors"
                  >
                    <Wrench className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>درخواست سرویس</span>
                  </Link>
                  <Link
                    href="/dashboard/tickets"
                    className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-amber-50 hover:text-amber-700 rounded-xl transition-colors"
                  >
                    <MessageSquare className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>پشتیبانی تیکت</span>
                  </Link>
                  <div className="my-1 border-t border-slate-100" />
                  <button
                    type="button"
                    onClick={() => {
                      logout();
                      window.location.href = "/";
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors text-right cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 text-rose-500 shrink-0" />
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
            className="lg:hidden p-1.5 sm:p-2 rounded-xl text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="منو"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {isMobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white px-4 py-4 space-y-2 shadow-xl animate-in fade-in slide-in-from-top-2">
          {navLinks.map((link) => (
            <Link
              key={link.title}
              href={link.href}
              onClick={() => setIsMobileMenuOpen(false)}
              className="block px-3 py-2.5 text-sm font-black text-slate-800 hover:bg-amber-50 hover:text-amber-600 rounded-xl text-right transition-colors"
            >
              {link.title}
            </Link>
          ))}
          <div className="pt-3 border-t border-slate-100 flex flex-col gap-2.5">
            {mounted && !isAuthenticated ? (
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  toggleLoginModal(true);
                }}
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-amber-500 text-slate-950 font-black text-sm shadow-xs cursor-pointer"
              >
                <User className="w-4 h-4 text-slate-950" />
                <span>ورود / ثبت‌نام در سامانه</span>
              </button>
            ) : (
              <>
                <Link
                  href="/dashboard"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold text-sm transition-colors"
                >
                  <User className="w-4 h-4 text-amber-600" />
                  <span>{user?.name || "پنل کاربری"}</span>
                </Link>
                <Link
                  href="/dashboard/contracts/request"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-sm transition-colors"
                >
                  <Wrench className="w-4 h-4 text-amber-600" />
                  <span>درخواست مشاوره و بازدید</span>
                </Link>
                <Link
                  href="/dashboard/tickets"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-sm transition-colors"
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
                  className="flex items-center justify-center gap-2 w-full py-2 rounded-xl text-rose-600 hover:bg-rose-50 text-xs font-bold transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>خروج از حساب</span>
                </button>
              </>
            )}
            <a
              href="tel:09133982695"
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-slate-900 text-amber-400 font-black text-sm shadow-xs"
            >
              <PhoneCall className="w-4 h-4 text-amber-400" />
              <span className="font-mono text-sm">۰۹۱۳۳۹۸۲۶۹۵</span>
              <span className="text-[11px] text-slate-300 font-bold">(تماس فوری ۲۴ ساعته)</span>
            </a>
          </div>
        </div>
      )}
      <CartDrawer />
    </header>
  );
};

export default Header;
