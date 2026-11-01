"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { PhoneCall, Mail, MapPin, Clock, ShieldCheck, Wrench, ChevronLeft } from "lucide-react";
import { toPersianDigits } from "@/lib/utils";
import { fetchPublicSiteSettings } from "@/lib/api/public";

export const Footer: React.FC = () => {
  const [contacts, setContacts] = useState({
    phone: "09133982695",
    email: "etminannamirrelee@gmail.com",
    about: "شرکت آسانرو اطمینان امیر کرمان با مدیریت مهندس محبی، مجری پروژه‌های مهندسی نصب، راه‌اندازی و نگهداری آسانسورهای کششی، گیرلس و هیدرولیک در استان کرمان است. این مجموعه با بهره‌گیری از تکنسین‌های مجرب، تضمین ایمنی و استانداردهای روز بین‌المللی را به کارفرمایان محترم ارائه می‌نماید.",
  });

  useEffect(() => {
    fetchPublicSiteSettings()
      .then((res) => {
        if (res.data) {
          setContacts({
            phone: res.data.contact_phone || "09133982695",
            email: res.data.contact_email || "etminannamirrelee@gmail.com",
            about: res.data.about_text || contacts.about,
          });
        }
      })
      .catch(() => {});
  }, []);

  const scrollToTop = () => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <footer id="contact" className="w-full bg-slate-950 text-white mt-16 border-t-4 border-amber-500" dir="rtl">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Top Utility Bar: Elevator Logo (Right), Phone & Working Hours (Center), Back to Top (Left) */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 py-8 border-b border-slate-800 text-xs">
          {/* Elevator Logo & Company Name */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-amber-400 shadow-lg bg-slate-900 shrink-0">
              <img
                src="/images/elevator-logo.png"
                alt="آسانرو اطمینان امیر کرمان"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex flex-col text-right">
              <span className="text-lg font-black text-white leading-tight">
                آسانرو اطمینان امیر کرمان
              </span>
              <span className="text-xs font-bold text-amber-400 mt-0.5">
                طراحی، نصب، سرویس و نگهداری تخصصی انواع آسانسور و پله برقی
              </span>
            </div>
          </div>

          {/* Direct Phone & Management in Center */}
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-slate-200">
            <span className="font-bold text-amber-400 flex items-center gap-1">
              <PhoneCall className="w-4 h-4" />
              تماس مستقیم:
            </span>
            <a
              href={`tel:${contacts.phone.replace(/\s+/g, "")}`}
              className="font-mono font-black text-base sm:text-lg text-white hover:text-amber-400 tracking-wider transition-colors"
            >
              {toPersianDigits(contacts.phone)}
            </a>
            <span className="mx-1 text-slate-600">|</span>
            <span className="font-bold text-amber-300">مدیریت: محبی</span>
            <span className="mx-1 text-slate-600">|</span>
            <span className="text-slate-300">پاسخگویی و اعزام کارشناس ۲۴/۷</span>
          </div>

          {/* Back to top Button */}
          <div>
            <button
              type="button"
              onClick={scrollToTop}
              className="px-5 py-2.5 rounded-full bg-amber-500 text-slate-950 hover:bg-amber-400 font-black text-xs transition-colors shadow-md"
            >
              بازگشت به بالا
            </button>
          </div>
        </div>

        {/* Middle Section: Quick Links, Contact Info, Trust & Standard Badges */}
        <div className="py-10 grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          {/* Col 1: About & Info (4 cols) */}
          <div className="md:col-span-4 flex flex-col space-y-4 text-right">
            <h3 className="text-base font-black text-amber-400">
              درباره آسانرو اطمینان امیر کرمان
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal text-justify">
              {contacts.about}
            </p>
            <div className="pt-2 flex flex-col space-y-2 text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
                <span>استان کرمان، دفتر مهندسی و پشتیبانی فنی آسانرو اطمینان امیر</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-amber-400 shrink-0" />
                <a href={`mailto:${contacts.email}`} className="font-mono hover:text-amber-300">
                  {contacts.email}
                </a>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                <span>ساعات کاری: همه‌روزه از ۸:۰۰ الی ۲۰:۰۰ (امداد خرابی شبانه‌روزی)</span>
              </div>
            </div>
          </div>

          {/* Col 2: Services Quick Links (3 cols) */}
          <div className="md:col-span-3 flex flex-col space-y-3 text-right">
            <h3 className="text-base font-black text-amber-400">
              خدمات تخصصی آسانسور
            </h3>
            <div className="flex flex-col space-y-2 text-xs font-bold text-slate-300">
              <Link href="/#services" className="hover:text-amber-400 transition-colors flex items-center gap-1.5">
                <ChevronLeft className="w-3.5 h-3.5 text-amber-500" />
                نصب و راه‌اندازی آسانسورهای کششی و گیرلس
              </Link>
              <Link href="/#services" className="hover:text-amber-400 transition-colors flex items-center gap-1.5">
                <ChevronLeft className="w-3.5 h-3.5 text-amber-500" />
                قرارداد سرویس و نگهداری ماهانه دوره‌ای
              </Link>
              <Link href="/#services" className="hover:text-amber-400 transition-colors flex items-center gap-1.5">
                <ChevronLeft className="w-3.5 h-3.5 text-amber-500" />
                بازسازی، مدرن‌سازی و تزئینات استیل کابین
              </Link>
              <Link href="/#services" className="hover:text-amber-400 transition-colors flex items-center gap-1.5">
                <ChevronLeft className="w-3.5 h-3.5 text-amber-500" />
                اخذ استاندارد ادواری و بیمه مسئولیت مدنی
              </Link>
              <Link href="/#services" className="hover:text-amber-400 transition-colors flex items-center gap-1.5">
                <ChevronLeft className="w-3.5 h-3.5 text-amber-500" />
                تامین قطعات و موتورهای ایتالیایی و ایرانی
              </Link>
              <Link href="/products" className="hover:text-amber-400 transition-colors flex items-center gap-1.5">
                <ChevronLeft className="w-3.5 h-3.5 text-amber-500" />
                کاتالوگ و فروشگاه آنلاین قطعات
              </Link>
              <Link href="/dashboard/tickets" className="hover:text-amber-400 transition-colors flex items-center gap-1.5">
                <ChevronLeft className="w-3.5 h-3.5 text-amber-500" />
                ثبت تیکت و پشتیبانی فنی ۲۴ ساعته
              </Link>
              <Link href="/dashboard/contracts/request" className="hover:text-amber-400 transition-colors flex items-center gap-1.5">
                <ChevronLeft className="w-3.5 h-3.5 text-amber-500" />
                درخواست بازدید و مشاوره کارشناسی رایگان
              </Link>
            </div>
          </div>

          {/* Col 3: Trust, Engineering Licenses & Standard Certifications (5 cols) */}
          <div className="md:col-span-5 flex flex-col items-center md:items-end space-y-4">
            <h3 className="text-base font-black text-amber-400 text-right w-full">
              مجوزها، استانداردها و گواهی‌های کیفی
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full">
              {/* Badge 1: استاندارد ملی */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col items-center justify-center text-center shadow-md hover:border-amber-500/50 transition-colors">
                <ShieldCheck className="w-7 h-7 text-amber-400 mb-1" />
                <span className="text-[11px] font-black text-white">استاندارد ملی</span>
                <span className="text-[9px] text-slate-400 mt-0.5">تاییدیه اداره استاندارد</span>
              </div>

              {/* Badge 2: بیمه حوادث */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col items-center justify-center text-center shadow-md hover:border-amber-500/50 transition-colors">
                <div className="w-7 h-7 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-black text-xs mb-1">
                  بیمه
                </div>
                <span className="text-[11px] font-black text-white">بیمه مسئولیت</span>
                <span className="text-[9px] text-slate-400 mt-0.5">پوشش حوادث سرنشین</span>
              </div>

              {/* Badge 3: سندیکای آسانسور */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col items-center justify-center text-center shadow-md hover:border-amber-500/50 transition-colors">
                <Wrench className="w-7 h-7 text-amber-400 mb-1" />
                <span className="text-[11px] font-black text-white">سندیکا</span>
                <span className="text-[9px] text-slate-400 mt-0.5">عضو سندیکای آسانسور</span>
              </div>

              {/* Badge 4: ایمنی و کنترل کیفی */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col items-center justify-center text-center shadow-md hover:border-amber-500/50 transition-colors">
                <div className="w-7 h-7 rounded-full bg-slate-800 text-amber-400 flex items-center justify-center font-mono font-black text-xs mb-1">
                  ISO
                </div>
                <span className="text-[11px] font-black text-white">کنترل کیفی</span>
                <span className="text-[9px] text-slate-400 mt-0.5">تست ایمنی پاراشوت</span>
              </div>
            </div>

            {/* Emergency Hotline callout */}
            <div className="w-full bg-gradient-to-r from-amber-500/10 via-amber-500/20 to-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-center justify-between text-right">
              <div>
                <span className="text-xs font-bold text-slate-300 block">خط ویژه امداد آسانسور کرمان:</span>
                <a href="tel:09133982695" className="text-lg font-black font-mono text-amber-400">
                  ۰۹۱۳۳۹۸۲۶۹۵
                </a>
              </div>
              <div className="text-left">
                <span className="px-3 py-1 rounded-full bg-amber-500 text-slate-950 font-black text-xs">
                  مدیریت: محبی
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Gold & Slate Bottom Copyright Strip */}
      <div className="w-full bg-amber-500 py-3 px-4 text-center">
        <p className="text-xs sm:text-sm font-black text-slate-950">
          © ۱۴۰۳ تمامی حقوق مادی و معنوی این وب‌سایت متعلق به شرکت آسانرو اطمینان امیر کرمان می‌باشد. مدیریت: محبی | تماس: ۰۹۱۳۳۹۸۲۶۹۵
        </p>
      </div>
    </footer>
  );
};

export default Footer;