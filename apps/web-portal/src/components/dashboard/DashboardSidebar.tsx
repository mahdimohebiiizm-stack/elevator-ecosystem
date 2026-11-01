"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  User,
  Wallet,
  Heart,
  ShoppingBag,
  MessageSquare,
  PlusCircle,
  LogOut,
  Menu,
  X,
  CreditCard,
  ShieldCheck,
  ShieldAlert,
  ShoppingCart,
  Package,
  LayoutTemplate,
  Wrench,
  Users,
  LayoutDashboard,
} from "lucide-react";
import { cn, formatToToman } from "@/lib/utils";
import { useAuthStore } from "@/store/useAuthStore";

export interface DashboardSidebarProps {
  userName?: string;
  userInitials?: string;
  membershipStatus?: string;
  walletBalanceRials?: number;
  className?: string;
  onLogout?: () => void;
}

export interface NavItem {
  id: string;
  label: string;
  icon: any;
  href: string;
  disabled?: boolean;
  badge?: string;
}

export const navItems: NavItem[] = [
  {
    id: "account",
    label: "اطلاعات حساب",
    icon: User,
    href: "/dashboard",
  },
  {
    id: "wallet",
    label: "کیف پول",
    icon: Wallet,
    href: "/dashboard/wallet",
  },
  {
    id: "wishlist",
    label: "لیست علاقه‌مندی‌ها",
    icon: Heart,
    href: "/dashboard/wishlist",
  },
  {
    id: "orders",
    label: "سفارش‌های من",
    icon: ShoppingBag,
    href: "/dashboard/orders",
  },
  {
    id: "tickets",
    label: "تیکت‌ها",
    icon: MessageSquare,
    href: "/dashboard/tickets",
  },
  {
    id: "contracts",
    label: "قراردادهای سرویس",
    icon: Wrench,
    href: "/dashboard/contracts",
  },
];

export const adminNavItems: NavItem[] = [
  {
    id: "admin-home",
    label: "پیشخوان مدیریت",
    icon: LayoutDashboard,
    href: "/dashboard/admin",
  },
  {
    id: "admin-orders",
    label: "مدیریت سفارشات",
    icon: ShoppingCart,
    href: "/dashboard/admin/orders",
  },
  {
    id: "admin-contracts",
    label: "قراردادهای سرویس (Admin)",
    icon: Wrench,
    href: "/dashboard/admin/contracts",
  },
  {
    id: "admin-tickets",
    label: "تیکت‌ها و پشتیبانی",
    icon: MessageSquare,
    href: "/dashboard/admin/tickets",
  },
  {
    id: "admin-users",
    label: "مدیریت کاربران (CRM)",
    icon: Users,
    href: "/dashboard/admin/users",
  },
  {
    id: "admin-products",
    label: "انبار و محصولات",
    icon: Package,
    href: "/admin/products",
  },
  {
    id: "admin-cms",
    label: "محتوا و بنرها",
    icon: LayoutTemplate,
    href: "/admin/cms",
  },
];

