import React from "react";
import { Headphones, Percent, ShieldCheck } from "lucide-react";

export const FeaturesRow: React.FC = () => {
  const features = [
    {
      id: "support",
      title: "پشتیبانی",
      englishTitle: "24/7 SUPPORT",
      description: "پاسخگویی سریع و پشتیبانی فنی کارشناسان مجرب از طریق تلگرام و تیکت تا پایان دوره اشتراک.",
      icon: <Headphones className="w-8 h-8 text-primary-900" />,
      bgColor: "bg-[#C7FFC3]/40",
      borderColor: "border-[#064B36]/20",
    },
    {
      id: "pricing",
      title: "قیمت مناسب",
      englishTitle: "BEST PRICING",
      description: "بهترین تعرفه رقابتی در ایران با پرداخت ریالی و مصون از نوسانات لحظه‌ای ارز.",
      icon: <Percent className="w-8 h-8 text-primary-900" />,
      bgColor: "bg-[#C7FFC3]/40",
      borderColor: "border-[#064B36]/20",
    },
    {
      id: "security",
      title: "پرداخت امن",
      englishTitle: "SECURE CHECKOUT",
      description: "پرداخت از طریق کلیه کارت‌های شتاب در درگاه‌های شاپرکی معتبر با بالاترین ضریب امنیت.",
      icon: <ShieldCheck className="w-8 h-8 text-primary-900" />,
      bgColor: "bg-[#C7FFC3]/40",
      borderColor: "border-[#064B36]/20",
    },
  ];

  return (
    <section className="py-12 sm:py-16 bg-surface-light overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Section Header with English Background Subtext */}
        <div className="relative mb-12 flex flex-col items-center">
          <span className="text-[12px] sm:text-sm font-black tracking-[0.25em] text-gray-400 uppercase mb-1">
            PARS PREMIUM FEATURES
          </span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-gray-800 tracking-tight">
            ویژگی های{" "}
            <span className="text-primary-900 underline decoration-accent-brand decoration-wavy decoration-2">
              پارس پرمیوم
            </span>
          </h2>
        </div>

        {/* 3 Pillars Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {features.map((item) => (
            <div
              key={item.id}
              className="group relative flex flex-col items-center text-center p-8 rounded-3xl bg-white border border-surface-border shadow-sm hover:shadow-xl hover:border-primary-500/40 transition-all duration-300"
            >
              {/* Highlight Icon Circle */}
              <div
                className={`flex items-center justify-center w-20 h-20 rounded-2xl ${item.bgColor} border ${item.borderColor} mb-6 group-hover:scale-110 transition-transform duration-300 shadow-sm`}
              >
                {item.icon}
              </div>

              {/* Title */}
              <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-primary-700 transition-colors">
                {item.title}
              </h3>

              {/* Description */}
              <p className="text-sm text-gray-500 leading-relaxed max-w-xs font-normal">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
