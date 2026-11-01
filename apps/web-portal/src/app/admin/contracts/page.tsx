"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Wrench,
  Search,
  RefreshCw,
  Building,
  User as UserIcon,
  Phone,
  Clock,
  BadgeDollarSign,
  FileCheck2,
  CheckCircle2,
  AlertCircle,
  X,
  Edit,
  SlidersHorizontal,
  ChevronDown,
} from "lucide-react";
import {
  fetchAdminContracts,
  updateAdminContract,
  ServiceContractDto,
  ContractStatus,
} from "@/lib/api/contracts";
import {
  formatPersianCurrency,
  toPersianDigits,
  cn,
} from "@/lib/utils";
import { toast } from "sonner";

type StatusFilterType = "ALL" | ContractStatus;

export default function AdminContractsPage() {
  const [contracts, setContracts] = useState<ServiceContractDto[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<StatusFilterType>("ALL");

  // Modal State
  const [selectedContract, setSelectedContract] =
    useState<ServiceContractDto | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  const [modalForm, setModalForm] = useState<{
    annual_price: string;
    tax_amount: string;
    start_date: string;
    status: ContractStatus;
  }>({
    annual_price: "",
    tax_amount: "",
    start_date: "",
    status: "QUOTED",
  });

  const loadContracts = async () => {
    setIsLoading(true);
    try {
      const response = await fetchAdminContracts();
      const data = Array.isArray(response.data) ? response.data : [];
      setContracts(data);
    } catch (error: any) {
      console.warn("Could not fetch admin contracts:", error);
      toast.error("خطا در بارگذاری قراردادها", {
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

  // Filter & Search Logic
  const filteredContracts = useMemo(() => {
    return contracts.filter((c) => {
      if (statusFilter !== "ALL" && c.status !== statusFilter) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const addressMatch = c.building_address?.toLowerCase().includes(q);
        const typeMatch = c.elevator_type?.toLowerCase().includes(q);
        const nameMatch = c.user?.name?.toLowerCase().includes(q);
        const phoneMatch = c.user?.phone?.toLowerCase().includes(q);
        const idMatch = c.id?.toLowerCase().includes(q);

        if (!addressMatch && !typeMatch && !nameMatch && !phoneMatch && !idMatch) {
          return false;
        }
      }

      return true;
    });
  }, [contracts, statusFilter, searchQuery]);

  // Open Review & Quote Modal
  const handleOpenReviewModal = (contract: ServiceContractDto) => {
    setSelectedContract(contract);
    setModalForm({
      annual_price: contract.annual_price ? String(contract.annual_price) : "",
      tax_amount: contract.tax_amount ? String(contract.tax_amount) : "",
      start_date: contract.start_date
        ? new Date(contract.start_date).toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10),
      status: contract.status === "PENDING" ? "QUOTED" : contract.status,
    });
    setIsModalOpen(true);
  };

  // Submit Quote & Status Update
  const handleSaveQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContract) return;

    setIsUpdating(true);
    try {
      const payload: any = {
        status: modalForm.status,
      };

      if (modalForm.annual_price.trim()) {
        const numPrice = parseFloat(modalForm.annual_price.trim());
        if (isNaN(numPrice) || numPrice < 0) {
          toast.error("مبلغ سالیانه نامعتبر است");
          setIsUpdating(false);
          return;
        }
        payload.annual_price = numPrice;
      }

      if (modalForm.tax_amount.trim()) {
        const numTax = parseFloat(modalForm.tax_amount.trim());
        if (!isNaN(numTax)) payload.tax_amount = numTax;
      }

      if (modalForm.start_date.trim()) {
        payload.start_date = new Date(modalForm.start_date).toISOString();
      }

      const response = await updateAdminContract(selectedContract.id, payload);
      const updated = response.data;
      toast.success("قرارداد با موفقیت بروزرسانی شد", {
        description: `وضعیت قرارداد به ${getStatusBadge(updated.status).label} تغییر یافت.`,
      });

      setContracts((prev) =>
        prev.map((c) => (c.id === updated.id ? updated : c))
      );
      setIsModalOpen(false);
      setSelectedContract(null);
    } catch (error: any) {
      toast.error("خطا در ثبت اطلاعات قرارداد", {
        description:
          error?.response?.data?.detail || "ثبت تغییرات با خطا مواجه شد.",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusBadge = (status: ContractStatus) => {
    switch (status) {
      case "PENDING":
        return {
          label: "درخواست اولیه (بررسی)",
          className: "bg-amber-50 text-amber-800 border-amber-200",
          dot: "bg-amber-500",
        };
      case "QUOTED":
        return {
          label: "پیش‌فاکتور صادر شده",
          className: "bg-blue-50 text-blue-700 border-blue-200",
          dot: "bg-blue-500",
        };
      case "ACTIVE":
        return {
          label: "قرارداد فعال",
          className: "bg-emerald-50 text-emerald-700 border-emerald-200",
          dot: "bg-emerald-500",
        };
      case "REJECTED":
        return {
          label: "رد شده",
          className: "bg-rose-50 text-rose-700 border-rose-200",
          dot: "bg-rose-500",
        };
      case "EXPIRED":
        return {
          label: "پایان قرارداد",
          className: "bg-slate-100 text-slate-700 border-slate-200",
          dot: "bg-slate-400",
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
        month: "2-digit",
        day: "2-digit",
      }).format(date);
    } catch {
      return isoString;
    }
  };

  // Metrics
  const stats = useMemo(() => {
    const total = contracts.length;
    const pending = contracts.filter((c) => c.status === "PENDING").length;
    const quoted = contracts.filter((c) => c.status === "QUOTED").length;
    const active = contracts.filter((c) => c.status === "ACTIVE").length;
    return { total, pending, quoted, active };
  }, [contracts]);

  return (
    <div className="w-full space-y-6 font-sans text-slate-900" dir="rtl">
      {/* 1. Header Bar */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center flex-shrink-0">
            <Wrench className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                مدیریت قراردادهای سرویس و نگهداری
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-xs font-bold text-slate-600">
                {isLoading ? "..." : `${toPersianDigits(contracts.length)} قرارداد`}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
              بررسی مشخصات فنی آسانسورها، برآورد قیمت سالیانه، صدور پیش‌فاکتور و فعال‌سازی سرویس دوره‌ای
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={loadContracts}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
        >
          <RefreshCw
            className={cn("w-4 h-4 text-slate-500", isLoading && "animate-spin")}
          />
          <span>تازه‌سازی داده‌ها</span>
        </button>
      </div>

      {/* 2. Metric KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-slate-500 block">کل درخواست‌ها</span>
          <span className="text-2xl font-black text-slate-900 block mt-1">
            {isLoading ? "..." : toPersianDigits(stats.total)}
          </span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 block">در انتظار بررسی</span>
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          </div>
          <span className="text-2xl font-black text-amber-700 block mt-1">
            {isLoading ? "..." : toPersianDigits(stats.pending)}
          </span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-slate-500 block">پیش‌فاکتور صادر شده</span>
          <span className="text-2xl font-black text-blue-700 block mt-1">
            {isLoading ? "..." : toPersianDigits(stats.quoted)}
          </span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-slate-500 block">قراردادهای فعال</span>
          <span className="text-2xl font-black text-emerald-700 block mt-1">
            {isLoading ? "..." : toPersianDigits(stats.active)}
          </span>
        </div>
      </div>

      {/* 3. Search and Filters */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="جستجو در آدرس، نوع آسانسور، نام یا شماره تماس مشتری..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pr-10 pl-4 text-xs font-bold text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all text-right"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {(
            [
              { id: "ALL", label: "همه" },
              { id: "PENDING", label: "در انتظار بررسی" },
              { id: "QUOTED", label: "قیمت‌گذاری شده" },
              { id: "ACTIVE", label: "فعال" },
              { id: "REJECTED", label: "رد شده" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={cn(
                "px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer",
                statusFilter === tab.id
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Contracts Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold">
                <th className="py-4 px-4 w-12 text-center">#</th>
                <th className="py-4 px-4">مشتری</th>
                <th className="py-4 px-4">موقعیت و نشانی ساختمان</th>
                <th className="py-4 px-4">مشخصات آسانسور</th>
                <th className="py-4 px-4">مبلغ سالیانه مصوب</th>
                <th className="py-4 px-4">وضعیت</th>
                <th className="py-4 px-4 text-center">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-4 px-4 text-center">
                      <div className="w-5 h-4 bg-slate-200 rounded mx-auto" />
                    </td>
                    <td className="py-4 px-4">
                      <div className="h-4 bg-slate-200 rounded w-28 mb-1" />
                      <div className="h-3 bg-slate-100 rounded w-20" />
                    </td>
                    <td className="py-4 px-4">
                      <div className="h-4 bg-slate-200 rounded w-48" />
                    </td>
                    <td className="py-4 px-4">
                      <div className="h-4 bg-slate-200 rounded w-36" />
                    </td>
                    <td className="py-4 px-4">
                      <div className="h-4 bg-slate-200 rounded w-24" />
                    </td>
                    <td className="py-4 px-4">
                      <div className="h-6 bg-slate-200 rounded-full w-20" />
                    </td>
                    <td className="py-4 px-4 text-center">
                      <div className="h-8 bg-slate-200 rounded-xl w-28 mx-auto" />
                    </td>
                  </tr>
                ))
              ) : filteredContracts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-14 text-center">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
                        <Wrench className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-bold text-slate-700">
                        هیچ قراردادی یافت نشد
                      </p>
                      <p className="text-xs text-slate-400">
                        مطابق با فیلتر یا عبارت جستجوی وارد شده رکوردی وجود ندارد.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredContracts.map((contract, idx) => {
                  const badge = getStatusBadge(contract.status);

                  return (
                    <tr
                      key={contract.id}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      {/* Row Index */}
                      <td className="py-4 px-4 text-center font-bold text-slate-400">
                        {toPersianDigits(idx + 1)}
                      </td>

                      {/* Customer Info */}
                      <td className="py-4 px-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900">
                            {contract.user?.name || "مشتری سامانه"}
                          </span>
                          <span className="text-[11px] text-slate-500 font-mono mt-0.5 flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-400" />
                            {contract.user?.phone ? toPersianDigits(contract.user.phone) : "-"}
                          </span>
                        </div>
                      </td>

                      {/* Building Address */}
                      <td className="py-4 px-4 max-w-xs">
                        <div className="flex items-start gap-1.5">
                          <Building className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                          <span className="line-clamp-2 text-slate-800 font-medium">
                            {contract.building_address}
                          </span>
                        </div>
                      </td>

                      {/* Technical Specs */}
                      <td className="py-4 px-4">
                        <div className="space-y-0.5">
                          <span className="font-bold text-slate-900 block truncate max-w-[180px]">
                            {contract.elevator_type}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            {toPersianDigits(contract.stops_count)} توقف •{" "}
                            {toPersianDigits(contract.capacity_kg)} kg •{" "}
                            {contract.speed_ms}
                          </span>
                        </div>
                      </td>

                      {/* Annual Price */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        {contract.annual_price ? (
                          <span className="font-black text-emerald-700 text-xs">
                            {formatPersianCurrency(contract.annual_price)}
                          </span>
                        ) : (
                          <span className="text-[11px] text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                            برآورد نشده
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border",
                            badge.className
                          )}
                        >
                          <span className={cn("w-1.5 h-1.5 rounded-full", badge.dot)} />
                          {badge.label}
                        </span>
                      </td>

                      {/* Action Button: Review & Quote */}
                      <td className="py-4 px-4 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleOpenReviewModal(contract)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-xs transition-all active:scale-95 cursor-pointer"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          <span>بررسی و قیمت‌گذاری</span>
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

      {/* 5. Review & Quote Modal */}
      {isModalOpen && selectedContract && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            className="bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-200 max-w-lg w-full space-y-5 animate-in fade-in zoom-in-95 duration-200"
            dir="rtl"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center">
                  <BadgeDollarSign className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    بررسی و قیمت‌گذاری قرارداد
                  </h3>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">
                    {selectedContract.id}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (!isUpdating) {
                    setIsModalOpen(false);
                    setSelectedContract(null);
                  }
                }}
                className="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Contract Specs Summary */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">مشتری:</span>
                <span className="font-bold text-slate-800">
                  {selectedContract.user?.name || "مشتری سامانه"} (
                  {selectedContract.user?.phone ? toPersianDigits(selectedContract.user.phone) : "-"}
                  )
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">نوع آسانسور:</span>
                <span className="font-bold text-slate-800">
                  {selectedContract.elevator_type}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">مشخصات فنی:</span>
                <span className="font-bold text-slate-800">
                  {toPersianDigits(selectedContract.stops_count)} توقف •{" "}
                  {toPersianDigits(selectedContract.capacity_kg)} کیلوگرم •{" "}
                  {selectedContract.speed_ms}
                </span>
              </div>
              <div className="pt-1 border-t border-slate-200/80">
                <span className="text-slate-500 block mb-0.5">آدرس محل نصب:</span>
                <span className="font-medium text-slate-800 leading-relaxed block">
                  {selectedContract.building_address}
                </span>
              </div>
            </div>

            {/* Quote Form */}
            <form onSubmit={handleSaveQuote} className="space-y-4">
              {/* Annual Price */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  مبلغ برآورد سالیانه (تومان) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step={100000}
                  value={modalForm.annual_price}
                  onChange={(e) =>
                    setModalForm((prev) => ({
                      ...prev,
                      annual_price: e.target.value,
                    }))
                  }
                  placeholder="مثال: 18000000"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-sm font-bold text-slate-900"
                  required
                />
                {modalForm.annual_price && (
                  <p className="text-xs text-emerald-700 font-bold mt-1">
                    معادل: {formatPersianCurrency(parseFloat(modalForm.annual_price) || 0)}
                  </p>
                )}
              </div>

              {/* Status Select */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  وضعیت قرارداد
                </label>
                <select
                  value={modalForm.status}
                  onChange={(e) =>
                    setModalForm((prev) => ({
                      ...prev,
                      status: e.target.value as ContractStatus,
                    }))
                  }
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-xs font-bold text-slate-900 bg-white cursor-pointer"
                >
                  <option value="PENDING">درخواست اولیه (PENDING)</option>
                  <option value="QUOTED">پیش‌فاکتور صادر شده (QUOTED)</option>
                  <option value="ACTIVE">قرارداد تایید و فعال شده (ACTIVE)</option>
                  <option value="REJECTED">رد شده / عدم تایید (REJECTED)</option>
                  <option value="EXPIRED">پایان مدت قرارداد (EXPIRED)</option>
                </select>
              </div>

              {/* Start Date */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  تاریخ شروع خدمات
                </label>
                <input
                  type="date"
                  dir="ltr"
                  value={modalForm.start_date}
                  onChange={(e) =>
                    setModalForm((prev) => ({
                      ...prev,
                      start_date: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-xs font-mono text-slate-900"
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setSelectedContract(null);
                  }}
                  disabled={isUpdating}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  {isUpdating && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isUpdating ? "در حال ثبت..." : "ثبت برآورد و اعلام به مشتری"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
