"use client";

import React, { useState, useMemo } from "react";
import {
  Package,
  Clock,
  CreditCard,
  Upload,
  CheckCircle2,
  Truck,
  AlertCircle,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Printer,
  MapPin,
  Building2,
  Phone,
  FileText,
  Search,
  Layers,
} from "lucide-react";
import { formatPersianCurrency, toPersianDigits, cn } from "@/lib/utils";
import { toast } from "sonner";

export type OrderStatus =
  | "PENDING_QUOTE"
  | "PENDING_QUOTATION"
  | "AWAITING_PAYMENT"
  | "PAYMENT_VERIFICATION"
  | "RECEIPT_REVIEW"
  | "PROCESSING"
  | "READY_FOR_PICKUP"
  | "SHIPPED";

export interface OrderItemRecord {
  id: string;
  trackingCode: string;
  date: string;
  totalPrice: number | null; // In Iranian Rials (or null if quote pending)
  status: OrderStatus;
  items: string[];
  typeLabel: string;
}

export function getStatusBadge(status: OrderStatus) {
  switch (status) {
    case "PENDING_QUOTE":
    case "PENDING_QUOTATION":
      return {
        label: "در انتظار بررسی و پیش‌فاکتور",
        className: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30",
        icon: <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />,
        step: 1,
      };
    case "AWAITING_PAYMENT":
      return {
        label: "پیش‌فاکتور صادر شد - منتظر پرداخت",
        className: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30 animate-pulse",
        icon: <CreditCard className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />,
        step: 2,
      };
    case "RECEIPT_REVIEW":
    case "PAYMENT_VERIFICATION":
      return {
        label: "فیش ثبت شد - در انتظار تایید حسابداری",
        className: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/30",
        icon: <Clock className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />,
        step: 2.5,
      };
    case "PROCESSING":
      return {
        label: "تایید پرداخت - در حال آماده‌سازی انبار",
        className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
        icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />,
        step: 3,
      };
    case "READY_FOR_PICKUP":
      return {
        label: "آماده تحویل حضوری در کرمان",
        className: "bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-500/30",
        icon: <Building2 className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />,
        step: 4,
      };
    case "SHIPPED":
      return {
        label: "ارسال شده (تحویل تیپاکس/باربری)",
        className: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-500/30",
        icon: <Truck className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />,
        step: 4,
      };
  }
}

interface OrderAccordionProps {
  orders: OrderItemRecord[];
  onOpenReceiptModal: (orderId: string) => void;
  onOnlinePayment: (order: OrderItemRecord) => void;
  onPrintInvoice: (order: OrderItemRecord) => void;
}

