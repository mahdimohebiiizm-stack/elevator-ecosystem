"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Package,
  Search,
  ShoppingCart,
  Check,
  ShieldCheck,
  SlidersHorizontal,
  RefreshCw,
  Sparkles,
  ArrowRight,
  Boxes,
  Layers,
  MapPin,
  Clock,
} from "lucide-react";
import { toPersianDigits, formatPersianCurrency, cn } from "@/lib/utils";
import { fetchPublicProducts } from "@/lib/api/public";
import { ProductDto } from "@/lib/api/admin";
import { useCartStore } from "@/store/useCartStore";
import { toast } from "sonner";

export default function PublicProductsCatalogPage() {
  const [products, setProducts] = useState<ProductDto[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  const { addItem, toggleCart } = useCartStore();

  const loadProducts = async () => {
    setIsLoading(true);
    try {
      const res = await fetchPublicProducts({ limit: 100 });
      const data = Array.isArray(res.data) ? res.data : (res as any)?.data || [];
      setProducts(data);
    } catch (error: any) {
      console.error("Failed to load public products:", error);
      toast.error("خطا در بارگذاری محصولات", {
        description: "برقراری ارتباط با کاتالوگ فروشگاه با خطا مواجه شد.",
      });
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  // Extract unique category names from loaded products
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category?.name) set.add(p.category.name);
    });
    return Array.from(set);
  }, [products]);

  // Filtered products list
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Category filter
      if (selectedCategory !== "ALL" && p.category?.name !== selectedCategory) {
        return false;
      }
      // Search query
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const title = (p.title || "").toLowerCase();
      const sku = (p.sku || "").toLowerCase();
      const brand = (p.brand || "").toLowerCase();
      const cat = (p.category?.name || "").toLowerCase();
      return (
        title.includes(q) || sku.includes(q) || brand.includes(q) || cat.includes(q)
      );
    });
  }, [products, selectedCategory, searchQuery]);

  const handleAddToCart = (product: ProductDto) => {
    addItem({
      id: product.id,
      name: product.title,
      price: product.price,
      image: "/images/elevator-hero-cutout.png",
      category: product.category?.name || "قطعات آسانسور",
    });
    toggleCart(true);
    toast.success("محصول به سبد خرید اضافه گردید.", {
      description: product.title,
    });
  };

  return (
    <div className="w-full min-h-screen bg-slate-50/60 pb-20 font-sans" dir="rtl">
      {/* 1. Page Header & Hero Banner */}
      <section className="w-full bg-[#0f172a] text-white py-12 md:py-16 border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-bold">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <span>ضمانت اصالت و استاندارد ملی کلیه قطعات</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
                کاتالوگ تخصصی قطعات و پکیج‌های آسانسور
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
                تامین و توزیع مستقیم تجهیزات مکانیکال و الکتریکال، موتورگیربکس، ریل، درب اتوماتیک و قطعات یدکی استاندارد با تحویل فوری در سراسر استان کرمان.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span className="px-4 py-2 rounded-2xl bg-white/10 border border-white/20 text-xs font-bold text-slate-200">
                {isLoading ? "..." : `${toPersianDigits(products.length)} کالای فعال`}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Main Catalog Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-8 space-y-6">
        {/* Search & Category Filter Toolbar */}
        <div className="bg-card rounded-2xl p-4 border border-border shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجوی نام قطعه، برند، کد کالا (SKU) یا دسته‌بندی..."
              className="w-full pl-4 pr-10 py-2.5 rounded-xl bg-muted/40 border border-border text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all font-sans"
            />
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            <button
              type="button"
              onClick={() => setSelectedCategory("ALL")}
              className={cn(
                "px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer",
                selectedCategory === "ALL"
                  ? "bg-foreground text-background shadow-xs"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              همه ({toPersianDigits(products.length)})
            </button>
            {categories.map((catName) => {
              const count = products.filter((p) => p.category?.name === catName).length;
              return (
                <button
                  key={catName}
                  type="button"
                  onClick={() => setSelectedCategory(catName)}
                  className={cn(
                    "px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer",
                    selectedCategory === catName
                      ? "bg-amber-500 text-slate-950 font-black shadow-xs"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  )}
                >
                  {catName} ({toPersianDigits(count)})
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Product Grid (Strictly grid-cols-1 sm:grid-cols-2 lg:grid-cols-4) */}
        {isLoading ? (
          // Skeleton Grid Loader
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="bg-card rounded-3xl border border-border p-4 space-y-4 shadow-xs animate-pulse flex flex-col justify-between h-[360px]"
              >
                <div className="w-full h-40 bg-muted rounded-2xl" />
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted/60 rounded w-1/2" />
                </div>
                <div className="pt-3 border-t border-border flex items-center justify-between">
                  <div className="h-5 bg-muted rounded w-24" />
                  <div className="h-9 bg-muted rounded-xl w-24" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          // Empty State
          <div className="bg-card rounded-3xl border border-border p-12 text-center space-y-3 shadow-xs">
            <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center mx-auto">
              <Boxes className="w-8 h-8 opacity-60" />
            </div>
            <h3 className="text-base font-black text-foreground">کالایی یافت نشد</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              {searchQuery.trim()
                ? `عبارت «${searchQuery}» با هیچ‌یک از قطعات موجود در انبار مطابقت ندارد.`
                : "در این دسته‌بندی فعلاً کالای فعالی ثبت نشده است."}
            </p>
            {searchQuery.trim() && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="mt-2 px-4 py-2 rounded-xl bg-muted text-xs font-bold text-foreground hover:bg-muted/80 cursor-pointer"
              >
                پاک کردن جستجو
              </button>
            )}
          </div>
        ) : (
          // Real Product Grid
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {filteredProducts.map((product) => {
              const hasBrand = !!product.brand;
              const hasOrigin = !!product.country_of_origin;
              const isLowStock = product.stock_count <= 2;

              return (
                <div
                  key={product.id}
                  className="group bg-card rounded-3xl border border-border hover:border-amber-500/40 shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between overflow-hidden"
                >
                  {/* Top Image & SKU Banner */}
                  <div className="relative p-5 pb-3 flex flex-col items-center justify-center bg-gradient-to-b from-muted/60 to-transparent">
                    {/* Instant Stock Badge */}
                    <div className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-[10px] font-bold">
                      <Check className="w-3 h-3" />
                      <span>تحویل فوری کرمان</span>
                    </div>

                    {/* Category Tag */}
                    {product.category?.name && (
                      <div className="absolute top-3 left-3 text-[10px] font-bold text-muted-foreground px-2 py-0.5 rounded-md bg-muted border border-border">
                        {product.category.name}
                      </div>
                    )}

                    {/* Image Placeholder */}
                    <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-card border border-border shadow-xs flex items-center justify-center mt-4 group-hover:scale-105 transition-transform duration-300 p-3">
                      <img
                        src="/images/elevator-hero-cutout.png"
                        alt={product.title}
                        className="w-full h-full object-contain drop-shadow-sm"
                      />
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-5 pt-2 space-y-3 flex-1 flex flex-col justify-between">
                    <div>
                      {/* SKU Identifier */}
                      <span className="font-mono text-[10px] font-bold text-muted-foreground block mb-1">
                        کد کالا: {toPersianDigits(product.sku)}
                      </span>

                      {/* Product Title */}
                      <h3 className="font-black text-sm text-foreground line-clamp-2 leading-snug group-hover:text-amber-600 transition-colors">
                        {product.title}
                      </h3>

                      {/* Brand & Origin Tags */}
                      {(hasBrand || hasOrigin) && (
                        <div className="flex items-center gap-2 mt-2 flex-wrap text-[11px] text-muted-foreground">
                          {hasBrand && (
                            <span className="inline-flex items-center gap-1 font-bold bg-muted/80 px-2 py-0.5 rounded-md border border-border">
                              برند: {product.brand}
                            </span>
                          )}
                          {hasOrigin && (
                            <span className="inline-flex items-center gap-1 font-medium bg-muted/80 px-2 py-0.5 rounded-md border border-border">
                              کشور: {product.country_of_origin}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Price & Action Section */}
                    <div className="pt-3 border-t border-border/80 flex items-end justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-bold text-muted-foreground block">
                          قیمت واحد
                        </span>
                        <span className="text-sm sm:text-base font-black text-foreground">
                          {formatPersianCurrency(product.price)}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleAddToCart(product)}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs transition-all shadow-md cursor-pointer hover:scale-105 active:scale-95 flex-shrink-0"
                      >
                        <ShoppingCart className="w-3.5 h-3.5" />
                        <span>خرید</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
