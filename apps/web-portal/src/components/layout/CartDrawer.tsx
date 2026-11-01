"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  X,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  ShieldCheck,
  FileText,
} from "lucide-react";
import { useCartStore } from "@/store/useCartStore";
import { useAuthStore } from "@/store/useAuthStore";
import { formatToToman, toPersianDigits } from "@/lib/utils";

export const CartDrawer: React.FC = () => {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const {
    items,
    isOpen,
    toggleCart,
    removeItem,
    updateQuantity,
    clearCart,
    getTotalPrice,
    getTotalItems,
  } = useCartStore();
  const { isAuthenticated, toggleLoginModal } = useAuthStore();

  const handleCheckoutClick = () => {
    if (!isAuthenticated) {
      toggleCart(false);
      toggleLoginModal(true);
      return;
    }
    toggleCart(false);
    router.push("/dashboard/orders");
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        toggleCart(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, toggleCart]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!mounted) return null;

  const totalRawPrice = getTotalPrice();
  const totalItemsCount = getTotalItems();
  const rawTotalFormatted = formatToToman(totalRawPrice).replace(" تومان", "");

  return (
    <>
      {/* Backdrop Overlay */}
      <div
        className={`fixed inset-0 z-50 bg-black/75 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => toggleCart(false)}
        aria-hidden="true"
      />

      {/* Slide-over Drawer Panel - 100dvh Dynamic Viewport Height, Anchored to Right */}
      <aside
        id="cart-drawer"
        dir="rtl"
        className={`fixed top-0 bottom-0 right-0 h-[100dvh] w-full sm:w-[450px] bg-[#0b1221] z-50 flex flex-col shadow-2xl transition-transform duration-500 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
        aria-label="سبد استعلام قطعات"
      >
        {/* Header (Fixed at top - Compact & Slim) */}
        <div className="py-4 px-6 border-b border-slate-800/80 flex justify-between items-center bg-[#0b1221] z-10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-500 flex items-center justify-center shrink-0">
              <ShoppingCart className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h2 className="text-base font-black text-white leading-tight">
                سبد استعلام قطعات
              </h2>
              <span className="text-xs font-bold text-slate-400">
                {totalItemsCount > 0
                  ? `${toPersianDigits(totalItemsCount)} قلم کالا انتخاب شده`
                  : "پیش‌فاکتور رسمی و خرید مستقیم"}
              </span>
            </div>
          </div>

          {/* Action buttons in header: Clear Cart + Close Button */}
          <div className="flex items-center gap-2">
            {items.length > 0 && (
              <button
                type="button"
                onClick={clearCart}
                className="px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-bold transition-colors flex items-center gap-1.5"
                title="تخلیه کامل سبد استعلام"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">تخلیه سبد</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => toggleCart(false)}
              className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-700/80 hover:border-amber-500 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
              aria-label="بستن سبد استعلام"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body (Scrollable - Maximized Vertical Space) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 custom-scrollbar">
          {items.length === 0 ? (
            <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center py-12 px-4 space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-slate-900/80 border border-slate-800 flex items-center justify-center text-slate-600 mb-2">
                <ShoppingCart className="w-8 h-8 text-amber-500/50" />
              </div>
              <h3 className="text-base font-black text-white">
                سبد استعلام شما خالی است
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 max-w-xs leading-relaxed">
                قطعات و تجهیزات مورد نیاز خود را از بخش تامین قطعات به سبد استعلام اضافه نمایید.
              </p>
              <button
                type="button"
                onClick={() => {
                  toggleCart(false);
                  const el = document.getElementById("packages");
                  if (el) el.scrollIntoView({ behavior: "smooth" });
                }}
                className="mt-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-amber-500/30 text-amber-500 text-xs font-black transition-colors"
              >
                مشاهده و انتخاب قطعات
              </button>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 sm:gap-4 bg-slate-900/40 border border-slate-800 rounded-2xl p-3 sm:p-4 transition-colors hover:border-slate-700"
              >
                {/* Left side: Thumbnail Image */}
                <div className="w-16 h-16 rounded-xl bg-slate-800 shrink-0 overflow-hidden flex items-center justify-center border border-slate-800/80">
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <ShoppingCart className="w-6 h-6 text-slate-500" />
                  )}
                </div>

                {/* Middle (Content) - Strictly Constrained to prevent layout push */}
                <div className="flex-1 min-w-0 overflow-hidden flex flex-col gap-1 text-right">
                  <h3 className="text-sm font-bold truncate text-white" title={item.name}>
                    {item.name}
                  </h3>
                  {item.category && (
                    <span className="text-xs text-slate-400 truncate">
                      {item.category}
                    </span>
                  )}
                  <span className="text-amber-500 text-sm font-bold mt-0.5">
                    {item.priceFormatted || formatToToman(item.price)}
                  </span>
                </div>

                {/* Right side (Actions: Quantity Pill + Delete) */}
                <div className="flex flex-col items-end shrink-0 gap-1.5">
                  {/* Quantity pill */}
                  <div className="flex items-center bg-slate-950 rounded-full border border-slate-800 h-8 px-1">
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.id, -1)}
                      className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-amber-500 transition-colors"
                      aria-label="کاهش تعداد"
                    >
                      <Minus size={13} />
                    </button>
                    <span className="w-6 text-center text-xs font-mono font-bold text-white select-none">
                      {toPersianDigits(item.quantity)}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.id, 1)}
                      className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-amber-500 transition-colors"
                      aria-label="افزایش تعداد"
                    >
                      <Plus size={13} />
                    </button>
                  </div>

                  {/* Delete button */}
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="text-rose-500/70 hover:text-rose-500 p-1 transition-colors self-end"
                    aria-label="حذف کالا"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer (Fixed at bottom - Compact & Polished) */}
        {items.length > 0 && (
          <div className="p-4 border-t border-slate-800/80 bg-slate-900/50 backdrop-blur-md z-10 shrink-0">
            {/* Total Price Row with Horizontal Typography Alignment */}
            <div className="flex justify-between items-center mb-4">
              <span className="text-slate-400 text-sm">جمع پیش‌فاکتور:</span>
              <div className="flex items-center gap-1.5 whitespace-nowrap">
                <span className="text-xl sm:text-2xl font-black text-white">
                  {rawTotalFormatted}
                </span>
                <span className="text-amber-500 text-sm">تومان</span>
              </div>
            </div>

            {/* CTA Button: Protected by Auth State */}
            <button
              type="button"
              onClick={handleCheckoutClick}
              className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold py-3.5 rounded-xl transition-colors duration-300 flex justify-center items-center gap-2 active:scale-[0.99] shadow-lg shadow-amber-500/15 text-sm sm:text-base cursor-pointer"
            >
              <FileText className="w-5 h-5 text-black" />
              <span>ثبت پیش‌فاکتور و استعلام رسمی</span>
            </button>

            <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 font-medium mt-2.5">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span>تضمین اصالت قطعات و فاکتور رسمی شرکت</span>
            </div>
          </div>
        )}
      </aside>
    </>
  );
};

export default CartDrawer;
