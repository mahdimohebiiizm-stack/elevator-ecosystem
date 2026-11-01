"use client";

import React, { useState, useRef, useMemo } from "react";
import Link from "next/link";
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
  X,
  Search,
  Layers,
  ShieldCheck,
  Building2,
  Hash,
  Phone,
} from "lucide-react";
import { formatToToman, formatPersianCurrency, toPersianDigits, cn } from "@/lib/utils";
import { uploadBankReceipt } from "@/lib/api";
import { toast } from "sonner";
import {
  OrderAccordion,
  OrderStatus,
  OrderItemRecord,
  getStatusBadge,
} from "@/components/orders/OrderAccordion";
import { InvoicePrint, InvoiceData } from "@/components/orders/InvoicePrint";

const initialOrders: OrderItemRecord[] = [
  {
    id: "ord-1",
    trackingCode: "ELV-10293",
    date: "۱۴۰۳/۰۸/۰۴ - ساعت ۱۴:۳۰",
    totalPrice: 480_000_000, // 48,000,000 Toman
    status: "AWAITING_PAYMENT",
    items: [
      "تابلو فرمان آرمان فراز درایو یاسکاوا ۳VF (کنترل هوشمند)",
      "سیم بکسل گوستاولف آلمان نمره ۱۰ مغز کنفی (۱۰۰ متر)",
    ],
    typeLabel: "استعلام سبد قطعات تخصصی",
  },
  {
    id: "ord-2",
    trackingCode: "ELV-10290",
    date: "۱۴۰۳/۰۸/۰۳ - ساعت ۱۰:۱۵",
    totalPrice: null,
    status: "PENDING_QUOTE",
    items: [
      "پکیج کامل آسانسور ۶ نفره روملس (MRL) گیرلس زیلابگ - پروژه برج سپهر کرمان",
    ],
    typeLabel: "استعلام پکیج مهندسی B2B",
  },
  {
    id: "ord-3",
    trackingCode: "ELV-10285",
    date: "۱۴۰۳/۰۸/۰۱ - ساعت ۱۶:۴۵",
    totalPrice: 145_000_000, // 14,500,000 Toman
    status: "RECEIPT_REVIEW",
    items: ["درب تمام اتوماتیک تلسکوپی طبقات یاران سایز ۸۰ سانت"],
    typeLabel: "استعلام قطعات مصرفی",
  },
  {
    id: "ord-4",
    trackingCode: "ELV-10271",
    date: "۱۴۰۳/۰۷/۲۸ - ساعت ۰۹:۲۰",
    totalPrice: 125_000_000, // 12,500,000 Toman
    status: "PROCESSING",
    items: [
      "روغن تخصصی گیربکس و ریل آسانسور بهران (گالن ۲۰ لیتری) × ۵",
      "کفشک راهنمای ریل آسانسور سایز T9",
    ],
    typeLabel: "خرید مستقیم قطعات",
  },
  {
    id: "ord-5",
    trackingCode: "ELV-10260",
    date: "۱۴۰۳/۰۷/۲۰ - ساعت ۱۱:۰۰",
    totalPrice: 380_000_000, // 38,000,000 Toman
    status: "SHIPPED",
    items: ["سیم بکسل گوستاولف آلمان نمره ۱۰ مغز کنفی (۱۰۰ متر)"],
    typeLabel: "تحویل با تیپاکس به سیرجان",
  },
  {
    id: "ord-6",
    trackingCode: "ELV-10255",
    date: "۱۴۰۳/۰۷/۱۵ - ساعت ۱۴:۰۰",
    totalPrice: 210_000_000,
    status: "READY_FOR_PICKUP",
    items: ["موتور گیرلس امگا ۵.۵ کیلووات تک‌سرعته (آماده در انبار)"],
    typeLabel: "تحویل حضوری در کرمان",
  },
];

