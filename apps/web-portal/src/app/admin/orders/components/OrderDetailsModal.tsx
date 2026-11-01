"use client";

import React, { useState } from "react";
import {
  X,
  User,
  Phone,
  Building2,
  MapPin,
  Calendar,
  CreditCard,
  Truck,
  Package,
  CheckCircle2,
  Clock,
  FileCheck2,
  ExternalLink,
  Eye,
  Receipt,
  FileText,
  Loader2,
  Sparkles,
} from "lucide-react";
import { formatPersianCurrency, toPersianDigits, cn } from "@/lib/utils";
import { OrderDto, TransactionDto, updateOrderStatus } from "@/lib/api/admin";
import { toast } from "sonner";

export interface OrderDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: OrderDto | null;
  onOrderUpdated?: () => void;
}

export const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({
  isOpen,
  onClose,
  order,
  onOrderUpdated,
}) => {
  const [updatingTxId, setUpdatingTxId] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>(order?.status || "PENDING");
  const [trackingCodeInput, setTrackingCodeInput] = useState<string>(order?.tracking_code || "");
  const [isSavingLogistics, setIsSavingLogistics] = useState<boolean>(false);

  React.useEffect(() => {
    if (order) {
      setSelectedStatus(order.status);
      setTrackingCodeInput(order.tracking_code || "");
    }
  }, [order]);

  if (!isOpen || !order) return null;

  // Pipeline Stepper Calculation
  const pipelineStages = [
    { status: "PENDING", label: "۱. ثبت سفارش" },
    { status: "PAYMENT_VERIFICATION", label: "۲. بررسی فیش" },
    { status: "PAID", label: "۳. تایید مالی" },
    {
      status: order.shipping_method === "تحویل حضوری در کرمان" ? "READY_FOR_PICKUP" : "SHIPPED",
      label: order.shipping_method === "تحویل حضوری در کرمان" ? "۴. تحویل حضوری" : "۴. تحویل باربری",
    },
  ];

  const getStageIndex = (status: string) => {
    switch (status) {
      case "PENDING":
      case "PENDING_QUOTATION":
      case "PENDING_QUOTE":
        return 0;
      case "PAYMENT_VERIFICATION":
      case "RECEIPT_REVIEW":
        return 1;
      case "PAID":
      case "PROCESSING":
        return 2;
      case "SHIPPED":
      case "READY_FOR_PICKUP":
        return 3;
      default:
        return -1;
    }
  };

  const currentStageIndex = getStageIndex(selectedStatus);

  const handleSaveLogistics = async () => {
    if (!order) return;
    setIsSavingLogistics(true);
    try {
      await updateOrderStatus(
        order.id,
        selectedStatus,
        undefined,
        undefined,
        selectedStatus === "SHIPPED" ? trackingCodeInput : undefined
      );
      toast.success("وضعیت سفارش و اطلاعات لاجستیک با موفقیت به‌روزرسانی شد.");
      onOrderUpdated?.();
    } catch (err: any) {
      console.error("Failed to update order logistics:", err);
      toast.error("خطا در به‌روزرسانی وضعیت سفارش", {
        description: err?.response?.data?.detail || "لطفاً مجدداً تلاش نمایید.",
      });
    } finally {
      setIsSavingLogistics(false);
    }
  };

  const handleUpdateStatus = async (
    targetOrderStatus: string,
    txId?: string,
    targetTxStatus?: string
  ) => {
    if (!order) return;
    if (txId) setUpdatingTxId(txId);
    try {
      await updateOrderStatus(order.id, targetOrderStatus, txId, targetTxStatus);
      toast.success(
        targetTxStatus === "SUCCESS"
          ? "فیش واریزی با موفقیت تایید و سفارش پرداخت گردید."
          : "فیش واریزی رد گردید و وضعیت سفارش در انتظار پرداخت باقی ماند."
      );
      onOrderUpdated?.();
      onClose();
    } catch (err: any) {
      console.error("Failed to update order status:", err);
      toast.error("خطا در به‌روزرسانی وضعیت سفارش", {
        description: err?.response?.data?.detail || "لطفاً مجدداً تلاش نمایید.",
      });
    } finally {
      setUpdatingTxId(null);
    }
  };

  const formatPersianDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return toPersianDigits(dateStr);
      return new Intl.DateTimeFormat("fa-IR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }).format(d);
    } catch {
      return toPersianDigits(dateStr);
    }
  };

  const getFullReceiptUrl = (url?: string) => {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    const backendBase =
      process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/v1\/?$/, "") ||
      "http://localhost:8000";
    return `${backendBase}${url.startsWith("/") ? "" : "/"}${url}`;
  };

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
            <span>آماده تحویل حضوری در کرمان</span>
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
            <span>بررسی فیش واریزی</span>
          </span>
        );
      case "PAID":
      case "PROCESSING":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
            <span>پرداخت شده و تایید شده</span>
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

  const getTransactionStatusBadge = (status: string) => {
    switch (status) {
      case "SUCCESS":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-bold">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>موفق و تایید شده</span>
          </span>
        );
      case "FAILED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200 text-[11px] font-bold">
            <X className="w-3 h-3 text-rose-600" />
            <span>ناموفق</span>
          </span>
        );
      case "PENDING":
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 text-[11px] font-bold">
            <Clock className="w-3 h-3 text-amber-600" />
            <span>در انتظار تایید حسابداری</span>
          </span>
        );
    }
  };

  const mapGatewayName = (name: string) => {
    const lower = (name || "").toLowerCase();
    if (lower.includes("receipt") || lower.includes("bank")) {
      return "فیش واریزی بانکی (کارت به کارت / پایا)";
    }
    if (lower.includes("zarinpal")) {
      return "درگاه پرداخت زرین‌پال";
    }
    return name || "درگاه بانکی";
  };

  const customerName =
    order.address_snapshot?.full_name ||
    order.user?.name ||
    "مشتری آسانرو";
  const customerPhone =
    order.address_snapshot?.phone ||
    order.user?.phone ||
    "-";
  const buildingTitle =
    order.address_snapshot?.title ||
    order.address_snapshot?.company ||
    "";
  const displayTracking =
    order.tracking_code || `ORD-${order.id.slice(0, 8).toUpperCase()}`;

  const transactions = order.transactions || [];

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 transition-opacity animate-in fade-in"
      onClick={onClose}
      dir="rtl"
    >
      <div
        className="w-full max-w-3xl bg-white rounded-3xl border border-gray-200 shadow-2xl p-6 sm:p-7 space-y-6 max-h-[90vh] overflow-y-auto font-sans text-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-700 flex items-center justify-center font-black">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-slate-900">
                  پرونده فنی و رهگیری سفارش
                </h3>
              </div>
              <span className="text-xs text-slate-500 font-sans">
                کد رهگیری: {toPersianDigits(displayTracking)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {getStatusBadge(order.status)}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Pipeline Stepper (Visual Order Workflow Lifecycle) */}
        <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-5 border border-slate-800 shadow-inner space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>چرخه فرآیند لجستیک و وضعیت سفارش (Order Workflow Pipeline)</span>
            </span>
            <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
              کلیک بر روی هر مرحله جهت انتخاب سریع وضعیت
            </span>
          </div>

          <div className="grid grid-cols-4 gap-2 text-center">
            {pipelineStages.map((stage, idx) => {
              const isCompleted = currentStageIndex > idx;
              const isCurrent = currentStageIndex === idx;

              return (
                <button
                  key={stage.status}
                  type="button"
                  onClick={() => setSelectedStatus(stage.status)}
                  className={cn(
                    "relative flex flex-col items-center p-2 sm:p-2.5 rounded-xl border text-xs transition-all cursor-pointer",
                    isCurrent
                      ? "bg-amber-500/20 border-amber-500 text-amber-300 font-black ring-2 ring-amber-500/30"
                      : isCompleted
                      ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400 font-bold"
                      : "bg-slate-800/60 border-slate-700/60 text-slate-400 hover:border-slate-600"
                  )}
                  title={`انتقال به مرحله: ${stage.label}`}
                >
                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] mb-1 font-black">
                    {isCompleted ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <span>{toPersianDigits(idx + 1)}</span>
                    )}
                  </div>
                  <span className="text-[11px] truncate max-w-full font-bold">
                    {stage.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 1. Customer & Building Info Card */}
        <div className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-200/80 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700 pb-1 border-b border-slate-200/60">
            <User className="w-4 h-4 text-amber-600" />
            <span>مشخصات مشتری و پروژه ساختمانی</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-slate-400 block font-medium">نام و نام خانوادگی:</span>
              <span className="font-bold text-slate-900 text-sm">{customerName}</span>
            </div>

            <div>
              <span className="text-slate-400 block font-medium">شماره تماس مستقیم:</span>
              <span className="font-bold text-slate-800 font-sans text-sm">
                {toPersianDigits(customerPhone)}
              </span>
            </div>

            {buildingTitle && (
              <div>
                <span className="text-slate-400 block font-medium">عنوان پروژه / شرکت:</span>
                <span className="font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  <span>{buildingTitle}</span>
                </span>
              </div>
            )}

            <div>
              <span className="text-slate-400 block font-medium">تاریخ و زمان ثبت:</span>
              <span className="font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>{formatPersianDate(order.created_at)}</span>
              </span>
            </div>
          </div>

          {order.address_snapshot?.full_address && (
            <div className="pt-2 border-t border-slate-200/60 text-xs">
              <span className="text-slate-400 block font-medium mb-1">نشانی تحویل و کارگاه:</span>
              <div className="flex items-start gap-1.5 text-slate-700 font-medium">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                <span>
                  {order.address_snapshot.province ? `${order.address_snapshot.province}، ` : ""}
                  {order.address_snapshot.city ? `${order.address_snapshot.city}، ` : ""}
                  {order.address_snapshot.full_address}
                  {order.address_snapshot.postal_code && (
                    <span className="font-sans text-slate-500 mr-2">
                      (کدپستی: {toPersianDigits(order.address_snapshot.postal_code)})
                    </span>
                  )}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* 2. Logistics & Shipping Details Card (Advanced Order Management) */}
        <div className="bg-blue-50/60 rounded-2xl p-4 sm:p-5 border border-blue-200/80 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-blue-200/60">
            <div className="flex items-center gap-2 text-xs font-bold text-blue-950">
              <Truck className="w-4 h-4 text-blue-600" />
              <span>مدیریت وضعیت سفارش، لاجستیک و ارسال مرسوله</span>
            </div>
            <span className="text-[11px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-lg">
              {order.shipping_method || "ارسال اختصاصی باربری آسانرو"}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {/* Status Selector */}
            <div className="space-y-1.5">
              <label className="text-slate-700 font-bold block">
                تغییر وضعیت سفارش:
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full bg-white border border-blue-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                <option value="PENDING">در انتظار پرداخت (PENDING)</option>
                <option value="PENDING_QUOTATION">در انتظار پیش‌فاکتور (PENDING_QUOTATION)</option>
                <option value="PAYMENT_VERIFICATION">بررسی فیش واریزی (PAYMENT_VERIFICATION)</option>
                <option value="PAID">پرداخت شده و تایید شده (PAID)</option>
                <option value="READY_FOR_PICKUP">آماده تحویل حضوری در کرمان (READY_FOR_PICKUP)</option>
                <option value="SHIPPED">تحویل به پست/تیپاکس (SHIPPED)</option>
                <option value="CANCELED">لغو شده (CANCELED)</option>
              </select>
            </div>

            {/* Tracking Code Field (Active when SHIPPED or already set) */}
            <div className="space-y-1.5">
              <label className="text-slate-700 font-bold block flex items-center justify-between">
                <span>کد رهگیری پستی / بارنامه تیپاکس:</span>
                {selectedStatus === "SHIPPED" && (
                  <span className="text-[10px] text-blue-600 font-black">الزامی برای ارسال</span>
                )}
              </label>
              <input
                type="text"
                value={trackingCodeInput}
                onChange={(e) => setTrackingCodeInput(e.target.value)}
                placeholder="مثال: TPX-98237461 یا کد مرسوله پستی..."
                className="w-full bg-white border border-blue-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-sans"
              />
            </div>
          </div>

          {/* Conditional Alert for READY_FOR_PICKUP */}
          {selectedStatus === "READY_FOR_PICKUP" && (
            <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl text-teal-900 text-xs flex items-center gap-2">
              <Building2 className="w-4 h-4 text-teal-600 shrink-0" />
              <span>
                سفارش به عنوان <strong>آماده تحویل حضوری در کرمان</strong> ثبت می‌شود و پیامک تحویل در انبار مرکزی برای مشتری فعال خواهد شد.
              </span>
            </div>
          )}

          {/* Save Status & Logistics Button */}
          <div className="flex items-center justify-end pt-1">
            <button
              type="button"
              disabled={isSavingLogistics}
              onClick={handleSaveLogistics}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {isSavingLogistics ? (
                <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-slate-950" />
              )}
              <span>ثبت تغییر وضعیت و اطلاعات لاجستیک</span>
            </button>
          </div>
        </div>

        {/* 3. Financial Audit Trail & Transactions (NEW) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between pb-1 border-b border-gray-100">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
              <CreditCard className="w-4 h-4 text-amber-600" />
              <span>پرونده مالی و تراکنش‌ها ({toPersianDigits(transactions.length)} رکورد)</span>
            </div>
          </div>

          {transactions.length === 0 ? (
            <div className="text-xs text-slate-400 py-4 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 font-medium">
              هیچ تراکنشی برای این سفارش ثبت نشده است.
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((tx) => {
                const fullReceiptUrl = getFullReceiptUrl(tx.receipt_url);

                return (
                  <div
                    key={tx.id}
                    className="p-4 rounded-2xl bg-slate-50 border border-gray-200/90 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs transition-all hover:bg-slate-100/70"
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-black text-slate-900 text-sm">
                          {mapGatewayName(tx.gateway_name)}
                        </span>
                        {getTransactionStatusBadge(tx.status)}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-500">
                        <span>
                          مبلغ:{" "}
                          <strong className="text-slate-900 font-black font-sans">
                            {formatPersianCurrency(tx.amount)}
                          </strong>
                        </span>
                        <span>
                          کد پیگیری / ارجاع:{" "}
                          <strong className="text-slate-900 font-sans">
                            {toPersianDigits(tx.authority || tx.ref_id || "-")}
                          </strong>
                        </span>
                        <span>
                          زمان:{" "}
                          <span className="text-slate-700 font-sans">
                            {formatPersianDate(tx.created_at)}
                          </span>
                        </span>
                      </div>
                    </div>

                    {/* Actions and Receipt View */}
                    <div className="flex flex-wrap items-center gap-2.5 shrink-0 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-200/80">
                      {/* Receipt Image Button / Viewer */}
                      {tx.receipt_url && (
                        <div className="flex items-center gap-2">
                          <div className="w-10 h-10 rounded-xl border border-gray-200 overflow-hidden bg-white shadow-xs shrink-0 flex items-center justify-center">
                            <img
                              src={fullReceiptUrl}
                              alt="تصویر فیش"
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                              }}
                            />
                          </div>

                          <a
                            href={fullReceiptUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs shadow-xs transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>مشاهده تصویر فیش</span>
                            <ExternalLink className="w-3 h-3 mr-0.5 opacity-80" />
                          </a>
                        </div>
                      )}

                      {/* Admin Actions for Pending Bank Receipts */}
                      {tx.status === "PENDING" && (tx.gateway_name === "bank_receipt" || tx.receipt_url) && (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={updatingTxId === tx.id}
                            onClick={() => handleUpdateStatus("PAID", tx.id, "SUCCESS")}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs shadow-xs transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                          >
                            {updatingTxId === tx.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            )}
                            <span>تایید فیش</span>
                          </button>
                          <button
                            type="button"
                            disabled={updatingTxId === tx.id}
                            onClick={() => handleUpdateStatus("PENDING", tx.id, "FAILED")}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-rose-300 text-rose-700 hover:bg-rose-50 disabled:opacity-50 font-bold text-xs shadow-xs transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                          >
                            {updatingTxId === tx.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <X className="w-3.5 h-3.5" />
                            )}
                            <span>رد فیش</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 4. Items Breakdown Table */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
            <Package className="w-4 h-4 text-amber-600" />
            <span>اقلام و پکیج‌های ثبت شده</span>
          </div>

          <div className="border border-gray-200 rounded-2xl overflow-hidden">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-gray-200">
                <tr>
                  <th className="py-2.5 px-4">شرح محصول / قطعه</th>
                  <th className="py-2.5 px-4 text-center">تعداد</th>
                  <th className="py-2.5 px-4">قیمت واحد</th>
                  <th className="py-2.5 px-4 text-left">مجموع</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {order.items && order.items.length > 0 ? (
                  order.items.map((it, idx) => {
                    const title =
                      it.product?.title ||
                      `قطعه آسانسور (${it.product_id?.slice(0, 8) || "سفارش قطعه"})`;
                    const qty = it.quantity || 1;
                    const unitPrice = it.unit_price_at_purchase || 0;
                    const rowTotal = unitPrice * qty;

                    return (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="py-3 px-4 text-slate-800">
                          <span className="font-bold block">{title}</span>
                          {it.product?.sku && (
                            <span className="text-[10px] text-slate-400 font-sans">
                              SKU: {it.product.sku}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-slate-900 font-sans">
                          {toPersianDigits(qty)}
                        </td>
                        <td className="py-3 px-4 text-slate-600 font-sans">
                          {unitPrice > 0 ? formatPersianCurrency(unitPrice) : "استعلامی"}
                        </td>
                        <td className="py-3 px-4 text-left font-bold text-slate-900 font-sans">
                          {rowTotal > 0 ? formatPersianCurrency(rowTotal) : "استعلامی"}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-slate-400">
                      پکیج استاندارد آسانسور و متعلقات نصب
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 5. Transactions & Total Card */}
        <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs text-white/70 block">مبلغ کل قابل پرداخت سفارش:</span>
            <span className="text-xl sm:text-2xl font-black text-amber-400 font-sans mt-0.5 block">
              {formatPersianCurrency(order.total_price)}
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-colors cursor-pointer text-center"
            >
              بستن پنجره
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
