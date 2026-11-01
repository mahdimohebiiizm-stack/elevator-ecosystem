"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  MessageSquare,
  ShoppingCart,
  Wrench,
  Users,
  ArrowUpRight,
  Send,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  ChevronLeft,
  ShieldCheck,
  Building2,
  TrendingUp,
} from "lucide-react";
import {
  fetchAdminOrders,
  fetchAdminTickets,
  fetchAdminUsers,
  OrderDto,
  TicketDto,
  UserAdminDto,
} from "@/lib/api/admin";
import { fetchAdminContracts, ServiceContractDto } from "@/lib/api/contracts";
import {
  formatPersianCurrency,
  toPersianDigits,
  cn,
} from "@/lib/utils";
import {
  AdminDirectMessageModal,
  TargetUserInfo,
} from "@/components/admin/AdminDirectMessageModal";
import { toast } from "sonner";

export default function AdminDashboardPage() {
  const [loading, setLoading] = useState<boolean>(true);
  const [orders, setOrders] = useState<OrderDto[]>([]);
  const [tickets, setTickets] = useState<TicketDto[]>([]);
  const [contracts, setContracts] = useState<ServiceContractDto[]>([]);
  const [users, setUsers] = useState<UserAdminDto[]>([]);

  // Direct Message Modal state
  const [dmTargetUser, setDmTargetUser] = useState<TargetUserInfo | null>(null);
  const [dmContextHint, setDmContextHint] = useState<string>("");
  const [isDmOpen, setIsDmOpen] = useState<boolean>(false);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [ordersRes, ticketsRes, contractsRes, usersRes] =
        await Promise.allSettled([
          fetchAdminOrders(),
          fetchAdminTickets(),
          fetchAdminContracts(),
          fetchAdminUsers(),
        ]);

      if (ordersRes.status === "fulfilled") {
        const data = Array.isArray(ordersRes.value.data)
          ? ordersRes.value.data
          : (ordersRes.value as any)?.data || [];
        setOrders(data);
      }

      if (ticketsRes.status === "fulfilled") {
        const data = Array.isArray(ticketsRes.value.data)
          ? ticketsRes.value.data
          : (ticketsRes.value as any)?.data || [];
        setTickets(data);
      }

      if (contractsRes.status === "fulfilled") {
        const data = Array.isArray(contractsRes.value.data)
          ? contractsRes.value.data
          : (contractsRes.value as any)?.data || [];
        setContracts(data);
      }

      if (usersRes.status === "fulfilled") {
        const data = Array.isArray(usersRes.value.data)
          ? usersRes.value.data
          : (usersRes.value as any)?.data || [];
        setUsers(data);
      }
    } catch (err) {
      console.error("Error loading admin overview metrics:", err);
      toast.error("خطا در بارگذاری برخی از آمارهای پیشخوان مدیریت");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const openDm = (target: TargetUserInfo, hint: string) => {
    setDmTargetUser(target);
    setDmContextHint(hint);
    setIsDmOpen(true);
  };

  // Metrics Calculations
  const openTicketsCount = tickets.filter(
    (t) => t.status?.toUpperCase() === "OPEN" || t.status?.toUpperCase() === "IN_PROGRESS"
  ).length;

  const pendingOrdersCount = orders.filter((o) =>
    ["PENDING", "PROCESSING", "PENDING_PAYMENT", "PENDING_VERIFICATION"].includes(
      o.status?.toUpperCase()
    )
  ).length;

  const activeContractsCount = contracts.filter((c) =>
    ["ACTIVE", "RUNNING", "CONFIRMED"].includes(c.status?.toUpperCase())
  ).length;

  const totalUsersCount = users.length;

  // Recent subsets
  const recentTickets = tickets.slice(0, 5);
  const recentOrders = orders.slice(0, 5);

  const getOrderStatusBadge = (status: string) => {
    switch (status?.toUpperCase()) {
      case "COMPLETED":
      case "DELIVERED":
        return {
          label: "تکمیل شده",
          classes: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
        };
      case "PROCESSING":
      case "CONFIRMED":
        return {
          label: "در حال پردازش",
          classes: "bg-blue-500/10 text-blue-600 border-blue-500/20",
        };
      case "PENDING":
      case "PENDING_PAYMENT":
        return {
          label: "در انتظار",
          classes: "bg-amber-500/10 text-amber-600 border-amber-500/20",
        };
      case "CANCELLED":
        return {
          label: "لغو شده",
          classes: "bg-rose-500/10 text-rose-600 border-rose-500/20",
        };
      default:
        return {
          label: status,
          classes: "bg-muted text-muted-foreground border-border",
        };
    }
  };

  const getTicketStatusBadge = (status: string) => {
    switch (status?.toUpperCase()) {
      case "OPEN":
        return {
          label: "باز / در انتظار",
          classes: "bg-rose-500/10 text-rose-600 border-rose-500/20",
        };
      case "IN_PROGRESS":
        return {
          label: "در حال بررسی",
          classes: "bg-amber-500/10 text-amber-600 border-amber-500/20",
        };
      case "REPLIED":
        return {
          label: "پاسخ داده شده",
          classes: "bg-blue-500/10 text-blue-600 border-blue-500/20",
        };
      case "CLOSED":
        return {
          label: "بسته شده",
          classes: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
        };
      default:
        return {
          label: status,
          classes: "bg-muted text-muted-foreground border-border",
        };
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300" dir="rtl">
      {/* Header Banner */}
      <div className="bg-primary text-primary-foreground rounded-2xl p-6 shadow-xl relative overflow-hidden border border-primary/20">
        <div className="absolute top-0 left-0 w-64 h-64 bg-accent/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="p-1.5 rounded-lg bg-accent/20 text-accent border border-accent/30">
                <ShieldCheck className="w-5 h-5" />
              </span>
              <span className="text-xs font-semibold text-accent uppercase tracking-widest">
                سامانه مرکزی ERP & CRM آسانرو
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              مرکز فرماندهی مدیریت سیستم
            </h1>
            <p className="text-sm text-primary-foreground/75 mt-1">
              نظارت بلادرنگ بر تراکنش‌ها، پشتیبانی کاربران و مخابره مستقیم پیام به تلگرام و بله
            </p>
          </div>

          <button
            onClick={loadDashboardData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-sm font-medium transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            <span>به‌روزرسانی داده‌ها</span>
          </button>
        </div>
      </div>

      {/* 4 KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Metric 1: Open Tickets */}
        <Link
          href="/dashboard/admin/tickets"
          className="group block p-5 rounded-2xl bg-card border border-border hover:border-accent/40 shadow-sm transition-all hover:shadow-md"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-muted-foreground">تیکت‌های باز و فعال</span>
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center group-hover:scale-105 transition-transform">
              <MessageSquare className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-black text-rose-500 font-mono tracking-tight">
              {toPersianDigits(openTicketsCount)}
            </span>
            <span className="text-xs text-muted-foreground flex items-center gap-1 group-hover:text-foreground">
              مشاهده صف
              <ChevronLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
            </span>
          </div>
        </Link>

        {/* Metric 2: Pending Orders */}
        <Link
          href="/dashboard/admin/orders"
          className="group block p-5 rounded-2xl bg-card border border-border hover:border-accent/40 shadow-sm transition-all hover:shadow-md"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-muted-foreground">سفارشات در انتظار اقدام</span>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center group-hover:scale-105 transition-transform">
              <ShoppingCart className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-black text-accent font-mono tracking-tight">
              {toPersianDigits(pendingOrdersCount)}
            </span>
            <span className="text-xs text-muted-foreground flex items-center gap-1 group-hover:text-foreground">
              مدیریت
              <ChevronLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
            </span>
          </div>
        </Link>

        {/* Metric 3: Active Contracts */}
        <Link
          href="/dashboard/admin/contracts"
          className="group block p-5 rounded-2xl bg-card border border-border hover:border-accent/40 shadow-sm transition-all hover:shadow-md"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-muted-foreground">قراردادهای فعال سرویس</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Wrench className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-black text-emerald-600 font-mono tracking-tight">
              {toPersianDigits(activeContractsCount)}
            </span>
            <span className="text-xs text-muted-foreground flex items-center gap-1 group-hover:text-foreground">
              لیست قراردادها
              <ChevronLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
            </span>
          </div>
        </Link>

        {/* Metric 4: Total CRM Users */}
        <Link
          href="/dashboard/admin/users"
          className="group block p-5 rounded-2xl bg-card border border-border hover:border-accent/40 shadow-sm transition-all hover:shadow-md"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-muted-foreground">کل کاربران و مشتریان (CRM)</span>
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-500 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-black text-foreground font-mono tracking-tight">
              {toPersianDigits(totalUsersCount)}
            </span>
            <span className="text-xs text-muted-foreground flex items-center gap-1 group-hover:text-foreground">
              مشتریان
              <ChevronLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
            </span>
          </div>
        </Link>
      </div>

      {/* Quick Action Bar */}
      <div className="p-4 rounded-2xl bg-muted/40 border border-border flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-bold text-foreground">
          <TrendingUp className="w-4 h-4 text-accent" />
          <span>دسترسی سریع عملیاتی:</span>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <Link
            href="/dashboard/admin/orders"
            className="px-3 py-1.5 rounded-lg bg-card border border-border hover:border-accent hover:text-accent font-medium transition-colors"
          >
            📦 سفارشات آسانسور
          </Link>
          <Link
            href="/dashboard/admin/tickets"
            className="px-3 py-1.5 rounded-lg bg-card border border-border hover:border-accent hover:text-accent font-medium transition-colors"
          >
            💬 تیکت‌های پشتیبانی
          </Link>
          <Link
            href="/dashboard/admin/contracts"
            className="px-3 py-1.5 rounded-lg bg-card border border-border hover:border-accent hover:text-accent font-medium transition-colors"
          >
            🛠 قراردادهای ادواری
          </Link>
          <Link
            href="/dashboard/admin/users"
            className="px-3 py-1.5 rounded-lg bg-card border border-border hover:border-accent hover:text-accent font-medium transition-colors"
          >
            👥 باشگاه مشتریان
          </Link>
        </div>
      </div>

      {/* Two Column Grid: Recent Open Tickets & Pending Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Latest Tickets */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm flex flex-col">
          <div className="p-4 bg-muted/30 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-accent" />
              <h2 className="font-bold text-sm text-foreground">آخرین تیکت‌های دریافتی</h2>
            </div>
            <Link
              href="/dashboard/admin/tickets"
              className="text-xs text-accent hover:underline flex items-center gap-0.5"
            >
              مشاهده همه
              <ChevronLeft className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="p-4 flex-1">
            {recentTickets.length === 0 ? (
              <div className="text-center py-10 text-xs text-muted-foreground">
                هیچ تیکت ثبتی در سامانه یافت نشد.
              </div>
            ) : (
              <div className="space-y-3">
                {recentTickets.map((t) => {
                  const badge = getTicketStatusBadge(t.status);
                  const targetUser: TargetUserInfo = {
                    id: t.user?.id || (t as any).user_id || "",
                    name: t.user?.name || "کاربر",
                    phone: t.user?.phone || "",
                    telegram_id: (t.user as any)?.telegram_id,
                    bale_id: (t.user as any)?.bale_id,
                  };

                  return (
                    <div
                      key={t.id}
                      className="p-3.5 rounded-xl border border-border/70 hover:border-accent/40 bg-background/50 hover:bg-muted/20 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-foreground line-clamp-1">
                            {t.title || t.subject || "بدون عنوان"}
                          </span>
                          <span
                            className={cn(
                              "text-[10px] px-2 py-0.5 rounded-full font-medium border",
                              badge.classes
                            )}
                          >
                            {badge.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-muted-foreground text-[11px]">
                          <span>کاربر: {t.user?.name || "ناشناس"}</span>
                          {t.user?.phone && (
                            <span dir="ltr" className="font-mono">
                              {toPersianDigits(t.user.phone)}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <button
                          type="button"
                          onClick={() => openDm(targetUser, `تیکت #${t.id.slice(0, 6)}`)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-accent/15 text-accent hover:bg-accent/25 border border-accent/30 font-medium transition-colors"
                        >
                          <Send className="w-3 h-3" />
                          <span>ارسال پیام</span>
                        </button>
                        <Link
                          href="/dashboard/admin/tickets"
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-muted hover:bg-muted/80 text-foreground border border-border font-medium transition-colors"
                        >
                          <span>مشاهده</span>
                          <ArrowUpRight className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Card 2: Latest Orders */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm flex flex-col">
          <div className="p-4 bg-muted/30 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-accent" />
              <h2 className="font-bold text-sm text-foreground">جدیدترین سفارشات</h2>
            </div>
            <Link
              href="/dashboard/admin/orders"
              className="text-xs text-accent hover:underline flex items-center gap-0.5"
            >
              مشاهده همه
              <ChevronLeft className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="p-4 flex-1">
            {recentOrders.length === 0 ? (
              <div className="text-center py-10 text-xs text-muted-foreground">
                هیچ سفارشی در سامانه ثبت نشده است.
              </div>
            ) : (
              <div className="space-y-3">
                {recentOrders.map((o) => {
                  const badge = getOrderStatusBadge(o.status);
                  const targetUser: TargetUserInfo = {
                    id: o.user?.id || o.user_id || "",
                    name: o.user?.name || o.address_snapshot?.full_name || "مشتری",
                    phone: o.user?.phone || o.address_snapshot?.phone || "",
                    telegram_id: (o.user as any)?.telegram_id,
                    bale_id: (o.user as any)?.bale_id,
                  };

                  return (
                    <div
                      key={o.id}
                      className="p-3.5 rounded-xl border border-border/70 hover:border-accent/40 bg-background/50 hover:bg-muted/20 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-foreground">
                            سفارش #{toPersianDigits(o.id.slice(0, 8))}
                          </span>
                          <span
                            className={cn(
                              "text-[10px] px-2 py-0.5 rounded-full font-medium border",
                              badge.classes
                            )}
                          >
                            {badge.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-muted-foreground text-[11px]">
                          <span>
                            مبلغ:{" "}
                            <strong className="text-foreground">
                              {formatPersianCurrency(o.total_price)}
                            </strong>
                          </span>
                          <span>
                            خریدار:{" "}
                            {o.address_snapshot?.full_name || o.user?.name || "ناشناس"}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <button
                          type="button"
                          onClick={() => openDm(targetUser, `سفارش #${o.id.slice(0, 8)}`)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-accent/15 text-accent hover:bg-accent/25 border border-accent/30 font-medium transition-colors"
                        >
                          <Send className="w-3 h-3" />
                          <span>پیام به خریدار</span>
                        </button>
                        <Link
                          href="/dashboard/admin/orders"
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-muted hover:bg-muted/80 text-foreground border border-border font-medium transition-colors"
                        >
                          <span>جزئیات</span>
                          <ArrowUpRight className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CRM Direct Message Modal */}
      <AdminDirectMessageModal
        isOpen={isDmOpen}
        onClose={() => setIsDmOpen(false)}
        user={dmTargetUser}
        contextHint={dmContextHint}
      />
    </div>
  );
}
