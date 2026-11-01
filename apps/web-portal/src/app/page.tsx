import React from "react";
import { HeroSection } from "@/components/sections/HeroSection";
import { CoreServices } from "@/components/sections/CoreServices";
import { BestSellers } from "@/components/sections/BestSellers";
import { CategoriesGrid } from "@/components/sections/CategoriesGrid";
import { PremiumFeatures } from "@/components/sections/PremiumFeatures";
import { LatestBlogPosts } from "@/components/sections/LatestBlogPosts";
import { AboutUsSection } from "@/components/sections/AboutUsSection";

export default function HomePage() {
  return (
    <div className="w-full pb-16 font-sans">
      {/* 1. Hero Section (Slider + Cutout) */}
      <HeroSection />

      {/* 2. Core Services Grid (نصب، سرویس دوره‌ای، بازسازی، تامین قطعات) */}
      <CoreServices />

      {/* 3. Best Sellers & Engineering Packages (Industrial Luxury Funnel) */}
      <BestSellers />

      {/* 4. Categories Grid (دسته‌بندی تخصصی آسانسورها) */}
      <CategoriesGrid />

      {/* 5. Premium Features / Why Us (چرا ما؟) */}
      <PremiumFeatures />

      {/* 6. Latest Blog Posts (مقالات و دانستنی‌های تخصصی) */}
      <LatestBlogPosts />

      {/* 7. About Us Section (درباره شرکت و استانداردها) */}
      <AboutUsSection />
    </div>
  );
}
