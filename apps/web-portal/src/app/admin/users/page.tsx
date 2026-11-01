"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Users,
  Search,
  RefreshCw,
  ShieldCheck,
  UserCheck,
  UserX,
  User as UserIcon,
  Filter,
  CheckSquare,
  Square,
  AlertCircle,
  Clock,
  Wallet,
  Phone,
  Power,
  Check,
  X,
  Edit,
  Lock,
} from "lucide-react";
import { toPersianDigits, formatToToman, cn } from "@/lib/utils";
import {
  fetchAdminUsers,
  bulkDeactivateUsers,
  toggleUserStatus,
  updateAdminUser,
  UserAdminDto,
} from "@/lib/api/admin";
import { toast } from "sonner";
import { useAuthStore } from "@/store/useAuthStore";

type RoleFilterType = "ALL" | "ADMIN" | "CUSTOMER";
type StatusFilterType = "ALL" | "ACTIVE" | "INACTIVE";

export default function AdminUsersPage() {
  const { user: currentAdmin } = useAuthStore();
  const [users, setUsers] = useState<UserAdminDto[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [roleFilter, setRoleFilter] = useState<RoleFilterType>("ALL");
  const [statusFilter, setStatusFilter] = useState<StatusFilterType>("ALL");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [isBulkOperating, setIsBulkOperating] = useState<boolean>(false);
  const [actioningUserId, setActioningUserId] = useState<string | null>(null);

  // Edit User Modal State
  const [editingUser, setEditingUser] = useState<UserAdminDto | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [editFormData, setEditFormData] = useState<{
    name: string;
    phone: string;
    role: string;
    password: string;
    is_active: boolean;
  }>({
    name: "",
    phone: "",
    role: "CUSTOMER",
    password: "",
    is_active: true,
  });
  const [isSavingUser, setIsSavingUser] = useState<boolean>(false);

  // Fetch users from backend
  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const response = await fetchAdminUsers();
      const data = Array.isArray(response.data)
        ? response.data
        : (response as any)?.data || [];
      setUsers(data);
      // Reset selected users that no longer exist
      setSelectedUserIds([]);
    } catch (error: any) {
      console.warn("Could not fetch admin users:", error);
      toast.error("خطا در بارگذاری کاربران", {
        description:
          error?.response?.data?.detail ||
          "برقراری ارتباط با سرور با خطا مواجه شد.",
      });
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // Filter & Search Logic
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // 1. Role Filter
      if (roleFilter !== "ALL" && u.role !== roleFilter) {
        return false;
      }

      // 2. Status Filter
      if (statusFilter === "ACTIVE" && !u.is_active) return false;
      if (statusFilter === "INACTIVE" && u.is_active) return false;

      // 3. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const nameMatch = u.name?.toLowerCase().includes(q);
        const phoneMatch = u.phone?.toLowerCase().includes(q);
        const idMatch = u.id?.toLowerCase().includes(q);
        const messengerMatch = u.messenger_id?.toLowerCase().includes(q);
        if (!nameMatch && !phoneMatch && !idMatch && !messengerMatch) {
          return false;
        }
      }

      return true;
    });
  }, [users, roleFilter, statusFilter, searchQuery]);

  // Bulk Selection Handlers
  const handleSelectAll = () => {
    if (selectedUserIds.length === filteredUsers.length) {
      setSelectedUserIds([]);
    } else {
      setSelectedUserIds(filteredUsers.map((u) => u.id));
    }
  };

  const handleToggleSelectUser = (id: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Bulk Deactivation Execution
  const handleBulkDeactivate = async () => {
    if (selectedUserIds.length === 0) return;

    // Filter out current admin user to prevent locking oneself out
    const finalIds = selectedUserIds.filter((id) => id !== currentAdmin?.id);

    if (finalIds.length === 0) {
      toast.error("خطای عملیات", {
        description: "شما نمی‌توانید حساب مدیریت جاری خود را غیرفعال کنید.",
      });
      return;
    }

    setIsBulkOperating(true);
    try {
      const response = await bulkDeactivateUsers(finalIds);
      toast.success("عملیات گروهی با موفقیت انجام شد", {
        description: response.data.message,
      });
      // Refresh list
      await loadUsers();
      setSelectedUserIds([]);
    } catch (error: any) {
      toast.error("خطا در غیرفعال‌سازی گروهی", {
        description:
          error?.response?.data?.detail || "خطایی در سرور رخ داده است.",
      });
    } finally {
      setIsBulkOperating(false);
    }
  };

  // Single User Status Toggle
  const handleToggleUserStatus = async (user: UserAdminDto) => {
    if (user.id === currentAdmin?.id && user.is_active) {
      toast.error("عملیات نامعتبر", {
        description: "شما نمی‌توانید حساب مدیریت جاری خود را غیرفعال کنید.",
      });
      return;
    }

    setActioningUserId(user.id);
    const newStatus = !user.is_active;

    try {
      await toggleUserStatus(user.id, newStatus);
      toast.success(
        newStatus ? "کاربر با موفقیت فعال شد" : "کاربر با موفقیت مسدود شد"
      );
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, is_active: newStatus } : u))
      );
    } catch (error: any) {
      toast.error("خطا در تغییر وضعیت کاربر", {
        description: error?.response?.data?.detail || "تغییر وضعیت ناموفق بود.",
      });
    } finally {
      setActioningUserId(null);
    }
  };

  // Open Edit User Modal
  const handleOpenEditModal = (user: UserAdminDto) => {
    setEditingUser(user);
    setEditFormData({
      name: user.name || "",
      phone: user.phone || "",
      role: user.role || "CUSTOMER",
      password: "",
      is_active: user.is_active,
    });
    setIsEditModalOpen(true);
  };

  // Close Edit User Modal
  const handleCloseEditModal = () => {
    if (isSavingUser) return;
    setIsEditModalOpen(false);
    setEditingUser(null);
  };

  // Save Edit User
  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    if (!editFormData.phone.trim()) {
      toast.error("شماره تماس الزامی است");
      return;
    }

    setIsSavingUser(true);
    try {
      const payload: {
        name?: string;
        phone?: string;
        role?: string;
        password?: string;
        is_active?: boolean;
      } = {
        name: editFormData.name.trim() || undefined,
        phone: editFormData.phone.trim(),
        role: editFormData.role,
        is_active: editFormData.is_active,
      };

      if (editFormData.password.trim()) {
        payload.password = editFormData.password.trim();
      }

      const response = await updateAdminUser(editingUser.id, payload);
      const updated = response.data;
      toast.success("مشخصات کاربر با موفقیت ویرایش شد");
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      setIsEditModalOpen(false);
      setEditingUser(null);
    } catch (error: any) {
      toast.error("خطا در ویرایش اطلاعات کاربر", {
        description:
          error?.response?.data?.detail || "بروزرسانی مشخصات ناموفق بود.",
      });
    } finally {
      setIsSavingUser(false);
    }
  };

  // Metrics computation
  const stats = useMemo(() => {
    const total = users.length;
    const active = users.filter((u) => u.is_active).length;
    const inactive = users.filter((u) => !u.is_active).length;
    const admins = users.filter((u) => u.role === "ADMIN").length;
    return { total, active, inactive, admins };
  }, [users]);

  // Format date helper
  const formatDate = (isoString?: string) => {
    if (!isoString) return "-";
    try {
      const date = new Date(isoString);
      return new Intl.DateTimeFormat("fa-IR", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }).format(date);
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-6 pb-24" dir="rtl">
      {/* Header & Page Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                مدیریت کاربران و مشتریان (CRM)
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 font-medium">
                مانیتورینگ اعضا، نقش‌های دسترسی و عملیات گروهی حساب‌ها
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={loadUsers}
          disabled={isLoading}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-bold shadow-sm transition-all active:scale-95 disabled:opacity-50 cursor-pointer self-start md:self-auto"
        >
          <RefreshCw
            className={cn("w-4 h-4 text-slate-500", isLoading && "animate-spin")}
          />
          <span>بروزرسانی داده‌ها</span>
        </button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Users */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400">کل کاربران</p>
            <p className="text-xl font-black text-slate-900 mt-0.5">
              {toPersianDigits(stats.total)}
            </p>
          </div>
        </div>

        {/* Active Users */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400">کاربران فعال</p>
            <p className="text-xl font-black text-emerald-600 mt-0.5">
              {toPersianDigits(stats.active)}
            </p>
          </div>
        </div>

        {/* Inactive Users */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <UserX className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400">غیرفعال / مسدود</p>
            <p className="text-xl font-black text-rose-600 mt-0.5">
              {toPersianDigits(stats.inactive)}
            </p>
          </div>
        </div>

        {/* Admins */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400">مدیران سیستم</p>
            <p className="text-xl font-black text-amber-600 mt-0.5">
              {toPersianDigits(stats.admins)}
            </p>
          </div>
        </div>
      </div>

      {/* Search and Filters Toolbar */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="جستجو با نام، شماره تماس یا شناسه کاربر..."
            className="w-full pl-4 pr-10 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs sm:text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all placeholder:text-slate-400"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Role Filter */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl">
            {(
              [
                { label: "همه نقش‌ها", val: "ALL" },
                { label: "مدیران", val: "ADMIN" },
                { label: "مشتریان", val: "CUSTOMER" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.val}
                type="button"
                onClick={() => setRoleFilter(opt.val)}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
                  roleFilter === opt.val
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-900"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl">
            {(
              [
                { label: "همه وضعیت‌ها", val: "ALL" },
                { label: "فعال", val: "ACTIVE" },
                { label: "غیرفعال", val: "INACTIVE" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.val}
                type="button"
                onClick={() => setStatusFilter(opt.val)}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
                  statusFilter === opt.val
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-900"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Users Data Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse min-w-[750px]">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/75 text-slate-500 text-xs font-bold">
                <th className="py-4 px-4 w-12 text-center">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    disabled={filteredUsers.length === 0}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 focus:outline-none transition-colors cursor-pointer"
                    title={
                      selectedUserIds.length === filteredUsers.length &&
                      filteredUsers.length > 0
                        ? "لغو انتخاب همه"
                        : "انتخاب همه"
                    }
                  >
                    {filteredUsers.length > 0 &&
                    selectedUserIds.length === filteredUsers.length ? (
                      <CheckSquare className="w-5 h-5 text-amber-600" />
                    ) : (
                      <Square className="w-5 h-5" />
                    )}
                  </button>
                </th>
                <th className="py-4 px-4">کاربر و اطلاعات تماس</th>
                <th className="py-4 px-4">نقش سیستمی</th>
                <th className="py-4 px-4">وضعیت حساب</th>
                <th className="py-4 px-4">موجودی کیف پول</th>
                <th className="py-4 px-4">تاریخ عضویت</th>
                <th className="py-4 px-4 text-center">عملیات سریع</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs sm:text-sm font-medium text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-400">
                    <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-amber-500" />
                    <p className="font-bold">در حال بارگذاری اطلاعات کاربران...</p>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-400">
                    <Users className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                    <p className="font-bold text-slate-600">کاربری با این مشخصات یافت نشد</p>
                    <p className="text-xs text-slate-400 mt-1">
                      فیلترها یا عبارت جستجوی خود را تغییر دهید.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const isSelected = selectedUserIds.includes(user.id);
                  const isCurrentAdminRow = user.id === currentAdmin?.id;

                  return (
                    <tr
                      key={user.id}
                      className={cn(
                        "hover:bg-slate-50/80 transition-colors",
                        isSelected && "bg-amber-50/40"
                      )}
                    >
                      {/* Checkbox */}
                      <td className="py-4 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleSelectUser(user.id)}
                          className="p-1 rounded-lg text-slate-400 hover:text-slate-600 focus:outline-none transition-colors cursor-pointer"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-5 h-5 text-amber-600" />
                          ) : (
                            <Square className="w-5 h-5" />
                          )}
                        </button>
                      </td>

                      {/* User Info */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              "w-10 h-10 rounded-2xl flex items-center justify-center font-black text-xs shrink-0 shadow-inner",
                              user.role === "ADMIN"
                                ? "bg-amber-500 text-slate-950 font-black"
                                : "bg-slate-100 text-slate-700"
                            )}
                          >
                            {user.name ? user.name.slice(0, 2) : "کا"}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-bold text-slate-900 truncate">
                              {user.name || "کاربر عمومی"}
                              {isCurrentAdminRow && (
                                <span className="mr-2 text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-md font-black">
                                  حساب شما
                                </span>
                              )}
                            </span>
                            <span className="text-xs text-slate-500 font-mono mt-0.5 flex items-center gap-1.5">
                              <Phone className="w-3 h-3 text-slate-400" />
                              {user.phone ? toPersianDigits(user.phone) : "بدون شماره"}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td className="py-4 px-4">
                        {user.role === "ADMIN" ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black bg-purple-50 text-purple-700 border border-purple-200">
                            <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                            مدیر سیستم
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            <UserIcon className="w-3.5 h-3.5 text-slate-500" />
                            مشتری سامانه
                          </span>
                        )}
                      </td>

                      {/* Status Badge */}
                      <td className="py-4 px-4">
                        {user.is_active ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            فعال
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black bg-rose-50 text-rose-700 border border-rose-200">
                            <span className="w-2 h-2 rounded-full bg-rose-500" />
                            مسدود / غیرفعال
                          </span>
                        )}
                      </td>

                      {/* Wallet Balance */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1.5 font-bold text-slate-800">
                          <Wallet className="w-3.5 h-3.5 text-slate-400" />
                          <span>{toPersianDigits(formatToToman(user.wallet_balance || 0))}</span>
                          <span className="text-[11px] text-slate-400 font-normal">تومان</span>
                        </div>
                      </td>

                      {/* Created At */}
                      <td className="py-4 px-4 text-xs text-slate-500">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{toPersianDigits(formatDate(user.created_at))}</span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Edit User Button */}
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(user)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 transition-all active:scale-95 cursor-pointer"
                            title="ویرایش مشخصات کاربر"
                          >
                            <Edit className="w-3.5 h-3.5" />
                            <span>ویرایش</span>
                          </button>

                          {/* Quick Status Toggle Button */}
                          <button
                            type="button"
                            onClick={() => handleToggleUserStatus(user)}
                            disabled={
                              actioningUserId === user.id ||
                              (isCurrentAdminRow && user.is_active)
                            }
                            className={cn(
                              "inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed",
                              user.is_active
                                ? "bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200"
                                : "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200"
                            )}
                            title={
                              isCurrentAdminRow
                                ? "شما نمی‌توانید حساب فعال خود را غیرفعال کنید"
                                : user.is_active
                                ? "مسدودسازی این کاربر"
                                : "فعال‌سازی این کاربر"
                            }
                          >
                            <Power className="w-3.5 h-3.5" />
                            <span>
                              {actioningUserId === user.id
                                ? "..."
                                : user.is_active
                                ? "مسدودسازی"
                                : "فعال‌سازی"}
                            </span>
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
      </div>

      {/* Sticky Bulk Action Bar */}
      {selectedUserIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl px-4 animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className="bg-slate-900 text-white rounded-3xl p-4 sm:p-5 shadow-2xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 font-black">
                {toPersianDigits(selectedUserIds.length)}
              </div>
              <div>
                <p className="text-sm font-black text-white">
                  {toPersianDigits(selectedUserIds.length)} کاربر انتخاب شده است
                </p>
                <p className="text-xs text-slate-400">
                  می‌توانید عملیات گروهی مورد نظر را بر روی این کاربران اعمال کنید.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              {/* Deactivate Button */}
              <button
                type="button"
                onClick={handleBulkDeactivate}
                disabled={isBulkOperating}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs sm:text-sm shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                <UserX className="w-4 h-4" />
                <span>
                  {isBulkOperating
                    ? "در حال غیرفعال‌سازی..."
                    : "غیرفعال‌سازی دسته‌جمعی"}
                </span>
              </button>

              {/* Clear Selection Button */}
              <button
                type="button"
                onClick={() => setSelectedUserIds([])}
                disabled={isBulkOperating}
                className="px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs sm:text-sm transition-all active:scale-95 cursor-pointer"
              >
                لغو
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {isEditModalOpen && editingUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            className="bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-200 max-w-lg w-full space-y-5 animate-in fade-in zoom-in-95 duration-200"
            dir="rtl"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center">
                  <Edit className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    ویرایش اطلاعات کاربر
                  </h3>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">
                    {editingUser.id}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseEditModal}
                disabled={isSavingUser}
                className="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveUser} className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  نام و نام خانوادگی
                </label>
                <input
                  type="text"
                  value={editFormData.name}
                  onChange={(e) =>
                    setEditFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="مثال: علی احمدی"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-sm text-slate-900"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  شماره تماس (موبایل) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={editFormData.phone}
                  onChange={(e) =>
                    setEditFormData((prev) => ({ ...prev, phone: e.target.value }))
                  }
                  placeholder="09123456789"
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-sm font-mono text-slate-900 text-left"
                />
              </div>

              {/* Role */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  نقش کاربری
                </label>
                <select
                  value={editFormData.role}
                  onChange={(e) =>
                    setEditFormData((prev) => ({ ...prev, role: e.target.value }))
                  }
                  disabled={editingUser.id === currentAdmin?.id}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-sm text-slate-900 bg-white disabled:bg-slate-50 disabled:text-slate-500"
                >
                  <option value="CUSTOMER">مشتری سامانه (CUSTOMER)</option>
                  <option value="ADMIN">مدیر سیستم (ADMIN)</option>
                </select>
                {editingUser.id === currentAdmin?.id && (
                  <p className="text-[11px] text-amber-600 mt-1 font-medium">
                    شما نمی‌توانید نقش حساب مدیریت فعلی خود را تغییر دهید.
                  </p>
                )}
              </div>

              {/* Password (Optional) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  رمز عبور جدید (اختیاری)
                </label>
                <div className="relative">
                  <input
                    type="password"
                    dir="ltr"
                    value={editFormData.password}
                    onChange={(e) =>
                      setEditFormData((prev) => ({ ...prev, password: e.target.value }))
                    }
                    placeholder="در صورت عدم تمایل به تغییر، خالی بگذارید"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-sm text-slate-900"
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                </div>
              </div>

              {/* Active Toggle */}
              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="user_is_active"
                  checked={editFormData.is_active}
                  onChange={(e) =>
                    setEditFormData((prev) => ({ ...prev, is_active: e.target.checked }))
                  }
                  disabled={editingUser.id === currentAdmin?.id}
                  className="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500 cursor-pointer disabled:cursor-not-allowed"
                />
                <label
                  htmlFor="user_is_active"
                  className="text-xs font-bold text-slate-800 cursor-pointer select-none"
                >
                  حساب کاربری فعال و مجاز به ورود است
                </label>
              </div>

              {/* Form Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleCloseEditModal}
                  disabled={isSavingUser}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={isSavingUser}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  {isSavingUser && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isSavingUser ? "در حال ذخیره..." : "ذخیره تغییرات"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
