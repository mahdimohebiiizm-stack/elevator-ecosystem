"use client";

import React, { useRef, useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShoppingCart,
  CheckCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  Layers,
  Wrench,
  Package,
} from "lucide-react";
import { useCartStore } from "@/store/useCartStore";
import { useAuthStore } from "@/store/useAuthStore";
import { toPersianDigits } from "@/lib/utils";
import { fetchPublicProducts } from "@/lib/api/public";
import { ProductDto } from "@/lib/api/admin";

export interface EngineeringPackage {
  id: string;
  title: string;
  category: string;
  badge: string;
  specs: string[];
  href: string;
  tag: string;
}

export interface SparePart {
  id: string;
  title: string;
  category: string;
  badge: string;
  image: string;
  specs: string[];
  priceFormatted: string;
  priceRaw: number;
  href: string;
}

const basePackages = [
  {
    title: "پکیج کامل آسانسور ۶ نفره روملس (MRL) گیرلس زیلابگ",
    category: "پکیج مهندسی پیشرفته",
    badge: "پروژه‌های لوکس و تجاری",
    specs: [
      "سرعت ۱m/s با درایو ۳VF یاسکاوا ژاپن",
      "کابین تمام استیل طلایی و میرور با لاین نوری",
      "گارانتی ۳۶ ماهه بدون قید و شرط و بیمه کامل",
    ],
    tag: "MRL GEARLESS",
  },
  {
    title: "پکیج آسانسور ۸ نفره کششی با موتور گیربکس بهران لیفت",
    category: "پکیج مسکونی استاندارد",
    badge: "استاندارد ملی ایران",
    specs: [
      "موتور گیربکس بهران لیفت استاندارد ملی",
      "تابلو فرمان میکروپروسسوری با نجات اضطراری",
      "اخذ تاییدیه استاندارد اولیه و ادواری در کرمان",
    ],
    tag: "TRACTION LIFT",
  },
  {
    title: "پکیج نیرومحرکه موتور آسانسور آلبرتو ساسی ایتالیا (LEO)",
    category: "نیرومحرکه و موتورخانه",
    badge: "وارداتی اصل با برگه سبز",
    specs: [
      "توان ۵.۵ کیلووات با استاتیک بار ۳۰۰۰kg",
      "فلکه ۵۲۰ میلیمتر ۵ شیار استاندارد اروپایی",
      "فوق‌العاده کم‌صدا، بادوام و بدون کوچک‌ترین لرزش",
    ],
    tag: "SASSI ITALY",
  },
  {
    title: "پکیج آسانسور هیدرولیک مسکونی ویتور (Wittur) ۴ نفره",
    category: "سیستم‌های هیدرولیک",
    badge: "بدون نیاز به موتورخانه",
    specs: [
      "پاوریونیت ایتالیا با شیر کنترل بلین آلمان",
      "بدون نیاز به موتورخانه در پشت‌بام ساختمان",
      "حرکت کاملاً بی‌صدا و ایمنی مضاعف ضدسقوط",
    ],
    tag: "WITTUR HYDRAULIC",
  },
];

const baseParts = [
  {
    title: "تابلو فرمان آرمان فراز درایو یاسکاوا ۳VF (کنترل هوشمند)",
    category: "تابلو فرمان هوشمند",
    badge: "نجات اضطراری UPS",
    image: "/images/elevator-hero-corporate.jpg",
    specs: [
      "درایو ۳VF یاسکاوا اصل ژاپن",
      "سیستم نجات اضطراری خودکار Blackout",
      "گارانتی تعویض ۲۴ ماهه معتبر شرکتی",
    ],
    priceFormatted: "۴۸,۰۰۰,۰۰۰",
    priceRaw: 480_000_000,
  },
  {
    title: "درب تمام اتوماتیک تلسکوپی طبقات یاران سایز ۸۰ سانت",
    category: "درب‌های اتوماتیک",
    badge: "مقاوم در برابر حریق",
    image: "/images/elevator-hero-luxury.jpg",
    specs: [
      "مکانیزم تلسکوپی روان، دقیق و بی‌صدا",
      "رنگ الکترواستاتیک کوره‌ای ضدخش",
      "دارای گواهینامه تست حریق استاندارد",
    ],
    priceFormatted: "۱۴,۵۰۰,۰۰۰",
    priceRaw: 145_000_000,
  },
  {
    title: "سیم بکسل گوستاولف آلمان نمره ۱۰ مغز کنفی (۱۰۰ متر)",
    category: "تجهیزات مصرفی و قطعات",
    badge: "اصالت ۱۰۰٪ آلمان",
    image: "/images/Gemini_Generated_Image_38wy8138wy8138wy.jpg",
    specs: [
      "مغز کنفی استاندارد DIN 3062",
      "مقاومت کششی ۱۷۷۰ N/mm² فوق‌سنگین",
      "تحویل فوری در سراسر استان کرمان",
    ],
    priceFormatted: "۳۸,۰۰۰,۰۰۰",
    priceRaw: 380_000_000,
  },
  {
    title: "روغن تخصصی گیربکس و ریل آسانسور بهران (گالن ۲۰ لیتری)",
    category: "روانکاری تخصصی",
    badge: "فرمولاسیون اختصاصی",
    image: "/images/elevator-hero-cartoon.jpg",
    specs: [
      "ویسکوزیته استاندارد VG 320 صنعتی",
      "کاهش سایش و محافظت از دنده برنجی",
      "مخصوص موتورهای بهران، ساسی و الکمپ",
    ],
    priceFormatted: "۱,۲۵۰,۰۰۰",
    priceRaw: 12_500_000,
  },
];

