"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Users,
  Search,
  RefreshCw,
  Send,
  ShieldCheck,
  User as UserIcon,
  Phone,
  Lock,
  Loader2,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Filter,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import {
  fetchAdminUsers,
  toggleUserStatus,
  UserAdminDto,
} from "@/lib/api/admin";
import {
  AdminDirectMessageModal,
  TargetUserInfo,
} from "@/components/admin/AdminDirectMessageModal";
import {
  toPersianDigits,
  cn,
} from "@/lib/utils";
import { useAuthStore } from "@/store/useAuthStore";
import { toast } from "sonner";

type RoleFilterType = "ALL" | "ADMIN" | "CUSTOMER";
type StatusFilterType = "ALL" | "ACTIVE" | "INACTIVE";

export default function AdminUsersCRMPage() {
  const { user: currentAdmin } = useAuthStore();
  const [users, setUsers] = useState<UserAdminDto[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [roleFilter, setRoleFilter] = useState<RoleFilterType>("ALL");
  const [statusFilter, setStatusFilter] = useState<StatusFilterType>("ALL");
  const [actioningUserId, setActioningUserId] = useState<string | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Direct Message Modal state
  const [dmTargetUser, setDmTargetUser] = useState<TargetUserInfo | null>(null);
  const [dmContextHint, setDmContextHint] = useState<string>("");
  const [isDmModalOpen, setIsDmModalOpen] = useState<boolean>(false);

  /**
   * Strictly fetch real database users using Axios
   * Zero mock data or hardcoded arrays tolerated
   */
  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const response = await fetchAdminUsers();
      const data = Array.isArray(response.data)
        ? response.data
        : (response as any)?.data || [];
      setUsers(data);
    } catch (error: any) {
      console.warn("Could not fetch admin users from database:", error);
      setUsers([]);
      toast.error("خطا در بارگذاری اطلاعات کاربران از پایگاه داده", {
        description:
          error?.response?.data?.detail ||
          "برقراری ارتباط با سرور برقرار نشد یا دسترسی مدیر معتبر نیست.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // Reset pagination to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, roleFilter, statusFilter, pageSize]);

  /**
   * Status toggle with strict Single-Admin Safeguard
   */
  const handleToggleStatus = async (user: UserAdminDto) => {
    // 1. Single-Admin Safeguard: Prevent self-lockout or deactivation of the sole system admin
    const isCurrentAdmin =
      (currentAdmin?.id && user.id === currentAdmin.id) ||
      (user.role?.toUpperCase() === "ADMIN" &&
        (!currentAdmin?.id || user.phone === currentAdmin?.phone || user.id === currentAdmin?.id));

    if (isCurrentAdmin || user.role?.toUpperCase() === "ADMIN") {
      toast.warning("حفاظت امنیتی مدیر ارشد", {
        description:
          "این حساب متعلق به تنها مدیر سیستم است و جهت حفظ پایداری سامانه، امکان غیرفعال‌سازی آن وجود ندارد.",
      });
      return;
    }

    const newActive = !user.is_active;
    setActioningUserId(user.id);

    try {
      await toggleUserStatus(user.id, newActive);
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, is_active: newActive } : u))
      );
      toast.success(
        `وضعیت حساب کاربر ${user.name || user.phone || ""} به ${
          newActive ? "فعال" : "مسدود / غیرفعال"
        } تغییر یافت.`
      );
    } catch (err: any) {
      console.error("Toggle user status error:", err);
      const errMsg =
        err?.response?.data?.detail || "خطا در برقراری ارتباط با پایگاه داده.";
      toast.error(errMsg);
    } finally {
      setActioningUserId(null);
    }
  };

  const openDirectMessage = (user: UserAdminDto) => {
    const targetUser: TargetUserInfo = {
      id: user.id,
      name: user.name || "کاربر",
      phone: user.phone || "",
      telegram_id: user.telegram_id,
      bale_id: user.bale_id,
      messenger_id: user.messenger_id,
      role: user.role,
    };
    setDmTargetUser(targetUser);
    setDmContextHint(`کاربر #${user.id.slice(0, 6)}`);
    setIsDmModalOpen(true);
  };

  const formatPersianDate = (dateStr?: string | null): string => {
    if (!dateStr) return "-";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return toPersianDigits(dateStr);
      return toPersianDigits(
        new Intl.DateTimeFormat("fa-IR", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        }).format(d)
      );
    } catch {
      return toPersianDigits(dateStr);
    }
  };

  // Filter & Search Logic
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (roleFilter !== "ALL" && u.role?.toUpperCase() !== roleFilter) {
        return false;
      }
      if (statusFilter === "ACTIVE" && !u.is_active) return false;
      if (statusFilter === "INACTIVE" && u.is_active) return false;

      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase().trim();
      const name = (u.name || "").toLowerCase();
      const phone = (u.phone || "").toLowerCase();
      const id = (u.id || "").toLowerCase();
      const messenger = (u.messenger_id || "").toLowerCase();

      return (
        name.includes(q) ||
        phone.includes(q) ||
        id.includes(q) ||
        messenger.includes(q)
      );
    });
  }, [users, roleFilter, statusFilter, searchQuery]);

  // Pagination Calculations
  const totalRecords = filteredUsers.length;
  const totalPages = Math.ceil(totalRecords / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalRecords);
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

  return (
    <div className="space-y-6 animate-in fade-in duration-300" dir="rtl">
      {/* Header Banner */}
      <div className="bg-primary text-primary-foreground rounded-2xl p-6 shadow-xl relative overflow-hidden border border-primary/20">
        <div className="absolute top-0 left-0 w-64 h-64 bg-accent/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="p-1.5 rounded-lg bg-accent/20 text-accent border border-accent/30">
                <Users className="w-5 h-5" />
              </span>
              <span className="text-xs font-semibold text-accent uppercase tracking-widest">
                مدیریت ارتباط با مشتریان (CRM)
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              بانک اطلاعات کاربران و کارفرمایان
            </h1>
            <p className="text-sm text-primary-foreground/75 mt-1">
              داده‌های بلادرنگ پایگاه داده PostgreSQL با امکان مدیریت دسترسی و مخابره پیام به تلگرام و بله
            </p>
          </div>

          <button
            onClick={loadUsers}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-sm font-medium transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
            <span>به‌روزرسانی داده‌ها</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-card border border-border rounded-2xl p-4 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-muted-foreground absolute right-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجو با نام کاربر، شماره موبایل یا شناسه سیستمی..."
              className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all placeholder:text-muted-foreground text-foreground"
            />
          </div>

          {/* Role Filter Chips */}
          <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            {[
              { id: "ALL", label: "همه کاربران" },
              { id: "ADMIN", label: "مدیران سیستم" },
              { id: "CUSTOMER", label: "مشتریان و کارفرمایان" },
            ].map((chip) => (
              <button
                key={chip.id}
                onClick={() => setRoleFilter(chip.id as RoleFilterType)}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-bold transition-all border",
                  roleFilter === chip.id
                    ? "bg-accent text-accent-foreground border-accent shadow-sm"
                    : "bg-muted/50 text-muted-foreground border-border hover:bg-muted hover:text-foreground"
                )}
              >
                {chip.label}
              </button>
            ))}
          </div>

          {/* Status Filter Chips */}
          <div className="flex flex-wrap items-center gap-1.5 border-r border-border pr-2">
            {[
              { id: "ALL", label: "همه وضعیت‌ها" },
              { id: "ACTIVE", label: "فقط فعال" },
              { id: "INACTIVE", label: "مسدود شده" },
            ].map((chip) => (
              <button
                key={chip.id}
                onClick={() => setStatusFilter(chip.id as StatusFilterType)}
                className={cn(
                  "px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all border",
                  statusFilter === chip.id
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-muted/40 text-muted-foreground border-border hover:bg-muted hover:text-foreground"
                )}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            {/* Table Header with bg-primary and text-white/text-accent */}
            <thead className="bg-primary text-primary-foreground font-bold border-b border-primary/30">
              <tr>
                <th className="py-4 px-4">کاربر / نام و شناسه</th>
                <th className="py-4 px-4">شماره تماس</th>
                <th className="py-4 px-4">نقش سیستمی</th>
                <th className="py-4 px-4">اتصال ربات پیام‌رسان</th>
                <th className="py-4 px-4">وضعیت حساب</th>
                <th className="py-4 px-4">تاریخ عضویت</th>
                <th className="py-4 px-4 text-center">عملیات CRM</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-accent" />
                      <span>در حال دریافت اطلاعات زنده کاربران از سرور...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    هیچ کاربری با شرایط جستجو یافت نشد.
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((item) => {
                  const isAdmin = item.role?.toUpperCase() === "ADMIN";

                  // Single-Admin Safeguard identifier
                  const isCurrentAdmin =
                    (currentAdmin?.id && item.id === currentAdmin.id) ||
                    (isAdmin &&
                      (!currentAdmin?.id ||
                        item.phone === currentAdmin?.phone ||
                        item.id === currentAdmin?.id));

                  // Real database messenger connection check
                  const hasTg = Boolean(
                    item.telegram_id ||
                      (item.messenger_id &&
                        (item.messenger_id.startsWith("tg_") ||
                          item.messenger_id.startsWith("telegram_")))
                  );
                  const hasBale = Boolean(
                    item.bale_id ||
                      (item.messenger_id &&
                        (item.messenger_id.startsWith("bale_") ||
                          item.messenger_id.includes("bale")))
                  );

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      {/* Name & ID (Fixed LTR formatting bug) */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={cn(
                              "w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0",
                              isAdmin
                                ? "bg-rose-500/15 text-rose-600 border border-rose-500/30"
                                : "bg-accent/15 text-accent border border-accent/30"
                            )}
                          >
                            {item.name ? item.name[0] : (item.phone ? item.phone.slice(-2) : "ک")}
                          </div>
                          <div className="space-y-0.5">
                            <div className="font-bold text-foreground flex items-center gap-1.5">
                              <span>{item.name || item.phone || "کاربر بدون نام"}</span>
                              {isCurrentAdmin && (
                                <span className="text-[10px] bg-accent/20 text-accent font-normal px-1.5 py-0.2 rounded border border-accent/30">
                                  شما
                                </span>
                              )}
                            </div>
                            {/* Strict LTR wrap to prevent RTL punctuation scrambling */}
                            <div className="text-right">
                              <span
                                dir="ltr"
                                className="inline-block text-left font-mono text-[11px] text-muted-foreground select-all"
                              >
                                #{item.id.slice(0, 8)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Phone (Strict LTR wrap) */}
                      <td className="py-3.5 px-4">
                        {item.phone ? (
                          <span
                            dir="ltr"
                            className="inline-block text-left font-mono text-muted-foreground text-[11px]"
                          >
                            {toPersianDigits(item.phone)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/60">-</span>
                        )}
                      </td>

                      {/* Role */}
                      <td className="py-3.5 px-4">
                        {isAdmin ? (
                          <span className="inline-flex items-center gap-1 text-[10px] px-2.5 py-0.5 rounded-full font-bold bg-rose-500/10 text-rose-600 border border-rose-500/20">
                            <ShieldCheck className="w-3 h-3" />
                            مدیر ارشد
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] px-2.5 py-0.5 rounded-full font-medium bg-muted text-muted-foreground border border-border">
                            <UserIcon className="w-3 h-3" />
                            مشتری
                          </span>
                        )}
                      </td>

                      {/* Bot Connection Badges */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          {hasTg && (
                            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium bg-sky-500/10 text-sky-600 border border-sky-500/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                              تلگرام ✓
                            </span>
                          )}
                          {hasBale && (
                            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              بله ✓
                            </span>
                          )}
                          {!hasTg && !hasBale && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-muted/40 text-muted-foreground/60 border border-border">
                              بدون اتصال ربات
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Account Status with Single-Admin Safeguard */}
                      <td className="py-3.5 px-4">
                        {isCurrentAdmin ? (
                          /* Safeguard: Current sole admin is strictly protected from self-deactivation */
                          <div
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/30 cursor-not-allowed select-none"
                            title="این حساب متعلق به مدیر سیستم است و جهت حفظ امنیت، امکان غیرفعال‌سازی آن وجود ندارد."
                          >
                            <Lock className="w-3 h-3 text-amber-500" />
                            <span>مدیر فعال (محافظت‌شده)</span>
                          </div>
                        ) : (
                          /* Interactive Toggle Switch for regular users */
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(item)}
                              disabled={actioningUserId === item.id}
                              title={
                                item.is_active
                                  ? "کلیک جهت مسدودسازی دسترسی کاربر"
                                  : "کلیک جهت فعال‌سازی حساب کاربر"
                              }
                              className={cn(
                                "relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-50",
                                item.is_active
                                  ? "bg-emerald-500"
                                  : "bg-slate-300 dark:bg-slate-700"
                              )}
                            >
                              <span className="sr-only">تغییر وضعیت حساب</span>
                              <span
                                className={cn(
                                  "pointer-events-none flex items-center justify-center h-4 w-4 rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out",
                                  item.is_active
                                    ? "translate-x-0"
                                    : "-translate-x-5"
                                )}
                              >
                                {actioningUserId === item.id ? (
                                  <Loader2 className="w-2.5 h-2.5 text-slate-700 animate-spin" />
                                ) : item.is_active ? (
                                  <Check className="w-2.5 h-2.5 text-emerald-600 stroke-[3]" />
                                ) : (
                                  <X className="w-2.5 h-2.5 text-rose-500 stroke-[3]" />
                                )}
                              </span>
                            </button>
                            <span className="text-[11px] font-semibold select-none">
                              {item.is_active ? (
                                <span className="text-emerald-600">فعال</span>
                              ) : (
                                <span className="text-rose-500">مسدود</span>
                              )}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Created At */}
                      <td className="py-3.5 px-4 text-muted-foreground font-mono text-[11px]">
                        {formatPersianDate(item.created_at)}
                      </td>

                      {/* CRM Actions */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => openDirectMessage(item)}
                            title="ارسال پیام مستقیم به تلگرام یا بله کاربر"
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-accent/15 text-accent hover:bg-accent/25 border border-accent/30 font-medium transition-colors"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>پیام مستقیم</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* UI Pagination Controls */}
        <div className="p-4 bg-muted/20 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          {/* Record Count Summary */}
          <div className="text-muted-foreground">
            {totalRecords > 0 ? (
              <span>
                نمایش{" "}
                <strong className="text-foreground font-mono">
                  {toPersianDigits(startIndex + 1)}
                </strong>{" "}
                تا{" "}
                <strong className="text-foreground font-mono">
                  {toPersianDigits(endIndex)}
                </strong>{" "}
                از مجموع{" "}
                <strong className="text-foreground font-mono">
                  {toPersianDigits(totalRecords)}
                </strong>{" "}
                کاربر
              </span>
            ) : (
              <span>بدون رکورد</span>
            )}
          </div>

          {/* Page Controls */}
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-border bg-card hover:bg-muted disabled:opacity-40 disabled:pointer-events-none transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
                <span>قبلی</span>
              </button>

              <div className="flex items-center gap-1 font-mono">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    type="button"
                    onClick={() => setCurrentPage(page)}
                    className={cn(
                      "w-8 h-8 rounded-xl font-bold transition-all border",
                      currentPage === page
                        ? "bg-accent text-accent-foreground border-accent shadow-sm"
                        : "bg-card border-border hover:bg-muted text-foreground"
                    )}
                  >
                    {toPersianDigits(page)}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-border bg-card hover:bg-muted disabled:opacity-40 disabled:pointer-events-none transition-colors"
              >
                <span>بعدی</span>
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* CRM Direct Message Modal */}
      <AdminDirectMessageModal
        isOpen={isDmModalOpen}
        onClose={() => setIsDmModalOpen(false)}
        user={dmTargetUser}
        contextHint={dmContextHint}
      />
    </div>
  );
}
