"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Package,
  Plus,
  Search,
  RefreshCw,
  Edit,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Boxes,
  Layers,
  Sparkles,
  SlidersHorizontal,
  CheckSquare,
  Square,
  Trash2,
  Power,
  PowerOff,
} from "lucide-react";
import { formatPersianCurrency, toPersianDigits, cn } from "@/lib/utils";
import {
  fetchAdminProducts,
  bulkActionProducts,
  ProductDto,
} from "@/lib/api/admin";
import { ProductModal } from "./components/ProductModal";
import { toast } from "sonner";

export default function AdminProductsPage() {
  const [products, setProducts] = useState<ProductDto[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeFilter, setActiveFilter] = useState<
    "ALL" | "ACTIVE" | "INACTIVE" | "OUT_OF_STOCK"
  >("ALL");
  const [categoryTab, setCategoryTab] = useState<"ALL" | "PACKAGES" | "PARTS">("ALL");
  const [selectedProduct, setSelectedProduct] = useState<ProductDto | null>(
    null
  );
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // Bulk Actions State
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [isBulkOperating, setIsBulkOperating] = useState<boolean>(false);

  // Fetch all admin products from backend
  const loadProducts = async () => {
    setIsLoading(true);
    try {
      const response = await fetchAdminProducts();
      const data = Array.isArray(response.data)
        ? response.data
        : (response as any)?.data || [];
      setProducts(data);
    } catch (error: any) {
      console.warn("Could not fetch admin products from backend:", error);
      setProducts([]);

      const status = error?.response?.status;
      if (status === 404) {
        toast.info("ماژول انبار و محصولات در بک‌اند", {
          description:
            "اندپوینت API محصولات هنوز در سرور مستقر نشده است. جدول خالی نمایش داده می‌شود.",
        });
      } else {
        toast.error("خطا در بارگذاری محصولات", {
          description:
            error?.response?.data?.detail ||
            "برقراری ارتباط با سرور برقرار نشد یا دسترسی مدیر لازم است.",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  // Bulk Selection Handlers
  const handleSelectAll = () => {
    if (selectedProductIds.length === filteredProducts.length) {
      setSelectedProductIds([]);
    } else {
      setSelectedProductIds(filteredProducts.map((p) => p.id));
    }
  };

  const handleToggleSelectProduct = (id: string) => {
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBulkAction = async (action: "deactivate" | "activate" | "delete") => {
    if (selectedProductIds.length === 0) return;

    if (action === "delete") {
      const confirmed = window.confirm(
        `آیا از حذف دائم ${selectedProductIds.length} محصول انتخاب‌شده اطمینان دارید؟`
      );
      if (!confirmed) return;
    }

    setIsBulkOperating(true);
    try {
      const res = await bulkActionProducts(selectedProductIds, action);
      toast.success("عملیات گروهی با موفقیت انجام شد", {
        description: res.data.message,
      });
      setSelectedProductIds([]);
      await loadProducts();
    } catch (error: any) {
      toast.error("خطا در اجرای عملیات گروهی", {
        description:
          error?.response?.data?.detail || "خطایی در برقراری ارتباط با سرور رخ داده است.",
      });
    } finally {
      setIsBulkOperating(false);
    }
  };

  // Filter and search logic
  const filteredProducts = useMemo(() => {
    return products.filter((item) => {
      // 1. Status Filter
      if (activeFilter === "ACTIVE" && !item.is_active) return false;
      if (activeFilter === "INACTIVE" && item.is_active) return false;
      if (activeFilter === "OUT_OF_STOCK" && item.stock_count > 0) return false;

      // 2. Category Tab Filter (Packages vs Parts)
      const isPkg =
        item.category?.name?.includes("پکیج") ||
        item.sku?.toUpperCase().startsWith("PKG") ||
        item.title?.includes("پکیج");
      if (categoryTab === "PACKAGES" && !isPkg) return false;
      if (categoryTab === "PARTS" && isPkg) return false;

      // 3. Search Query (Title, SKU, Category)
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase().trim();
      const title = (item.title || "").toLowerCase();
      const sku = (item.sku || "").toLowerCase();
      const category = (item.category?.name || "").toLowerCase();

      return (
        title.includes(query) || sku.includes(query) || category.includes(query)
      );
    });
  }, [products, activeFilter, categoryTab, searchQuery]);

  // Operational metrics
  const activeCount = useMemo(
    () => products.filter((p) => p.is_active).length,
    [products]
  );
  const outOfStockCount = useMemo(
    () => products.filter((p) => p.stock_count <= 0).length,
    [products]
  );

  return (
    <div className="w-full space-y-6 font-sans text-foreground" dir="rtl">
      {/* 1. Header Bar: Title, Description & Primary Actions */}
      <div className="bg-card rounded-3xl p-6 sm:p-7 border border-border shadow-[0_2px_15px_rgba(0,0,0,0.03)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
            <Boxes className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                مدیریت انبار و محصولات
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-muted border border-border text-xs font-bold text-muted-foreground">
                {isLoading ? "..." : `${toPersianDigits(products.length)} کالا`}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground font-medium mt-0.5">
              سامانه مدیریت اطلاعات محصولات (PIM)، کنترل موجودی انبار و کاتالوگ قطعات آسانسور
            </p>
          </div>
        </div>

        {/* Top Action Buttons */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={loadProducts}
            disabled={isLoading}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-card hover:bg-muted text-foreground border border-border text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
          >
            <RefreshCw
              className={cn(
                "w-3.5 h-3.5 text-amber-600",
                isLoading && "animate-spin"
              )}
            />
            <span>بروزرسانی</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedProduct(null);
              setIsModalOpen(true);
            }}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>افزودن محصول جدید</span>
          </button>
        </div>
      </div>

      {/* 2. Operational Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-card rounded-3xl p-6 border border-border shadow-[0_2px_15px_rgba(0,0,0,0.02)] flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-muted-foreground block">
              کل محصولات و پکیج‌ها
            </span>
            <span className="text-2xl font-black text-foreground font-sans mt-1.5 block">
              {isLoading ? "..." : toPersianDigits(products.length)}
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center border border-amber-500/30">
            <Package className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-card rounded-3xl p-6 border border-border shadow-[0_2px_15px_rgba(0,0,0,0.02)] flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-muted-foreground block">
              محصولات فعال در کاتالوگ
            </span>
            <span className="text-2xl font-black text-emerald-600 font-sans mt-1.5 block">
              {isLoading ? "..." : toPersianDigits(activeCount)}
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center border border-emerald-500/30">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-card rounded-3xl p-6 border border-border shadow-[0_2px_15px_rgba(0,0,0,0.02)] flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-muted-foreground block">
              اقلام ناموجود / هشدار انبار
            </span>
            <span className="text-2xl font-black text-rose-600 font-sans mt-1.5 block">
              {isLoading ? "..." : toPersianDigits(outOfStockCount)}
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center border border-rose-500/30">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="bg-card rounded-3xl p-4 sm:p-5 border border-border shadow-[0_2px_15px_rgba(0,0,0,0.02)] flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-muted-foreground absolute right-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="جستجو در نام قطعه، شناسه SKU، دسته‌بندی..."
            className="w-full bg-muted border border-border rounded-xl py-2.5 pr-10 pl-4 text-xs font-bold text-foreground placeholder-muted-foreground focus:bg-card focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all text-right font-sans"
          />
        </div>

        {/* Category Tabs: Packages vs Parts */}
        <div className="flex items-center gap-1 bg-muted p-1 rounded-2xl">
          <button
            type="button"
            onClick={() => setCategoryTab("ALL")}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap",
              categoryTab === "ALL"
                ? "bg-card text-foreground shadow-xs font-black"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            همه اقلام
          </button>
          <button
            type="button"
            onClick={() => setCategoryTab("PACKAGES")}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap",
              categoryTab === "PACKAGES"
                ? "bg-amber-500 text-slate-950 shadow-xs font-black"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            پکیج‌ها
          </button>
          <button
            type="button"
            onClick={() => setCategoryTab("PARTS")}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap",
              categoryTab === "PARTS"
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-950 shadow-xs font-black"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            قطعات
          </button>
        </div>

        {/* Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          <button
            type="button"
            onClick={() => setActiveFilter("ALL")}
            className={cn(
              "px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer shadow-xs font-sans",
              activeFilter === "ALL"
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-950"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            همه موارد ({toPersianDigits(products.length)})
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter("ACTIVE")}
            className={cn(
              "px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer shadow-xs font-sans",
              activeFilter === "ACTIVE"
                ? "bg-emerald-600 text-white"
                : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20"
            )}
          >
            فعال ({toPersianDigits(activeCount)})
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter("OUT_OF_STOCK")}
            className={cn(
              "px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer shadow-xs font-sans",
              activeFilter === "OUT_OF_STOCK"
                ? "bg-rose-600 text-white"
                : "bg-rose-500/10 text-rose-700 dark:text-rose-400 hover:bg-rose-500/20 border border-rose-500/20"
            )}
          >
            ناموجود ({toPersianDigits(outOfStockCount)})
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter("INACTIVE")}
            className={cn(
              "px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer shadow-xs font-sans",
              activeFilter === "INACTIVE"
                ? "bg-slate-700 text-white"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            غیرفعال
          </button>
        </div>
      </div>

      {/* 4. Products Data Table */}
      <div className="bg-card rounded-2xl shadow-xs border border-border overflow-hidden font-sans">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse text-sm" dir="rtl">
            <thead>
              <tr className="bg-muted/60 border-b border-border text-xs font-bold text-muted-foreground">
                <th className="py-4 px-3 w-12 text-center">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer inline-flex items-center justify-center"
                    title={
                      filteredProducts.length > 0 &&
                      selectedProductIds.length === filteredProducts.length
                        ? "لغو انتخاب همه"
                        : "انتخاب همه"
                    }
                  >
                    {filteredProducts.length > 0 &&
                    selectedProductIds.length === filteredProducts.length ? (
                      <CheckSquare className="w-4 h-4 text-amber-500" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="py-4 px-4 text-center w-14">ردیف</th>
                <th className="py-4 px-5">شناسه (SKU)</th>
                <th className="py-4 px-5">عنوان محصول / قطعه</th>
                <th className="py-4 px-5">دسته‌بندی</th>
                <th className="py-4 px-5">قیمت واحد</th>
                <th className="py-4 px-5 text-center">موجودی</th>
                <th className="py-4 px-5 text-center">وضعیت</th>
                <th className="py-4 px-5 text-center">اقدام</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-sm">
              {isLoading ? (
                // Skeleton Loader
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-4 px-3 text-center">
                      <div className="w-4 h-4 bg-muted rounded mx-auto" />
                    </td>
                    <td className="py-4 px-4 text-center">
                      <div className="h-4 bg-muted rounded w-6 mx-auto" />
                    </td>
                    <td className="py-4 px-5">
                      <div className="h-4 bg-muted rounded w-20" />
                    </td>
                    <td className="py-4 px-5">
                      <div className="h-4 bg-muted rounded w-44 mb-1.5" />
                      <div className="h-3 bg-muted/60 rounded w-28" />
                    </td>
                    <td className="py-4 px-5">
                      <div className="h-6 bg-muted rounded-full w-24" />
                    </td>
                    <td className="py-4 px-5">
                      <div className="h-4 bg-muted rounded w-28" />
                    </td>
                    <td className="py-4 px-5 text-center">
                      <div className="h-4 bg-muted rounded w-12 mx-auto" />
                    </td>
                    <td className="py-4 px-5 text-center">
                      <div className="h-6 bg-muted rounded-full w-16 mx-auto" />
                    </td>
                    <td className="py-4 px-5 text-center">
                      <div className="h-8 bg-muted rounded-xl w-20 mx-auto" />
                    </td>
                  </tr>
                ))
              ) : filteredProducts.length === 0 ? (
                // Beautiful Empty State
                <tr>
                  <td colSpan={9} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="w-16 h-16 rounded-3xl bg-muted border border-border flex items-center justify-center text-muted-foreground">
                        <Boxes className="w-8 h-8 opacity-50" />
                      </div>
                      <div className="text-sm font-black text-foreground">
                        هیچ محصولی یافت نشد
                      </div>
                      <p className="text-xs text-muted-foreground max-w-sm">
                        {searchQuery.trim()
                          ? `عبارت "${searchQuery}" با هیچ‌یک از مشخصات قطعات یا پکیج‌های آسانسور مطابقت ندارد.`
                          : "هنوز محصولی در انبار و کاتالوگ سیستم تعریف نشده یا انبار خالی است."}
                      </p>
                      {searchQuery.trim() && (
                        <button
                          type="button"
                          onClick={() => setSearchQuery("")}
                          className="mt-2 px-3 py-1.5 rounded-lg bg-muted text-xs font-bold text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
                        >
                          پاک کردن فیلتر جستجو
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                // Products Rows
                filteredProducts.map((product, index) => {
                  const isLowStock = product.stock_count <= 2;
                  const isOutOfStock = product.stock_count <= 0;

                  return (
                    <tr
                      key={product.id}
                      className={cn(
                        "hover:bg-muted/40 transition-colors group",
                        selectedProductIds.includes(product.id) && "bg-amber-500/10"
                      )}
                    >
                      {/* 0. Selection Checkbox */}
                      <td className="py-4 px-3 text-center align-middle">
                        <button
                          type="button"
                          onClick={() => handleToggleSelectProduct(product.id)}
                          className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer inline-flex items-center justify-center"
                        >
                          {selectedProductIds.includes(product.id) ? (
                            <CheckSquare className="w-4 h-4 text-amber-500" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>

                      {/* 1. Row Index */}
                      <td className="py-4 px-5 text-center align-middle font-bold text-muted-foreground text-xs">
                        {toPersianDigits(index + 1)}
                      </td>

                      {/* 2. SKU Identifier */}
                      <td className="py-4 px-5 align-middle whitespace-nowrap">
                        <span className="font-bold text-xs text-foreground bg-muted/80 px-2.5 py-1 rounded-md border border-border">
                          {toPersianDigits(product.sku)}
                        </span>
                      </td>

                      {/* 3. Product Title */}
                      <td className="py-4 px-5 align-middle">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center flex-shrink-0">
                            <Package className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-black text-foreground block text-sm group-hover:text-amber-600 transition-colors">
                              {product.title}
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                              شناسه سیستم: {toPersianDigits(product.id.slice(0, 8))}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* 4. Category */}
                      <td className="py-4 px-5 align-middle whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-muted text-muted-foreground text-xs font-bold border border-border">
                          <Layers className="w-3 h-3 text-amber-500" />
                          <span>{product.category?.name || "قطعات عمومی آسانسور"}</span>
                        </span>
                      </td>

                      {/* 5. Unit Price */}
                      <td className="py-4 px-5 align-middle whitespace-nowrap">
                        <span className="font-black text-foreground text-sm font-sans">
                          {product.price > 0
                            ? formatPersianCurrency(product.price)
                            : "استعلامی"}
                        </span>
                      </td>

                      {/* 6. Stock Count */}
                      <td className="py-4 px-5 align-middle text-center whitespace-nowrap">
                        {isOutOfStock ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-600 border border-rose-500/20 text-xs font-bold">
                            <XCircle className="w-3 h-3" />
                            <span>ناموجود</span>
                          </span>
                        ) : (
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold",
                              isLowStock
                                ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20"
                                : "bg-muted text-foreground border border-border"
                            )}
                          >
                            <span>{toPersianDigits(product.stock_count)}</span>
                            <span className="text-[10px] text-muted-foreground">عدد</span>
                          </span>
                        )}
                      </td>

                      {/* 7. Status Badge */}
                      <td className="py-4 px-5 align-middle text-center whitespace-nowrap">
                        {product.is_active ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 text-xs font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span>فعال</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted text-muted-foreground border border-border text-xs font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60" />
                            <span>غیرفعال</span>
                          </span>
                        )}
                      </td>

                      {/* 8. Action: Edit Button */}
                      <td className="py-4 px-5 align-middle text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedProduct(product);
                            setIsModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-card hover:bg-muted text-foreground border border-border text-xs font-bold transition-all shadow-xs hover:border-amber-500/50 cursor-pointer"
                        >
                          <Edit className="w-3.5 h-3.5 text-amber-600" />
                          <span>ویرایش</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sticky Bulk Action Bar */}
      {selectedProductIds.length > 0 && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl px-4 animate-in fade-in slide-in-from-bottom-5 duration-300 font-sans"
          dir="rtl"
        >
          <div className="bg-slate-900 text-white rounded-3xl p-4 sm:p-5 shadow-2xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 font-black">
                {toPersianDigits(selectedProductIds.length)}
              </div>
              <div>
                <p className="text-sm font-black text-white">
                  {toPersianDigits(selectedProductIds.length)} کالا انتخاب شده است
                </p>
                <p className="text-xs text-slate-400">
                  عملیات گروهی بر روی محصولات و پکیج‌های انتخاب‌شده
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => handleBulkAction("deactivate")}
                disabled={isBulkOperating}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold text-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                <PowerOff className="w-3.5 h-3.5" />
                <span>غیرفعال‌سازی</span>
              </button>

              <button
                type="button"
                onClick={() => handleBulkAction("activate")}
                disabled={isBulkOperating}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                <Power className="w-3.5 h-3.5" />
                <span>فعال‌سازی</span>
              </button>

              <button
                type="button"
                onClick={() => handleBulkAction("delete")}
                disabled={isBulkOperating}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>حذف</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedProductIds([])}
                disabled={isBulkOperating}
                className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white font-bold text-xs transition-all cursor-pointer"
              >
                لغو
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Product Create & Edit Modal */}
      <ProductModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedProduct(null);
        }}
        product={selectedProduct}
        onSuccess={loadProducts}
      />
    </div>
  );
}
