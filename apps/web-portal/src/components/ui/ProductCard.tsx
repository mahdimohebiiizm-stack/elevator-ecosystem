"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Check, Sparkles } from "lucide-react";
import { cn, formatToToman, toPersianDigits } from "@/lib/utils";

export interface ProductCardProps {
  id?: string;
  title: string;
  image?: string;
  iconText?: string;
  headerBgColor?: string;
  headerTextColor?: string;
  category?: string;
  rialPrice: number;
  originalRialPrice?: number;
  discountPercentage?: number;
  badgeText?: string;
  isInstantDelivery?: boolean;
  className?: string;
  onAddToCart?: () => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  id,
  title,
  image,
  iconText,
  headerBgColor,
  headerTextColor,
  category,
  rialPrice,
  originalRialPrice,
  discountPercentage,
  badgeText,
  isInstantDelivery = true,
  className,
  onAddToCart,
}) => {
  const formattedPrice = formatToToman(rialPrice);
  const formattedOriginalPrice = originalRialPrice ? formatToToman(originalRialPrice) : null;

  return (
    <div
      className={cn(
        "group relative flex flex-col justify-between overflow-hidden rounded-2xl bg-white border border-surface-border shadow-sm hover:shadow-xl hover:border-accent-brand/40 transition-all duration-300",
        className
      )}
    >
      {/* Upper Section: Brand Icon / Visual Container (Matching Pars Premium Screenshot style) */}
      <div
        className={cn(
          "relative flex items-center justify-center h-32 w-full p-4 transition-transform duration-300 group-hover:scale-[1.02]",
          headerBgColor || "bg-gradient-to-br from-surface-cream to-surface-warm"
        )}
      >
        {/* Floating Discount Tag */}
        {discountPercentage && discountPercentage > 0 && (
          <div className="absolute top-3 right-3 z-10 flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent-brand text-white text-[11px] font-bold shadow-md shadow-accent-brand/30">
            <span>{toPersianDigits(discountPercentage)}٪</span>
            <span>تخفیف</span>
          </div>
        )}

        {/* Instant Delivery Badge */}
        {isInstantDelivery && (
          <div className="absolute top-3 left-3 z-10 flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/90 backdrop-blur-sm text-primary-900 text-[10px] font-semibold border border-primary-900/10">
            <Check className="w-3 h-3 text-emerald-600" />
            <span>تحویل آنی</span>
          </div>
        )}

        {/* Brand Logo / Icon Display */}
        {image ? (
          <div className="relative w-16 h-16 rounded-2xl overflow-hidden bg-white shadow-md p-2 flex items-center justify-center">
            {/* Using standard img tag if local/remote image without fixed width constraints */}
            <img src={image} alt={title} className="w-full h-full object-contain" />
          </div>
        ) : (
          <div
            className={cn(
              "flex items-center justify-center w-16 h-16 rounded-2xl bg-white shadow-md border border-black/5 font-black text-2xl tracking-tight transition-transform group-hover:rotate-3",
              headerTextColor || "text-primary-900"
            )}
          >
            {iconText || title.slice(0, 2).toUpperCase()}
          </div>
        )}
      </div>

      {/* Middle Section: Title & Category Description */}
      <div className="p-4 flex-1 flex flex-col justify-between text-right space-y-2">
        {category && (
          <span className="text-[11px] font-semibold text-gray-500 block">
            {category}
          </span>
        )}

        <h3 className="text-sm font-bold text-gray-900 line-clamp-2 leading-snug group-hover:text-primary-700 transition-colors">
          {title}
        </h3>

        {badgeText && (
          <span className="inline-block self-start text-[10px] text-accent-brand bg-accent-brand/10 font-bold px-2 py-0.5 rounded-md">
            {badgeText}
          </span>
        )}
      </div>

      {/* Bottom Section: Price & Action CTA Area */}
      <div className="p-4 pt-0 border-t border-surface-border/60 bg-surface-light/40">
        <div className="flex items-center justify-between pt-3">
          {/* Action / Buy Button */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              if (onAddToCart) onAddToCart();
            }}
            className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary-900 text-white hover:bg-accent-brand transition-colors duration-200 shadow-sm shadow-primary-900/20 group/btn"
            aria-label={`خرید ${title}`}
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover/btn:-translate-x-0.5" />
          </button>

          {/* Pricing Stack */}
          <div className="flex flex-col items-end text-left">
            {formattedOriginalPrice && (
              <span className="text-[11px] text-gray-400 line-through font-medium">
                {formattedOriginalPrice}
              </span>
            )}
            <span className="text-base font-extrabold text-primary-900 tracking-tight">
              {formattedPrice}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