export const DashboardSidebar: React.FC<DashboardSidebarProps> = ({
  userName = "مهدی میری",
  userInitials = "مم",
  membershipStatus = "عضو فعال",
  walletBalanceRials = 0,
  className,
  onLogout,
}) => {
  const [mounted, setMounted] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

  useEffect(() => {
    setMounted(true);
  }, []);

  const formattedBalance = formatToToman(walletBalanceRials);

  const activeUserName = mounted && user?.name ? user.name : userName;
  const isAdmin = mounted && user?.role === "ADMIN";
  const activeInitials = mounted && user?.name
    ? user.name
        .split(" ")
        .filter(Boolean)
        .map((n) => n[0])
        .join("")
        .slice(0, 2) || user.name.slice(0, 2)
    : userInitials;

  const handleLogout = () => {
    if (onLogout) onLogout();
    logout();
    setMobileOpen(false);
    window.location.href = "/";
  };

  const isItemActive = (href: string) => {
    if (href === "/dashboard" || href === "/dashboard/admin") {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  const sidebarContent = (
    <div className="flex flex-col justify-between min-h-full space-y-6">
      {/* Top Profile Area (Matching Live Pars Premium UI) */}
      <div>
        {/* User Card: Initials Circle on Left/Right, Name & Status */}
        <div className="flex items-center justify-between pb-4">
          <div className="text-right">
            <h3 className="text-base font-black text-white">{activeUserName}</h3>
            {isAdmin ? (
              <div className="flex items-center gap-1.5 mt-1.5 text-xs text-rose-400 font-bold">
                <span className="w-2 h-2 rounded-full bg-rose-500 inline-block animate-pulse" />
                <span className="bg-rose-500/20 text-rose-300 border border-rose-500/40 px-2 py-0.5 rounded-full text-[11px]">
                  مدیر سیستم
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 mt-1.5 text-xs text-amber-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-amber-400 inline-block animate-pulse" />
                <span>{mounted && user ? "مشتری" : membershipStatus}</span>
              </div>
            )}
          </div>

          {/* Initials Circle */}
          <div
            className={cn(
              "flex items-center justify-center w-12 h-12 rounded-full font-black text-base shadow-inner flex-shrink-0 transition-colors",
              isAdmin
                ? "bg-rose-500/20 border border-rose-400/50 text-rose-300"
                : "bg-amber-500/20 border border-amber-400/50 text-amber-300"
            )}
          >
            {activeInitials}
          </div>
        </div>

        {/* Thin Divider */}
        <div className="h-[1px] w-full bg-white/10 my-2" />

        {/* Wallet Balance Summary Row */}
        <div className="py-3 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-white/90">
            <CreditCard className="w-4 h-4 text-amber-400" />
            <span className="text-white/70">کیف پول:</span>
            <span className="font-extrabold text-white">{formattedBalance}</span>
          </div>

          <Link
            href="/dashboard/wallet"
            className="text-[11px] font-bold text-amber-400 hover:text-white transition-colors"
          >
            افزایش موجودی &gt;
          </Link>
        </div>

        {/* Thin Divider */}
        <div className="h-[1px] w-full bg-white/10 my-2" />

        {/* Navigation Menu */}
        <nav className="mt-3 space-y-1.5" aria-label="ناوبری حساب کاربری">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = isItemActive(item.href);

            return (
              <Link
                key={item.id}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all text-right",
                  isActive
                    ? "bg-slate-800 text-amber-400 shadow-md shadow-black/20 ring-1 ring-amber-500/30"
                    : "text-white/80 hover:text-white hover:bg-white/5"
                )}
              >
                <Icon className={cn("w-4 h-4", isActive ? "text-amber-400" : "text-white/70")} />
                <span>{item.label}</span>
              </Link>
            );
          })}

          {/* Dynamic Admin Navigation Group (Rendered below standard links for ADMIN role) */}
          {isAdmin && (
            <div className="pt-3 mt-3 border-t border-white/10 space-y-1.5">
              <div className="px-4 py-1 text-[11px] font-bold text-amber-400/80 tracking-wider">
                بخش مدیریت (ERP)
              </div>
              {adminNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = item.href !== "#" && isItemActive(item.href);

                if (item.disabled) {
                  return (
                    <div
                      key={item.id}
                      className="w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold text-white/40 bg-white/[0.02] cursor-not-allowed select-none text-right"
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-4 h-4 text-white/40" />
                        <span>{item.label}</span>
                      </div>
                      {item.badge && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400/10 text-amber-300/80 border border-amber-400/20 font-medium">
                          {item.badge}
                        </span>
                      )}
                    </div>
                  );
                }

                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all text-right",
                      isActive
                        ? "bg-slate-800 text-amber-400 shadow-md shadow-black/20 ring-1 ring-amber-500/30"
                        : "text-white/80 hover:text-white hover:bg-white/5"
                    )}
                  >
                    <Icon
                      className={cn(
                        "w-4 h-4",
                        isActive ? "text-amber-400" : "text-white/70"
                      )}
                    />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </nav>
      </div>

      {/* Bottom Area: Logout */}
      <div className="pt-4 border-t border-white/10">
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold text-white/80 hover:text-white hover:bg-rose-500/20 transition-all text-right cursor-pointer"
        >
          <LogOut className="w-4 h-4 text-white/70" />
          <span>خروج از حساب کاربری</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Drawer Trigger */}
      <div className="lg:hidden w-full mb-4">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="w-full flex items-center justify-between p-4 rounded-2xl bg-slate-900 text-white shadow-md border border-slate-800"
        >
          <div className="flex items-center gap-3">
            <Menu className="w-5 h-5 text-amber-400" />
            <span className="font-bold text-sm">منوی کاربری ({activeUserName})</span>
          </div>
          <span className="text-xs font-bold text-amber-400">{formattedBalance}</span>
        </button>
      </div>

      {/* Mobile Modal Drawer */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={() => setMobileOpen(false)}
        >
          <div
            className="fixed top-0 right-0 bottom-0 w-72 max-w-[85vw] bg-slate-900 text-white p-6 shadow-2xl overflow-y-auto border-l border-slate-800"
            onClick={(e) => e.stopPropagation()}
            dir="rtl"
          >
            <div className="flex justify-end mb-4">
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10"
                aria-label="بستن منو"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Desktop Persistent Solid Deep Navy Sidebar */}
      <aside
        className={cn(
          "hidden lg:block w-full rounded-3xl bg-slate-900 text-white p-6 shadow-xl flex-shrink-0 self-start sticky top-[175px] h-[calc(100vh-195px)] overflow-y-auto scrollbar-none [&::-webkit-scrollbar]:hidden [scrollbar-width:none] [-ms-overflow-style:none] border border-slate-800 z-30",
          className
        )}
        dir="rtl"
      >
        {sidebarContent}
      </aside>
    </>
  );
};

export default DashboardSidebar;
