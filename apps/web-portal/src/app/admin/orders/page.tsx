"use client";

import React, { useState, useEffect } from "react";
import {
  Search,
  FileCheck2,
  Clock,
  CheckCircle2,
  Eye,
  Download,
  Building2,
  X,
  RefreshCw,
  ShoppingBag,
  Truck,
  FileText,
  CheckSquare,
  Square,
} from "lucide-react";
import { formatPersianCurrency, toPersianDigits, cn } from "@/lib/utils";
import {
  fetchAdminOrders,
  bulkUpdateOrderStatus,
  OrderDto,
} from "@/lib/api/admin";
import { OrderDetailsModal } from "./components/OrderDetailsModal";
import { toast } from "sonner";

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<OrderDto[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeFilter, setActiveFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<OrderDto | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // Bulk Actions State
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [isBulkUpdating, setIsBulkUpdating] = useState<boolean>(false);
  const [bulkTargetStatus, setBulkTargetStatus] = useState<string>("SHIPPED");

  // Fetch admin orders from FastAPI live backend
  const loadOrders = async () => {
    setIsLoading(true);
    try {
      const response = await fetchAdminOrders();
      const data = Array.isArray(response.data)
        ? response.data
        : (response as any)?.data || [];
      setOrders(data);
    } catch (error: any) {
      console.warn("Could not fetch admin orders from backend:", error);
      setOrders([]);
      toast.error("عدم دسترسی یا خطای بارگذاری سفارشات", {
        description:
          error?.response?.data?.detail ||
          "سرویس دریافت سفارشات در دسترس نیست یا نیاز به دسترسی مدیر دارد.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const openOrderModal = (order: OrderDto) => {
    setSelectedOrder(order);
    setIsModalOpen(true);
  };

  // Bulk Selection Handlers
  const handleSelectAllOrders = () => {
    if (selectedOrderIds.length === filteredOrders.length) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(filteredOrders.map((o) => o.id));
    }
  };

  const handleToggleSelectOrder = (id: string) => {
    setSelectedOrderIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Bulk Status Update Handler
  const handleBulkUpdateStatus = async () => {
    if (selectedOrderIds.length === 0 || !bulkTargetStatus) return;

    setIsBulkUpdating(true);
    try {
      const response = await bulkUpdateOrderStatus(
        selectedOrderIds,
        bulkTargetStatus
      );
      toast.success("وضعیت سفارشات با موفقیت تغییر یافت", {
        description: response.data.message,
      });
      setSelectedOrderIds([]);
      await loadOrders();
    } catch (error: any) {
      toast.error("خطا در تغییر وضعیت گروهی سفارشات", {
        description:
          error?.response?.data?.detail || "خطایی در سرور رخ داده است.",
      });
    } finally {
      setIsBulkUpdating(false);
    }
  };

  // Filter and Search logic
  const filteredOrders = orders.filter((order) => {
    const matchesFilter =
      activeFilter === "ALL" ? true : order.status === activeFilter;

    if (!matchesFilter) return false;

    if (!searchQuery.trim()) return true;

    const query = searchQuery.toLowerCase().trim();
    const tracking = (order.tracking_code || order.id || "").toLowerCase();
    const customerName = (
      order.address_snapshot?.full_name ||
      order.user?.name ||
      ""
    ).toLowerCase();
    const customerPhone = (
      order.address_snapshot?.phone ||
      order.user?.phone ||
      ""
    ).toLowerCase();
    const company = (
      order.address_snapshot?.company ||
      order.address_snapshot?.title ||
      ""
    ).toLowerCase();
    const shippingMethod = (order.shipping_method || "").toLowerCase();

    return (
      tracking.includes(query) ||
      customerName.includes(query) ||
      customerPhone.includes(query) ||
      company.includes(query) ||
      shippingMethod.includes(query)
    );
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "SHIPPED":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 text-blue-800 border border-blue-200 text-xs font-bold">
            <Truck className="w-3.5 h-3.5 text-blue-700" />
            <span>ارسال شده (پست/تیپاکس)</span>
          </span>
        );
      case "READY_FOR_PICKUP":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-100 text-teal-800 border border-teal-200 text-xs font-bold">
            <Building2 className="w-3.5 h-3.5 text-teal-700" />
            <span>آماده تحویل حضوری (کرمان)</span>
          </span>
        );
      case "PENDING_QUOTATION":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold">
            <FileText className="w-3.5 h-3.5 text-amber-700" />
            <span>در انتظار پیش‌فاکتور</span>
          </span>
        );
      case "PAYMENT_VERIFICATION":
      case "RECEIPT_REVIEW":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-100 text-rose-800 border border-rose-200 text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            <span>بررسی فیش</span>
          </span>
        );
      case "PAID":
      case "PROCESSING":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
            <span>پرداخت شده</span>
          </span>
        );
      case "PENDING":
      case "PENDING_QUOTE":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold">
            <Clock className="w-3.5 h-3.5 text-amber-700" />
            <span>در انتظار پرداخت</span>
          </span>
        );
      case "CANCELED":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold">
            <X className="w-3.5 h-3.5 text-slate-500" />
            <span>لغو شده</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold">
            <span>{status}</span>
          </span>
        );
    }
  };

  // Operational Counts
  const pendingCount = orders.filter(
    (o) => o.status === "PENDING" || o.status === "PENDING_QUOTE"
  ).length;
  const reviewCount = orders.filter((o) => o.status === "RECEIPT_REVIEW").length;
  const activeCount = orders.filter(
    (o) => o.status === "PROCESSING" || o.status === "PAID" || o.status === "SHIPPED"
  ).length;

  return (
    <div className="w-full space-y-6 font-sans text-slate-900" dir="rtl">
      {/* 1. Header Bar: Title & Primary Actions */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-gray-100 shadow-[0_2px_15px_rgba(0,0,0,0.03)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-700 flex items-center justify-center flex-shrink-0">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                پنل مدیریت سفارشات و قراردادها
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700">
                {isLoading ? "..." : `${toPersianDigits(orders.length)} رکورد`}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
              سامانه یکپارچه مانیتورینگ استعلام‌های B2B، خریدهای B2C و تایید اسناد مالی
            </p>
          </div>
        </div>

        {/* Top Control Buttons */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={loadOrders}
            disabled={isLoading}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-gray-200 text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={cn("w-3.5 h-3.5 text-amber-600", isLoading && "animate-spin")} />
            <span>بروزرسانی</span>
          </button>
          <button
            type="button"
            onClick={() => {
              toast.success("خروجی اکسل آماده شد", {
                description: "فایل گزارش جامع فاکتورها دانلود شد.",
              });
            }}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>خروجی اکسل</span>
          </button>
        </div>
      </div>

      {/* 2. Operational Counters (3 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-[0_2px_15px_rgba(0,0,0,0.02)] flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 block">
              سفارش‌های در انتظار پرداخت
            </span>
            <span className="text-2xl font-black text-slate-900 font-sans mt-1.5 block">
              {isLoading ? "..." : toPersianDigits(pendingCount)}
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200/80">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-[0_2px_15px_rgba(0,0,0,0.02)] flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 block">
              فیش‌های واریزی نیازمند بررسی
            </span>
            <span className="text-2xl font-black text-rose-600 font-sans mt-1.5 block">
              {isLoading ? "..." : toPersianDigits(reviewCount)}
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-200/80">
            <FileCheck2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-[0_2px_15px_rgba(0,0,0,0.02)] flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 block">
              سفارشات تایید شده و فعال
            </span>
            <span className="text-2xl font-black text-emerald-700 font-sans mt-1.5 block">
              {isLoading ? "..." : toPersianDigits(activeCount)}
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200/80">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* 3. Search and Filter Bar */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-gray-100 shadow-[0_2px_15px_rgba(0,0,0,0.02)] flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="جستجو در کد رهگیری، نام مشتری، روش ارسال..."
            className="w-full bg-slate-50 border border-gray-200 rounded-xl py-2.5 pr-10 pl-4 text-xs font-bold text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all text-right font-sans"
          />
        </div>

        {/* Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 hide-scrollbar">
          <button
            type="button"
            onClick={() => setActiveFilter("ALL")}
            className={cn(
              "px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer shadow-xs font-sans",
              activeFilter === "ALL"
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            )}
          >
            همه موارد ({toPersianDigits(orders.length)})
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter("SHIPPED")}
            className={cn(
              "px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer shadow-xs font-sans",
              activeFilter === "SHIPPED"
                ? "bg-blue-600 text-white"
                : "bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200/60"
            )}
          >
            ارسال شده (پست/تیپاکس)
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter("READY_FOR_PICKUP")}
            className={cn(
              "px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer shadow-xs font-sans",
              activeFilter === "READY_FOR_PICKUP"
                ? "bg-teal-600 text-white"
                : "bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200/60"
            )}
          >
            تحویل حضوری کرمان
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter("RECEIPT_REVIEW")}
            className={cn(
              "px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer shadow-xs font-sans",
              activeFilter === "RECEIPT_REVIEW"
                ? "bg-rose-600 text-white"
                : "bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200/60"
            )}
          >
            <span>بررسی فیش</span>
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter("PENDING")}
            className={cn(
              "px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer shadow-xs font-sans",
              activeFilter === "PENDING"
                ? "bg-amber-500 text-slate-950 font-black"
                : "bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200/60"
            )}
          >
            در انتظار پرداخت
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter("PAID")}
            className={cn(
              "px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer shadow-xs font-sans",
              activeFilter === "PAID"
                ? "bg-emerald-600 text-white"
                : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200/60"
            )}
          >
            پرداخت شده
          </button>
        </div>
      </div>

      {/* 4. Streamlined Orders Data Table (text-sm, font-sans, unified modal action) */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden font-sans">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse text-sm" dir="rtl">
            <thead>
              <tr className="bg-slate-50 border-b border-gray-200 text-xs font-bold text-slate-600">
                <th className="py-4 px-3 w-12 text-center">
                  <button
                    type="button"
                    onClick={handleSelectAllOrders}
                    className="text-slate-400 hover:text-slate-700 transition-colors cursor-pointer inline-flex items-center justify-center"
                    title={
                      filteredOrders.length > 0 &&
                      selectedOrderIds.length === filteredOrders.length
                        ? "لغو انتخاب همه"
                        : "انتخاب همه"
                    }
                  >
                    {filteredOrders.length > 0 &&
                    selectedOrderIds.length === filteredOrders.length ? (
                      <CheckSquare className="w-4 h-4 text-amber-500" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="py-4 px-5">ردیف / شناسه</th>
                <th className="py-4 px-5">مشتری</th>
                <th className="py-4 px-5">مبلغ کل سفارش</th>
                <th className="py-4 px-5">وضعیت</th>
                <th className="py-4 px-5 text-center">اقدام</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {isLoading ? (
                // Skeleton Loader while loading
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-4 px-3 text-center">
                      <div className="w-4 h-4 bg-slate-200 rounded mx-auto" />
                    </td>
                    <td className="py-4 px-5">
                      <div className="h-4 bg-slate-200 rounded w-24 mb-1.5" />
                      <div className="h-3 bg-slate-100 rounded w-16" />
                    </td>
                    <td className="py-4 px-5">
                      <div className="h-4 bg-slate-200 rounded w-32 mb-1.5" />
                      <div className="h-3 bg-slate-100 rounded w-20" />
                    </td>
                    <td className="py-4 px-5">
                      <div className="h-4 bg-slate-200 rounded w-28" />
                    </td>
                    <td className="py-4 px-5">
                      <div className="h-6 bg-slate-200 rounded-full w-24" />
                    </td>
                    <td className="py-4 px-5 text-center">
                      <div className="h-8 bg-slate-200 rounded-xl w-24 mx-auto" />
                    </td>
                  </tr>
                ))
              ) : filteredOrders.length === 0 ? (
                // Empty State
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="w-16 h-16 rounded-3xl bg-slate-50 border border-slate-200/80 flex items-center justify-center text-slate-400">
                        <ShoppingBag className="w-8 h-8 text-slate-300" />
                      </div>
                      <div className="text-sm font-black text-slate-700">
                        هیچ سفارشی یافت نشد
                      </div>
                      <p className="text-xs text-slate-400 max-w-sm">
                        در حال حاضر هیچ رکوردی مطابق جستجو یا فیلتر انتخابی شما در سامانه ثبت نشده است.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order, idx) => {
                  const displayTracking =
                    order.tracking_code || `ORD-${order.id.slice(0, 8).toUpperCase()}`;
                  const customerName =
                    order.address_snapshot?.full_name ||
                    order.user?.name ||
                    "مشتری آسانرو";
                  const customerPhone =
                    order.address_snapshot?.phone ||
                    order.user?.phone ||
                    "-";
                  const companyOrTitle =
                    order.address_snapshot?.company ||
                    order.address_snapshot?.title;

                  return (
                    <tr
                      key={order.id}
                      className={cn(
                        "hover:bg-slate-50/70 transition-colors group",
                        selectedOrderIds.includes(order.id) && "bg-amber-50/40"
                      )}
                    >
                      {/* 0. Selection Checkbox */}
                      <td className="py-4 px-3 text-center align-middle">
                        <button
                          type="button"
                          onClick={() => handleToggleSelectOrder(order.id)}
                          className="text-slate-400 hover:text-slate-700 transition-colors cursor-pointer inline-flex items-center justify-center"
                        >
                          {selectedOrderIds.includes(order.id) ? (
                            <CheckSquare className="w-4 h-4 text-amber-500" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>

                      {/* 1. Row Index & Tracking ID */}
                      <td className="py-4 px-5 align-middle">
                        <div className="flex items-center gap-2.5">
                          <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-500 text-xs font-bold flex items-center justify-center shrink-0">
                            {toPersianDigits(idx + 1)}
                          </span>
                          <div>
                            <span className="font-bold text-slate-900 block font-sans">
                              {toPersianDigits(displayTracking)}
                            </span>
                            {order.shipping_method && (
                              <span className="inline-flex items-center gap-1 text-[11px] text-blue-600 font-medium">
                                <Truck className="w-3 h-3 text-blue-500" />
                                <span>{order.shipping_method}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 2. Customer Info */}
                      <td className="py-4 px-5 align-middle">
                        <div className="font-bold text-slate-900">
                          {customerName}
                        </div>
                        <div className="text-xs text-slate-500 font-sans mt-0.5">
                          {toPersianDigits(customerPhone)}
                        </div>
                        {companyOrTitle && (
                          <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5 font-medium">
                            <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate max-w-[170px]">{companyOrTitle}</span>
                          </div>
                        )}
                      </td>

                      {/* 3. Total Price in Toman */}
                      <td className="py-4 px-5 align-middle whitespace-nowrap">
                        <span className="font-black text-slate-900 font-sans">
                          {formatPersianCurrency(order.total_price)}
                        </span>
                      </td>

                      {/* 4. Status Badge */}
                      <td className="py-4 px-5 align-middle whitespace-nowrap">
                        {getStatusBadge(order.status)}
                      </td>

                      {/* 5. Unified Action Button: Open Details Modal */}
                      <td className="py-4 px-5 align-middle text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => openOrderModal(order)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                        >
                          <Eye className="w-4 h-4 text-amber-400" />
                          <span>مشاهده جزییات</span>
                        </button>
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
      {selectedOrderIds.length > 0 && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl px-4 animate-in fade-in slide-in-from-bottom-5 duration-300 font-sans"
          dir="rtl"
        >
          <div className="bg-slate-900 text-white rounded-3xl p-4 sm:p-5 shadow-2xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 font-black">
                {toPersianDigits(selectedOrderIds.length)}
              </div>
              <div>
                <p className="text-sm font-black text-white">
                  {toPersianDigits(selectedOrderIds.length)} سفارش انتخاب شده است
                </p>
                <p className="text-xs text-slate-400">
                  تغییر وضعیت همزمان و ثبت خودکار اعلان برای مشتریان
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={bulkTargetStatus}
                onChange={(e) => setBulkTargetStatus(e.target.value)}
                disabled={isBulkUpdating}
                className="bg-slate-800 text-white text-xs font-bold rounded-xl px-3 py-2.5 border border-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
              >
                <option value="PAID">پرداخت شده (PAID)</option>
                <option value="SHIPPED">ارسال شده (SHIPPED)</option>
                <option value="READY_FOR_PICKUP">
                  تحویل حضوری کرمان (READY_FOR_PICKUP)
                </option>
                <option value="CANCELED">لغو شده (CANCELED)</option>
              </select>

              <button
                type="button"
                onClick={handleBulkUpdateStatus}
                disabled={isBulkUpdating}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {isBulkUpdating && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>{isBulkUpdating ? "در حال ثبت..." : "اعمال تغییر وضعیت"}</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedOrderIds([])}
                disabled={isBulkUpdating}
                className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-all active:scale-95 cursor-pointer"
              >
                لغو
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Clean Order Details Modal */}
      <OrderDetailsModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedOrder(null);
        }}
        order={selectedOrder}
        onOrderUpdated={loadOrders}
      />
    </div>
  );
}
