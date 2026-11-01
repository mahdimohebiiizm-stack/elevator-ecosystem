"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  ShoppingCart,
  Search,
  RefreshCw,
  Send,
  Eye,
  Clock,
  User as UserIcon,
  Phone,
  CheckCircle2,
  AlertCircle,
  Truck,
  CreditCard,
  FileText,
  Building2,
  PackageCheck,
  ChevronDown,
} from "lucide-react";
import {
  fetchAdminOrders,
  updateOrderStatus,
  OrderDto,
} from "@/lib/api/admin";
import { OrderDetailsModal } from "@/app/admin/orders/components/OrderDetailsModal";
import {
  AdminDirectMessageModal,
  TargetUserInfo,
} from "@/components/admin/AdminDirectMessageModal";
import {
  formatPersianCurrency,
  toPersianDigits,
  cn,
} from "@/lib/utils";
import { toast } from "sonner";

type OrderStatusFilterType =
  | "ALL"
  | "PENDING"
  | "PENDING_QUOTATION"
  | "PAYMENT_VERIFICATION"
  | "PAID"
  | "READY_FOR_PICKUP"
  | "SHIPPED"
  | "CANCELED";

export default function AdminOrdersDataGridPage() {
  const [orders, setOrders] = useState<OrderDto[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<OrderStatusFilterType>("ALL");
  const [selectedOrder, setSelectedOrder] = useState<OrderDto | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState<boolean>(false);

  // CRM Direct Message Modal state
  const [dmTargetUser, setDmTargetUser] = useState<TargetUserInfo | null>(null);
  const [dmContextHint, setDmContextHint] = useState<string>("");
  const [isDmModalOpen, setIsDmModalOpen] = useState<boolean>(false);

  const loadOrders = async () => {
    setIsLoading(true);
    try {
      const response = await fetchAdminOrders();
      const data = Array.isArray(response.data)
        ? response.data
        : (response as any)?.data || [];
      setOrders(data);
    } catch (error: any) {
      console.warn("Could not fetch admin orders:", error);
      setOrders([]);
      toast.error("خطا در دریافت لیست سفارشات از سرور");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      await updateOrderStatus(orderId, newStatus);
      toast.success("وضعیت سفارش با موفقیت به‌روزرسانی شد.");
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
      );
    } catch (err: any) {
      console.error("Status update error:", err);
      toast.error("خطا در به‌روزرسانی وضعیت سفارش");
    }
  };

  const openOrderDetails = (order: OrderDto) => {
    setSelectedOrder(order);
    setIsDetailsModalOpen(true);
  };

  const openDirectMessage = (order: OrderDto) => {
    const targetUser: TargetUserInfo = {
      id: order.user?.id || order.user_id || "",
      name:
        order.user?.name ||
        order.address_snapshot?.full_name ||
        "مشتری",
      phone:
        order.user?.phone ||
        order.address_snapshot?.phone ||
        "",
      telegram_id: (order.user as any)?.telegram_id,
      bale_id: (order.user as any)?.bale_id,
    };
    setDmTargetUser(targetUser);
    setDmContextHint(`سفارش #${order.id.slice(0, 8)}`);
    setIsDmModalOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toUpperCase()) {
      case "PAID":
      case "COMPLETED":
      case "DELIVERED":
        return {
          label: "پرداخت تایید شده",
          classes: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
        };
      case "SHIPPED":
        return {
          label: "ارسال شده (باربری/پست)",
          classes: "bg-sky-500/10 text-sky-600 border-sky-500/20",
        };
      case "READY_FOR_PICKUP":
        return {
          label: "آماده تحویل حضوری",
          classes: "bg-teal-500/10 text-teal-600 border-teal-500/20",
        };
      case "PAYMENT_VERIFICATION":
        return {
          label: "بررسی فیش واریزی",
          classes: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
        };
      case "PENDING_QUOTATION":
        return {
          label: "در انتظار پیش‌فاکتور",
          classes: "bg-purple-500/10 text-purple-600 border-purple-500/20",
        };
      case "PENDING":
      case "PENDING_PAYMENT":
        return {
          label: "در انتظار پرداخت",
          classes: "bg-amber-500/10 text-amber-600 border-amber-500/20",
        };
      case "CANCELED":
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
  const filteredOrders = useMemo(() => {
    return orders.filter((item) => {
      if (statusFilter !== "ALL" && item.status?.toUpperCase() !== statusFilter) {
        return false;
      }
      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase();
      const orderId = (item.id || "").toLowerCase();
      const customerName = (
        item.user?.name ||
        item.address_snapshot?.full_name ||
        ""
      ).toLowerCase();
      const phone = (
        item.user?.phone ||
        item.address_snapshot?.phone ||
        ""
      ).toLowerCase();
      const tracking = (item.tracking_code || "").toLowerCase();

      return (
        orderId.includes(q) ||
        customerName.includes(q) ||
        phone.includes(q) ||
        tracking.includes(q)
      );
    });
  }, [orders, statusFilter, searchQuery]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300" dir="rtl">
      {/* Header Banner */}
      <div className="bg-primary text-primary-foreground rounded-2xl p-6 shadow-xl relative overflow-hidden border border-primary/20">
        <div className="absolute top-0 left-0 w-64 h-64 bg-accent/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="p-1.5 rounded-lg bg-accent/20 text-accent border border-accent/30">
                <ShoppingCart className="w-5 h-5" />
              </span>
              <span className="text-xs font-semibold text-accent uppercase tracking-widest">
                لجستیک و فروش قطعات آسانسور
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              مدیریت و پردازش سفارشات
            </h1>
            <p className="text-sm text-primary-foreground/75 mt-1">
              بررسی و تایید پیش‌فاکتورها، رهگیری مرسولات پستی و مخابره وضعیت سفارش به پیام‌رسان کاربر
            </p>
          </div>

          <button
            onClick={loadOrders}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-sm font-medium transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
            <span>به‌روزرسانی</span>
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
              placeholder="جستجو با شماره سفارش، نام مشتری، شماره تماس یا کد رهگیری پستی..."
              className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all placeholder:text-muted-foreground text-foreground"
            />
          </div>

          {/* Status Filter Chips */}
          <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            {[
              { id: "ALL", label: "همه سفارشات" },
              { id: "PENDING", label: "در انتظار پرداخت" },
              { id: "PAYMENT_VERIFICATION", label: "بررسی فیش" },
              { id: "PAID", label: "پرداخت شده" },
              { id: "SHIPPED", label: "ارسال شده" },
              { id: "READY_FOR_PICKUP", label: "تحویل حضوری" },
              { id: "CANCELED", label: "لغو شده" },
            ].map((chip) => (
              <button
                key={chip.id}
                onClick={() => setStatusFilter(chip.id as OrderStatusFilterType)}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-bold transition-all border",
                  statusFilter === chip.id
                    ? "bg-accent text-accent-foreground border-accent shadow-sm"
                    : "bg-muted/50 text-muted-foreground border-border hover:bg-muted hover:text-foreground"
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
                <th className="py-4 px-4">شماره سفارش</th>
                <th className="py-4 px-4">مشتری / تحویل‌گیرنده</th>
                <th className="py-4 px-4">مبلغ کل فاکتور</th>
                <th className="py-4 px-4">وضعیت پرداخت / سفارش</th>
                <th className="py-4 px-4">تاریخ ثبت</th>
                <th className="py-4 px-4 text-center">عملیات مدیریت</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-accent" />
                      <span>در حال دریافت سفارشات آسانسور...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground">
                    هیچ سفارشی با شرایط جستجو یافت نشد.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((item) => {
                  const statusBadge = getStatusBadge(item.status);
                  const customerName =
                    item.address_snapshot?.full_name ||
                    item.user?.name ||
                    "ناشناس";
                  const customerPhone =
                    item.address_snapshot?.phone ||
                    item.user?.phone ||
                    "";

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      {/* Order ID */}
                      <td className="py-3.5 px-4 font-mono font-bold text-foreground">
                        #{toPersianDigits(item.id.slice(0, 8))}
                      </td>

                      {/* Customer Info */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <div className="font-bold text-foreground">
                            {customerName}
                          </div>
                          {customerPhone && (
                            <div
                              dir="ltr"
                              className="text-[11px] text-muted-foreground font-mono"
                            >
                              {toPersianDigits(customerPhone)}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Price */}
                      <td className="py-3.5 px-4 font-bold text-foreground">
                        {formatPersianCurrency(item.total_price)}
                      </td>

                      {/* Status Dropdown */}
                      <td className="py-3.5 px-4">
                        <select
                          value={item.status?.toUpperCase() || "PENDING"}
                          onChange={(e) =>
                            handleStatusChange(item.id, e.target.value)
                          }
                          className={cn(
                            "text-xs font-bold rounded-lg border px-2.5 py-1 bg-background focus:outline-none focus:ring-1 focus:ring-accent transition-all cursor-pointer",
                            statusBadge.classes
                          )}
                        >
                          <option value="PENDING">در انتظار پرداخت (PENDING)</option>
                          <option value="PENDING_QUOTATION">در انتظار پیش‌فاکتور (PENDING_QUOTATION)</option>
                          <option value="PAYMENT_VERIFICATION">بررسی فیش واریزی (PAYMENT_VERIFICATION)</option>
                          <option value="PAID">پرداخت تایید شده (PAID)</option>
                          <option value="READY_FOR_PICKUP">آماده تحویل حضوری (READY_FOR_PICKUP)</option>
                          <option value="SHIPPED">ارسال شده (SHIPPED)</option>
                          <option value="CANCELED">لغو شده (CANCELED)</option>
                        </select>
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-4 text-muted-foreground font-mono text-[11px]">
                        {formatPersianDate(item.created_at)}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center justify-center gap-2">
                          {/* Direct Message (Bot/CRM) */}
                          <button
                            type="button"
                            onClick={() => openDirectMessage(item)}
                            title="ارسال پیام مستقیم به تلگرام/بله خریدار"
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-accent/15 text-accent hover:bg-accent/25 border border-accent/30 font-medium transition-colors"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>پیام مستقیم</span>
                          </button>

                          {/* Details & Invoice Modal */}
                          <button
                            type="button"
                            onClick={() => openOrderDetails(item)}
                            title="مشاهده فاکتور و وضعیت مرسوله"
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 font-medium transition-colors"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>فاکتور و جزئیات</span>
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

      {/* Order Details & Logistics Modal */}
      <OrderDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        order={selectedOrder}
        onOrderUpdated={loadOrders}
      />

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
