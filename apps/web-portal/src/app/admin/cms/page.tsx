"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  LayoutTemplate,
  UploadCloud,
  Link as LinkIcon,
  Plus,
  Trash2,
  RefreshCw,
  Save,
  CheckCircle2,
  AlertCircle,
  Phone,
  Mail,
  FileText,
  Loader2,
  Image as ImageIcon,
  ExternalLink,
  Eye,
} from "lucide-react";
import { toPersianDigits, cn } from "@/lib/utils";
import {
  fetchSiteSettings,
  updateSiteSettings,
  uploadBannerImage,
  SiteSettingDto,
} from "@/lib/api/admin";
import { toast } from "sonner";

export default function AdminCmsPage() {
  const [settings, setSettings] = useState<SiteSettingDto | null>(null);
  const [heroBanners, setHeroBanners] = useState<string[]>([]);
  const [contactPhone, setContactPhone] = useState<string>("");
  const [contactEmail, setContactEmail] = useState<string>("");
  const [aboutText, setAboutText] = useState<string>("");

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  // Manual URL input state
  const [manualUrl, setManualUrl] = useState<string>("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const getFullBannerUrl = (url: string) => {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    const backendBase =
      process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/v1\/?$/, "") ||
      "http://localhost:8000";
    return `${backendBase}${url.startsWith("/") ? "" : "/"}${url}`;
  };

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const response = await fetchSiteSettings();
      const data = response.data;
      setSettings(data);
      setHeroBanners(Array.isArray(data.hero_banners) ? data.hero_banners : []);
      setContactPhone(data.contact_phone || "");
      setContactEmail(data.contact_email || "");
      setAboutText(data.about_text || "");
    } catch (error: any) {
      console.warn("Could not fetch site settings from backend:", error);
      toast.error("خطا در بارگذاری تنظیمات سایت", {
        description:
          error?.response?.data?.detail ||
          "برقراری ارتباط با سرور برقرار نشد یا دسترسی مدیر لازم است.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  // Handle direct file upload
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("فرمت نامعتبر است", {
        description: "لطفاً فقط فایل‌های تصویری (JPEG, PNG, WebP) انتخاب نمایید.",
      });
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await uploadBannerImage(formData);
      const uploadedUrl = response.data.url;
      setHeroBanners((prev) => [...prev, uploadedUrl]);
      toast.success("بنر با موفقیت آپلود شد", {
        description: "تصویر جدید به انتهای لیست اسلایدر اضافه گردید.",
      });
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error("خطا در آپلود تصویر بنر", {
        description: error?.response?.data?.detail || "بارگذاری فایل انجام نشد.",
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Handle adding manual URL
  const handleAddManualUrl = () => {
    const clean = manualUrl.trim();
    if (!clean) {
      toast.error("لطفاً آدرس تصویر بنر را وارد نمایید.");
      return;
    }

    if (!clean.startsWith("http://") && !clean.startsWith("https://") && !clean.startsWith("/")) {
      toast.error("فرمت آدرس نامعتبر است", {
        description: "آدرس باید با http:// یا https:// یا / شروع شود.",
      });
      return;
    }

    setHeroBanners((prev) => [...prev, clean]);
    setManualUrl("");
    toast.success("آدرس بنر اضافه شد");
  };

  // Handle removing banner
  const handleRemoveBanner = (indexToRemove: number) => {
    setHeroBanners((prev) => prev.filter((_, idx) => idx !== indexToRemove));
    toast.info("بنر از لیست اسلایدر حذف شد");
  };

  // Save all settings
  const handleSaveAll = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    setIsSaving(true);
    try {
      await updateSiteSettings({
        hero_banners: heroBanners,
        contact_phone: contactPhone.trim(),
        contact_email: contactEmail.trim(),
        about_text: aboutText.trim(),
      });
      toast.success("تنظیمات با موفقیت ذخیره گردید", {
        description: "تغییرات بنرها و اطلاعات شرکت در سراسر سامانه اعمال شد.",
      });
      loadSettings();
    } catch (error: any) {
      console.error("Save error:", error);
      toast.error("خطا در ذخیره‌سازی تنظیمات", {
        description:
          error?.response?.data?.detail ||
          "ثبت تغییرات با خطا مواجه شد. لطفاً مجدداً تلاش نمایید.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full space-y-6 font-sans text-foreground" dir="rtl">
      {/* 1. Header Bar: Title & Primary Save CTA */}
      <div className="bg-card rounded-3xl p-6 sm:p-7 border border-border shadow-[0_2px_15px_rgba(0,0,0,0.03)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
            <LayoutTemplate className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                مدیریت محتوا و بنرها (CMS)
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-muted border border-border text-xs font-bold text-muted-foreground">
                {isLoading ? "..." : `${toPersianDigits(heroBanners.length)} بنر فعال`}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground font-medium mt-0.5">
              سیستم مدیریت یکپارچه بنرهای اسلایدر صفحه اصلی، اطلاعات تماس و بیوگرافی شرکت
            </p>
          </div>
        </div>

        {/* Top Control Buttons */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={loadSettings}
            disabled={isLoading || isSaving}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-card hover:bg-muted text-foreground border border-border text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
          >
            <RefreshCw
              className={cn(
                "w-3.5 h-3.5 text-amber-600",
                isLoading && "animate-spin"
              )}
            />
            <span>بروزرسانی</span>
          </button>

          <button
            type="button"
            onClick={() => handleSaveAll()}
            disabled={isSaving || isLoading}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>در حال ذخیره...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>ذخیره تغییرات کلی</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 2. Hero Banners: Hybrid Management Section */}
      <div className="bg-card rounded-3xl p-6 border border-border shadow-[0_2px_15px_rgba(0,0,0,0.02)] space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-foreground">
                اسلایدر و بنرهای صفحه اصلی (Hero Banners)
              </h2>
              <span className="text-xs text-muted-foreground">
                مدیریت هیبریدی: امکان آپلود مستقیم فایل‌های تصویر یا درج پیوند اینترنتی
              </span>
            </div>
          </div>
        </div>

        {/* Current Banners List */}
        <div className="space-y-3">
          <span className="text-xs font-bold text-foreground block">
            بنرهای در حال نمایش ({toPersianDigits(heroBanners.length)} مورد):
          </span>

          {heroBanners.length === 0 ? (
            <div className="text-center py-10 bg-muted/30 rounded-2xl border border-dashed border-border p-6 space-y-2">
              <ImageIcon className="w-10 h-10 text-muted-foreground/40 mx-auto" />
              <div className="text-xs font-bold text-foreground">
                هیچ بنری برای اسلایدر صفحه اصلی ثبت نشده است.
              </div>
              <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
                از بخش زیر می‌توانید با آپلود مستقیم تصویر یا درج آدرس اینترنتی، بنرهای تبلیغاتی و مهندسی خود را اضافه نمایید.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {heroBanners.map((bannerUrl, index) => {
                const fullUrl = getFullBannerUrl(bannerUrl);

                return (
                  <div
                    key={index}
                    className="group relative bg-muted/40 rounded-2xl border border-border overflow-hidden flex flex-col justify-between shadow-xs hover:border-amber-500/50 transition-all"
                  >
                    {/* Image Preview Container */}
                    <div className="relative aspect-video w-full bg-slate-950 overflow-hidden flex items-center justify-center">
                      <img
                        src={fullUrl}
                        alt={`بنر اسلایدر ${index + 1}`}
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                      <div className="absolute top-2.5 right-2.5 px-2.5 py-0.5 rounded-lg bg-slate-900/80 backdrop-blur-xs text-white text-[11px] font-bold">
                        اسلاید {toPersianDigits(index + 1)}
                      </div>
                    </div>

                    {/* Banner Info & Action Bar */}
                    <div className="p-3.5 flex items-center justify-between gap-2 border-t border-border bg-card">
                      <div className="flex-1 min-w-0">
                        <span
                          className="text-[11px] text-muted-foreground block truncate font-sans text-left"
                          dir="ltr"
                          title={bannerUrl}
                        >
                          {bannerUrl}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <a
                          href={fullUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg bg-muted text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
                          title="مشاهده در تب جدید"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>

                        <button
                          type="button"
                          onClick={() => handleRemoveBanner(index)}
                          className="p-1.5 rounded-lg bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 transition-colors cursor-pointer"
                          title="حذف بنر"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Hybrid Add Banner Area (Two Visual Options) */}
        <div className="pt-4 border-t border-border space-y-3">
          <span className="text-xs font-black text-foreground block">
            افزودن بنر جدید (انتخاب روش دلخواه):
          </span>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Option A: Direct File Upload */}
            <div className="p-5 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-3 flex flex-col justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-black text-amber-700 dark:text-amber-400">
                  <UploadCloud className="w-4 h-4" />
                  <span>روش اول: آپلود مستقیم فایل تصویر از سیستم</span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  تصویر مستقیماً در سرور شرکت آپلود شده و آدرس داخلی ایمن به اسلایدر اختصاص می‌یابد.
                </p>
              </div>

              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                  id="banner-file-input"
                  disabled={isUploading}
                />
                <label
                  htmlFor="banner-file-input"
                  className={cn(
                    "w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-dashed border-amber-500/40 bg-card hover:bg-amber-500/10 text-xs font-bold text-foreground transition-all cursor-pointer shadow-xs",
                    isUploading && "opacity-50 pointer-events-none"
                  )}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
                      <span>در حال بارگذاری و آپلود در سرور...</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-4 h-4 text-amber-600" />
                      <span>انتخاب فایل تصویر (JPEG, PNG, WebP)</span>
                    </>
                  )}
                </label>
              </div>
            </div>

            {/* Option B: Manual URL Paste */}
            <div className="p-5 rounded-2xl bg-muted/40 border border-border space-y-3 flex flex-col justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-black text-foreground">
                  <LinkIcon className="w-4 h-4 text-blue-600" />
                  <span>روش دوم: درج لینک اینترنتی بنر (URL)</span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  در صورتی که تصویر بنر روی سرور CDN یا هاست دیگری قرار دارد، لینک مستقیم آن را وارد کنید.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={manualUrl}
                  onChange={(e) => setManualUrl(e.target.value)}
                  placeholder="https://example.com/banner.jpg"
                  className="flex-1 bg-card border border-border rounded-xl py-2.5 px-3 text-xs font-bold text-foreground placeholder-muted-foreground focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all text-left font-sans"
                  dir="ltr"
                />
                <button
                  type="button"
                  onClick={handleAddManualUrl}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-950 text-xs font-bold transition-all shadow-xs hover:opacity-90 cursor-pointer shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>افزودن لینک</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Section 2: Contact, Email & About Text */}
      <div className="bg-card rounded-3xl p-6 border border-border shadow-[0_2px_15px_rgba(0,0,0,0.02)] space-y-5">
        <div className="flex items-center gap-2.5 pb-4 border-b border-border">
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
            <Phone className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-black text-foreground">
              اطلاعات تماس و متن فوتر سازمانی
            </h2>
            <span className="text-xs text-muted-foreground">
              پیکربندی شماره‌های تماس پشتیبانی، ایمیل رسمی و بیوگرافی کوتاه شرکت
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Contact Phone */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-amber-600" />
              <span>شماره تماس پشتیبانی و مدیریت</span>
            </label>
            <input
              type="text"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              placeholder="مثال: 09133982695"
              className="w-full bg-muted border border-border rounded-xl py-2.5 px-3.5 text-xs font-bold text-foreground placeholder-muted-foreground focus:bg-card focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all text-left font-sans"
              dir="ltr"
            />
          </div>

          {/* Contact Email */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-blue-600" />
              <span>پست الکترونیک رسمی شرکت</span>
            </label>
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="مثال: etminannamirrelee@gmail.com"
              className="w-full bg-muted border border-border rounded-xl py-2.5 px-3.5 text-xs font-bold text-foreground placeholder-muted-foreground focus:bg-card focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all text-left font-sans"
              dir="ltr"
            />
          </div>
        </div>

        {/* About Text */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-purple-600" />
            <span>متن درباره ما و معرفی شرکت در فوتر</span>
          </label>
          <textarea
            rows={4}
            value={aboutText}
            onChange={(e) => setAboutText(e.target.value)}
            placeholder="معرفی رسمی شرکت، سوابق مهندسی، خدمات تخصصی و کادر فنی..."
            className="w-full bg-muted border border-border rounded-xl py-2.5 px-3.5 text-xs font-bold text-foreground placeholder-muted-foreground focus:bg-card focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all text-right font-sans leading-relaxed"
          />
        </div>

        {/* Bottom Save Action */}
        <div className="pt-3 border-t border-border flex items-center justify-end">
          <button
            type="button"
            onClick={() => handleSaveAll()}
            disabled={isSaving || isLoading}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>در حال ذخیره‌سازی...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>ذخیره تمامی تنظیمات و بنرها</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