export default function OrdersDashboardPage() {
  const [orders, setOrders] = useState<OrderItemRecord[]>(initialOrders);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | OrderStatus>("ALL");

  // Receipt Modal State
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [receiptDate, setReceiptDate] = useState("۱۴۰۳/۰۸/۰۴");
  const [receiptTracking, setReceiptTracking] = useState("");
  const [receiptAmount, setReceiptAmount] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [isSubmittingReceipt, setIsSubmittingReceipt] = useState(false);
  const [copiedBankInfo, setCopiedBankInfo] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Invoice Modal State
  const [selectedInvoiceOrder, setSelectedInvoiceOrder] = useState<OrderItemRecord | null>(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);

  const currentInvoiceData = useMemo<InvoiceData | null>(() => {
    if (!selectedInvoiceOrder) return null;
    const items = selectedInvoiceOrder.items.map((item, idx) => {
      const price = selectedInvoiceOrder.totalPrice
        ? Math.round(selectedInvoiceOrder.totalPrice / selectedInvoiceOrder.items.length)
        : 0;
      return {
        id: String(idx + 1),
        name: item,
        quantity: 1,
        unit: "مورد / پکیج",
        unitPrice: price,
        totalPrice: price,
      };
    });

    const total = selectedInvoiceOrder.totalPrice || 0;
    return {
      orderId: selectedInvoiceOrder.trackingCode,
      trackingCode: selectedInvoiceOrder.trackingCode,
      date: selectedInvoiceOrder.date,
      status: selectedInvoiceOrder.status,
      statusLabel: getStatusBadge(selectedInvoiceOrder.status).label,
      paymentMethod:
        selectedInvoiceOrder.status === "AWAITING_PAYMENT"
          ? "در انتظار پرداخت (آنلاین / کارت به کارت)"
          : "حواله مستقیم بانکی",
      customerName: "مشتری محترم شرکت آسانرو اطمینان امیر",
      customerPhone: "۰۹۱۳۳۹۸۲۶۹۵",
      customerAddress: "کرمان، بلوار جمهوری اسلامی - تحویل انبار مرکزی یا ارسال باربری",
      items,
      subtotal: total,
      tax: 0,
      total: total,
    };
  }, [selectedInvoiceOrder]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedBankInfo(label);
    setTimeout(() => setCopiedBankInfo(null), 2000);
  };

  const openReceiptModal = (orderId: string) => {
    const order = orders.find((o) => o.id === orderId);
    setSelectedOrderId(orderId);
    setReceiptFile(null);
    if (order && order.totalPrice) {
      setReceiptAmount(formatToToman(order.totalPrice));
    }
    setIsReceiptModalOpen(true);
  };

  const handleReceiptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderId) return;

    if (!receiptFile) {
      toast.error("تصویر فیش الزامی است", {
        description: "لطفاً فایل تصویر فیش واریزی بانکی (JPG یا PNG) را انتخاب نمایید.",
      });
      return;
    }

    setIsSubmittingReceipt(true);
    try {
      const formData = new FormData();
      formData.append("file", receiptFile);
      formData.append("tracking_code", receiptTracking);
      formData.append("date", receiptDate);
      formData.append("amount", receiptAmount);

      const res = await uploadBankReceipt(selectedOrderId, formData);
      if (res.status === 200 || res.status === 201) {
        toast.success("فیش واریزی با موفقیت ثبت شد", {
          description: "سند مالی جهت بررسی در اختیار دپارتمان مالی آسانرو قرار گرفت.",
        });
        setSuccessToast("فیش واریزی با موفقیت ثبت شد و جهت بررسی در اختیار دپارتمان مالی قرار گرفت.");
        setTimeout(() => setSuccessToast(null), 5000);
        // Update order state to RECEIPT_REVIEW
        setOrders((prev) =>
          prev.map((o) =>
            o.id === selectedOrderId ? { ...o, status: "RECEIPT_REVIEW" } : o
          )
        );
        setIsReceiptModalOpen(false);
        setReceiptFile(null);
      }
    } catch (error: any) {
      console.error("Receipt upload failed:", error);
      toast.error("خطا در ارسال فیش بانکی به سرور", {
        description:
          error?.response?.data?.detail ||
          error?.response?.data?.message ||
          "خطای ارتباط با سرور: سرویس دریافت فیش بانکی با خطا مواجه شد.",
      });
    } finally {
      setIsSubmittingReceipt(false);
    }
  };

  const handleOnlinePayment = (order: OrderItemRecord) => {
    alert(
      `در حال اتصال به درگاه امن زرین‌پال برای سفارش ${order.trackingCode} به مبلغ ${
        order.totalPrice ? formatToToman(order.totalPrice) : ""
      }...`
    );
  };

  // Filter orders
  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.trackingCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.items.some((item) =>
        item.toLowerCase().includes(searchQuery.toLowerCase())
      );
    const matchesStatus =
      statusFilter === "ALL" || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="w-full space-y-6" dir="rtl">
      {/* 1. Top Header Bar: Light Card Matching Wallet Page */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-[0_2px_15px_rgba(0,0,0,0.03)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600 mb-0.5">
              <ShieldCheck className="w-4 h-4 text-amber-600" />
              <span>سامانه رسمی استعلام و رهگیری قراردادها</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
              سفارش‌ها و پیش‌فاکتورها
            </h1>
            <p className="text-xs sm:text-sm text-gray-400 font-medium mt-0.5">
              مشاهده وضعیت پروژه‌ها، صدور پیش‌فاکتور رسمی، پرداخت آنلاین و ارسال فیش بانکی
            </p>
          </div>
        </div>

        <Link
          href="/dashboard/contracts/request"
          className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs shadow-md shadow-amber-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] shrink-0"
        >
          <Layers className="w-4 h-4" />
          <span>ثبت استعلام جدید</span>
        </Link>
      </div>

      {/* Success Notification Alert */}
      {successToast && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center justify-between gap-3 shadow-sm animate-fadeIn">
          <div className="flex items-center gap-2.5 text-xs sm:text-sm font-bold">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{successToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessToast(null)}
            className="text-emerald-700 hover:text-emerald-900 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. Filter & Search Bar: Clean Light Container */}
      <div className="bg-white rounded-3xl border border-gray-100 p-4 shadow-[0_2px_15px_rgba(0,0,0,0.03)] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="جستجو با شماره رهگیری (مثلاً ELV-10293) یا نام کالا..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-50/80 border border-gray-200 rounded-xl pr-10 pl-4 py-2.5 text-xs font-bold text-gray-800 placeholder-gray-400 focus:outline-none focus:border-amber-500 focus:bg-white transition-colors"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 hide-scrollbar">
          <button
            type="button"
            onClick={() => setStatusFilter("ALL")}
            className={`px-3.5 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all ${
              statusFilter === "ALL"
                ? "bg-amber-500 text-slate-950 shadow-sm"
                : "bg-gray-50 text-gray-500 hover:text-gray-800 hover:bg-gray-100/80 border border-gray-200/80"
            }`}
          >
            همه ({toPersianDigits(orders.length)})
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter("AWAITING_PAYMENT")}
            className={`px-3.5 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all ${
              statusFilter === "AWAITING_PAYMENT"
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-gray-50 text-gray-500 hover:text-gray-800 hover:bg-gray-100/80 border border-gray-200/80"
            }`}
          >
            در انتظار پرداخت (
            {toPersianDigits(
              orders.filter((o) => o.status === "AWAITING_PAYMENT").length
            )}
            )
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter("PENDING_QUOTE")}
            className={`px-3.5 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all ${
              statusFilter === "PENDING_QUOTE"
                ? "bg-amber-500 text-slate-950 shadow-sm"
                : "bg-gray-50 text-gray-500 hover:text-gray-800 hover:bg-gray-100/80 border border-gray-200/80"
            }`}
          >
            در انتظار پیش‌فاکتور (
            {toPersianDigits(
              orders.filter((o) => o.status === "PENDING_QUOTE").length
            )}
            )
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter("RECEIPT_REVIEW")}
            className={`px-3.5 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all ${
              statusFilter === "RECEIPT_REVIEW"
                ? "bg-purple-600 text-white shadow-sm"
                : "bg-gray-50 text-gray-500 hover:text-gray-800 hover:bg-gray-100/80 border border-gray-200/80"
            }`}
          >
            بررسی فیش (
            {toPersianDigits(
              orders.filter((o) => o.status === "RECEIPT_REVIEW").length
            )}
            )
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter("PROCESSING")}
            className={`px-3.5 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all ${
              statusFilter === "PROCESSING"
                ? "bg-emerald-600 text-white shadow-sm"
                : "bg-gray-50 text-gray-500 hover:text-gray-800 hover:bg-gray-100/80 border border-gray-200/80"
            }`}
          >
            پردازش انبار (
            {toPersianDigits(
              orders.filter((o) => o.status === "PROCESSING").length
            )}
            )
          </button>
        </div>
      </div>

      {/* 3. Orders Accordion List & Delivery Details */}
      <OrderAccordion
        orders={filteredOrders}
        onOpenReceiptModal={openReceiptModal}
        onOnlinePayment={handleOnlinePayment}
        onPrintInvoice={(order) => {
          setSelectedInvoiceOrder(order);
          setIsInvoiceModalOpen(true);
        }}
      />

      {/* Invoice Print Modal */}
      <InvoicePrint
        isOpen={isInvoiceModalOpen}
        onClose={() => {
          setIsInvoiceModalOpen(false);
          setSelectedInvoiceOrder(null);
        }}
        invoice={currentInvoiceData}
      />

      {/* ============================================================== */}
      {/* RECEIPT UPLOAD MODAL (Light Theme Matching Wallet Modal)      */}
      {/* ============================================================== */}
      {isReceiptModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setIsReceiptModalOpen(false)}
        >
          {/* Modal Container */}
          <div
            className="w-full max-w-lg bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-gray-100 z-10 space-y-5 text-gray-900 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            dir="rtl"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                  <Upload className="w-5 h-5 text-amber-700" />
                </div>
                <div>
                  <h3 className="text-base font-black text-gray-900">
                    ثبت فیش واریزی (کارت به کارت / پایا)
                  </h3>
                  <span className="text-xs text-gray-400 font-medium">
                    تاییدیه رسمی دپارتمان مالی شرکت آسانرو
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsReceiptModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-800 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Company Bank Details Card (Soft Amber Tint) */}
            <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-4 sm:p-5 space-y-3 text-slate-700">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                <Building2 className="w-4 h-4 text-amber-700" />
                <span>اطلاعات حساب رسمی شرکت آسانرو اطمینان امیر کرمان</span>
              </div>

              {/* Card Number */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-amber-200/60 shadow-xs">
                <div className="text-right">
                  <span className="text-[11px] text-gray-400 block font-medium">شماره کارت بانک ملت:</span>
                  <span className="font-mono font-black text-sm text-gray-900 tracking-widest" dir="ltr">
                    6104-3378-9012-3456
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard("6104337890123456", "card")}
                  className="px-2.5 py-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-xs text-amber-900 font-bold transition-colors flex items-center gap-1"
                >
                  {copiedBankInfo === "card" ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copiedBankInfo === "card" ? "کپی شد" : "کپی"}</span>
                </button>
              </div>

              {/* IBAN (Sheba) */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-amber-200/60 shadow-xs">
                <div className="text-right">
                  <span className="text-[11px] text-gray-400 block font-medium">شماره شبا (IBAN):</span>
                  <span className="font-mono font-black text-xs text-gray-900 tracking-wider" dir="ltr">
                    IR12 0120 0000 0000 1234 5678 90
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard("IR120120000000001234567890", "sheba")}
                  className="px-2.5 py-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-xs text-amber-900 font-bold transition-colors flex items-center gap-1"
                >
                  {copiedBankInfo === "sheba" ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copiedBankInfo === "sheba" ? "کپی شد" : "کپی"}</span>
                </button>
              </div>
            </div>

            {/* Receipt Form */}
            <form onSubmit={handleReceiptSubmit} className="space-y-4">
              {/* Receipt Image Upload Zone */}
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-2">
                  بارگذاری تصویر فیش واریزی (عکس یا اسکرین‌شات) *
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setReceiptFile(e.target.files[0]);
                    }
                  }}
                />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    "w-full border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors group",
                    receiptFile
                      ? "border-emerald-500 bg-emerald-50/40"
                      : "border-gray-300 hover:border-amber-500 bg-gray-50/60"
                  )}
                >
                  {receiptFile ? (
                    <div className="flex flex-col items-center space-y-1.5">
                      <CheckCircle2 className="w-8 h-8 text-emerald-600 mb-1" />
                      <span className="text-xs font-bold text-emerald-900">
                        فایل انتخاب شد: {receiptFile.name}
                      </span>
                      <span className="text-[11px] text-emerald-700 font-sans">
                        حجم: {toPersianDigits((receiptFile.size / 1024).toFixed(0))} کیلوبایت
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setReceiptFile(null);
                          if (fileInputRef.current) fileInputRef.current.value = "";
                        }}
                        className="text-[11px] text-rose-600 font-bold hover:underline mt-1"
                      >
                        حذف و انتخاب فایل دیگر
                      </button>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-gray-400 group-hover:text-amber-600 transition-colors mb-2" />
                      <span className="text-xs font-bold text-gray-700 group-hover:text-amber-700">
                        برای انتخاب یا رها کردن تصویر فیش اینجا کلیک کنید
                      </span>
                      <span className="text-[11px] text-gray-400 mt-1">
                        فرمت‌های مجاز: JPG, PNG حداکثر ۵ مگابایت
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Grid: Date & Tracking Number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1.5">
                    تاریخ واریز *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: ۱۴۰۳/۰۸/۰۴"
                    value={receiptDate}
                    onChange={(e) => setReceiptDate(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-xl p-3 text-xs font-bold text-gray-800 placeholder-gray-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all font-sans"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1.5">
                    شماره پیگیری / ارجاع فیش *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: ۹۸۲۳۰۴۸۲"
                    value={receiptTracking}
                    onChange={(e) => setReceiptTracking(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-xl p-3 text-xs font-bold text-gray-800 placeholder-gray-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all text-left font-sans"
                    dir="ltr"
                  />
                </div>
              </div>

              {/* Amount */}
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1.5">
                  مبلغ واریز شده (تومان) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="مبلغ مندرج روی فیش"
                  value={receiptAmount}
                  onChange={(e) => setReceiptAmount(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-xl p-3 text-xs font-sans font-bold text-gray-800 placeholder-gray-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
                />
              </div>

              {/* Submit Button */}
              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsReceiptModalOpen(false)}
                  className="py-2.5 px-4 rounded-xl border border-gray-200 text-gray-600 font-bold text-xs hover:bg-gray-50 transition-colors"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReceipt}
                  className="py-3 px-6 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-black text-xs transition-all shadow-sm shadow-amber-500/20 active:scale-95 flex items-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4 text-slate-950" />
                  <span>{isSubmittingReceipt ? "در حال ارسال به سرور..." : "ارسال جهت تایید حسابداری"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
