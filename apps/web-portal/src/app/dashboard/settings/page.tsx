"use client";

import React, { useState } from "react";
import { toPersianDigits, cn } from "@/lib/utils";
import {
  Settings,
  Smartphone,
  Send,
  MessageCircle,
  Copy,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Lock,
  Key,
  Bell,
  Check,
  AlertCircle,
  Laptop,
} from "lucide-react";

export default function SettingsDashboardPage() {
  const [syncToken, setSyncToken] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [tokenTtlSeconds, setTokenTtlSeconds] = useState(600); // 10 minutes

  // Omnichannel states
  const [isTelegramConnected, setIsTelegramConnected] = useState(true);
  const [isBaleConnected, setIsBaleConnected] = useState(false);

  // Notification Toggles
  const [notifications, setNotifications] = useState({
    orderReady: true,
    vaultDelivery: true,
    renewalAlert: true,
    securityLogin: true,
  });

  const handleGenerateSyncToken = () => {
    setIsGenerating(true);
    setTimeout(() => {
      const generated = `SYNC-PARS-${Math.floor(1000 + Math.random() * 9000)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      setSyncToken(generated);
      setTokenTtlSeconds(600);
      setIsGenerating(false);
    }, 500);
  };

  const handleCopyToken = () => {
    if (!syncToken) return;
    navigator.clipboard.writeText(syncToken);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  const toggleNotification = (key: keyof typeof notifications) => {
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white p-6 rounded-3xl border border-surface-border shadow-sm">
        <div className="flex items-center gap-2 text-xs font-bold text-primary-900 mb-1">
          <Settings className="w-4 h-4 text-accent-brand" />
          <span>پیکربندی حساب و ارتباطات چندکاناله (Omnichannel)</span>
        </div>
        <h1 className="text-2xl font-black text-gray-900">
          تنظیمات و اتصال پیام‌رسان‌ها
        </h1>
        <p className="text-xs text-gray-500 mt-1 max-w-2xl leading-relaxed">
          برای دریافت اعلان‌های لحظه‌ای صدور لایسنس، اطلاعات گاوصندوق دیجیتال و ارتباط با هوش مصنوعی ربات، حساب وب خود را به ربات‌های رسمی تلگرام و بله متصل نمایید.
        </p>
      </div>

      {/* Omnichannel Bot Binding Section (Backend Sync) */}
      <div className="bg-white rounded-3xl border border-surface-border p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
              <span>اتصال پیام‌رسان هوشمند (Telegram & Bale Bot)</span>
              <span className="text-[10px] font-bold bg-primary-50 text-primary-900 px-2.5 py-0.5 rounded-full border border-primary-200">
                همگام‌سازی دوطرفه
              </span>
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              اتصال حساب به ربات تلگرام و بله پارس پرمیوم با استفاده از توکن امن رمزنگاری شده
            </p>
          </div>

          <button
            type="button"
            onClick={handleGenerateSyncToken}
            disabled={isGenerating}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent-brand text-white font-extrabold text-xs hover:bg-accent-bright transition-all shadow-md shadow-accent-brand/20 disabled:opacity-50"
          >
            <RefreshCw className={cn("w-4 h-4", isGenerating && "animate-spin")} />
            <span>تولید توکن همگام‌سازی (Generate Sync Token)</span>
          </button>
        </div>

        {/* Generated Token Box */}
        {syncToken && (
          <div className="mt-6 p-5 rounded-2xl bg-gradient-to-br from-primary-900/5 via-white to-accent-brand/5 border-2 border-primary-900/20 shadow-sm animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-gray-600 block mb-1">
                  توکن اتصال یکبار مصرف شما (Sync Token):
                </span>
                <span className="font-mono text-base font-black text-primary-900 tracking-wider">
                  {syncToken}
                </span>
                <span className="text-[11px] text-amber-700 block mt-1">
                  ⏱️ اعتبار این توکن ۱۰ دقیقه است.
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyToken}
                  className="px-4 py-2 rounded-xl bg-white border border-gray-200 text-xs font-bold text-gray-800 hover:border-primary-900 flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  {copiedToken ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700">کپی شد ✓</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>کپی توکن</span>
                    </>
                  )}
                </button>

                <a
                  href={`https://t.me/ParsPremiumBot?start=${syncToken}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-xl bg-sky-500 text-white text-xs font-bold hover:bg-sky-600 flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>اتصال مستقیم در تلگرام</span>
                </a>

                <a
                  href={`https://ble.ir/ParsPremiumBot?start=${syncToken}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>اتصال مستقیم در بله</span>
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Connected Channels Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          {/* Telegram Status Card */}
          <div className="p-5 rounded-2xl border border-gray-200 bg-white shadow-sm flex flex-col justify-between">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center">
                  <Send className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-gray-900">ربات تلگرام</h3>
                  <span className="text-xs text-gray-500 block">@ParsPremiumOfficialBot</span>
                </div>
              </div>

              {isTelegramConnected ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3" />
                  متصل است
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-gray-100 text-gray-600">
                  متصل نیست
                </span>
              )}
            </div>

            {isTelegramConnected && (
              <div className="p-3 rounded-xl bg-surface-light border border-surface-border text-xs text-gray-600 space-y-1 mb-4">
                <div className="flex justify-between">
                  <span>شناسه تلگرام:</span>
                  <span className="font-mono font-bold text-gray-900">@mahdi_pars</span>
                </div>
                <div className="flex justify-between">
                  <span>شناسه عددی (Chat ID):</span>
                  <span className="font-mono font-bold text-gray-900">۹۸۲۱۰۴۹۱</span>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => setIsTelegramConnected(!isTelegramConnected)}
              className={cn(
                "w-full py-2.5 rounded-xl text-xs font-bold transition-colors border",
                isTelegramConnected
                  ? "border-rose-200 text-rose-600 hover:bg-rose-50"
                  : "border-sky-500 bg-sky-50 text-sky-700 hover:bg-sky-100"
              )}
            >
              {isTelegramConnected ? "قطع اتصال از تلگرام" : "اتصال به ربات تلگرام"}
            </button>
          </div>

          {/* Bale Status Card */}
          <div className="p-5 rounded-2xl border border-gray-200 bg-white shadow-sm flex flex-col justify-between">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <MessageCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-gray-900">پیام‌رسان ایرانی بله</h3>
                  <span className="text-xs text-gray-500 block">@ParsPremiumBot</span>
                </div>
              </div>

              {isBaleConnected ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3" />
                  متصل است
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                  در انتظار همگام‌سازی
                </span>
              )}
            </div>

            <div className="p-3 rounded-xl bg-surface-light border border-surface-border text-xs text-gray-600 mb-4">
              <p className="leading-relaxed">
                با اتصال به بله، تمامی پیام‌های آماده‌سازی و کدهای تحویل بدون نیاز به فیلترشکن برای شما ارسال خواهد شد.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                if (!syncToken) handleGenerateSyncToken();
                setIsBaleConnected(true);
              }}
              className="w-full py-2.5 rounded-xl border border-emerald-600 bg-emerald-50 text-emerald-800 text-xs font-bold hover:bg-emerald-100 transition-colors"
            >
              اتصال به پیام‌رسان بله
            </button>
          </div>
        </div>
      </div>

      {/* Notification Preferences */}
      <div className="bg-white rounded-3xl border border-surface-border p-6 sm:p-8 shadow-sm">
        <h3 className="text-base font-black text-gray-900 mb-4 flex items-center gap-2">
          <Bell className="w-4 h-4 text-accent-brand" />
          <span>تنظیمات اعلان‌ها و هشدارهای سیستم</span>
        </h3>

        <div className="space-y-3">
          <div
            onClick={() => toggleNotification("orderReady")}
            className="flex items-center justify-between p-4 rounded-2xl border border-gray-100 hover:bg-surface-light cursor-pointer transition-colors"
          >
            <div>
              <h4 className="text-xs font-bold text-gray-900">
                اعلان آماده‌سازی و صدور اطلاعات سفارش
              </h4>
              <p className="text-[11px] text-gray-500 mt-0.5">
                ارسال پیامک و پیام در تلگرام/بله به محض آماده شدن سفارش
              </p>
            </div>
            <div
              className={cn(
                "w-11 h-6 rounded-full p-1 transition-colors flex items-center",
                notifications.orderReady ? "bg-primary-900 justify-start" : "bg-gray-200 justify-end"
              )}
            >
              <div className="w-4 h-4 rounded-full bg-white shadow-md" />
            </div>
          </div>

          <div
            onClick={() => toggleNotification("vaultDelivery")}
            className="flex items-center justify-between p-4 rounded-2xl border border-gray-100 hover:bg-surface-light cursor-pointer transition-colors"
          >
            <div>
              <h4 className="text-xs font-bold text-gray-900">
                اعلان لینک امن MinIO گاوصندوق دیجیتال
              </h4>
              <p className="text-[11px] text-gray-500 mt-0.5">
                اطلاع‌رسانی صدور لینک موقت فایل‌های سشن و پیکربندی ابری
              </p>
            </div>
            <div
              className={cn(
                "w-11 h-6 rounded-full p-1 transition-colors flex items-center",
                notifications.vaultDelivery ? "bg-primary-900 justify-start" : "bg-gray-200 justify-end"
              )}
            >
              <div className="w-4 h-4 rounded-full bg-white shadow-md" />
            </div>
          </div>

          <div
            onClick={() => toggleNotification("renewalAlert")}
            className="flex items-center justify-between p-4 rounded-2xl border border-gray-100 hover:bg-surface-light cursor-pointer transition-colors"
          >
            <div>
              <h4 className="text-xs font-bold text-gray-900">
                یادآوری تمدید اشتراک (۳ روز قبل از انقضا)
              </h4>
              <p className="text-[11px] text-gray-500 mt-0.5">
                جهت جلوگیری از قطع دسترسی و از دست رفتن اطلاعات اکانت
              </p>
            </div>
            <div
              className={cn(
                "w-11 h-6 rounded-full p-1 transition-colors flex items-center",
                notifications.renewalAlert ? "bg-primary-900 justify-start" : "bg-gray-200 justify-end"
              )}
            >
              <div className="w-4 h-4 rounded-full bg-white shadow-md" />
            </div>
          </div>
        </div>
      </div>

      {/* Security & Sessions */}
      <div className="bg-white rounded-3xl border border-surface-border p-6 sm:p-8 shadow-sm">
        <h3 className="text-base font-black text-gray-900 mb-4 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>امنیت و نشست‌های فعال</span>
        </h3>

        <div className="p-4 rounded-2xl border border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gray-100 text-gray-700 flex items-center justify-center">
              <Laptop className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-gray-900">
                Windows 11 • Google Chrome (نشست فعلی)
              </h4>
              <span className="text-[11px] text-gray-500">
                آی‌پی: 5.120.94.10 • آخرین فعالیت: هم‌اکنون
              </span>
            </div>
          </div>

          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
            دستگاه فعال
          </span>
        </div>
      </div>
    </div>
  );
}