// Exactly 20 B2B Engineering Packages
export const engineeringPackages: EngineeringPackage[] = Array.from({ length: 20 }, (_, index) => {
  const base = basePackages[index % basePackages.length];
  const modelNum = index + 1;
  return {
    id: `pkg-${modelNum}`,
    title: `${base.title} - مدل ${modelNum}`,
    category: base.category,
    badge: base.badge,
    specs: base.specs,
    href: "/dashboard/contracts/request",
    tag: `${base.tag} #${modelNum}`,
  };
});

const BASE_PART_UUIDS = [
  "11111111-1111-4111-a111-111111111111", // Arman Faraz 3VF Board
  "22222222-2222-4222-a222-222222222222", // Yaran Auto Door
  "33333333-3333-4333-a333-333333333333", // Gustav Wolf Wire Rope
  "44444444-4444-4444-a444-444444444444", // Behran Elevator Oil
];

// Exactly 20 B2C Spare Parts
export const spareParts: SparePart[] = Array.from({ length: 20 }, (_, index) => {
  const base = baseParts[index % baseParts.length];
  const itemNum = index + 1;
  const hexSuffix = itemNum.toString(16).padStart(4, "0");
  const uuid =
    index < 4
      ? BASE_PART_UUIDS[index]
      : `00000000-0000-4000-a000-00000000${hexSuffix}`;

  return {
    id: uuid,
    title: `${base.title} - سری ${itemNum}`,
    category: base.category,
    badge: base.badge,
    image: base.image,
    specs: base.specs,
    priceFormatted: base.priceFormatted,
    priceRaw: base.priceRaw,
    href: "/products",
  };
});

export interface BestSellersProps {
  packages?: EngineeringPackage[];
  parts?: SparePart[];
}

