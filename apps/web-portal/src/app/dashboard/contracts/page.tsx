"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Wrench,
  Plus,
  RefreshCw,
  Building,
  Calendar,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  FileText,
  BadgeDollarSign,
  ChevronLeft,
} from "lucide-react";
import {
  fetchMyContracts,
  ServiceContractDto,
  ContractStatus,
} from "@/lib/api/contracts";
import {
  formatPersianCurrency,
  toPersianDigits,
  cn,
} from "@/lib/utils";
import { toast } from "sonner";

export default function CustomerContractsPage() {
  const [contracts, setContracts] = useState<ServiceContractDto[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadContracts = async () => {
    setIsLoading(true);
    try {
      const response = await fetchMyContracts();
      const data = Array.isArray(response.data) ? response.data : [];
      setContracts(data);
    } catch (error: any) {
      console.warn("Could not load customer contracts:", error);
      toast.error("خطا در دریافت لیست قراردادها", {
        description:
          error?.response?.data?.detail || "برقراری ارتباط با سرور با خطا مواجه شد.",
      });
      setContracts([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadContracts();
  }, []);

  const getStatusBadge = (status: ContractStatus) => {
    switch (status) {
      case "PENDING":
        return {
          label: "در انتظار بررسی فنی",
          className: "bg-amber-500/10 text-amber-700 border-amber-500/20",
          dot: "bg-amber-500",
        };
      case "QUOTED":
        return {
          label: "پیش‌فاکتور صادر شده",
          className: "bg-blue-500/10 text-blue-700 border-blue-500/20",
          dot: "bg-blue-500",
        };
      case "ACTIVE":
        return {
          label: "قرارداد فعال",
          className: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
          dot: "bg-emerald-500",
        };
      case "REJECTED":
        return {
          label: "عدم تایید / لغو شده",
          className: "bg-rose-500/10 text-rose-700 border-rose-500/20",
          dot: "bg-rose-500",
        };
      case "EXPIRED":
        return {
          label: "پایان مدت قرارداد",
          className: "bg-slate-500/10 text-slate-700 border-slate-500/20",
          dot: "bg-slate-500",
        };
      default:
        return {
          label: status,
          className: "bg-slate-100 text-slate-700 border-slate-200",
          dot: "bg-slate-400",
        };
    }
  };

  const formatDate = (isoString?: string | null) => {
    if (!isoString) return "-";
    try {
      const date = new Date(isoString);
      return new Intl.DateTimeFormat("fa-IR", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }).format(date);
    } catch {
      return isoString;
    }
  };

  return (
    <div className="w-full space-y-6 font-sans text-foreground" dir="rtl">
      {/* 1. Header Bar */}
      <div className="bg-card rounded-3xl p-6 sm:p-7 border border-border shadow-[0_2px_15px_rgba(0,0,0,0.03)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center flex-shrink-0">
            <Wrench className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                قراردادهای سرویس و نگهداری آسانسور
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-muted border border-border text-xs font-bold text-muted-foreground">
                {isLoading ? "..." : `${toPersianDigits(contracts.length)} مورد`}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground font-medium mt-0.5">
              مشاهده وضعیت درخواست‌ها، برآورد هزینه سالیانه و قراردادهای فعال سرویس دوره‌ای
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={loadContracts}
            disabled={isLoading}
            className="p-2.5 rounded-xl bg-card hover:bg-muted text-foreground border border-border transition-colors cursor-pointer disabled:opacity-50"
            title="بروزرسانی لیست"
          >
            <RefreshCw
              className={cn("w-4 h-4 text-muted-foreground", isLoading && "animate-spin")}
            />
          </button>

          <Link
            href="/dashboard/contracts/request"
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shadow-md transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>ثبت درخواست جدید</span>
          </Link>
        </div>
      </div>

      {/* 2. Contracts List / Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 2 }).map((_, idx) => (
            <div
              key={idx}
              className="bg-card rounded-3xl p-6 border border-border shadow-xs animate-pulse space-y-4"
            >
              <div className="h-5 bg-muted rounded w-2/3" />
              <div className="h-4 bg-muted/60 rounded w-1/2" />
              <div className="h-10 bg-muted/40 rounded-xl" />
            </div>
          ))}
        </div>
      ) : contracts.length === 0 ? (
        <div className="bg-card rounded-3xl p-12 sm:p-16 border border-border shadow-xs text-center space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto border border-amber-500/20">
            <Wrench className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base font-black text-foreground">
              هنوز هیچ قرارداد سرویسی ثبت نشده است
            </h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1 leading-relaxed">
              با ثبت اطلاعات ساختمان و مشخصات فنی آسانسور، از خدمات دوره‌ای، بیمه مسئولیت مدنی و
              پشتیبانی ۲۴ ساعته متخصصین آسانرو در کرمان بهره‌مند شوید.
            </p>
          </div>
          <Link
            href="/dashboard/contracts/request"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shadow-md transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>ثبت اولین درخواست سرویس و نگهداری</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {contracts.map((contract) => {
            const badge = getStatusBadge(contract.status);

            return (
              <div
                key={contract.id}
                className="bg-card rounded-3xl p-6 border border-border shadow-xs hover:border-amber-500/30 transition-all space-y-5"
              >
                {/* Card Header: Type & Status */}
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <span className="text-[11px] font-mono text-muted-foreground">
                      شناسه: {contract.id.slice(0, 8).toUpperCase()}
                    </span>
                    <h3 className="text-base font-black text-foreground">
                      {contract.elevator_type}
                    </h3>
                  </div>

                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black border",
                      badge.className
                    )}
                  >
                    <span className={cn("w-2 h-2 rounded-full", badge.dot)} />
                    {badge.label}
                  </span>
                </div>

                {/* Building Address */}
                <div className="flex items-start gap-2.5 text-xs text-muted-foreground bg-muted/40 p-3 rounded-xl border border-border/50">
                  <Building className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <span className="leading-relaxed font-medium text-foreground">
                    {contract.building_address}
                  </span>
                </div>

                {/* Specs Grid */}
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="bg-muted/30 p-2.5 rounded-xl border border-border/50">
                    <span className="text-muted-foreground block text-[11px] mb-0.5">توقف‌ها</span>
                    <span className="font-black text-foreground">
                      {toPersianDigits(contract.stops_count)} ایستگاه
                    </span>
                  </div>
                  <div className="bg-muted/30 p-2.5 rounded-xl border border-border/50">
                    <span className="text-muted-foreground block text-[11px] mb-0.5">ظرفیت</span>
                    <span className="font-black text-foreground">
                      {toPersianDigits(contract.capacity_kg)} کیلوگرم
                    </span>
                  </div>
                  <div className="bg-muted/30 p-2.5 rounded-xl border border-border/50">
                    <span className="text-muted-foreground block text-[11px] mb-0.5">سرعت</span>
                    <span className="font-black text-foreground">
                      {contract.speed_ms}
                    </span>
                  </div>
                </div>

                {/* Pricing & Duration Bar */}
                <div className="pt-3 border-t border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="text-muted-foreground text-[11px] block">
                      هزینه سالیانه مصوب:
                    </span>
                    {contract.annual_price ? (
                      <span className="font-black text-emerald-700 text-sm">
                        {formatPersianCurrency(contract.annual_price)}
                      </span>
                    ) : (
                      <span className="text-amber-600 font-bold text-xs">
                        در انتظار برآورد کارشناس فنی
                      </span>
                    )}
                  </div>

                  <div className="text-left sm:text-right">
                    <span className="text-muted-foreground text-[11px] block">تاریخ ثبت:</span>
                    <span className="font-medium text-muted-foreground text-xs">
                      {toPersianDigits(formatDate(contract.created_at))}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
