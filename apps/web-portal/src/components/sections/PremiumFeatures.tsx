"use client";

import React from "react";
import { Headphones, ShieldCheck, Award } from "lucide-react";

export interface FeatureItem {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}

export const defaultElevatorFeatures: FeatureItem[] = [
  {
    id: "standard",
    title: "استاندارد ملی و مجوز رسمی",
    description: "عضویت رسمی در سندیکای آسانسور و اخذ تاییدیه استاندارد اولیه و ادواری",
    icon: <Award className="w-8 h-8 text-amber-500" />,
  },
  {
    id: "insurance",
    title: "بیمه مسئولیت مدنی سرنشین",
    description: "کلیه پروژه‌ها و قراردادهای سرویس تحت پوشش کامل بیمه حوادث معتبر می‌باشند",
    icon: <ShieldCheck className="w-8 h-8 text-amber-500" />,
  },
  {
    id: "support",
    title: "امداد و رفع خرابی ۲۴ ساعته",
    description: "پاسخگویی شبانه‌روزی و اعزام سریع کارشناس فنی در تمام مناطق استان کرمان",
    icon: <Headphones className="w-8 h-8 text-amber-500" />,
  },
];

export interface PremiumFeaturesProps {
  features?: FeatureItem[];
}

export const PremiumFeatures: React.FC<PremiumFeaturesProps> = ({
  features = defaultElevatorFeatures,
}) => {
  return (
    <section id="why-us" className="w-full max-w-6xl mx-auto px-4 sm:px-6 my-16" dir="rtl">
      {/* Section Heading matching Clean Enterprise Standard */}
      <div className="flex flex-col items-center text-center mb-10">
        <span className="text-amber-600 text-xs sm:text-sm tracking-[0.25em] font-extrabold uppercase mb-1">
          WHY CHOOSE US
        </span>
        <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight">
          چرا ما؟
        </h2>
        <p className="text-sm sm:text-base text-slate-600 font-bold mt-2 max-w-xl">
          تضمین کیفیت، امنیت جابجایی سرنشینان و ارائه خدمات استاندارد با کادر مجرب
        </p>
      </div>

      {/* 3 Feature Cards (Preserved cleanly) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {features.map((item) => (
          <div
            key={item.id}
            className="flex flex-col items-center text-center p-7 rounded-3xl bg-white border border-slate-200/90 shadow-sm hover:shadow-xl hover:border-amber-400 transition-all duration-300 group"
          >
            <div className="w-18 h-18 rounded-2xl bg-slate-900 shadow-md border border-amber-500/30 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              {item.icon}
            </div>
            <h3 className="text-lg sm:text-xl font-black text-slate-900 mb-2">
              {item.title}
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
              {item.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default PremiumFeatures;