export const OrderAccordion: React.FC<OrderAccordionProps> = ({
  orders,
  onOpenReceiptModal,
  onOnlinePayment,
  onPrintInvoice,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(
    orders.length > 0 ? orders[0].id : null
  );
  const [activeDeliveryViewId, setActiveDeliveryViewId] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const handleDeliveryInfoClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (expandedId !== id) {
      setExpandedId(id);
    }
    setActiveDeliveryViewId(id);
    toast.info("اطلاعات تحویل و لجستیک نمایش داده شد", {
      description: "برای هماهنگی تحویل می‌توانید با واحد پشتیبانی تماس بگیرید.",
    });
  };

  const handleCopyTrackingCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success("کد رهگیری کپی شد", {
      description: code,
    });
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const filteredOrders = useMemo(() => {
    if (!searchQuery.trim()) return orders;
    const q = searchQuery.toLowerCase().trim();
    return orders.filter(
      (order) =>
        order.trackingCode.toLowerCase().includes(q) ||
        order.id.toLowerCase().includes(q) ||
        order.typeLabel.toLowerCase().includes(q) ||
        order.items.some((item) => item.toLowerCase().includes(q))
    );
  }, [orders, searchQuery]);

  return (
    <div className="space-y-5 font-sans" dir="rtl">
      {/* Search Bar for Orders */}
      <div className="bg-card rounded-2xl p-4 border border-border shadow-xs flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="جستجو در شناسه سفارش، کد رهگیری یا نام قطعه..."
            className="w-full pl-4 pr-10 py-2.5 rounded-xl bg-muted/50 border border-border text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-all font-sans"
          />
        </div>

        <div className="text-xs text-muted-foreground font-medium hidden sm:block">
          تعداد سفارش‌ها: <strong className="text-foreground">{toPersianDigits(filteredOrders.length)}</strong>
        </div>
      </div>

      {/* Empty State */}
      {filteredOrders.length === 0 ? (
        <div className="bg-card rounded-3xl p-12 text-center border border-border shadow-xs space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-muted text-muted-foreground flex items-center justify-center mx-auto">
            <Package className="w-8 h-8 opacity-60" />
          </div>
          <h3 className="text-base font-black text-foreground">سفارشی یافت نشد</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            {searchQuery.trim()
              ? `عبارت "${searchQuery}" در سوابق سفارش‌های شما پیدا نشد.`
              : "هنوز سفارشی در سامانه آسانرو ثبت نکرده‌اید."}
          </p>
        </div>
      ) : (
        /* Accordion List */
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const isExpanded = expandedId === order.id;
            const badge = getStatusBadge(order.status);
            const isAwaitingPayment = order.status === "AWAITING_PAYMENT";

            return (
              <div
                key={order.id}
                className={cn(
                  "bg-card rounded-3xl border transition-all duration-200 overflow-hidden shadow-xs",
                  isExpanded
                    ? "border-accent/60 ring-2 ring-accent/20 shadow-md"
                    : "border-border hover:border-border/80"
                )}
              >
                {/* ============================================================== */}
                {/* Summary Row: Order ID, Status, Date, Total, Action Buttons     */}
                {/* ============================================================== */}
                <div
                  onClick={() => toggleExpand(order.id)}
                  className="p-5 sm:p-6 cursor-pointer flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 select-none hover:bg-muted/30 transition-colors"
                >
                  {/* Left Column: Order ID & Status */}
                  <div className="flex items-center gap-3.5 flex-1 min-w-0">
                    <div
                      className={cn(
                        "w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-transform",
                        isExpanded
                          ? "bg-accent text-accent-foreground shadow-sm"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      <Package className="w-5 h-5" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono font-black text-sm text-foreground">
                          {order.trackingCode}
                        </span>
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border",
                            badge.className
                          )}
                        >
                          {badge.icon}
                          <span>{badge.label}</span>
                        </span>
                      </div>

                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        {order.typeLabel} &bull; <span className="font-sans">{order.date}</span>
                      </p>
                    </div>
                  </div>

                  {/* Right Column: Total Price & 3 Action Buttons */}
                  <div className="flex flex-wrap items-center justify-between lg:justify-end gap-3 w-full lg:w-auto pt-3 lg:pt-0 border-t lg:border-t-0 border-border">
                    <div className="text-right lg:text-left min-w-[120px]">
                      <span className="text-[11px] text-muted-foreground block font-medium">
                        مبلغ کل سفارش:
                      </span>
                      {order.totalPrice !== null ? (
                        <span className="text-sm sm:text-base font-black text-foreground font-sans">
                          {formatPersianCurrency(order.totalPrice)}
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-accent-foreground bg-accent/20 px-2 py-0.5 rounded-md border border-accent/30">
                          در حال محاسبه
                        </span>
                      )}
                    </div>

                    {/* Action Buttons: Semantic Styling */}
                    <div
                      className="flex items-center gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* 1. اطلاعات تحویل */}
                      <button
                        type="button"
                        onClick={(e) => handleDeliveryInfoClick(order.id, e)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-muted hover:bg-muted/80 text-foreground font-bold text-xs transition-colors border border-border cursor-pointer"
                        title="مشاهده اطلاعات تحویل"
                      >
                        <Truck className="w-3.5 h-3.5 text-accent" />
                        <span className="hidden sm:inline">اطلاعات تحویل</span>
                      </button>

                      {/* 2. چاپ فاکتور */}
                      <button
                        type="button"
                        onClick={() => onPrintInvoice(order)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs transition-colors shadow-xs cursor-pointer"
                        title="چاپ فاکتور رسمی"
                      >
                        <Printer className="w-3.5 h-3.5 text-accent" />
                        <span>چاپ فاکتور</span>
                      </button>

                      {/* 3. جزئیات سفارش (Accordion Toggle) */}
                      <button
                        type="button"
                        onClick={() => toggleExpand(order.id)}
                        className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-accent hover:bg-accent/90 text-accent-foreground font-bold text-xs transition-colors shadow-xs cursor-pointer"
                      >
                        <span>{isExpanded ? "بستن جزئیات" : "جزئیات سفارش"}</span>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* ============================================================== */}
                {/* Expanded Details Body                                          */}
                {/* ============================================================== */}
                {isExpanded && (
                  <div className="border-t border-border bg-card p-5 sm:p-7 space-y-6 animate-in slide-in-from-top-2">
                    {/* 1. Progress State Machine Bar */}
                    <div className="bg-muted/30 border border-border rounded-2xl p-4 sm:p-5">
                      <div className="flex items-center justify-between text-xs font-bold text-muted-foreground mb-3">
                        <span>مراحل اجرای سفارش و استعلام:</span>
                        <span className="text-[11px] font-sans">
                          شناسه سیستمی: {order.id}
                        </span>
                      </div>

                      <div className="relative flex items-center justify-between">
                        <div className="absolute top-1/2 left-4 right-4 -translate-y-1/2 h-1 bg-muted z-0" />
                        <div
                          className="absolute top-1/2 right-4 -translate-y-1/2 h-1 bg-accent transition-all duration-500 z-0"
                          style={{
                            width:
                              badge.step === 1
                                ? "15%"
                                : badge.step === 2
                                ? "45%"
                                : badge.step === 2.5
                                ? "60%"
                                : badge.step === 3
                                ? "80%"
                                : "95%",
                          }}
                        />

                        {/* Step 1 */}
                        <div className="relative z-10 flex flex-col items-center">
                          <div
                            className={cn(
                              "w-7 h-7 sm:w-8 sm:h-8 rounded-full font-black flex items-center justify-center text-xs shadow-xs",
                              badge.step >= 1
                                ? "bg-accent text-accent-foreground"
                                : "bg-muted text-muted-foreground"
                            )}
                          >
                            <Check className="w-4 h-4" />
                          </div>
                          <span className="text-[10px] sm:text-[11px] mt-1.5 font-bold text-foreground">
                            ثبت اولیه
                          </span>
                        </div>

                        {/* Step 2 */}
                        <div className="relative z-10 flex flex-col items-center">
                          <div
                            className={cn(
                              "w-7 h-7 sm:w-8 sm:h-8 rounded-full font-black flex items-center justify-center text-xs shadow-xs",
                              badge.step >= 2
                                ? "bg-accent text-accent-foreground"
                                : "bg-muted text-muted-foreground"
                            )}
                          >
                            {badge.step >= 2 ? <Check className="w-4 h-4" /> : "۲"}
                          </div>
                          <span className="text-[10px] sm:text-[11px] mt-1.5 font-bold text-foreground">
                            پیش‌فاکتور
                          </span>
                        </div>

                        {/* Step 3 */}
                        <div className="relative z-10 flex flex-col items-center">
                          <div
                            className={cn(
                              "w-7 h-7 sm:w-8 sm:h-8 rounded-full font-black flex items-center justify-center text-xs shadow-xs",
                              badge.step >= 3
                                ? "bg-accent text-accent-foreground"
                                : badge.step === 2.5
                                ? "bg-purple-600 text-white animate-pulse"
                                : "bg-muted text-muted-foreground"
                            )}
                          >
                            {badge.step >= 3 ? <Check className="w-4 h-4" /> : "۳"}
                          </div>
                          <span className="text-[10px] sm:text-[11px] mt-1.5 font-bold text-foreground">
                            تایید مالی
                          </span>
                        </div>

                        {/* Step 4 */}
                        <div className="relative z-10 flex flex-col items-center">
                          <div
                            className={cn(
                              "w-7 h-7 sm:w-8 sm:h-8 rounded-full font-black flex items-center justify-center text-xs shadow-xs",
                              badge.step === 4
                                ? "bg-cyan-600 text-white"
                                : badge.step === 3
                                ? "bg-emerald-600 text-white animate-pulse"
                                : "bg-muted text-muted-foreground"
                            )}
                          >
                            {badge.step === 4 ? <Check className="w-4 h-4" /> : "۴"}
                          </div>
                          <span className="text-[10px] sm:text-[11px] mt-1.5 font-bold text-foreground">
                            تحویل و ارسال
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 2. Items List */}
                    <div className="bg-muted/20 border border-border rounded-2xl p-4 sm:p-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground">
                          اقلام و قطعات مندرج در سفارش:
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyTrackingCode(order.trackingCode)}
                          className="inline-flex items-center gap-1.5 text-xs text-accent-foreground bg-accent/20 hover:bg-accent/30 font-bold px-2.5 py-1 rounded-lg border border-accent/30 cursor-pointer"
                        >
                          {copiedCode === order.trackingCode ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span>کپی شد</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>کپی کد پیگیری</span>
                            </>
                          )}
                        </button>
                      </div>

                      <div className="space-y-2">
                        {order.items.map((item, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-2 text-xs sm:text-sm text-foreground font-medium bg-card p-3 rounded-xl border border-border"
                          >
                            <span className="w-2 h-2 rounded-full bg-accent shrink-0" />
                            <span>{item}</span>
                          </div>
                        ))}
                      </div>

                      <div className="pt-3 border-t border-border flex items-center justify-between">
                        <span className="text-xs sm:text-sm font-bold text-muted-foreground">
                          مبلغ نهایی پیش‌فاکتور رسمی:
                        </span>
                        {order.totalPrice !== null ? (
                          <span className="text-base sm:text-lg font-black text-foreground font-sans">
                            {formatPersianCurrency(order.totalPrice)}
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-accent-foreground bg-accent/20 px-3 py-1 rounded-xl">
                            در حال کارشناسی فنی
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 3. Delivery Info Box */}
                    <div
                      className={cn(
                        "rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs border transition-all",
                        activeDeliveryViewId === order.id
                          ? "bg-accent/10 border-accent/40 ring-1 ring-accent/30"
                          : "bg-blue-500/10 border-blue-500/20"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                          <Truck className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-black text-foreground">
                            اطلاعات تحویل و لجستیک کالا:
                          </p>
                          <p className="text-muted-foreground mt-0.5">
                            {order.status === "READY_FOR_PICKUP"
                              ? "آماده تحویل در دفتر مرکزی کرمان (بلوار جمهوری اسلامی). جهت هماهنگی با انبار تماس حاصل فرمایید."
                              : order.status === "SHIPPED"
                              ? "بسته تحویل شرکت تیپاکس/باربری گردیده و کد مرسوله پستی پیامک خواهد شد."
                              : "پس از تایید واریز حسابداری، بسته‌بندی در انبار مرکزی آغاز و با باربری به آدرس پروژه ارسال خواهد شد."}
                          </p>
                        </div>
                      </div>

                      <a
                        href="tel:09133982695"
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs transition-colors shrink-0"
                      >
                        <Phone className="w-3.5 h-3.5 text-accent" />
                        <span>هماهنگی تحویل (۰۹۱۳۳۹۸۲۶۹۵)</span>
                      </a>
                    </div>

                    {/* 4. Payment Actions if AWAITING_PAYMENT */}
                    {isAwaitingPayment && (
                      <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 sm:p-5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-accent/20 text-accent flex items-center justify-center shrink-0">
                            <AlertCircle className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-black text-foreground text-sm">
                              پیش‌فاکتور تایید شده است؛ لطفاً نسبت به تسویه حساب اقدام فرمایید:
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5 font-medium">
                              امکان پرداخت برخط از درگاه بانکی یا واریز کارت‌به‌کارت/پایا و ارسال عکس فیش وجود دارد.
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5 w-full lg:w-auto shrink-0">
                          <button
                            type="button"
                            onClick={() => onOnlinePayment(order)}
                            className="flex-1 lg:flex-initial px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                          >
                            <CreditCard className="w-4 h-4 text-accent" />
                            <span>پرداخت آنلاین (زرین‌پال)</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => onOpenReceiptModal(order.id)}
                            className="flex-1 lg:flex-initial px-4 py-2.5 rounded-xl bg-accent hover:bg-accent/90 text-accent-foreground font-black text-xs transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                          >
                            <Upload className="w-4 h-4" />
                            <span>ثبت فیش واریزی</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Bottom Control Actions */}
                    <div className="pt-2 flex items-center justify-end gap-3 border-t border-border">
                      <button
                        type="button"
                        onClick={() => onPrintInvoice(order)}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs transition-colors shadow-xs cursor-pointer"
                      >
                        <Printer className="w-4 h-4 text-accent" />
                        <span>چاپ فاکتور رسمی فروش</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
