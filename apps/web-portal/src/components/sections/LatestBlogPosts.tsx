"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Clock, Calendar, ArrowLeft } from "lucide-react";

export interface BlogPostItem {
  id: string;
  title: string;
  excerpt: string;
  image: string;
  date: string;
  readingTime: string;
  category: string;
  slug: string;
}

export const defaultElevatorBlogPosts: BlogPostItem[] = [
  {
    id: "standard-guide",
    title: "راهنمای گام‌به‌گام اخذ تاییدیه استاندارد ادواری آسانسور در استان کرمان",
    excerpt:
      "دریافت سالانه گواهینامه استاندارد ادواری آسانسور برای معتبر ماندن بیمه حوادث و حفظ سلامت سرنشینان الزامی است. در این مقاله جامع به بررسی مدارک، نحوه ثبت در سامانه اداره استاندارد و مراحل بازرسی فنی می‌پردازیم.",
    image: "/images/elevator-hero-corporate.jpg",
    date: "۲۵ مهر ۱۴۰۳",
    readingTime: "۶ دقیقه",
    category: "استاندارد و ایمنی",
    slug: "elevator-standard-guide-kerman",
  },
  {
    id: "gearless-vs-geared",
    title: "مقایسه تخصصی آسانسور گیرلس و گیربکس‌دار؛ کدام سیستم برای شما مناسب‌تر است؟",
    excerpt:
      "آسانسورهای مدرن گیرلس با حذف گیربکس مکانیکی، لرزش و ضربه استارت را به صفر رسانده و مصرف انرژی را تا ۵۰ درصد کاهش می‌دهند. مقایسه هزینه اولیه، هزینه استهلاک و شرایط نصب در پروژه‌های مختلف.",
    image: "/images/elevator-hero-luxury.jpg",
    date: "۱۴ مهر ۱۴۰۳",
    readingTime: "۸ دقیقه",
    category: "راهنمای انتخاب",
    slug: "gearless-vs-geared-elevator-comparison",
  },
  {
    id: "maintenance-importance",
    title: "چرا سرویس و نگهداری ماهانه آسانسور حیاتی است؟ خطرات قانونی عدم بیمه",
    excerpt:
      "عدم انعقاد قرارداد سرویس با شرکت دارای پروانه می‌تواند مسئولیت‌های کیفری سنگینی را متوجه مدیر ساختمان کند. بررسی چک‌لیست ۳۰ گانه بازرسی روغن، پاراشوت و میکروسوئیچ‌های ایمنی.",
    image: "/images/elevator-hero-cartoon.jpg",
    date: "۰۲ مهر ۱۴۰۳",
    readingTime: "۵ دقیقه",
    category: "سرویس و نگهداری",
    slug: "importance-of-elevator-maintenance",
  },
];

export interface LatestBlogPostsProps {
  posts?: BlogPostItem[];
}

export const LatestBlogPosts: React.FC<LatestBlogPostsProps> = ({
  posts = defaultElevatorBlogPosts,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % posts.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + posts.length) % posts.length);
  };

  const currentPost = posts[currentIndex] || posts[0];

  return (
    <section id="blog" className="w-full max-w-6xl mx-auto px-4 sm:px-6 my-16" dir="rtl">
      {/* Header Row */}
      <div className="flex items-center justify-between mb-8">
        <div className="hidden sm:block w-28"></div>

        {/* Center Title */}
        <div className="flex flex-col items-center text-center">
          <span className="text-amber-600 text-xs sm:text-sm tracking-[0.2em] font-extrabold uppercase mb-1">
            KNOWLEDGE BASE
          </span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900">
            مقالات و دانستنی‌های تخصصی
          </h2>
        </div>

        {/* Left Side Action Button */}
        <Link
          href="/#blog"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-amber-500 text-amber-400 hover:text-slate-950 font-black text-xs sm:text-sm transition-colors shadow-sm"
        >
          <span>آرشیو مقالات</span>
          <ArrowLeft className="w-4 h-4" />
        </Link>
      </div>

      {/* Main Blog Featured Card (Active carousel slide) */}
      <div className="rounded-3xl bg-white border border-slate-200/90 shadow-md hover:shadow-xl transition-all duration-300 p-6 sm:p-8 lg:p-10 mb-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Post Image */}
          <div className="lg:col-span-5 relative rounded-2xl overflow-hidden aspect-[16/10] bg-slate-900 border border-slate-800 shadow-md">
            <img
              src={currentPost.image}
              alt={currentPost.title}
              className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
            />
            <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-slate-900/90 backdrop-blur-md text-amber-400 font-black text-xs border border-amber-500/30">
              {currentPost.category}
            </div>
          </div>

          {/* Post Content */}
          <div className="lg:col-span-7 flex flex-col justify-between space-y-4 text-right">
            <div className="space-y-3">
              <div className="flex items-center gap-4 text-xs font-bold text-slate-400">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-amber-500" />
                  {currentPost.date}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                  زمان مطالعه: {currentPost.readingTime}
                </span>
              </div>

              <h3 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 leading-snug hover:text-amber-600 transition-colors">
                <Link href={`/#blog`}>{currentPost.title}</Link>
              </h3>

              <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-normal text-justify">
                {currentPost.excerpt}
              </p>
            </div>

            <div className="pt-4 flex items-center justify-between border-t border-slate-100">
              <Link
                href={`/#blog`}
                className="inline-flex items-center gap-2 text-sm font-black text-slate-900 hover:text-amber-600 transition-colors"
              >
                <span>مطالعه ادامه مقاله</span>
                <ChevronLeft className="w-4 h-4 text-amber-500 -scale-x-100" />
              </Link>

              {/* Slider Controls */}
              <div className="flex items-center gap-2" dir="ltr">
                <button
                  type="button"
                  onClick={handlePrev}
                  className="w-9 h-9 rounded-full bg-slate-100 hover:bg-amber-500 hover:text-slate-950 flex items-center justify-center transition-colors text-slate-700"
                  aria-label="قبلی"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-xs font-mono font-bold text-slate-500 px-1">
                  {currentIndex + 1} / {posts.length}
                </span>
                <button
                  type="button"
                  onClick={handleNext}
                  className="w-9 h-9 rounded-full bg-slate-100 hover:bg-amber-500 hover:text-slate-950 flex items-center justify-center transition-colors text-slate-700"
                  aria-label="بعدی"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LatestBlogPosts;