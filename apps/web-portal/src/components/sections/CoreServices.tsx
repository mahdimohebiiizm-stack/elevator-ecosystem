"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Wrench,
  ShieldCheck,
  Sparkles,
  Cog,
  ChevronLeft,
  CheckCircle2,
  PhoneCall,
} from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";

export interface ServiceCardItem {
  id: string;
  title: string;
  tag: string;
  description: string;
  features: string[];
  icon: React.ReactNode;
  href: string;
}

export const coreServices: ServiceCardItem[] = [
  {
    id: "installation",
    title: "نصب و راه‌اندازی تخصصی",
    tag: "مهندسی و طراحی",
    description:
      "طراحی و اجرای انواع آسانسورهای کششی، گیرلس، روملس (MRL) و هیدرولیک مطابق با استانداردهای ملی ساختمان.",
    features: [
      "محاسبات ترافیکی و آهن‌کشی استاندارد",
      "اخذ تاییدیه استاندارد اولیه",
      "گارانتی ۲۴ ماهه قطعات و خدمات",
    ],
    icon: <Wrench className="w-8 h-8 sm:w-12 sm:h-12 text-amber-500 group-hover:scale-110 transition-transform duration-500" />,
    href: "/dashboard/contracts/request",
  },
  {
    id: "maintenance",
    title: "سرویس و نگهداری دوره‌ای",
    tag: "قرارداد رسمی و بیمه",
    description:
      "سرویس ماهانه منظم همراه با چک‌لیست کامل، آچارکشی، تست پاراشوت و پوشش کامل بیمه مسئولیت مدنی.",
    features: [
      "امداد و پشتیبانی شبانه‌روزی (۲۴/۷)",
      "ثبت چک‌لیست ادواری ماهانه",
      "پوشش کامل بیمه حوادث سرنشینان",
    ],
    icon: <ShieldCheck className="w-8 h-8 sm:w-12 sm:h-12 text-amber-500 group-hover:scale-110 transition-transform duration-500" />,
    href: "/dashboard/contracts/request",
  },
  {
    id: "modernization",
    title: "بازسازی و نوسازی کابین",
    tag: "تزئینات لوکس و 3VF",
    description:
      "مدرن‌سازی سیستم‌های قدیمی، تبدیل به درایو هوشمند بدون لرزش، استیل‌کاری طلایی و شستی‌های تاچ.",
    features: [
      "استیل‌کاری مدرن و لاین نوری",
      "کاهش ۵۰ درصدی مصرف برق و استهلاک",
      "ارتقاء ایمنی به استانداردهای روز",
    ],
    icon: <Sparkles className="w-8 h-8 sm:w-12 sm:h-12 text-amber-500 group-hover:scale-110 transition-transform duration-500" />,
    href: "/dashboard/contracts/request",
  },
  {
    id: "parts-supply",
    title: "تامین قطعات اورجینال",
    tag: "توزیع مستقیم در کرمان",
    description:
      "تامین مستقیم موتورهای بهران، ساسی، زیلابگ، تابلوفرمان‌های آرمان فراز، ریل‌های ساورا و سیم بکسل گوستاولف.",
    features: [
      "ضمانت اصالت ۱۰۰٪ کالا و سلامت فیزیکی",
      "قیمت رقابتی بدون واسطه در استان کرمان",
      "تحویل فوری قطعات و تجهیزات",
    ],
    icon: <Cog className="w-8 h-8 sm:w-12 sm:h-12 text-amber-500 group-hover:scale-110 transition-transform duration-500" />,
    href: "/products",
  },
];

