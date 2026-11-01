"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { PhoneCall, ChevronLeft, ShieldCheck } from "lucide-react";
import { toPersianDigits } from "@/lib/utils";
import { fetchPublicSiteSettings } from "@/lib/api/public";

export interface HeroSlide {
  image: string;
  badge: string;
  title: string;
  highlight: string;
  ribbon: string;
  description: string;
}

export const heroSlides: HeroSlide[] = [
  {
    image: "/images/Gemini_Generated_Image_38wy8138wy8138wy.jpg",
    badge: "مجری رسمی استاندارد و بیمه آسانسور در استان کرمان",
    title: "آسانرو اطمینان امیر",
    highlight: "کرمان",
    ribbon: "ELEVATOR ENGINEERING & SAFETY",
    description: "نصب، راه‌اندازی، سرویس و نگهداری تخصصی انواع آسانسورهای کششی و گیرلس",
  },
  {
    image: "/images/Gemini_Generated_Image_sc9v43sc9v43sc9v.jpg",
    badge: "تکنولوژی روز اروپا و درایو بدون لرزش ۳VF",
    title: "طراحی و اجرای آسانسورهای",
    highlight: "روملس (MRL)",
    ribbon: "LUXURY CABIN & ENERGY SAVING",
    description: "کاهش ۵۰ درصدی مصرف برق با موتورهای مغناطیس دائم گیرلس و سیستم هوشمند",
  },
  {
    image: "/images/Gemini_Generated_Image_effxgueffxgueffx_1.jpg",
    badge: "پشتیبانی شبانه‌روزی و اخذ گواهینامه استاندارد ادواری",
    title: "قراردادهای رسمی سرویس و",
    highlight: "نگهداری ماهانه",
    ribbon: "24/7 ELEVATOR EMERGENCY SERVICE",
    description: "اعزام فوری تکنسین در کلیه مناطق کرمان، چک‌لیست کامل ادواری و پوشش بیمه حوادث",
  },
];

export interface HeroSectionProps {
  banners?: string[];
  contactPhone?: string | null;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  banners,
  contactPhone,
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [isTextFading, setIsTextFading] = useState(false);
  const [internalBanners, setInternalBanners] = useState<string[]>([]);
  const [internalPhone, setInternalPhone] = useState<string>("09133982695");

  useEffect(() => {
    if (!banners) {
      fetchPublicSiteSettings()
        .then((res) => {
          if (res.data) {
            if (res.data.hero_banners && res.data.hero_banners.length > 0) {
              setInternalBanners(res.data.hero_banners);
            }
            if (res.data.contact_phone) {
              setInternalPhone(res.data.contact_phone);
            }
          }
        })
        .catch(() => {});
    }
  }, [banners]);

