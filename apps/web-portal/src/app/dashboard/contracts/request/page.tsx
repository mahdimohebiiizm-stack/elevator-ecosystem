"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Wrench,
  Building,
  Cpu,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  FileCheck2,
  ShieldCheck,
  RefreshCw,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import { createContractRequest, ContractCreateDto } from "@/lib/api/contracts";
import { toPersianDigits, cn } from "@/lib/utils";
import { toast } from "sonner";

export default function ContractRequestWizardPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Form State
  const [formData, setFormData] = useState<ContractCreateDto>({
    building_name: "",
    building_address: "",
    postal_code: "",
    registration_plate: "",
    employer_national_id: "",
    elevator_type: "کششی گیربکس (Traction Geared)",
    usage_type: "مسافری",
    stops_count: 5,
    capacity_kg: 600,
    speed_ms: "1.0 m/s",
    payment_frequency: "FLEXIBLE",
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Step 1 Validation
  const validateStep1 = () => {
    const errors: Record<string, string> = {};
    if (!formData.building_name?.trim()) {
      errors.building_name = "لطفاً نام ساختمان یا مجتمع را وارد نمایید.";
    }
    if (!formData.building_address.trim() || formData.building_address.trim().length < 5) {
      errors.building_address = "لطفاً آدرس دقیق ساختمان را به طور کامل وارد نمایید.";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Step 2 Validation
  const validateStep2 = () => {
    const errors: Record<string, string> = {};
    if (!formData.elevator_type) {
      errors.elevator_type = "نوع آسانسور را انتخاب نمایید.";
    }
    if (!formData.stops_count || formData.stops_count < 1) {
      errors.stops_count = "تعداد توقف باید حداقل ۱ طبقه باشد.";
    }
    if (!formData.capacity_kg || formData.capacity_kg < 100) {
      errors.capacity_kg = "ظرفیت نامعتبر است (حداقل ۱۰۰ کیلوگرم).";
    }
    if (!formData.speed_ms?.trim()) {
      errors.speed_ms = "سرعت نامی آسانسور را مشخص فرمایید.";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = () => {
    if (currentStep === 1) {
      if (validateStep1()) setCurrentStep(2);
    } else if (currentStep === 2) {
      if (validateStep2()) setCurrentStep(3);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep1() || !validateStep2()) return;

    setIsSubmitting(true);
    try {
      await createContractRequest(formData);
      toast.success("درخواست قرارداد با موفقیت ثبت شد", {
        description: "کارشناسان فنی آسانرو در اسرع وقت هزینه سالیانه را برآورد خواهند کرد.",
      });
      router.push("/dashboard/contracts");
    } catch (error: any) {
      toast.error("خطا در ثبت درخواست قرارداد", {
        description:
          error?.response?.data?.detail || "برقراری ارتباط با سرور با خطا مواجه شد.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 font-sans text-foreground" dir="rtl">
      {/* 1. Header Bar */}
      <div className="bg-card rounded-3xl p-6 sm:p-7 border border-border shadow-[0_2px_15px_rgba(0,0,0,0.03)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center flex-shrink-0">
            <Wrench className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
              درخواست قرارداد سرویس و نگهداری
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground font-medium mt-0.5">
              مراحل سه‌گانه تکمیل مشخصات جهت صدور پیش‌فاکتور و آغاز پوشش خدمات دوره‌ای
            </p>
          </div>
        </div>

        <Link
          href="/dashboard/contracts"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-muted hover:bg-muted/80 text-foreground text-xs font-bold transition-all cursor-pointer"
        >
          <ArrowRight className="w-4 h-4" />
          <span>بازگشت به لیست قراردادها</span>
        </Link>
      </div>

      {/* 2. Step Indicator */}
      <div className="bg-card rounded-2xl p-4 sm:p-6 border border-border shadow-xs">
        <div className="flex items-center justify-between relative max-w-2xl mx-auto">
          {/* Progress Connecting Line */}
          <div className="absolute top-1/2 -translate-y-1/2 right-12 left-12 h-1 bg-muted -z-0">
            <div
              className="h-full bg-amber-500 transition-all duration-300"
              style={{
                width: currentStep === 1 ? "0%" : currentStep === 2 ? "50%" : "100%",
              }}
            />
          </div>

          {/* Step 1 */}
          <div className="flex flex-col items-center relative z-10">
            <div
              className={cn(
                "w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm transition-all shadow-xs",
                currentStep >= 1
                  ? "bg-amber-500 text-slate-950 font-black ring-4 ring-amber-500/20"
                  : "bg-muted text-muted-foreground"
              )}
            >
              ۱
            </div>
            <span
              className={cn(
                "text-xs font-bold mt-2",
                currentStep === 1 ? "text-amber-600 font-black" : "text-muted-foreground"
              )}
            >
              اطلاعات ساختمان
            </span>
          </div>

          {/* Step 2 */}
          <div className="flex flex-col items-center relative z-10">
            <div
              className={cn(
                "w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm transition-all shadow-xs",
                currentStep >= 2
                  ? "bg-amber-500 text-slate-950 font-black ring-4 ring-amber-500/20"
                  : "bg-muted text-muted-foreground"
              )}
            >
              ۲
            </div>
            <span
              className={cn(
                "text-xs font-bold mt-2",
                currentStep === 2 ? "text-amber-600 font-black" : "text-muted-foreground"
              )}
            >
              مشخصات فنی آسانسور
            </span>
          </div>

          {/* Step 3 */}
          <div className="flex flex-col items-center relative z-10">
            <div
              className={cn(
                "w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm transition-all shadow-xs",
                currentStep === 3
                  ? "bg-amber-500 text-slate-950 font-black ring-4 ring-amber-500/20"
                  : "bg-muted text-muted-foreground"
              )}
            >
              ۳
            </div>
            <span
              className={cn(
                "text-xs font-bold mt-2",
                currentStep === 3 ? "text-amber-600 font-black" : "text-muted-foreground"
              )}
            >
              بازبینی و تأیید نهایی
            </span>
          </div>
        </div>
      </div>

      {/* 3. Wizard Content Body */}
      <div className="bg-card rounded-3xl p-6 sm:p-8 border border-border shadow-xs">
        {/* ================= STEP 1: Building Details ================= */}
        {currentStep === 1 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex items-center gap-3 border-b border-border pb-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Building className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-black text-foreground">
                  مرحله ۱: موقعیت و اطلاعات ساختمان
                </h2>
                <p className="text-xs text-muted-foreground">
                  نشانی محل نصب آسانسور جهت مراجعه منظم تکنسین‌های سرویس ماهانه
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Building Name */}
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5">
                    نام ساختمان / مجتمع <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.building_name || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        building_name: e.target.value,
                      }))
                    }
                    placeholder="مثال: برج مسکونی آناهیتا یا مجتمع تجاری الماس"
                    className={cn(
                      "w-full px-4 py-3 rounded-2xl border text-sm text-foreground bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all",
                      formErrors.building_name ? "border-rose-500" : "border-border"
                    )}
                  />
                  {formErrors.building_name && (
                    <p className="text-xs text-rose-500 mt-1 font-bold flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {formErrors.building_name}
                    </p>
                  )}
                </div>

                {/* National ID */}
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5">
                    کد ملی یا شناسه ملی کارفرما / مدیر
                  </label>
                  <input
                    type="text"
                    maxLength={11}
                    value={formData.employer_national_id || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        employer_national_id: e.target.value,
                      }))
                    }
                    placeholder="۱۰ رقم کد ملی جهت ثبت در بیمه‌نامه و فاکتور رسمی"
                    className="w-full px-4 py-3 rounded-2xl border border-border text-sm font-mono text-foreground bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
                  />
                </div>

                {/* Postal Code */}
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5">
                    کد پستی ۱۰ رقمی ملک
                  </label>
                  <input
                    type="text"
                    maxLength={10}
                    value={formData.postal_code || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        postal_code: e.target.value,
                      }))
                    }
                    placeholder="کد پستی محل نصب آسانسور (اختیاری)"
                    className="w-full px-4 py-3 rounded-2xl border border-border text-sm font-mono text-foreground bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
                  />
                </div>

                {/* Registration Plate */}
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5">
                    پلاک ثبتی یا شهرداری ملک
                  </label>
                  <input
                    type="text"
                    value={formData.registration_plate || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        registration_plate: e.target.value,
                      }))
                    }
                    placeholder="مثال: پلاک ۲۴، فرعی ۱۲"
                    className="w-full px-4 py-3 rounded-2xl border border-border text-sm text-foreground bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">
                  نشانی کامل و دقیق ساختمان / مجتمع <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={formData.building_address}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      building_address: e.target.value,
                    }))
                  }
                  placeholder="مثال: استان کرمان، شهر کرمان، بلوار جمهوری اسلامی، خیابان شهید نامجو، پلاک ۲۴"
                  className={cn(
                    "w-full px-4 py-3 rounded-2xl border text-sm text-foreground bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all resize-none",
                    formErrors.building_address ? "border-rose-500" : "border-border"
                  )}
                />
                {formErrors.building_address && (
                  <p className="text-xs text-rose-500 mt-1 font-bold flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {formErrors.building_address}
                  </p>
                )}
                <p className="text-[11px] text-muted-foreground mt-1.5">
                  در صورت وجود نام نگهبانی یا نکات تردد خاص، می‌توانید در انتهای آدرس قید نمایید.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ================= STEP 2: Technical Specs ================= */}
        {currentStep === 2 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex items-center gap-3 border-b border-border pb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-black text-foreground">
                  مرحله ۲: مشخصات فنی و مهندسی آسانسور
                </h2>
                <p className="text-xs text-muted-foreground">
                  این پارامترها برای محاسبه حق‌الزحمه استاندارد و بیمه مسئولیت مدنی ضروری است
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Elevator Type */}
              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">
                  سیستم محرکه و نوع آسانسور <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.elevator_type}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, elevator_type: e.target.value }))
                  }
                  className="w-full px-4 py-3 rounded-2xl border border-border bg-background text-foreground text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 cursor-pointer"
                >
                  <option value="کششی گیربکس (Traction Geared)">
                    کششی گیربکس (Traction Geared)
                  </option>
                  <option value="کششی گیرلس (Gearless High-Speed)">
                    کششی گیرلس (Gearless High-Speed)
                  </option>
                  <option value="هیدرولیک (Hydraulic Passenger)">
                    هیدرولیک (Hydraulic Passenger)
                  </option>
                  <option value="روملس بدون موتورخانه (MRL)">
                    روملس بدون موتورخانه (MRL)
                  </option>
                  <option value="هوم‌لیفت / خانگی (Homelift)">
                    هوم‌لیفت / خانگی (Homelift)
                  </option>
                  <option value="باربر صنعتی / خودروبَر">باربر صنعتی / خودروبَر</option>
                </select>
              </div>

              {/* Usage Type */}
              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">
                  نوع کاربری آسانسور <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.usage_type || "مسافری"}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, usage_type: e.target.value }))
                  }
                  className="w-full px-4 py-3 rounded-2xl border border-border bg-background text-foreground text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 cursor-pointer"
                >
                  <option value="مسافری">مسافری (Passenger)</option>
                  <option value="باربری">باربری (Freight)</option>
                  <option value="بیمارستانی / برانکاردبر">بیمارستانی / برانکاردبر (Hospital)</option>
                  <option value="خودروبر">خودروبر (Car Lift)</option>
                </select>
              </div>

              {/* Stops Count */}
              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">
                  تعداد توقف (تعداد طبقات و ایستگاه‌ها) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={formData.stops_count}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      stops_count: parseInt(e.target.value) || 1,
                    }))
                  }
                  className={cn(
                    "w-full px-4 py-3 rounded-2xl border text-sm font-bold text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500",
                    formErrors.stops_count ? "border-rose-500" : "border-border"
                  )}
                />
                {formErrors.stops_count && (
                  <p className="text-xs text-rose-500 mt-1 font-bold">
                    {formErrors.stops_count}
                  </p>
                )}
              </div>

              {/* Capacity Kg */}
              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">
                  ظرفیت بار نامی (کیلوگرم) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step={50}
                  min={100}
                  max={5000}
                  value={formData.capacity_kg}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      capacity_kg: parseInt(e.target.value) || 100,
                    }))
                  }
                  className={cn(
                    "w-full px-4 py-3 rounded-2xl border text-sm font-bold text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500",
                    formErrors.capacity_kg ? "border-rose-500" : "border-border"
                  )}
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  مثال: ۴۵۰ (۶ نفره) یا ۶۰۰ (۸ نفره)
                </p>
                {formErrors.capacity_kg && (
                  <p className="text-xs text-rose-500 mt-1 font-bold">
                    {formErrors.capacity_kg}
                  </p>
                )}
              </div>

              {/* Speed */}
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-foreground mb-1.5">
                  سرعت نامی آسانسور (متر بر ثانیه) <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.speed_ms}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, speed_ms: e.target.value }))
                  }
                  className="w-full px-4 py-3 rounded-2xl border border-border bg-background text-foreground text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 cursor-pointer"
                >
                  <option value="0.5 m/s">0.5 m/s (سرعت آرام - هیدرولیک / مسکونی کم‌تراکم)</option>
                  <option value="1.0 m/s">1.0 m/s (استاندارد مسکونی)</option>
                  <option value="1.6 m/s">1.6 m/s (تندرو - برج‌ها و مجتمع‌های اداری)</option>
                  <option value="2.0 m/s">2.0 m/s (پر سرعت گیرلس)</option>
                  <option value="2.5 m/s">2.5 m/s (فوق سریع)</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* ================= STEP 3: Review & Submit ================= */}
        {currentStep === 3 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex items-center gap-3 border-b border-border pb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-black text-foreground">
                  مرحله ۳: انتخاب شیوه پرداخت و بررسی نهایی
                </h2>
                <p className="text-xs text-muted-foreground">
                  دوره پرداخت پیشنهادی خود را انتخاب نموده و صحت اطلاعات را بررسی فرمایید
                </p>
              </div>
            </div>

            {/* Payment Frequency Selector */}
            <div className="bg-card rounded-2xl p-4 border border-border space-y-3">
              <label className="block text-xs font-bold text-foreground">
                شیوه و دوره تسویه حساب قرارداد سرویس:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  {
                    id: "MONTHLY",
                    title: "ماهانه (پس از هر بازدید)",
                    desc: "پرداخت حق‌الزحمه در پایان هر ماه و صدور برگه چک‌لیست",
                  },
                  {
                    id: "QUARTERLY",
                    title: "سه‌ماهه (فصلی)",
                    desc: "تخفیف ویژه دوره‌ای و تسویه در ۴ قسط مساوی سالیانه",
                  },
                  {
                    id: "FLEXIBLE",
                    title: "توافقی / منعطف",
                    desc: "تعیین زمان‌بندی و شرایط اقساطی با هماهنگی امور مالی",
                  },
                ].map((option) => (
                  <div
                    key={option.id}
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        payment_frequency: option.id as any,
                      }))
                    }
                    className={cn(
                      "p-3.5 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between text-right",
                      formData.payment_frequency === option.id
                        ? "border-amber-500 bg-amber-500/10 shadow-xs"
                        : "border-border hover:border-border/80 bg-background"
                    )}
                  >
                    <div>
                      <span className="block text-xs font-black text-foreground">
                        {option.title}
                      </span>
                      <span className="block text-[11px] text-muted-foreground mt-1 leading-relaxed">
                        {option.desc}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Summary Review Card */}
            <div className="bg-muted/40 rounded-2xl p-5 border border-border space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-muted-foreground block mb-1">نام ساختمان / مجتمع:</span>
                  <span className="font-bold text-foreground text-sm">
                    {formData.building_name || "-"}
                  </span>
                </div>

                <div>
                  <span className="text-muted-foreground block mb-1">کد ملی کارفرما / مدیر:</span>
                  <span className="font-bold text-foreground text-sm font-mono">
                    {formData.employer_national_id ? toPersianDigits(formData.employer_national_id) : "ثبت نشده (تکمیل هنگام عقد قرارداد)"}
                  </span>
                </div>

                <div>
                  <span className="text-muted-foreground block mb-1">نوع و سیستم آسانسور:</span>
                  <span className="font-bold text-foreground text-sm">
                    {formData.elevator_type}
                  </span>
                </div>

                <div>
                  <span className="text-muted-foreground block mb-1">نوع کاربری:</span>
                  <span className="font-bold text-foreground text-sm">
                    {formData.usage_type || "مسافری"}
                  </span>
                </div>

                <div>
                  <span className="text-muted-foreground block mb-1">تعداد توقف:</span>
                  <span className="font-bold text-foreground text-sm">
                    {toPersianDigits(formData.stops_count)} ایستگاه
                  </span>
                </div>

                <div>
                  <span className="text-muted-foreground block mb-1">ظرفیت بار نامی:</span>
                  <span className="font-bold text-foreground text-sm">
                    {toPersianDigits(formData.capacity_kg || 600)} کیلوگرم
                  </span>
                </div>

                <div>
                  <span className="text-muted-foreground block mb-1">سرعت حرکتی:</span>
                  <span className="font-bold text-foreground text-sm">
                    {formData.speed_ms}
                  </span>
                </div>

                <div>
                  <span className="text-muted-foreground block mb-1">دوره پرداخت انتخابی:</span>
                  <span className="font-bold text-foreground text-sm">
                    {formData.payment_frequency === "MONTHLY"
                      ? "ماهانه"
                      : formData.payment_frequency === "QUARTERLY"
                      ? "سه‌ماهه (فصلی)"
                      : "توافقی / منعطف"}
                  </span>
                </div>

                <div>
                  <span className="text-muted-foreground block mb-1">کد پستی / پلاک ثبتی:</span>
                  <span className="font-bold text-foreground text-sm font-mono">
                    {[formData.postal_code, formData.registration_plate].filter(Boolean).join(" - ") || "ثبت نشده"}
                  </span>
                </div>

                <div className="sm:col-span-2 md:col-span-3 pt-2 border-t border-border/60">
                  <span className="text-muted-foreground block mb-1">نشانی کامل ساختمان:</span>
                  <p className="font-bold text-foreground leading-relaxed text-sm">
                    {formData.building_address}
                  </p>
                </div>
              </div>
            </div>

            {/* Service Guarantee Banner */}
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <p className="font-black text-amber-900">
                  تضمین رسمی ایمنی و خدمات استاندارد آسانرو اطمینان امیر کرمان
                </p>
                <p className="text-amber-800/80 leading-relaxed">
                  کلیه قراردادهای منعقده شامل بازدید منظم ماهانه بر اساس استاندارد ملی آسانسور،
                  ارائه چک‌لیست معتبر، پاسخگویی ۲۴ ساعته به خرابی‌های اضطراری و تحت پوشش بیمه
                  مسئولیت مدنی شرکت می‌باشند.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Wizard Controls Footer */}
        <div className="flex items-center justify-between pt-6 border-t border-border mt-8">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={handleBack}
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-muted hover:bg-muted/80 text-foreground text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
            >
              <ArrowRight className="w-4 h-4" />
              <span>مرحله قبلی</span>
            </button>
          ) : (
            <div />
          )}

          {currentStep < 3 ? (
            <button
              type="button"
              onClick={handleNext}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <span>مرحله بعدی</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-7 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-lg shadow-emerald-600/20 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <FileCheck2 className="w-4 h-4" />
              )}
              <span>{isSubmitting ? "در حال ثبت درخواست..." : "تأیید و ارسال نهایی درخواست"}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