export const CoreServices: React.FC = () => {
  const router = useRouter();
  const { isAuthenticated, toggleLoginModal } = useAuthStore();

  const handleServiceClick = (href: string) => {
    if (isAuthenticated) {
      router.push(href);
    } else {
      toggleLoginModal(true);
    }
  };

  return (
    <section id="services" className="w-full max-w-6xl mx-auto px-4 sm:px-6 my-10 sm:my-16" dir="rtl">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 sm:mb-10 pb-4 border-b border-slate-200">
        <div className="space-y-1.5 sm:space-y-2">
          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight">
            خدمات اصلی و تخصصی
          </h2>
          <p className="text-xs sm:text-sm md:text-base text-slate-600 font-bold max-w-2xl leading-relaxed">
            ارائه کلیه راهکارهای مهندسی طراحی، نصب، استانداردسازی ادواری و سرویس و نگهداری آسانسور
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <a
            href="tel:09133982695"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 sm:px-5 sm:py-3 rounded-xl bg-slate-900 text-amber-400 hover:bg-slate-800 font-black text-xs sm:text-sm shadow-md transition-all active:scale-95 w-full sm:w-auto text-center"
          >
            <PhoneCall className="w-4 h-4 shrink-0" />
            <span className="truncate">مشاوره تلفنی: ۰۹۱۳۳۹۸۲۶۹۵</span>
          </a>
        </div>
      </div>

      {/* Grid of 4 Responsive Service Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
        {coreServices.map((service) => (
          <div
            key={service.id}
            className="group relative rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 hover:border-amber-500/50 shadow-lg hover:shadow-2xl hover:shadow-amber-900/20 transition-all duration-300 p-5 sm:p-7 lg:p-9 flex flex-col justify-between overflow-hidden"
          >
            {/* Ambient Background Glow */}
            <div className="absolute top-0 right-0 w-40 sm:w-48 h-40 sm:h-48 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition-colors pointer-events-none" />

            {/* Top Row: SVG Icon & Tag */}
            <div className="space-y-4 sm:space-y-6 relative z-10">
              <div className="flex items-center justify-between">
                <div className="w-14 h-14 sm:w-18 sm:h-18 rounded-xl sm:rounded-2xl bg-slate-950/80 border border-amber-500/30 flex items-center justify-center shadow-md group-hover:border-amber-400/80 group-hover:shadow-amber-500/20 transition-all duration-300 shrink-0 backdrop-blur-xs">
                  {service.icon}
                </div>
                <span className="text-[11px] sm:text-xs font-black px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 shadow-xs">
                  {service.tag}
                </span>
              </div>

              {/* Title & Description */}
              <div>
                <h3 className="text-lg sm:text-2xl font-black text-white tracking-tight group-hover:text-amber-400 transition-colors leading-snug">
                  {service.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal mt-2 sm:mt-3 text-justify">
                  {service.description}
                </p>
              </div>

              {/* Bullet Features */}
              <div className="pt-3 sm:pt-4 space-y-2 border-t border-slate-800/80">
                {service.features.map((feat, index) => (
                  <div key={index} className="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-200">
                    <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 shrink-0" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom Card Action: Fully Mobile-Friendly */}
            <div className="pt-4 sm:pt-5 mt-4 sm:mt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 relative z-10">
              <button
                type="button"
                onClick={() => handleServiceClick(service.href)}
                className="inline-flex items-center justify-center sm:justify-start gap-1.5 text-xs sm:text-sm font-black text-amber-400 hover:text-amber-300 transition-colors group/link cursor-pointer py-1"
              >
                <span>ثبت درخواست و استعلام قیمت</span>
                <ChevronLeft className="w-4 h-4 text-amber-400 group-hover/link:-translate-x-1 transition-transform" />
              </button>

              <span className="text-[11px] font-bold text-slate-500 text-center sm:text-left">
                پشتیبانی رسمی و فنی
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Promotional Banner Strip Below Services */}
      <div className="mt-8 sm:mt-10 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-amber-500/30 p-5 sm:p-7 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 sm:gap-6 text-white text-right">
        <div className="space-y-1 sm:space-y-1.5">
          <span className="text-[11px] sm:text-xs font-black text-amber-400">
            تخفیف ویژه قراردادهای سالانه ساختمان‌های مسکونی و اداری
          </span>
          <h4 className="text-base sm:text-xl font-black leading-snug">
            نیاز به بازدید فنی و کارشناسی رایگان آسانسور ساختمان خود دارید؟
          </h4>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            تیم مهندسی ما در کوتاه‌ترین زمان جهت بررسی سلامت فنی و ارائه پیش‌فاکتور اعزام خواهد شد.
          </p>
        </div>

        <div className="w-full md:w-auto shrink-0 pt-2 md:pt-0">
          <a
            href="tel:09133982695"
            className="block w-full md:w-auto px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs sm:text-sm shadow-md transition-all text-center"
          >
            تماس با کارشناس: ۰۹۱۳۳۹۸۲۶۹۵
          </a>
        </div>
      </div>
    </section>
  );
};

export default CoreServices;
