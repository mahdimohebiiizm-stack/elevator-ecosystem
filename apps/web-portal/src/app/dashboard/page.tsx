"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ChevronDown,
  ChevronLeft,
  CreditCard,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Wallet,
  CheckCircle2,
  Camera,
  User,
  Phone,
  Calendar,
  Briefcase,
  MapPin,
} from "lucide-react";

export default function DashboardAccountPage() {
  const [isFormExpanded, setIsFormExpanded] = useState(false);
  const [showAddCardModal, setShowAddCardModal] = useState(false);
  const [cardNumber, setCardNumber] = useState("");
  const [shabaNumber, setShabaNumber] = useState("");
  const [savedCardSuccess, setSavedCardSuccess] = useState(false);
  const [formSaveSuccess, setFormSaveSuccess] = useState(false);

  // Form Fields State
  const [firstName, setFirstName] = useState("مهدی");
  const [lastName, setLastName] = useState("میری");
  const [birthDate, setBirthDate] = useState("۱۳۷۵/۰۵/۱۴");
  const [jobTitle, setJobTitle] = useState("توسعه‌دهنده نرم‌افزار");
  const [phoneNumber, setPhoneNumber] = useState("۰۹۱۲۳۴۵۶۷۸۹");
  const [city, setCity] = useState("تهران");
  const [gender, setGender] = useState<"male" | "female">("male");

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormSaveSuccess(true);
    setTimeout(() => setFormSaveSuccess(false), 3000);
  };

  return (
    <div className="w-full space-y-6" dir="rtl">
      {/* 1. Header Card with Interactive Toggle for Account Form */}
      <div className="bg-white rounded-2xl p-6 sm:p-7 border border-gray-100 shadow-sm transition-all duration-300">
        {/* Header Row: Title on Right, Circular Green Toggle Button on Left */}
        <div
          onClick={() => setIsFormExpanded(!isFormExpanded)}
          className="flex items-center justify-between cursor-pointer select-none"
        >
          <div className="text-right">
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
              اطلاعات حساب
            </h1>
            <p className="text-xs sm:text-sm text-gray-400 font-medium mt-1">
              به‌روزرسانی اطلاعات پروفایل حساب کاربری شما
            </p>
          </div>

          {/* Circular Green Arrow Toggle Button */}
          <button
            type="button"
            aria-label="تغییر وضعیت فرم ویرایش حساب"
            className="w-9 h-9 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 flex items-center justify-center hover:bg-emerald-100 transition-colors shadow-xs"
          >
            <ChevronDown
              className={`w-4 h-4 transition-transform duration-300 ${
                isFormExpanded ? "rotate-180" : ""
              }`}
            />
          </button>
        </div>

        {/* Expandable Account Edit Form */}
        {isFormExpanded && (
          <form
            onSubmit={handleProfileSubmit}
            className="mt-6 pt-6 border-t border-gray-100 animate-in fade-in slide-in-from-top-2 space-y-6"
          >
            {/* Avatar Section */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-amber-500/20 border-2 border-amber-400/50 text-amber-500 font-black text-xl flex items-center justify-center shadow-inner">
                  مم
                </div>
                <button
                  type="button"
                  title="تغییر تصویر نمایه"
                  className="absolute bottom-0 left-0 w-7 h-7 rounded-full bg-[#0f172a] text-white flex items-center justify-center shadow-md hover:bg-slate-800 transition-colors"
                >
                  <Camera className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="text-right">
                <span className="text-sm font-bold text-gray-800 block">
                  تصویر حساب کاربری
                </span>
                <span className="text-xs text-gray-400">
                  فرمت‌های مجاز: JPG, PNG (حداکثر ۲ مگابایت)
                </span>
              </div>
            </div>

            {/* Inputs Grid: 2 Columns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
              {/* نام */}
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1.5">
                  نام
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full py-2.5 px-3.5 pl-9 rounded-xl border border-gray-200 bg-gray-50/50 text-xs font-bold text-gray-800 focus:bg-white focus:outline-none focus:border-amber-500 transition-colors"
                  />
                  <User className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                </div>
              </div>

              {/* نام خانوادگی */}
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1.5">
                  نام خانوادگی
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full py-2.5 px-3.5 pl-9 rounded-xl border border-gray-200 bg-gray-50/50 text-xs font-bold text-gray-800 focus:bg-white focus:outline-none focus:border-amber-500 transition-colors"
                  />
                  <User className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                </div>
              </div>

              {/* تاریخ تولد */}
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1.5">
                  تاریخ تولد
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    placeholder="۱۳۷۵/۰۵/۱۴"
                    className="w-full py-2.5 px-3.5 pl-9 rounded-xl border border-gray-200 bg-gray-50/50 text-xs font-bold text-gray-800 focus:bg-white focus:outline-none focus:border-amber-500 transition-colors"
                  />
                  <Calendar className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                </div>
              </div>

              {/* شغل */}
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1.5">
                  شغل
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="مثال: توسعه‌دهنده وب"
                    className="w-full py-2.5 px-3.5 pl-9 rounded-xl border border-gray-200 bg-gray-50/50 text-xs font-bold text-gray-800 focus:bg-white focus:outline-none focus:border-amber-500 transition-colors"
                  />
                  <Briefcase className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                </div>
              </div>

              {/* شماره تلفن */}
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1.5">
                  شماره تلفن
                </label>
                <div className="relative">
                  <input
                    type="text"
                    dir="ltr"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full py-2.5 px-3.5 pl-9 rounded-xl border border-gray-200 bg-gray-50/50 text-xs font-mono font-bold text-gray-800 focus:bg-white focus:outline-none focus:border-[#184e38] text-right transition-colors"
                  />
                  <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                </div>
              </div>

              {/* شهر */}
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1.5">
                  شهر
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="تهران"
                    className="w-full py-2.5 px-3.5 pl-9 rounded-xl border border-gray-200 bg-gray-50/50 text-xs font-bold text-gray-800 focus:bg-white focus:outline-none focus:border-amber-500 transition-colors"
                  />
                  <MapPin className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                </div>
              </div>
            </div>

            {/* جنسیت Radio Buttons */}
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-2">
                جنسیت
              </label>
              <div className="flex items-center gap-6 text-xs font-bold text-gray-700">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="gender"
                    value="male"
                    checked={gender === "male"}
                    onChange={() => setGender("male")}
                    className="w-4 h-4 text-[#184e38] focus:ring-[#184e38] accent-[#184e38]"
                  />
                  <span>مرد</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="gender"
                    value="female"
                    checked={gender === "female"}
                    onChange={() => setGender("female")}
                    className="w-4 h-4 text-[#184e38] focus:ring-[#184e38] accent-[#184e38]"
                  />
                  <span>زن</span>
                </label>
              </div>
            </div>

            {/* Submit Button & Notification */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-[#184e38] hover:bg-[#1f6647] text-white font-black text-xs shadow-md shadow-emerald-900/10 transition-all hover:scale-[1.01] active:scale-[0.98] cursor-pointer"
              >
                ویرایش حساب کاربری
              </button>

              {formSaveSuccess && (
                <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-bold animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>اطلاعات حساب کاربری با موفقیت به‌روزرسانی شد.</span>
                </div>
              )}
            </div>
          </form>
        )}
      </div>

      {/* 2. Standalone Summary Cards with Breathing Room (NO Shared White Wrapper) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1 (Right in RTL): اضافه کردن کارت (Dashed Placeholder Card) */}
        <div className="border-2 border-dashed border-emerald-300 bg-white rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center text-center min-h-[250px] hover:border-emerald-400 transition-all group">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50/60 border border-emerald-100 shadow-xs flex items-center justify-center text-[#184e38] mb-5 group-hover:scale-105 transition-transform">
            <CreditCard className="w-7 h-7 text-[#184e38]" />
          </div>

          <button
            type="button"
            onClick={() => setShowAddCardModal(true)}
            className="px-6 py-2.5 rounded-xl bg-[#184e38] hover:bg-[#1f6647] text-white font-extrabold text-xs transition-all shadow-sm active:scale-95 cursor-pointer"
          >
            اضافه کردن کارت
          </button>
        </div>

        {/* Card 2 (Middle in RTL): موجودی کیف پول (Orange Top Accent & Gradient) */}
        <div className="bg-gradient-to-b from-[#fff7ed] via-[#fffbf7] to-white rounded-2xl border border-orange-200/80 border-t-4 border-t-[#ff742b] p-6 shadow-sm flex flex-col justify-between min-h-[250px]">
          <div>
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#ff742b] inline-block" />
                  <h3 className="text-sm font-extrabold text-gray-800">
                    موجودی کیف پول
                  </h3>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-gray-500 mt-2">
                  <span>
                    مانده واقعی: <strong className="text-gray-900 font-bold">۰ تومان</strong>
                  </span>
                  <span>•</span>
                  <span>
                    قابل استفاده: <strong className="text-gray-900 font-bold">۰ تومان</strong>
                  </span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center shadow-xs">
                <Wallet className="w-5 h-5" />
              </div>
            </div>

            {/* Status Note */}
            <div className="flex items-center gap-1.5 text-xs text-gray-600 mt-6 pt-3 border-t border-orange-100/70 font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>کیف پول شما فعال است</span>
            </div>
          </div>

          {/* Action CTA */}
          <div className="pt-4">
            <Link
              href="/dashboard/wallet"
              className="w-full py-2.5 rounded-xl bg-[#ff742b] hover:bg-[#ea580c] text-white font-extrabold text-xs flex items-center justify-center gap-1 transition-all shadow-md shadow-orange-500/20 hover:scale-[1.01]"
            >
              <span>افزایش موجودی</span>
              <ChevronLeft className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Card 3 (Left in RTL): سفارش‌های من (Green Top Accent & Gradient) */}
        <div className="bg-gradient-to-b from-[#f0fdf4] via-[#f7fef9] to-white rounded-2xl border border-emerald-200/80 border-t-4 border-t-emerald-600 p-6 shadow-sm flex flex-col justify-between min-h-[250px]">
          <div>
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                  <h3 className="text-sm font-extrabold text-gray-800">
                    سفارش‌های من
                  </h3>
                </div>
                <span className="text-[11px] text-gray-400 mt-1 block">
                  سفارش ثبت شده: <strong className="text-gray-900 font-bold text-sm">۱</strong>
                </span>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-xs">
                <ShoppingBag className="w-5 h-5" />
              </div>
            </div>

            {/* Stats Breakdown 2x2 Mini Grid */}
            <div className="grid grid-cols-2 gap-2 text-[11px] mt-4 pt-3 border-t border-emerald-100/60">
              <div className="bg-emerald-50/80 text-emerald-800 px-2 py-1.5 rounded-lg font-bold text-center">
                تکمیل شده: ۱
              </div>
              <div className="bg-amber-50/80 text-amber-800 px-2 py-1.5 rounded-lg font-bold text-center">
                در حال پردازش: ۰
              </div>
              <div className="bg-gray-50 text-gray-600 px-2 py-1.5 rounded-lg font-medium text-center">
                لغو شده: ۰
              </div>
              <div className="bg-gray-50 text-gray-600 px-2 py-1.5 rounded-lg font-medium text-center">
                ناموفق: ۰
              </div>
            </div>
          </div>

          {/* Action CTA */}
          <div className="pt-4">
            <Link
              href="/dashboard/orders"
              className="w-full py-2.5 rounded-xl border border-emerald-600 text-emerald-700 hover:bg-emerald-50 font-bold text-xs flex items-center justify-center gap-1 transition-colors"
            >
              <span>مشاهده همه</span>
              <ChevronLeft className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Add Bank Card Modal */}
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
              <h3 className="font-extrabold text-base text-gray-900">
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

            {savedCardSuccess ? (
              <div className="py-8 text-center space-y-3">
                <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
                <p className="text-sm font-bold text-gray-800">
                  کارت بانکی با موفقیت تأیید و متصل گردید.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddCardModal(false);
                    setSavedCardSuccess(false);
                  }}
                  className="mt-4 px-6 py-2 rounded-xl bg-[#184e38] text-white text-xs font-bold"
                >
                  بستن
                </button>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setSavedCardSuccess(true);
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
            )}
          </div>
        </div>
      )}
    </div>
  );
}