  const resolveBannerUrl = (url: string) => {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    const backendBase =
      process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/v1\/?$/, "") ||
      "http://localhost:8000";
    return `${backendBase}${url.startsWith("/") ? "" : "/"}${url}`;
  };

  const activeBanners = banners && banners.length > 0 ? banners : internalBanners;

  const slidesToRender = useMemo(() => {
    if (activeBanners && activeBanners.length > 0) {
      return activeBanners.map((bannerUrl, idx) => {
        const fallback = heroSlides[idx % heroSlides.length];
        return {
          ...fallback,
          image: resolveBannerUrl(bannerUrl),
        };
      });
    }
    return heroSlides;
  }, [activeBanners]);

  // Automated 12-second background and slide progression
  useEffect(() => {
    if (slidesToRender.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slidesToRender.length);
    }, 12000);

    return () => clearInterval(timer);
  }, [slidesToRender.length]);

  // Synchronize text dissolve animation with currentSlide (Prevents clashing and overlap)
  useEffect(() => {
    if (currentSlide === activeSlideIndex) return;

    setIsTextFading(true);
    const timeout = setTimeout(() => {
      setActiveSlideIndex(currentSlide);
      setIsTextFading(false);
    }, 250); // 250ms fade-out duration

    return () => clearTimeout(timeout);
  }, [currentSlide, activeSlideIndex]);

  const activeSlide = slidesToRender[activeSlideIndex] || heroSlides[0];
  const phoneDisplay = contactPhone || internalPhone || "09133982695";
  const phoneHref = `tel:${phoneDisplay.replace(/\s+/g, "")}`;

  return (
    <section className="relative w-full bg-[#0f172a] text-white overflow-hidden py-10 md:py-14 lg:py-16" dir="rtl">
      {/* ===================================================================== */}
      {/* LAYER 1: Background Slider with Isolated Opacity Cross-Fade            */}
      {/* ===================================================================== */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        {slidesToRender.map((s, idx) => {
          const isActive = currentSlide === idx;
          return (
            <div
              key={idx}
              className={`absolute inset-0 transition-opacity duration-1000 ease-in-out will-change-[opacity] ${
                isActive ? "opacity-100 z-[2]" : "opacity-0 z-[1] pointer-events-none"
              }`}
            >
              <img
                src={s.image}
                alt={s.title}
                className="w-full h-full object-cover object-center"
                loading={idx === 0 ? "eager" : "lazy"}
              />
            </div>
          );
        })}

        {/* Single Persistent Dark Scrim Over Background - Sits at z-[3] */}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-950/85 to-transparent z-[3] pointer-events-none" />
        <div className="absolute inset-0 bg-slate-950/40 z-[3] pointer-events-none" />
      </div>

      {/* ===================================================================== */}
      {/* LAYER 2: Ambient Atmosphere Glows (z-[4])                             */}
      {/* ===================================================================== */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none z-[4]" />
      <div className="absolute bottom-0 left-10 w-[500px] h-[500px] bg-sky-600/10 rounded-full blur-3xl pointer-events-none z-[4]" />

      {/* ===================================================================== */}
      {/* LAYER 3: Interactive Foreground Content Container (z-[10])            */}
      {/* ===================================================================== */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-[10]">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center min-h-[380px] lg:min-h-[440px]">
          {/* Right Column: High-Impact Typography & Branding */}
          <div className="lg:col-span-7 flex flex-col items-start text-right z-10 order-2 lg:order-1 min-h-[340px] sm:min-h-[360px] md:min-h-[380px] justify-center">
            {/* Text Content with Clean Dissolve Transition (Zero Overlap / Zero Clashing) */}
            <div className="relative w-full min-h-[195px] sm:min-h-[215px] md:min-h-[230px] flex flex-col justify-center">
              <div
                className={`flex flex-col items-start text-right space-y-3.5 transition-all duration-300 ease-in-out ${
                  isTextFading
                    ? "opacity-0 translate-y-1 pointer-events-none"
                    : "opacity-100 translate-y-0"
                }`}
              >
                {/* Top Badge */}
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-black backdrop-blur-md shadow-sm">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>{activeSlide.badge}</span>
                </div>

                {/* Main Headline */}
                <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-white tracking-tight leading-tight">
                  {activeSlide.title} <span className="text-amber-400">{activeSlide.highlight}</span>
                </h1>

                {/* Gold Ribbon Box */}
                <div className="inline-block bg-amber-400 text-slate-950 font-black text-xs sm:text-sm tracking-[0.25em] px-3.5 py-1.5 rounded uppercase shadow-sm mt-1 mb-1 font-mono">
                  {activeSlide.ribbon}
                </div>

                {/* Sub-headline */}
                <p className="text-lg sm:text-xl md:text-2xl font-bold text-slate-200 tracking-wide mt-1 leading-relaxed max-w-xl">
                  {activeSlide.description}
                </p>
              </div>
            </div>

            {/* CTA Buttons in Gold/Amber - Stably positioned below text (Zero CLS) */}
            <div className="pt-4 flex flex-wrap items-center gap-3">
              <Link
                href="/dashboard/contracts/request"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm shadow-xl shadow-amber-500/25 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <span>درخواست مشاوره رایگان</span>
                <ChevronLeft className="w-5 h-5 -scale-x-100" />
              </Link>
              <Link
                href="/products"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm border border-white/20 backdrop-blur-sm transition-all"
              >
                <span>کاتالوگ محصولات</span>
              </Link>
              <a
                href={phoneHref}
                className="inline-flex items-center gap-2 px-5 py-3.5 rounded-2xl bg-slate-900/80 hover:bg-slate-900 text-amber-400 font-bold text-sm border border-amber-500/30 backdrop-blur-sm transition-all"
              >
                <PhoneCall className="w-4 h-4 text-amber-400" />
                <span>تماس فوری: {toPersianDigits(phoneDisplay)}</span>
              </a>
            </div>

            {/* Interactive Carousel Dots */}
            {slidesToRender.length > 1 && (
              <div className="pt-6 flex items-center gap-2">
                {slidesToRender.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCurrentSlide(idx)}
                    className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                      currentSlide === idx ? "w-8 bg-amber-400" : "w-2 bg-white/40 hover:bg-white/70"
                    }`}
                    aria-label={`اسلاید ${idx + 1}`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Left Column: Transparent Floating Luxury Elevator Cutout */}
          <div className="lg:col-span-5 relative flex items-center justify-center bg-transparent order-1 lg:order-2">
            <div className="relative w-full max-w-[380px] sm:max-w-[420px] flex items-center justify-center bg-transparent">
              <img
                src="/images/elevator-hero-cutout.png"
                alt="کابین آسانسور لوکس - آسانرو اطمینان امیر کرمان"
                width={787}
                height={1066}
                className="w-full h-auto object-contain max-h-[360px] sm:max-h-[420px] lg:max-h-[460px] bg-transparent select-none pointer-events-none drop-shadow-[0_20px_50px_rgba(0,0,0,0.85)] hover:scale-105 transition-transform duration-500"
                loading="eager"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;