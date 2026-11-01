"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Package,
  Layers,
  CheckCircle2,
  AlertCircle,
  Loader2,
  DollarSign,
  Hash,
  Boxes,
  ShieldCheck,
  Globe2,
  Scale,
  Award,
} from "lucide-react";
import { formatPersianCurrency, toPersianDigits, cn } from "@/lib/utils";
import { ProductDto, createProduct, updateProduct } from "@/lib/api/admin";
import { toast } from "sonner";

export interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product?: ProductDto | null;
  onSuccess?: () => void;
}

export const ProductModal: React.FC<ProductModalProps> = ({
  isOpen,
  onClose,
  product,
  onSuccess,
}) => {
  const isEdit = Boolean(product && product.id);

  // Form State
  const [title, setTitle] = useState<string>("");
  const [sku, setSku] = useState<string>("");
  const [priceInToman, setPriceInToman] = useState<string>("");
  const [stockCount, setStockCount] = useState<string>("");
  const [isActive, setIsActive] = useState<boolean>(true);

  // Enterprise PIM Attributes
  const [brand, setBrand] = useState<string>("");
  const [countryOfOrigin, setCountryOfOrigin] = useState<string>("");
  const [warrantyMonths, setWarrantyMonths] = useState<string>("");
  const [weightKg, setWeightKg] = useState<string>("");

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Reset or populate form when modal opens or product changes
  useEffect(() => {
    if (isOpen) {
      if (product) {
        setTitle(product.title || "");
        setSku(product.sku || "");
        // Backend stores price in Rials; convert to Tomans for user editing
        const tomanVal = product.price ? Math.floor(product.price / 10) : 0;
        setPriceInToman(tomanVal > 0 ? String(tomanVal) : "");
        setStockCount(
          product.stock_count !== undefined && product.stock_count !== null
            ? String(product.stock_count)
            : "0"
        );
        setIsActive(product.is_active ?? true);

        // Core PIM Fields
        setBrand(product.brand || "");
        setCountryOfOrigin(product.country_of_origin || "");
        setWarrantyMonths(
          product.warranty_months !== null && product.warranty_months !== undefined
            ? String(product.warranty_months)
            : ""
        );
        setWeightKg(
          product.weight_kg !== null && product.weight_kg !== undefined
            ? String(product.weight_kg)
            : ""
        );
      } else {
        // Create mode defaults
        setTitle("");
        setSku("");
        setPriceInToman("");
        setStockCount("1");
        setIsActive(true);
        setBrand("");
        setCountryOfOrigin("");
        setWarrantyMonths("");
        setWeightKg("");
      }
      setErrors({});
    }
  }, [isOpen, product]);

  if (!isOpen) return null;

  const validateForm = () => {
    const errs: { [key: string]: string } = {};

    if (!title.trim()) {
      errs.title = "عنوان محصول الزامی است.";
    }

    if (!sku.trim()) {
      errs.sku = "شناسه / کد کالا (SKU) الزامی است.";
    }

    const numericPrice = Number(priceInToman.replace(/,/g, ""));
    if (priceInToman.trim() !== "" && (isNaN(numericPrice) || numericPrice < 0)) {
      errs.price = "قیمت باید عددی نامنفی باشد.";
    }

    const numericStock = Number(stockCount);
    if (stockCount.trim() === "" || isNaN(numericStock) || numericStock < 0) {
      errs.stock = "تعداد موجودی باید عددی معتبر (بزرگتر یا مساوی صفر) باشد.";
    }

    if (warrantyMonths.trim() !== "") {
      const numWarranty = Number(warrantyMonths);
      if (isNaN(numWarranty) || numWarranty < 0) {
        errs.warranty = "مدت گارانتی باید عدد معتبر (بر حسب ماه) باشد.";
      }
    }

    if (weightKg.trim() !== "") {
      const numWeight = Number(weightKg);
      if (isNaN(numWeight) || numWeight < 0) {
        errs.weight = "وزن باید عددی نامنفی باشد.";
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error("لطفاً خطاهای فرم را برطرف نمایید.");
      return;
    }

    setIsSaving(true);

    try {
      const cleanPriceToman = Number(priceInToman.replace(/,/g, "")) || 0;
      // Convert Toman to Rials for backend storage
      const priceInRials = Math.round(cleanPriceToman * 10);
      const cleanStock = Math.floor(Number(stockCount)) || 0;

      const payload: Partial<ProductDto> = {
        title: title.trim(),
        sku: sku.trim().toUpperCase(),
        price: priceInRials,
        stock_count: cleanStock,
        is_active: isActive,
        brand: brand.trim() || undefined,
        country_of_origin: countryOfOrigin.trim() || undefined,
        warranty_months:
          warrantyMonths.trim() !== "" ? Math.floor(Number(warrantyMonths)) : undefined,
        weight_kg: weightKg.trim() !== "" ? Number(weightKg) : undefined,
      };

      if (isEdit && product?.id) {
        await updateProduct(product.id, payload);
        toast.success("محصول با موفقیت ویرایش شد", {
          description: `اطلاعات «${title}» با موفقیت به‌روزرسانی شد.`,
        });
      } else {
        await createProduct(payload);
        toast.success("محصول جدید با موفقیت ایجاد شد", {
          description: `کالای «${title}» به کاتالوگ انبار اضافه شد.`,
        });
      }

      onSuccess?.();
      onClose();
    } catch (error: any) {
      console.error("Failed to save product:", error);

      const status = error?.response?.status;
      if (status === 404) {
        toast.error("اندپوینت سرور هنوز فعال نیست", {
          description:
            "مسیر ثبت و ویرایش محصول در بک‌اند هنوز مستقر نشده است.",
        });
      } else {
        toast.error("خطا در ذخیره اطلاعات محصول", {
          description:
            error?.response?.data?.detail ||
            "عملیات با خطا مواجه شد. لطفاً مجدداً تلاش نمایید.",
        });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const parsedTomanNumber = Number(priceInToman.replace(/,/g, "")) || 0;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 transition-opacity animate-in fade-in"
      onClick={onClose}
      dir="rtl"
    >
      <div
        className="w-full max-w-2xl bg-card rounded-3xl border border-border shadow-2xl p-6 sm:p-7 space-y-6 max-h-[90vh] overflow-y-auto font-sans text-foreground"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-600 flex items-center justify-center font-black">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-foreground">
                {isEdit ? "ویرایش مشخصات محصول (PIM)" : "افزودن محصول جدید به انبار (PIM)"}
              </h3>
              <span className="text-xs text-muted-foreground font-sans">
                {isEdit
                  ? `شناسه سیستمی: ${toPersianDigits(product?.id?.slice(0, 8))}`
                  : "ثبت کالا، مشخصات فنی، برند، کشور سازنده و کنترل موجودی"}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 1. Product Title (Full Width) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground block">
              عنوان محصول / نام قطعه <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (errors.title) setErrors((prev) => ({ ...prev, title: "" }));
              }}
              placeholder="مثال: موتور گیرلس ساسی ایتالیا ۶ نفره ۱ متر بر ثانیه"
              className={cn(
                "w-full bg-muted border rounded-xl py-2.5 px-3.5 text-xs font-bold text-foreground placeholder-muted-foreground focus:bg-card focus:outline-none focus:ring-1 transition-all text-right font-sans",
                errors.title
                  ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500"
                  : "border-border focus:border-amber-500 focus:ring-amber-500"
              )}
            />
            {errors.title && (
              <span className="text-[11px] font-bold text-rose-500 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.title}
              </span>
            )}
          </div>

          {/* 2. Grid: SKU & Brand */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* SKU */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground block">
                شناسه کالا (SKU) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={sku}
                onChange={(e) => {
                  setSku(e.target.value);
                  if (errors.sku) setErrors((prev) => ({ ...prev, sku: "" }));
                }}
                placeholder="مثال: MTR-SASSI-6P"
                className={cn(
                  "w-full bg-muted border rounded-xl py-2.5 px-3.5 text-xs font-bold text-foreground placeholder-muted-foreground focus:bg-card focus:outline-none focus:ring-1 transition-all text-left font-sans",
                  errors.sku
                    ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500"
                    : "border-border focus:border-amber-500 focus:ring-amber-500"
                )}
                dir="ltr"
              />
              {errors.sku && (
                <span className="text-[11px] font-bold text-rose-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.sku}
                </span>
              )}
            </div>

            {/* Brand */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground flex items-center gap-1">
                <Award className="w-3.5 h-3.5 text-amber-600" />
                <span>برند</span>
              </label>
              <input
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="مثال: ساسی (Sassi) / بهران / شیندلر"
                className="w-full bg-muted border border-border focus:border-amber-500 focus:ring-amber-500 rounded-xl py-2.5 px-3.5 text-xs font-bold text-foreground placeholder-muted-foreground focus:bg-card focus:outline-none focus:ring-1 transition-all text-right font-sans"
              />
            </div>
          </div>

          {/* 3. Grid: Price & Stock */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Price in Tomans */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-foreground block">
                  قیمت واحد (تومان)
                </label>
                {parsedTomanNumber > 0 && (
                  <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 font-sans">
                    معادل ریال: {formatPersianCurrency(parsedTomanNumber * 10)}
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={priceInToman}
                  onChange={(e) => {
                    setPriceInToman(e.target.value);
                    if (errors.price)
                      setErrors((prev) => ({ ...prev, price: "" }));
                  }}
                  placeholder="مثال: ۱۸۵۰۰۰۰۰ (۰ = استعلامی)"
                  className={cn(
                    "w-full bg-muted border rounded-xl py-2.5 pr-3.5 pl-14 text-xs font-bold text-foreground placeholder-muted-foreground focus:bg-card focus:outline-none focus:ring-1 transition-all text-left font-sans",
                    errors.price
                      ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500"
                      : "border-border focus:border-amber-500 focus:ring-amber-500"
                  )}
                  dir="ltr"
                />
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground pointer-events-none">
                  تومان
                </span>
              </div>
              {errors.price && (
                <span className="text-[11px] font-bold text-rose-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.price}
                </span>
              )}
            </div>

            {/* Stock Count */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground block">
                تعداد موجودی در انبار <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={stockCount}
                  onChange={(e) => {
                    setStockCount(e.target.value);
                    if (errors.stock)
                      setErrors((prev) => ({ ...prev, stock: "" }));
                  }}
                  placeholder="تعداد موجود در انبار"
                  className={cn(
                    "w-full bg-muted border rounded-xl py-2.5 pr-3.5 pl-14 text-xs font-bold text-foreground placeholder-muted-foreground focus:bg-card focus:outline-none focus:ring-1 transition-all text-left font-sans",
                    errors.stock
                      ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500"
                      : "border-border focus:border-amber-500 focus:ring-amber-500"
                  )}
                  dir="ltr"
                />
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground pointer-events-none">
                  عدد
                </span>
              </div>
              {errors.stock && (
                <span className="text-[11px] font-bold text-rose-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.stock}
                </span>
              )}
            </div>
          </div>

          {/* 4. Grid: Country of Origin, Warranty & Weight */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Country of Origin */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground flex items-center gap-1">
                <Globe2 className="w-3.5 h-3.5 text-blue-600" />
                <span>کشور سازنده</span>
              </label>
              <input
                type="text"
                value={countryOfOrigin}
                onChange={(e) => setCountryOfOrigin(e.target.value)}
                placeholder="مثال: ایتالیا / ایران / آلمان"
                className="w-full bg-muted border border-border focus:border-amber-500 focus:ring-amber-500 rounded-xl py-2.5 px-3.5 text-xs font-bold text-foreground placeholder-muted-foreground focus:bg-card focus:outline-none focus:ring-1 transition-all text-right font-sans"
              />
            </div>

            {/* Warranty (Months) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>گارانتی (ماه)</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={warrantyMonths}
                  onChange={(e) => {
                    setWarrantyMonths(e.target.value);
                    if (errors.warranty)
                      setErrors((prev) => ({ ...prev, warranty: "" }));
                  }}
                  placeholder="مثال: ۲۴"
                  className={cn(
                    "w-full bg-muted border rounded-xl py-2.5 pr-3.5 pl-12 text-xs font-bold text-foreground placeholder-muted-foreground focus:bg-card focus:outline-none focus:ring-1 transition-all text-left font-sans",
                    errors.warranty
                      ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500"
                      : "border-border focus:border-amber-500 focus:ring-amber-500"
                  )}
                  dir="ltr"
                />
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground pointer-events-none">
                  ماه
                </span>
              </div>
              {errors.warranty && (
                <span className="text-[11px] font-bold text-rose-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.warranty}
                </span>
              )}
            </div>

            {/* Weight (Kg) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground flex items-center gap-1">
                <Scale className="w-3.5 h-3.5 text-purple-600" />
                <span>وزن (کیلوگرم)</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={weightKg}
                  onChange={(e) => {
                    setWeightKg(e.target.value);
                    if (errors.weight)
                      setErrors((prev) => ({ ...prev, weight: "" }));
                  }}
                  placeholder="مثال: ۳۵۰.۵"
                  className={cn(
                    "w-full bg-muted border rounded-xl py-2.5 pr-3.5 pl-14 text-xs font-bold text-foreground placeholder-muted-foreground focus:bg-card focus:outline-none focus:ring-1 transition-all text-left font-sans",
                    errors.weight
                      ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500"
                      : "border-border focus:border-amber-500 focus:ring-amber-500"
                  )}
                  dir="ltr"
                />
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground pointer-events-none">
                  کیلوگرم
                </span>
              </div>
              {errors.weight && (
                <span className="text-[11px] font-bold text-rose-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.weight}
                </span>
              )}
            </div>
          </div>

          {/* 5. Active Status Toggle */}
          <div className="pt-2">
            <label className="flex items-center gap-3 p-3.5 rounded-2xl bg-muted/50 border border-border cursor-pointer hover:bg-muted transition-colors">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 rounded text-primary focus:ring-primary border-border cursor-pointer accent-primary"
              />
              <div className="flex-1">
                <span className="text-xs font-black text-foreground block">
                  کالا در کاتالوگ فعال و قابل سفارش باشد
                </span>
                <span className="text-[11px] text-muted-foreground block mt-0.5">
                  با غیرفعال کردن، این محصول در سایت عمومی برای مشتریان نمایش داده نمی‌شود.
                </span>
              </div>
            </label>
          </div>

          {/* Modal Actions */}
          <div className="pt-4 border-t border-border flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2.5 rounded-xl bg-muted hover:bg-muted/80 text-muted-foreground font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              انصراف
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs shadow-xs transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>در حال ذخیره‌سازی...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isEdit ? "ذخیره تغییرات" : "ثبت و افزودن کالا"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
