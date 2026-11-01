import React from "react";
import Link from "next/link";
import { ChevronLeft, Flame, TrendingUp } from "lucide-react";
import { ProductCard, ProductCardProps } from "@/components/ui/ProductCard";

export interface ProductShowcaseSectionProps {
  title: string;
  subtitle?: string;
  badgeText?: string;
  icon?: React.ReactNode;
  viewAllLink?: string;
  headerTheme?: "orange" | "green";
  products: ProductCardProps[];
}

export const ProductShowcaseSection: React.FC<ProductShowcaseSectionProps> = ({
  title,
  subtitle,
  badgeText,
  icon,
  viewAllLink = "#",
  headerTheme = "orange",
  products,
}) => {
  const headerBgClass =
    headerTheme === "green"
      ? "bg-gradient-to-r from-primary-900 via-primary-800 to-primary-700 text-white"
      : "bg-gradient-to-r from-accent-brand via-accent-bright to-accent-sunset text-white";

  return (
    <div className="w-full my-10">
      {/* Curved Orange Header Banner (Matching Pars Premium Screenshot style) */}
      <div
        className={`flex items-center justify-between px-6 py-4 rounded-2xl ${headerBgClass} shadow-md mb-6`}
      >
        <div className="flex items-center gap-3">
          {icon}
          <div>
            <h2 className="text-lg sm:text-xl font-black tracking-tight">{title}</h2>
            {subtitle && (
              <span className="text-xs text-white/80 font-medium block mt-0.5">{subtitle}</span>
            )}
          </div>
          {badgeText && (
            <span className="mr-2 text-xs font-bold bg-white/20 backdrop-blur-sm px-2.5 py-1 rounded-full">
              {badgeText}
            </span>
          )}
        </div>

        <Link
          href={viewAllLink}
          className="inline-flex items-center gap-1 text-xs sm:text-sm font-bold text-white hover:text-white/80 transition-colors group"
        >
          <span>مشاهده همه</span>
          <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
        </Link>
      </div>

      {/* Responsive Horizontal Scroll & Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 sm:gap-5">
        {products.map((product, idx) => (
          <ProductCard key={product.id || `${product.title}-${idx}`} {...product} />
        ))}
      </div>
    </div>
  );
};

export const ProductShowcase: React.FC = () => {
  // 1. تخفیف های شگفت انگیز (Amazing Discounts)
  const discountProducts: ProductCardProps[] = [
    {
      id: "rytr",
      title: "خرید اکانت Rytr با ایمیل شخصی",
      category: "هوش مصنوعی",
      iconText: "Rytr",
      headerBgColor: "bg-rose-50",
      headerTextColor: "text-rose-600",
      rialPrice: 4_500_000,
      originalRialPrice: 6_000_000,
      discountPercentage: 25,
      badgeText: "تخفیف ویژه",
    },
    {
      id: "chegg",
      title: "خرید اکانت Chegg چگ با ایمیل شما (۲۰٪ تخفیف)",
      category: "آموزش",
      iconText: "Chegg",
      headerBgColor: "bg-orange-50",
      headerTextColor: "text-orange-600",
      rialPrice: 1_850_000,
      originalRialPrice: 2_300_000,
      discountPercentage: 20,
    },
    {
      id: "codecademy",
      title: "خرید اکانت Codecademy Pro کد کادمی پرو",
      category: "برنامه‌نویسی",
      iconText: "Code",
      headerBgColor: "bg-blue-50",
      headerTextColor: "text-blue-700",
      rialPrice: 1_990_000,
      originalRialPrice: 2_600_000,
      discountPercentage: 23,
    },
    {
      id: "remini",
      title: "خرید اکانت Remini رمینی پرو با ایمیل شما",
      category: "ویرایش عکس",
      iconText: "Remini",
      headerBgColor: "bg-red-50",
      headerTextColor: "text-red-700",
      rialPrice: 990_000,
      originalRialPrice: 1_400_000,
      discountPercentage: 29,
    },
    {
      id: "headspace",
      title: "خرید اکانت هداسپیس Headspace با ایمیل",
      category: "سلامت و آرامش",
      iconText: "Head",
      headerBgColor: "bg-amber-50",
      headerTextColor: "text-amber-600",
      rialPrice: 2_650_000,
      originalRialPrice: 3_500_000,
      discountPercentage: 24,
    },
    {
      id: "blinkist",
      title: "خرید اکانت بلینکیست Blinkist با ایمیل شما",
      category: "کتاب و پادکست",
      iconText: "Blink",
      headerBgColor: "bg-teal-50",
      headerTextColor: "text-teal-700",
      rialPrice: 2_590_000,
      originalRialPrice: 3_200_000,
      discountPercentage: 19,
    },
  ];

  // 2. پرفروشهای این ماه (Best Sellers This Month)
  const bestSellers: ProductCardProps[] = [
    {
      id: "gemini",
      title: "خرید اکانت جمینای جیمنای Google Gemini",
      category: "هوش مصنوعی",
      iconText: "Gemini",
      headerBgColor: "bg-indigo-50",
      headerTextColor: "text-indigo-700",
      rialPrice: 990_000,
      badgeText: "محبوب‌ترین",
    },
    {
      id: "chatgpt",
      title: "خرید اکانت چت جی پی تی پلاس ChatGPT Plus",
      category: "هوش مصنوعی",
      iconText: "GPT",
      headerBgColor: "bg-emerald-50",
      headerTextColor: "text-emerald-800",
      rialPrice: 24_835_000,
      badgeText: "فوری",
    },
    {
      id: "telegram",
      title: "خرید تلگرام پرمیوم ۳ و ۶ ماهه (شارژ قانونی)",
      category: "پیام‌رسان",
      iconText: "TG",
      headerBgColor: "bg-sky-50",
      headerTextColor: "text-sky-600",
      rialPrice: 24_540_000,
    },
    {
      id: "elsa",
      title: "خرید اکانت ELSA Speak السا اسپیک با ایمیل شما",
      category: "آموزش زبان",
      iconText: "ELSA",
      headerBgColor: "bg-cyan-50",
      headerTextColor: "text-cyan-700",
      rialPrice: 57_990_000,
    },
    {
      id: "spotify",
      title: "خرید اکانت اسپاتیفای Spotify قانونی بدون پرش",
      category: "موسیقی",
      iconText: "Spotify",
      headerBgColor: "bg-green-50",
      headerTextColor: "text-green-800",
      rialPrice: 4_150_000,
    },
    {
      id: "canva",
      title: "خرید اکانت Canva Pro کانوا پرو قانونی",
      category: "گرافیک و دیزاین",
      iconText: "Canva",
      headerBgColor: "bg-blue-50",
      headerTextColor: "text-blue-600",
      rialPrice: 590_000,
    },
  ];

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
      {/* Showcase 1: Amazing Discounts */}
      <ProductShowcaseSection
        title="تخفیف های شگفت انگیز"
        subtitle="فرصت محدود خرید اشتراک‌ها با بیشترین درصد تخفیف"
        icon={<Flame className="w-6 h-6 text-white animate-bounce" />}
        headerTheme="orange"
        viewAllLink="#discounts"
        products={discountProducts}
      />

      {/* Showcase 2: Best Sellers of This Month */}
      <ProductShowcaseSection
        title="پرفروش های این ماه"
        subtitle="سرویس‌های برگزیده و مورد اعتماد کاربران پارس پرمیوم"
        icon={<TrendingUp className="w-6 h-6 text-white" />}
        headerTheme="orange"
        viewAllLink="#bestsellers"
        products={bestSellers}
      />
    </section>
  );
};