export const BestSellers: React.FC<BestSellersProps> = ({
  packages = engineeringPackages,
  parts = spareParts,
}) => {
  const router = useRouter();
  const { isAuthenticated, toggleLoginModal } = useAuthStore();
  const b2bSliderRef = useRef<HTMLDivElement>(null);
  const b2cSliderRef = useRef<HTMLDivElement>(null);
  const { addItem, toggleCart } = useCartStore();

  const [backendProducts, setBackendProducts] = useState<ProductDto[]>([]);

  useEffect(() => {
    fetchPublicProducts({ limit: 50 })
      .then((res) => {
        const data = Array.isArray(res.data) ? res.data : (res as any)?.data || [];
        setBackendProducts(data);
      })
      .catch(() => {});
  }, []);

  const formatTomanCommas = (rial: number) => {
    const toman = Math.floor(rial / 10);
    return toPersianDigits(toman.toLocaleString("en-US"));
  };

  const activeParts = useMemo(() => {
    if (backendProducts.length > 0) {
      return backendProducts.map((p, idx) => {
        const specsList: string[] = [];
        if (p.brand) specsList.push(`برند سازنده: ${p.brand}`);
        if (p.country_of_origin) specsList.push(`کشور سازنده: ${p.country_of_origin}`);
        if (p.warranty_months) specsList.push(`گارانتی: ${toPersianDigits(p.warranty_months)} ماه`);
        if (specsList.length === 0) {
          specsList.push("استاندارد ملی و تضمین اصالت کالا");
          specsList.push("تحویل فوری در سراسر استان کرمان");
        }

        return {
          id: p.id,
          title: p.title,
          category: p.category?.name || "قطعات و تجهیزات آسانسور",
          badge: p.brand || (p.stock_count > 0 ? "تحویل فوری کرمان" : "سفارشی"),
          image: baseParts[idx % baseParts.length].image,
          specs: specsList.slice(0, 3),
          priceFormatted: formatTomanCommas(p.price),
          priceRaw: p.price,
          href: `/products`,
        };
      });
    }
    return parts;
  }, [backendProducts, parts]);

  const activePackages = useMemo(() => {
    if (backendProducts.length > 0) {
      const pkgList = backendProducts.filter(
        (p) => (p.category?.name || "").includes("پکیج") || (p.title || "").includes("پکیج")
      );
      if (pkgList.length > 0) {
        return pkgList.map((p, idx) => {
          const specsList: string[] = [];
          if (p.brand) specsList.push(`موتور گیرلس/کششی: ${p.brand}`);
          if (p.country_of_origin) specsList.push(`فناوری: ${p.country_of_origin}`);
          if (p.warranty_months) specsList.push(`گارانتی: ${toPersianDigits(p.warranty_months)} ماه`);
          if (specsList.length === 0) {
            specsList.push("طراحی، نصب و استاندارد ادواری در کرمان");
          }

          return {
            id: p.id,
            title: p.title,
            category: p.category?.name || "پکیج مهندسی پیشرفته",
            badge: p.country_of_origin ? `استاندارد ${p.country_of_origin}` : "پروژه‌های لوکس و تجاری",
            specs: specsList.slice(0, 3),
            href: "/dashboard/contracts/request",
            tag: p.sku || `MRL #${idx + 1}`,
          };
        });
      }
    }
    return packages;
  }, [backendProducts, packages]);

  const handlePackageClick = (href: string) => {
    if (isAuthenticated) {
      router.push(href);
    } else {
      toggleLoginModal(true);
    }
  };

  // Dynamic Responsive Scroll Function (80% of visible container width)
  const scrollSlider = (ref: React.RefObject<HTMLDivElement>, direction: "left" | "right") => {
    if (ref.current) {
      const container = ref.current;
      const scrollAmount =
        direction === "left" ? -(container.clientWidth * 0.8) : container.clientWidth * 0.8;
      container.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  return (
    <section id="packages" className="w-full max-w-6xl mx-auto px-4 sm:px-6 my-16 space-y-16" dir="rtl">
      {/* ============================================================== */}
      {/* 1. B2B ENGINEERING PACKAGES (HORIZONTAL SLIDER - PURE INQUIRY)  */}
      {/* ============================================================== */}
      <div className="space-y-6">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 flex items-center justify-center text-slate-950 shrink-0 shadow-md">
              <Layers className="w-5 h-5 font-black" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                پکیج‌های مهندسی و تجاری
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 font-bold mt-0.5">
                طراحی، نصب و راه‌اندازی (استعلامی بدون قیمت)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handlePackageClick("/dashboard/contracts/request")}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-black text-amber-600 hover:text-amber-700 transition-colors cursor-pointer"
          >
            <span>استعلام کلیه پکیج‌ها</span>
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        {/* B2B Slider Container with Repositioned Navigation Arrows */}
        <div className="relative group/slider">
          {/* Left Navigation Arrow (Desktop) */}
          <button
            type="button"
            onClick={() => scrollSlider(b2bSliderRef, "left")}
            aria-label="اسکرول به چپ"
            className="hidden md:flex absolute -left-5 lg:-left-7 top-1/2 -translate-y-1/2 z-30 w-12 h-12 rounded-full bg-slate-900/95 border border-slate-700/80 hover:border-amber-500 text-slate-200 hover:text-amber-400 items-center justify-center shadow-2xl hover:shadow-amber-500/25 backdrop-blur-xl transition-all hover:scale-110 active:scale-95"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          {/* Right Navigation Arrow (Desktop) */}
          <button
            type="button"
            onClick={() => scrollSlider(b2bSliderRef, "right")}
            aria-label="اسکرول به راست"
            className="hidden md:flex absolute -right-5 lg:-right-7 top-1/2 -translate-y-1/2 z-30 w-12 h-12 rounded-full bg-slate-900/95 border border-slate-700/80 hover:border-amber-500 text-slate-200 hover:text-amber-400 items-center justify-center shadow-2xl hover:shadow-amber-500/25 backdrop-blur-xl transition-all hover:scale-110 active:scale-95"
          >
            <ChevronRight className="w-6 h-6" />
          </button>

          {/* Horizontal Scrolling Flexbox Slider with Strict Snapping */}
          <div
            ref={b2bSliderRef}
            className="flex overflow-x-auto snap-x snap-mandatory gap-6 pb-8 hide-scrollbar scroll-smooth touch-pan-x w-full scroll-px-4 md:scroll-px-0"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {activePackages.map((pkg) => (
              <div
                key={pkg.id}
                className="w-[85vw] sm:w-[380px] shrink-0 snap-always snap-center md:snap-start bg-[#0b1221] border border-slate-800 rounded-3xl overflow-hidden hover:border-amber-500/50 hover:shadow-[0_0_30px_rgba(245,158,11,0.15)] transition-all duration-500 hover:-translate-y-2 group flex flex-col justify-between"
              >
                {/* Luxurious CSS-based Product Placeholder */}
                <div className="relative overflow-hidden">
                  <div className="w-full h-56 bg-gradient-to-br from-slate-900 via-[#0b1221] to-black flex items-center justify-center border-b border-slate-800/80 group-hover:scale-105 transition-transform duration-700">
                    <Package
                      size={56}
                      className="text-amber-500/40 group-hover:text-amber-400 transition-colors duration-500 drop-shadow-[0_0_15px_rgba(245,158,11,0.5)]"
                    />
                  </div>

                  {/* Badges on Placeholder Banner */}
                  <div className="absolute top-4 right-4 flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full bg-slate-950/80 backdrop-blur-md border border-amber-500/30 text-amber-400 text-xs font-black">
                      {pkg.badge}
                    </span>
                  </div>

                  <div className="absolute bottom-3 right-4">
                    <span className="text-[11px] font-black tracking-wider text-slate-300 font-mono bg-slate-900/90 px-2.5 py-0.5 rounded-md border border-slate-700">
                      {pkg.tag}
                    </span>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-6 flex flex-col justify-between flex-grow text-right">
                  <div>
                    <span className="text-xs font-bold text-amber-400 mb-1.5 block">
                      {pkg.category}
                    </span>
                    <h3 className="text-lg sm:text-xl font-black text-white group-hover:text-amber-400 transition-colors leading-snug min-h-[56px] line-clamp-2">
                      {pkg.title}
                    </h3>

                    {/* 3 Specs with Gold Checkmarks */}
                    <div className="space-y-2.5 my-4 pt-4 border-t border-slate-800">
                      {pkg.specs.map((spec, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs text-slate-300 leading-relaxed">
                          <CheckCircle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                          <span className="truncate">{spec}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Price Area: Clock Icon + Status Tag (NO PRICE NUMBER) */}
                  <div className="pt-3 border-t border-slate-800/80">
                    <div className="text-slate-400 text-sm flex items-center gap-2 mb-4">
                      <Clock size={16} className="text-amber-500" />
                      <span>نیازمند کارشناسی پروژه • استعلامی</span>
                    </div>

                    {/* CTA Button: Full-width Solid Amber */}
                    <button
                      type="button"
                      onClick={() => handlePackageClick(pkg.href)}
                      className="w-full py-3.5 px-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs sm:text-sm text-center shadow-lg shadow-amber-500/20 transition-all hover:scale-[1.02] active:scale-95 block cursor-pointer"
                    >
                      درخواست مشاوره و پیش‌فاکتور
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 2. B2C SPARE PARTS (HORIZONTAL SLIDER - WITH PRICES & CART CTA) */}
      {/* ============================================================== */}
      <div className="space-y-6">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-slate-900 flex items-center justify-center text-amber-400 border border-amber-500/40 shrink-0 shadow-md">
              <Wrench className="w-5 h-5 font-black" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                تامین قطعات اورجینال و بازسازی
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 font-bold mt-0.5">
                خرید مستقیم قطعات و تجهیزات مصرفی (دارای قیمت)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => router.push("/products")}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-black text-amber-600 hover:text-amber-700 transition-colors cursor-pointer"
          >
            <span>مشاهده همه قطعات</span>
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        {/* B2C Slider Container with Repositioned Navigation Arrows */}
        <div className="relative group/slider">
          {/* Left Navigation Arrow (Desktop) */}
          <button
            type="button"
            onClick={() => scrollSlider(b2cSliderRef, "left")}
            aria-label="اسکرول به چپ"
            className="hidden md:flex absolute -left-5 lg:-left-7 top-1/2 -translate-y-1/2 z-30 w-12 h-12 rounded-full bg-slate-900/95 border border-slate-700/80 hover:border-amber-500 text-slate-200 hover:text-amber-400 items-center justify-center shadow-2xl hover:shadow-amber-500/25 backdrop-blur-xl transition-all hover:scale-110 active:scale-95"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          {/* Right Navigation Arrow (Desktop) */}
          <button
            type="button"
            onClick={() => scrollSlider(b2cSliderRef, "right")}
            aria-label="اسکرول به راست"
            className="hidden md:flex absolute -right-5 lg:-right-7 top-1/2 -translate-y-1/2 z-30 w-12 h-12 rounded-full bg-slate-900/95 border border-slate-700/80 hover:border-amber-500 text-slate-200 hover:text-amber-400 items-center justify-center shadow-2xl hover:shadow-amber-500/25 backdrop-blur-xl transition-all hover:scale-110 active:scale-95"
          >
            <ChevronRight className="w-6 h-6" />
          </button>

          {/* Horizontal Scrolling Flexbox Slider for B2C with Strict Snapping */}
          <div
            ref={b2cSliderRef}
            className="flex overflow-x-auto snap-x snap-mandatory gap-6 pb-8 hide-scrollbar scroll-smooth touch-pan-x w-full scroll-px-4 md:scroll-px-0"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {activeParts.map((part) => (
              <div
                key={part.id}
                className="w-[85vw] sm:w-[380px] shrink-0 snap-always snap-center md:snap-start bg-[#0b1221] border border-slate-800 rounded-2xl overflow-hidden hover:border-amber-500/50 hover:shadow-[0_0_30px_rgba(245,158,11,0.15)] transition-all duration-300 hover:-translate-y-1 group flex flex-col h-full justify-between p-5 text-right"
              >
                <div>
                  {/* Scaled-down Centered Image Container */}
                  <div className="w-full h-36 rounded-xl overflow-hidden bg-slate-950/70 border border-slate-800 mb-4 flex items-center justify-center p-2 relative group-hover:border-amber-500/30 transition-colors">
                    <img
                      src={part.image}
                      alt={part.title}
                      className="w-full h-full object-cover rounded-lg group-hover:scale-105 transition-transform duration-300 opacity-80 group-hover:opacity-100"
                    />
                    <span className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-slate-900/90 text-amber-400 text-[10px] font-black border border-amber-500/30">
                      {part.badge}
                    </span>
                  </div>

                  {/* Category & Title */}
                  <span className="text-[11px] font-bold text-amber-500/90 mb-1 block">
                    {part.category}
                  </span>
                  <h4 className="text-sm sm:text-base font-black text-white group-hover:text-amber-400 transition-colors line-clamp-2 leading-snug mb-3 min-h-[44px]">
                    {part.title}
                  </h4>

                  {/* Technical Specs List */}
                  <div className="space-y-1.5 mb-4 border-t border-slate-800/80 pt-3">
                    {part.specs.map((spec, idx) => (
                      <div key={idx} className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400">
                        <CheckCircle size={14} className="text-amber-500 shrink-0" />
                        <span className="truncate">{spec}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Price Area & CTA Button */}
                <div className="pt-3 border-t border-slate-800/80">
                  <div className="text-2xl font-bold text-white mb-4">
                    {part.priceFormatted}{" "}
                    <span className="text-amber-500 text-sm font-normal">تومان</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      addItem({
                        id: part.id,
                        name: part.title,
                        price: part.priceRaw,
                        priceFormatted: `${part.priceFormatted} تومان`,
                        image: part.image,
                        category: part.category,
                      });
                      toggleCart(true);
                    }}
                    className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-400 border border-amber-500/50 hover:border-amber-400 text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-2 shadow-md active:scale-95 group/btn"
                  >
                    <ShoppingCart size={16} className="text-amber-400 group-hover/btn:scale-110 transition-transform" />
                    <span>افزودن به سبد خرید</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default BestSellers;
