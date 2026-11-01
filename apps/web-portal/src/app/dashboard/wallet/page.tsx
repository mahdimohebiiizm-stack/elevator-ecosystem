"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Wallet,
  Lock,
  Plus,
  CreditCard,
  Coins,
  ShoppingBag,
  ArrowDownLeft,
  FileText,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { formatToToman, toPersianDigits, cn } from "@/lib/utils";

export interface Transaction {
  id: string;
  trackingCode: string;
  type: "deposit" | "withdraw" | "order_payment";
  typeLabel: string;
  rialAmount: number;
  date: string;
  status: "completed" | "pending" | "failed" | "locked";
  description: string;
}

export default function WalletDashboardPage() {
  const [activeTab, setActiveTab] = useState<"transactions" | "withdrawals">("transactions");
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showAddCardModal, setShowAddCardModal] = useState(false);

  // Balances
  const usableBalanceRials = 0;
  const totalBalanceRials = 0;
  const lockedBalanceRials = 0;
  const reservedOrdersRials = 0;

  // Deposit Modal State
  const [depositAmountToman, setDepositAmountToman] = useState<number>(500_000);
  const [customAmount, setCustomAmount] = useState<string>("");

  // Bank Card Form State
  const [cardNumber, setCardNumber] = useState("");
  const [shabaNumber, setShabaNumber] = useState("");

  // Empty transactions list for live empty state replication
  const transactions: Transaction[] = [];

  return (
    <div className="w-full space-y-6" dir="rtl">
      {/* 1. Header Bar: Right Title, Left Actions */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-[0_2px_15px_rgba(0,0,0,0.03)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Title & Subtitle */}
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center flex-shrink-0">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
              کیف پول
            </h1>
            <p className="text-xs sm:text-sm text-gray-400 font-medium mt-0.5">
              مشاهده موجودی و مدیریت اعتبار کیف پول
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Green "+ افزایش موجودی" Button */}
          <button
            type="button"
            onClick={() => setShowDepositModal(true)}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#184e38] hover:bg-[#1f6647] text-white font-extrabold text-xs shadow-md shadow-emerald-900/10 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-4 h-4 text-emerald-300" />
            <span>افزایش موجودی</span>
          </button>

          {/* Orange "برداشت وجه" Button */}
          <button
            type="button"
            onClick={() => setShowWithdrawModal(true)}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#ff742b] hover:bg-[#ea580c] text-white font-extrabold text-xs shadow-md shadow-orange-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <ArrowDownLeft className="w-4 h-4" />
            <span>برداشت وجه</span>
          </button>
        </div>
      </div>

      {/* 2. Wallet Stats Grid (2 Rows of 3 Cards in RTL) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-6">
        {/* Row 1, Card 1 (Right): User Identification Card */}
        <div className="bg-white rounded-3xl border border-gray-100 p-5 sm:p-6 shadow-sm hover:border-emerald-200 transition-all flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-gray-400 block">شناسه کیف پول</span>
            <h3 className="text-sm sm:text-base font-black text-gray-900 mt-1">مهدی میری</h3>
            <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-emerald-600 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>حساب کاربری فعال</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-full bg-[#34d399]/20 text-[#184e38] font-black text-sm flex items-center justify-center border border-emerald-400/30">
            مم
          </div>
        </div>

        {/* Row 1, Card 2 (Middle): موجودی کل کیف پول */}
        <div className="bg-white rounded-3xl border border-gray-100 border-t-2 border-t-orange-400 p-5 sm:p-6 shadow-sm hover:border-orange-200 transition-all flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-gray-400 block">موجودی کل کیف پول</span>
            <div className="text-base sm:text-lg font-black text-gray-900 mt-1">
              {formatToToman(totalBalanceRials)}
            </div>
            <span className="text-[11px] text-gray-400 mt-1 block">کل اعتبار حساب</span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center">
            <Wallet className="w-5 h-5" />
          </div>
        </div>

        {/* Row 1, Card 3 (Left): موجودی قابل استفاده */}
        <div className="bg-white rounded-3xl border border-gray-100 border-t-2 border-t-emerald-500 p-5 sm:p-6 shadow-sm hover:border-emerald-200 transition-all flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-gray-400 block">موجودی قابل استفاده</span>
            <div className="text-base sm:text-lg font-black text-emerald-700 mt-1">
              {formatToToman(usableBalanceRials)}
            </div>
            <span className="text-[11px] text-gray-400 mt-1 block">آماده برای خرید</span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Coins className="w-5 h-5" />
          </div>
        </div>

        {/* Row 2, Card 4 (Right): موجودی مسدود شده */}
        <div className="bg-white rounded-3xl border border-gray-100 border-t-2 border-t-amber-400 p-5 sm:p-6 shadow-sm hover:border-amber-200 transition-all flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-gray-400 block">موجودی مسدود شده</span>
            <div className="text-base sm:text-lg font-black text-gray-900 mt-1">
              {formatToToman(lockedBalanceRials)}
            </div>
            <span className="text-[11px] text-gray-400 mt-1 block">مسدود شده در انتظار تایید</span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Lock className="w-5 h-5" />
          </div>
        </div>

        {/* Row 2, Card 5 (Middle): رزرو شده برای سفارش‌ها */}
        <div className="bg-white rounded-3xl border border-gray-100 border-t-2 border-t-sky-400 p-5 sm:p-6 shadow-sm hover:border-sky-200 transition-all flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-gray-400 block">رزرو شده برای سفارش‌ها</span>
            <div className="text-base sm:text-lg font-black text-gray-900 mt-1">
              {formatToToman(reservedOrdersRials)}
            </div>
            <span className="text-[11px] text-gray-400 mt-1 block">اعتبار سفارش‌های جاری</span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center">
            <ShoppingBag className="w-5 h-5" />
          </div>
        </div>

        {/* Row 2, Card 6 (Left): اضافه کردن کارت (Dashed) */}
        <div className="border-2 border-dashed border-emerald-300 bg-gradient-to-br from-emerald-50/30 via-white to-teal-50/20 rounded-3xl p-5 sm:p-6 shadow-sm flex items-center justify-between hover:border-emerald-400 transition-all">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white border border-emerald-100 shadow-xs flex items-center justify-center text-[#184e38]">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-black text-gray-800 block">کارت بانکی</span>
              <span className="text-[10px] text-gray-400">اتصال جهت تسویه سریع</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowAddCardModal(true)}
            className="px-4 py-2 rounded-xl bg-[#184e38] hover:bg-[#1f6647] text-white font-extrabold text-xs transition-colors shadow-xs cursor-pointer"
          >
            اضافه کردن کارت
          </button>
        </div>
      </div>

      {/* 3. Transactions Table Container with Tabs */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_2px_15px_rgba(0,0,0,0.03)] overflow-hidden">
        {/* Tab Strip */}
        <div className="p-4 sm:p-6 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("transactions")}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5",
                activeTab === "transactions"
                  ? "bg-[#184e38] text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
              )}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>تراکنش‌ها</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("withdrawals")}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5",
                activeTab === "withdrawals"
                  ? "bg-[#184e38] text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
              )}
            >
              <ArrowDownLeft className="w-3.5 h-3.5" />
              <span>برداشت‌ها</span>
            </button>
          </div>
        </div>

        {/* Table Column Headers */}
        <div className="grid grid-cols-5 gap-4 px-6 py-3.5 bg-gray-50/60 text-gray-400 text-xs font-bold border-b border-gray-100 text-center">
          <span className="text-right">شناسه</span>
          <span>نوع تراکنش</span>
          <span>مبلغ</span>
          <span>توضیحات</span>
          <span className="text-left">تاریخ</span>
        </div>

        {/* Empty State (Matching Live Pars Premium Screenshot) */}
        {transactions.length === 0 ? (
          <div className="py-20 px-4 flex flex-col items-center justify-center text-center">
            {/* Round Teal / Mint Icon Container */}
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shadow-xs mb-4">
              <FileText className="w-8 h-8 stroke-[1.5]" />
            </div>

            <h3 className="text-base font-black text-gray-800">
              تراکشی ثبت نشده است
            </h3>
            <p className="text-xs text-gray-400 mt-1 max-w-sm">
              پس از اولین فعالیت مالی، تراکنش‌های کیف پول اینجا نمایش داده می‌شوند.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {transactions.map((t) => (
              <div
                key={t.id}
                className="grid grid-cols-5 gap-4 px-6 py-4 text-xs font-medium items-center text-center hover:bg-gray-50/50"
              >
                <span className="text-right font-mono font-bold text-gray-800">{t.id}</span>
                <span className="text-gray-700">{t.typeLabel}</span>
                <span className="font-bold text-emerald-700">{formatToToman(t.rialAmount)}</span>
                <span className="text-gray-500 truncate">{t.description}</span>
                <span className="text-left text-gray-400">{t.date}</span>
              </div>
            ))}
          </div>
        )}

        {/* Table Footer Pagination Bar */}
        <div className="px-6 py-4 bg-gray-50/40 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
          {/* Right: Items per page selector */}
          <div className="flex items-center gap-2">
            <span>تعداد در صفحه:</span>
            <div className="relative">
              <select className="bg-white border border-gray-200 rounded-lg px-2.5 py-1 text-xs font-bold focus:outline-none focus:border-[#184e38]">
                <option value="5">۵</option>
                <option value="10">۱۰</option>
                <option value="20">۲۰</option>
              </select>
            </div>
          </div>

          {/* Center: Page Number 1 */}
          <div className="flex items-center gap-1">
            <span className="w-7 h-7 rounded-lg bg-[#184e38] text-white flex items-center justify-center font-bold text-xs">
              ۱
            </span>
          </div>

          {/* Left: Summary text */}
          <span className="text-gray-400 font-medium">موردی یافت نشد</span>
        </div>
      </div>

      {/* Deposit Modal */}
      {showDepositModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setShowDepositModal(false)}
        >
          <div
            className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-gray-100"
            onClick={(e) => e.stopPropagation()}
            dir="rtl"
          >
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <h3 className="font-black text-base text-gray-900">
                افزایش موجودی کیف پول
              </h3>
              <button
                type="button"
                onClick={() => setShowDepositModal(false)}
                className="text-gray-400 hover:text-gray-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <label className="text-xs font-bold text-gray-700 block">
                مبلغ شارژ را انتخاب یا وارد کنید (تومان)
              </label>

              {/* Quick Select Buttons */}
              <div className="grid grid-cols-3 gap-2">
                {[200_000, 500_000, 1_000_000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => {
                      setDepositAmountToman(amt);
                      setCustomAmount("");
                    }}
                    className={cn(
                      "py-2.5 px-3 rounded-xl text-xs font-bold border transition-all",
                      depositAmountToman === amt && !customAmount
                        ? "border-[#184e38] bg-emerald-50 text-[#184e38]"
                        : "border-gray-200 text-gray-600 hover:bg-gray-50"
                    )}
                  >
                    {amt.toLocaleString("fa-IR")} تومان
                  </button>
                ))}
              </div>

              {/* Custom Amount Input */}
              <div>
                <input
                  type="number"
                  placeholder="مبلغ دلخواه به تومان..."
                  value={customAmount}
                  onChange={(e) => {
                    setCustomAmount(e.target.value);
                    if (e.target.value) setDepositAmountToman(Number(e.target.value));
                  }}
                  className="w-full p-3 rounded-xl border border-gray-200 text-xs font-bold focus:outline-none focus:border-[#184e38]"
                />
              </div>

              {/* Payment Gateway Info */}
              <div className="p-3 rounded-xl bg-orange-50/60 border border-orange-100 text-xs text-orange-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-orange-600 shrink-0" />
                <span>اتصال به درگاه امن زرین‌پال (کارت‌های عضو شتاب)</span>
              </div>

              {/* Submit CTA */}
              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowDepositModal(false)}
                  className="py-2.5 px-4 rounded-xl border border-gray-200 text-gray-600 font-bold text-xs hover:bg-gray-50"
                >
                  انصراف
                </button>
                <button
                  type="button"
                  onClick={() => {
                    alert(`انتقال به درگاه پرداخت برای مبلغ ${depositAmountToman.toLocaleString("fa-IR")} تومان...`);
                    setShowDepositModal(false);
                  }}
                  className="py-2.5 px-6 rounded-xl bg-[#184e38] text-white font-extrabold text-xs hover:bg-[#1f6647] transition-all shadow-sm"
                >
                  پرداخت و شارژ آنی
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Withdraw Modal */}
      {showWithdrawModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setShowWithdrawModal(false)}
        >
          <div
            className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-gray-100"
            onClick={(e) => e.stopPropagation()}
            dir="rtl"
          >
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <h3 className="font-black text-base text-gray-900">
                درخواست برداشت وجه
              </h3>
              <button
                type="button"
                onClick={() => setShowWithdrawModal(false)}
                className="text-gray-400 hover:text-gray-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-100 text-xs text-gray-600">
                موجودی قابل برداشت شما: <strong className="text-emerald-700 font-bold">۰ تومان</strong>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">
                  مبلغ درخواستی (تومان)
                </label>
                <input
                  type="number"
                  placeholder="حداقل ۱۰۰,۰۰۰ تومان"
                  className="w-full p-3 rounded-xl border border-gray-200 text-xs font-bold focus:outline-none focus:border-[#184e38]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowWithdrawModal(false)}
                  className="py-2.5 px-4 rounded-xl border border-gray-200 text-gray-600 font-bold text-xs hover:bg-gray-50"
                >
                  انصراف
                </button>
                <button
                  type="button"
                  onClick={() => {
                    alert("درخواست برداشت به علت موجودی ناکافی ثبت نگردید.");
                    setShowWithdrawModal(false);
                  }}
                  className="py-2.5 px-6 rounded-xl bg-[#ff742b] text-white font-extrabold text-xs hover:bg-[#ea580c] transition-all shadow-sm"
                >
                  ثبت درخواست تسویه
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Card Modal */}
      {showAddCardModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setShowAddCardModal(false)}
        >
          <div
            className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-gray-100"
            onClick={(e) => e.stopPropagation()}
            dir="rtl"
          >
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <h3 className="font-black text-base text-gray-900">
                افزودن کارت بانکی جدید
              </h3>
              <button
                type="button"
                onClick={() => setShowAddCardModal(false)}
                className="text-gray-400 hover:text-gray-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                alert("کارت بانکی با موفقیت متصل گردید.");
                setShowAddCardModal(false);
              }}
              className="mt-5 space-y-4"
            >
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">
                  شماره ۱۶ رقمی کارت بانکی شتاب
                </label>
                <input
                  type="text"
                  maxLength={19}
                  required
                  placeholder="۶۰۳۷-۹۹۱۸-••••-••••"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  className="w-full p-3 rounded-xl border border-gray-200 text-xs font-mono font-bold focus:outline-none focus:border-[#184e38] text-left"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">
                  شماره شبا (بدون IR)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    maxLength={24}
                    placeholder="••••••••••••••••••••••••"
                    value={shabaNumber}
                    onChange={(e) => setShabaNumber(e.target.value)}
                    className="w-full p-3 pl-12 rounded-xl border border-gray-200 text-xs font-mono font-bold focus:outline-none focus:border-[#184e38] text-left"
                    dir="ltr"
                  />
                  <span className="absolute left-3 top-3 text-xs font-mono font-bold text-gray-400">
                    IR
                  </span>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddCardModal(false)}
                  className="py-2.5 px-4 rounded-xl border border-gray-200 text-gray-600 font-bold text-xs hover:bg-gray-50"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="py-2.5 px-6 rounded-xl bg-[#184e38] text-white font-bold text-xs hover:bg-[#1f6647] transition-colors shadow-sm"
                >
                  تأیید و ذخیره کارت
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
