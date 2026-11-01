"use client";

import React, { useRef } from "react";
import {
  Printer,
  X,
  Building2,
  Phone,
  ShieldCheck,
  Calendar,
  Hash,
  User,
  MapPin,
  CheckCircle2,
  FileText,
} from "lucide-react";
import { toPersianDigits, formatPersianCurrency, cn } from "@/lib/utils";

export interface InvoiceItem {
  id?: string;
  name: string;
  quantity: number;
  unit?: string;
  unitPrice: number;
  totalPrice: number;
}

export interface InvoiceData {
  orderId: string;
  trackingCode: string;
  date: string;
  status: string;
  statusLabel?: string;
  paymentMethod?: string;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  items: InvoiceItem[];
  subtotal: number;
  tax?: number;
  discount?: number;
  total: number;
  notes?: string;
}

interface InvoicePrintProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: InvoiceData | null;
}

export const InvoicePrint: React.FC<InvoicePrintProps> = ({
  isOpen,
  onClose,
  invoice,
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !invoice) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      {/* Global Print Styles injected for clean A4 printing */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #invoice-print-container,
          #invoice-print-container * {
            visibility: visible;
          }
          #invoice-print-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            margin: 0 !important;
            padding: 15mm !important;
            background: #ffffff !important;
            color: #000000 !important;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Modal Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto no-print animate-in fade-in"
        onClick={onClose}
      >
        {/* Modal Outer Container */}
        <div
          className="relative w-full max-w-4xl bg-card rounded-3xl shadow-2xl border border-border overflow-hidden flex flex-col max-h-[92vh] my-auto text-card-foreground"
          onClick={(e) => e.stopPropagation()}
          dir="rtl"
        >
          {/* Top Control Bar (Hidden when printing) */}
          <div className="flex items-center justify-between px-6 py-4 bg-primary text-primary-foreground border-b border-border/20 no-print">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-accent/20 text-accent flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-primary-foreground">
                  پیش‌فاکتور / فاکتور فروش رسمی شرکت
                </h3>
                <span className="text-[11px] text-primary-foreground/70 font-medium">
                  کد رهگیری: {toPersianDigits(invoice.trackingCode)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-accent hover:bg-accent/90 text-accent-foreground font-black text-xs transition-all shadow-md active:scale-95 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>چاپ فاکتور رسمی (A4)</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-9 h-9 rounded-xl bg-primary-foreground/10 hover:bg-primary-foreground/20 text-primary-foreground flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Printable Invoice Paper Sheet */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-muted/30">
            <div
              id="invoice-print-container"
              ref={printRef}
              className="bg-white p-6 sm:p-10 rounded-2xl shadow-sm border border-slate-200 font-sans text-slate-900 space-y-6"
            >
              {/* Header: Company & Invoice Info */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b-2 border-slate-900">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-slate-900 text-amber-500 flex items-center justify-center font-black text-xl shadow-md border-2 border-amber-500">
                    AEE
                  </div>
                  <div>
                    <h1 className="text-lg sm:text-xl font-black text-slate-950">
                      شرکت آسانرو اطمینان امیر کرمان
                    </h1>
                    <p className="text-xs font-bold text-slate-600 mt-0.5">
                      طراحی، مونتاژ، فروش قطعات و پکیج‌های استاندارد انواع آسانسور و بالابر
                    </p>
                    <p className="text-[11px] text-slate-500 font-medium mt-1">
                      مدیریت فنی و فروش: مهندس محبی | ۰۹۱۳۳۹۸۲۶۹۵
                    </p>
                  </div>
                </div>

                <div className="sm:text-left text-right bg-slate-100/80 p-3 sm:p-4 rounded-xl border border-slate-200 self-stretch sm:self-auto min-w-[200px]">
                  <div className="text-xs font-black text-slate-800">
                    نوع سند: <span className="text-amber-600 font-bold">فاکتور رسمی فروش</span>
                  </div>
                  <div className="text-xs text-slate-600 mt-1">
                    شماره فاکتور: <span className="font-mono font-bold text-slate-900">{toPersianDigits(invoice.orderId)}</span>
                  </div>
                  <div className="text-xs text-slate-600 mt-1">
                    تاریخ صدور: <span className="font-bold text-slate-900">{invoice.date}</span>
                  </div>
                  <div className="text-xs text-slate-600 mt-1">
                    وضعیت: <span className="font-bold text-emerald-700">{invoice.statusLabel || "تایید شده"}</span>
                  </div>
                </div>
              </div>

              {/* Parties Details (Seller & Buyer Grid) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* Seller Box */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                  <div className="font-black text-slate-950 flex items-center gap-2 border-b border-slate-200 pb-2">
                    <Building2 className="w-4 h-4 text-amber-600" />
                    <span>مشخصات فروشنده (مجری پروژه)</span>
                  </div>
                  <div className="text-slate-700">
                    <strong>نام شخص حقوقی:</strong> آسانرو اطمینان امیر کرمان
                  </div>
                  <div className="text-slate-700">
                    <strong>نشانی:</strong> کرمان، بلوار جمهوری اسلامی، نبش کوچه شرکت آسانرو
                  </div>
                  <div className="text-slate-700">
                    <strong>تلفن پشتیبانی و سفارشات:</strong> ۰۹۱۳۳۹۸۲۶۹۵
                  </div>
                  <div className="text-slate-700">
                    <strong>کد اقتصادی / مجوز:</strong> دارای پروانه طراحی و مونتاژ از وزارت صمت
                  </div>
                </div>

                {/* Buyer Box */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                  <div className="font-black text-slate-950 flex items-center gap-2 border-b border-slate-200 pb-2">
                    <User className="w-4 h-4 text-blue-600" />
                    <span>مشخصات خریدار / کارفرما</span>
                  </div>
                  <div className="text-slate-700">
                    <strong>نام خریدار:</strong> {invoice.customerName || "مشتری محترم شرکت آسانرو"}
                  </div>
                  <div className="text-slate-700">
                    <strong>شماره تماس:</strong> {toPersianDigits(invoice.customerPhone || "ثبت شده در سامانه")}
                  </div>
                  <div className="text-slate-700">
                    <strong>نشانی تحویل کالا / پروژه:</strong> {invoice.customerAddress || "کرمان - تحویل حضوری در انبار مرکزی یا ارسال با باربری"}
                  </div>
                  <div className="text-slate-700">
                    <strong>روش پرداخت:</strong> {invoice.paymentMethod || "واریز مستقیم / حواله پایا به حساب رسمی شرکت"}
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="overflow-x-auto border border-slate-300 rounded-xl">
                <table className="w-full text-right border-collapse text-xs">
                  <thead className="bg-slate-900 text-white">
                    <tr>
                      <th className="p-3 text-center w-12 border-l border-slate-700">ردیف</th>
                      <th className="p-3 border-l border-slate-700">شرح کالا یا خدمات آسانسور</th>
                      <th className="p-3 text-center w-20 border-l border-slate-700">تعداد / مقدار</th>
                      <th className="p-3 text-center w-16 border-l border-slate-700">واحد</th>
                      <th className="p-3 text-left w-36 border-l border-slate-700">قیمت واحد (ریال)</th>
                      <th className="p-3 text-left w-40">مبلغ کل (ریال)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {invoice.items.length > 0 ? (
                      invoice.items.map((item, index) => (
                        <tr key={index} className="hover:bg-slate-50/80">
                          <td className="p-3 text-center font-bold text-slate-500 border-l border-slate-200">
                            {toPersianDigits(index + 1)}
                          </td>
                          <td className="p-3 font-bold text-slate-900 border-l border-slate-200">
                            {item.name}
                          </td>
                          <td className="p-3 text-center font-bold text-slate-800 border-l border-slate-200">
                            {toPersianDigits(item.quantity)}
                          </td>
                          <td className="p-3 text-center text-slate-600 border-l border-slate-200">
                            {item.unit || "عدد / ست"}
                          </td>
                          <td className="p-3 text-left font-mono font-bold text-slate-800 border-l border-slate-200">
                            {toPersianDigits(item.unitPrice.toLocaleString("en-US"))}
                          </td>
                          <td className="p-3 text-left font-mono font-black text-slate-950">
                            {toPersianDigits(item.totalPrice.toLocaleString("en-US"))}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-slate-400">
                          اطلاعات اقلام فاکتور یافت نشد.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Total Summary & Warranty */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-start justify-between gap-4 pt-2">
                <div className="flex-1 bg-amber-50/60 border border-amber-200/80 rounded-xl p-4 text-xs space-y-2 text-slate-800">
                  <div className="font-bold text-amber-900 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-amber-700" />
                    <span>شرایط گارانتی و استانداردهای تحویل:</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-slate-700">
                    کلیه قطعات و پکیج‌های تحویلی دارای تاییدیه استاندارد ملی ایران و ضمانت اصالت شرکت آسانرو اطمینان امیر کرمان می‌باشند. در صورت نیاز به نصب، راه‌اندازی و بازرسی ادواری استاندارد، با دفتر مرکزی تماس حاصل فرمایید.
                  </p>
                </div>

                <div className="w-full sm:w-80 bg-slate-100 rounded-xl p-4 border border-slate-200 text-xs space-y-2.5">
                  <div className="flex justify-between items-center text-slate-600">
                    <span>جمع کل اقلام:</span>
                    <span className="font-mono font-bold">
                      {toPersianDigits(invoice.subtotal.toLocaleString("en-US"))} ریال
                    </span>
                  </div>

                  {invoice.tax !== undefined && invoice.tax > 0 && (
                    <div className="flex justify-between items-center text-slate-600">
                      <span>مالیات و عوارض قانونی:</span>
                      <span className="font-mono font-bold">
                        {toPersianDigits(invoice.tax.toLocaleString("en-US"))} ریال
                      </span>
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-300 flex justify-between items-center text-slate-950">
                    <span className="font-black text-sm">مبلغ قابل پرداخت (تومان):</span>
                    <span className="font-black text-base text-amber-600 font-sans">
                      {formatPersianCurrency(invoice.total)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Signature and Stamp Zone */}
              <div className="pt-8 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-600 gap-6">
                <div className="text-center sm:text-right">
                  <p className="font-bold text-slate-800">امضاء و تایید خریدار / کارفرما</p>
                  <p className="text-[10px] text-slate-400 mt-6">تاریخ و امضاء</p>
                </div>

                <div className="text-center sm:text-left flex flex-col items-center sm:items-end">
                  <p className="font-bold text-slate-800">مهر و امضای شرکت آسانرو اطمینان امیر کرمان</p>
                  <div className="mt-2 w-36 h-16 border-2 border-dashed border-amber-500/40 rounded-xl flex items-center justify-center text-[10px] text-amber-700 font-bold bg-amber-50/30">
                    محل مهر رسمی شرکت
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Modal Footer (Hidden when printing) */}
          <div className="px-6 py-4 bg-card border-t border-border flex items-center justify-between no-print">
            <span className="text-xs text-muted-foreground">
              با فشردن کلید چاپ، می‌توانید نسخه چاپی را به فرمت PDF یا پرینت کاغذی دریافت کنید.
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-muted hover:bg-muted/80 text-foreground font-bold text-xs transition-colors cursor-pointer"
              >
                بستن
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="px-5 py-2 rounded-xl bg-accent hover:bg-accent/90 text-accent-foreground font-black text-xs transition-all shadow-md flex items-center gap-2 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>پرینت / ذخیره PDF</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
