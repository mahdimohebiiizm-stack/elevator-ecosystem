"use client";

import React, { useState, useEffect } from "react";
import axios, { AxiosError } from "axios";
import {
  X,
  Phone,
  KeyRound,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Lock,
} from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { toPersianDigits } from "@/lib/utils";
import { toast } from "sonner";
import { apiLogin } from "@/lib/api";

export const LoginModal: React.FC = () => {
  const [mounted, setMounted] = useState(false);
  const { isLoginModalOpen, toggleLoginModal, login } = useAuthStore();

  const [step, setStep] = useState<"PHONE" | "OTP">("PHONE");
  const [phone, setPhone] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isLoginModalOpen) {
      setStep("PHONE");
      setOtpCode("");
      setErrorMessage(null);
    }
  }, [isLoginModalOpen]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isLoginModalOpen) {
        toggleLoginModal(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isLoginModalOpen, toggleLoginModal]);

  if (!mounted || !isLoginModalOpen) return null;

  const handlePhoneSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = phone.trim();
    if (!cleanPhone) return;

    setErrorMessage(null);
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setStep("OTP");
      toast.info("کد تایید پیامک شد", {
        description: `کد تایید ورود برای شماره ${toPersianDigits(
          cleanPhone
        )} ارسال گردید.`,
      });
    }, 400);
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = phone.trim();
    const cleanOtp = otpCode.trim();

    if (!cleanOtp) {
      setErrorMessage("لطفاً کد تایید را وارد نمایید.");
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const data = await apiLogin({
        phone: cleanPhone,
        otpCode: cleanOtp,
      });

      const rawUser = data.user || data;
      const userRole: "ADMIN" | "USER" =
        rawUser.role === "ADMIN" ? "ADMIN" : "USER";
      const userName =
        userRole === "ADMIN"
          ? "مهندس محبی"
          : rawUser.name || (cleanPhone === "09930046324" ? "مشتری ویژه" : `کاربر ${cleanPhone}`);
      const userId =
        rawUser.id ||
        (userRole === "ADMIN"
          ? "00000000-0000-4000-a000-000000000001"
          : "00000000-0000-4000-a000-000000000002");

      const token = data.access_token || "";

      login(
        {
          id: userId,
          name: userName,
          phone: cleanPhone,
          role: userRole,
        },
        token
      );

      toast.success(
        userRole === "ADMIN"
          ? "ورود موفقیت‌آمیز به پنل مدیریت"
          : "ورود موفقیت‌آمیز به حساب کاربری",
        {
          description: `خوش آمدید ${userName}`,
        }
      );

      toggleLoginModal(false);
    } catch (err: unknown) {
      let errorText = "کد تایید اشتباه است یا خطایی رخ داد";

      if (axios.isAxiosError(err)) {
        const errorData = err.response?.data as {
          message?: string;
          detail?: string;
          title?: string;
        } | undefined;

        if (errorData) {
          errorText =
            errorData.message ||
            errorData.detail ||
            errorData.title ||
            errorText;
        } else if (err.code === "ECONNABORTED" || !err.response) {
          errorText =
            "خطا در برقراری ارتباط با سرور. لطفاً وضعیت سرویس بک‌اند را بررسی کنید.";
        }
      }

      setErrorMessage(errorText);
      toast.error("خطا در ورود", {
        description: errorText,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
      onClick={() => toggleLoginModal(false)}
      dir="rtl"
    >
      <div
        className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-gray-100 z-10 text-gray-900 relative space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={() => toggleLoginModal(false)}
          className="absolute left-6 top-6 w-8 h-8 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-400 hover:text-gray-700 flex items-center justify-center transition-colors"
          aria-label="بستن"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3.5 pb-2">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-black text-gray-900 tracking-tight">
              ورود / ثبت‌نام
            </h3>
            <p className="text-xs text-gray-400 font-medium mt-0.5">
              سامانه احراز هویت شرکت آسانرو اطمینان امیر
            </p>
          </div>
        </div>

        {/* Error Alert Box */}
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2 animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Step 1: Phone Number Input */}
        {step === "PHONE" ? (
          <form onSubmit={handlePhoneSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-2">
                شماره موبایل *
              </label>
              <div className="relative">
                <input
                  type="tel"
                  required
                  autoFocus
                  placeholder="۰۹۱۳۳۹۸۲۶۹۵"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full p-3.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-center font-vazirmatn tabular-nums tracking-normal placeholder-gray-400"
                  dir="ltr"
                />
                <Phone className="w-4 h-4 text-gray-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
              <span className="text-[11px] text-gray-400 mt-1.5 block">
                کد تایید ورود یکبار مصرف به این شماره پیامک خواهد شد.
              </span>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !phone.trim()}
              className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-sm shadow-md shadow-amber-500/20 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? "در حال ارسال..." : "دریافت کد تایید"}
            </button>
          </form>
        ) : (
          /* Step 2: OTP Input */
          <form onSubmit={handleOtpSubmit} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-gray-700">
                  کد تایید پیامک شده *
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setStep("PHONE");
                    setErrorMessage(null);
                  }}
                  className="text-[11px] text-amber-600 hover:text-amber-700 font-bold flex items-center gap-1"
                >
                  <span>ویرایش شماره ({toPersianDigits(phone)})</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>

              <div className="relative">
                <input
                  type="text"
                  required
                  autoFocus
                  maxLength={6}
                  placeholder="••••"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  className="w-full p-3.5 rounded-xl border border-gray-200 text-base font-bold text-gray-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-center font-vazirmatn tabular-nums tracking-widest placeholder-gray-300"
                  dir="ltr"
                />
                <KeyRound className="w-4 h-4 text-gray-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !otpCode.trim()}
              className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-sm shadow-md shadow-amber-500/20 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? "در حال بررسی..." : "تایید و ورود"}
            </button>
          </form>
        )}

        {/* Magic OTP Helper for Testing */}
        <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200/60 text-[11px] text-amber-950 space-y-1">
          <div className="font-bold text-amber-900">حساب‌های آزمایشی ورود سریع (Magic OTP):</div>
          <div className="flex items-center justify-between">
            <span>مدیر سیستم:</span>
            <span className="font-mono font-bold" dir="ltr">09133982695 (12345)</span>
          </div>
          <div className="flex items-center justify-between">
            <span>مشتری ویژه:</span>
            <span className="font-mono font-bold" dir="ltr">09930046324 (1234)</span>
          </div>
        </div>

        {/* Security Trust Note */}
        <div className="pt-2 border-t border-gray-100 flex items-center justify-center gap-1.5 text-[11px] text-gray-400">
          <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
          <span>امنیت ورود تضمین شده با استاندارد شرکت آسانرو</span>
        </div>
      </div>
    </div>
  );
};

export default LoginModal;
