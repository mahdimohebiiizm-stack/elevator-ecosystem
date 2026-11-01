"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ChevronDown, ShieldCheck, Wrench, Award, PhoneCall } from "lucide-react";

export interface AboutUsSectionProps {
  title1?: string;
  body1?: string;
  title2?: string;
  body2?: string;
  extendedBody?: string;
  logoSrc?: string;
}

export const AboutUsSection: React.FC<AboutUsSectionProps> = ({
  title1 = "تعهد به ایمنی، کیفیت و ماندگاری در صنعت آسانسور",
  body1 = "صنعت آسانسور پیوندی ناگسستنی با آرامش و امنیت جان شهروندان دارد. شرکت آسانرو اطمینان امیر کرمان با مدیریت مهندس محبی، با تکیه بر سال‌ها تخصص فنی و تجربه درخشان در طراحی، نصب، بازسازی و نگهداری انواع سیستم‌های بالابر و آسانسور در استان کرمان، استانداردترین خدمات مهندسی را به هم‌استانی‌های گرامی ارائه می‌نماید.",
  title2 = "رسالت ما؛ آرامش در حرکت و استانداردهای بی‌نقص",
  body2 = "ما معتقدیم آسانسور قلب تپنده هر ساختمان است. حرکت روان، توقف بدون تکان، مصرف بهینه انرژی و ایمنی کامل، حداقل حقوق سرنشینان است. تیم مهندسی ما با محاسبات دقیق ترافیکی، اجرای سیستم‌های پیشرفته گیرلس و درایودار، تست‌های دقیق پاراشوت و اخذ سریع تاییدیه استاندارد ملی، خریدی مطمئن را برای کارفرمایان و سازندگان محترم تضمین می‌کند.",
  extendedBody = "این مجموعه مفتخر است با پشتیبانی ۲۴ ساعته و کادر مجرب، قراردادهای رسمی سرویس و نگهداری دوره‌ای را با پوشش کامل بیمه حوادث به ساکنین مجتمع‌های مسکونی، برج‌ها، ادارات و مراکز درمانی ارائه دهد. همچنین تامین مستقیم قطعات اورجینال (موتور، تابلو فرمان هوشمند، ریل و سیم بکسل) با مناسب‌ترین قیمت از ارکان اصلی خدمت‌رسانی ماست.",
  logoSrc = "/images/elevator-logo.png",
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <section id="about" className="w-full max-w-6xl mx-auto px-4 sm:px-6 my-10 sm:my-16" dir="rtl">
      <div className="bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 rounded-2xl sm:rounded-3xl border-2 border-amber-500/40 p-5 sm:p-8 lg:p-12 shadow-2xl relative overflow-hidden text-white">
        {/* Subtle decorative background blur glow */}
        <div className="absolute top-0 right-0 w-60 sm:w-80 h-60 sm:h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -z-0" />
        <div className="absolute bottom-0 left-0 w-60 sm:w-80 h-60 sm:h-80 bg-sky-500/10 rounded-full blur-3xl pointer-events-none -z-0" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 lg:gap-12 items-center">
          {/* Circular Elevator Logo (Top on mobile, Left on desktop) */}
          <div className="lg:col-span-5 flex items-center justify-center order-1 lg:order-2">
            <div className="relative w-36 h-36 sm:w-56 sm:h-56 lg:w-72 lg:h-72 rounded-full overflow-hidden border-2 sm:border-4 border-amber-400 shadow-2xl bg-slate-900 group shrink-0">
              <img
                src={logoSrc}
                alt="شرکت آسانرو اطمینان امیر کرمان"
                className="w-full h-full object-cover select-none group-hover:scale-105 transition-transform duration-500"
              />
            </div>
          </div>

          {/* Company Content (Bottom on mobile, Right on desktop) */}
          <div className="lg:col-span-7 flex flex-col justify-center space-y-4 sm:space-y-6 order-2 lg:order-1">
            {/* Block 1 */}
            <div className="space-y-2 sm:space-y-3">
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-amber-500/10 text-amber-400 text-[11px] sm:text-xs font-black border border-amber-500/20">
                <span>ABOUT US</span>
              </div>
              <h2 className="text-lg sm:text-2xl lg:text-3xl font-black text-white leading-snug">
                {title1}
              </h2>
              <p className="text-xs sm:text-sm md:text-base text-slate-300 leading-relaxed font-normal text-right text-justify">
                {body1}
              </p>
            </div>

            {/* Block 2 */}
            <div className="space-y-2 sm:space-y-3">
              <h3 className="text-base sm:text-xl lg:text-2xl font-black text-amber-400 leading-snug">
                {title2}
              </h3>
              <p className="text-xs sm:text-sm md:text-base text-slate-300 leading-relaxed font-normal text-right text-justify">
                {body2}
              </p>
            </div>

            {/* Collapsible Extended Body */}
            {isExpanded && (
              <div className="pt-2 border-t border-slate-800 animate-fadeIn space-y-3 sm:space-y-4">
                <p className="text-xs sm:text-sm md:text-base text-slate-300 leading-relaxed font-normal text-right text-justify">
                  {extendedBody}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 pt-2">
                  <div className="flex items-center gap-2 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-slate-900 border border-slate-800">
                    <Award className="w-4 h-4 text-amber-400 shrink-0" />
                    <span className="text-xs font-bold text-slate-200">تاییدیه استاندارد ادواری</span>
                  </div>
                  <div className="flex items-center gap-2 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-slate-900 border border-slate-800">
                    <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
                    <span className="text-xs font-bold text-slate-200">بیمه کامل مسئولیت</span>
                  </div>
                  <div className="flex items-center gap-2 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-slate-900 border border-slate-800">
                    <Wrench className="w-4 h-4 text-amber-400 shrink-0" />
                    <span className="text-xs font-bold text-slate-200">امداد و تعمیرات ۲۴/۷</span>
                  </div>
                </div>
              </div>
            )}

            {/* CTA Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 sm:px-6 sm:py-3 rounded-xl sm:rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs sm:text-sm shadow-md transition-all cursor-pointer"
              >
                <span>{isExpanded ? "بستن توضیحات" : "مشاهده جزئیات بیشتر و رزومه"}</span>
                <ChevronDown
                  className={`w-4 h-4 transition-transform duration-300 ${
                    isExpanded ? "rotate-180" : ""
                  }`}
                />
              </button>

              <a
                href="tel:09133982695"
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 sm:px-5 sm:py-3 rounded-xl sm:rounded-2xl bg-slate-900 hover:bg-slate-800 border border-amber-400/40 text-amber-400 hover:text-amber-300 font-bold text-xs sm:text-sm transition-all"
              >
                <PhoneCall className="w-4 h-4 shrink-0" />
                <span className="font-mono">مدیریت (محبی): ۰۹۱۳۳۹۸۲۶۹۵</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutUsSection;
