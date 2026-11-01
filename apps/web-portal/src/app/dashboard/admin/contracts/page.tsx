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
  Send,
  FileCheck2,
  CheckCircle2,
  AlertCircle,
  X,
  Edit,
  SlidersHorizontal,
  ChevronDown,
  CloudUpload,
  Database,
} from "lucide-react";
import {
  fetchAdminContracts,
  updateAdminContract,
  syncAdminContract,
  ServiceContractDto,
  ContractStatus,
} from "@/lib/api/contracts";
import {
  formatPersianCurrency,
  toPersianDigits,
  cn,
} from "@/lib/utils";
import {
  AdminDirectMessageModal,
  TargetUserInfo,
} from "@/components/admin/AdminDirectMessageModal";
import { toast } from "sonner";

type StatusFilterType = "ALL" | ContractStatus;

export default function AdminContractsDataGridPage() {
  const [contracts, setContracts] = useState<ServiceContractDto[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<StatusFilterType>("ALL");

  // Edit / Quote Modal State
  const [selectedContract, setSelectedContract] =
    useState<ServiceContractDto | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [syncingContractId, setSyncingContractId] = useState<string | null>(null);

  const handleManualSync = async (contractId: string) => {
    setSyncingContractId(contractId);
    try {
      const response = await syncAdminContract(contractId);
      const updated = response.data;
      toast.success("همگام‌سازی با موفقیت انجام شد", {
        description: `اطلاعات ساختمان، آسانسور و قرارداد با شماره ${updated.contract_number || "اختصاص‌یافته"} در پایگاه داده Core App ذخیره شد.`,
      });
      setContracts((prev) =>
        prev.map((c) => (c.id === updated.id ? updated : c))
      );
      if (selectedContract && selectedContract.id === updated.id) {
        setSelectedContract(updated);
      }
    } catch (error: any) {
      toast.error("خطا در همگام‌سازی با Core App", {
        description:
          error?.response?.data?.detail || "برقراری ارتباط با پایگاه داده Core App با خطا مواجه شد.",
      });
    } finally {
      setSyncingContractId(null);
    }
  };

  // CRM Direct Message Modal State
  const [dmTargetUser, setDmTargetUser] = useState<TargetUserInfo | null>(null);
  const [dmContextHint, setDmContextHint] = useState<string>("");
  const [isDmModalOpen, setIsDmModalOpen] = useState<boolean>(false);

  const [modalForm, setModalForm] = useState<{
    building_name: string;
    building_address: string;
    employer_national_id: string;
    postal_code: string;
    registration_plate: string;
    elevator_type: string;
    usage_type: string;
    stops_count: number;
    capacity_kg: number;
    speed_ms: string;
    annual_price: string;
    monthly_fee: string;
    payment_frequency: string;
    tax_amount: string;
    start_date: string;
    status: ContractStatus;
  }>({
    building_name: "",
    building_address: "",
    employer_national_id: "",
    postal_code: "",
    registration_plate: "",
    elevator_type: "",
    usage_type: "مسافری",
    stops_count: 5,
    capacity_kg: 600,
    speed_ms: "1.0 m/s",
    annual_price: "",
    monthly_fee: "",
    payment_frequency: "FLEXIBLE",
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
      toast.error("خطا در دریافت لیست قراردادهای سرویس");
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
      building_name: contract.building_name || "",
      building_address: contract.building_address || "",
      employer_national_id: contract.employer_national_id || "",
      postal_code: contract.postal_code || "",
      registration_plate: contract.registration_plate || "",
      elevator_type: contract.elevator_type || "کششی گیربکس (Traction Geared)",
      usage_type: contract.usage_type || "مسافری",
      stops_count: contract.stops_count || 5,
      capacity_kg: contract.capacity_kg || 600,
      speed_ms: contract.speed_ms || "1.0 m/s",
      annual_price: contract.annual_price ? String(contract.annual_price) : "",
      monthly_fee: contract.monthly_fee ? String(contract.monthly_fee) : "",
      payment_frequency: (contract.payment_frequency as string) || "FLEXIBLE",
      tax_amount: contract.tax_amount ? String(contract.tax_amount) : "",
      start_date: contract.start_date
        ? new Date(contract.start_date).toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10),
      status: contract.status === "PENDING" ? "QUOTED" : contract.status,
    });
    setIsModalOpen(true);
  };

  // Open Direct Message to Building Manager
  const handleOpenDirectMessage = (contract: ServiceContractDto) => {
    const targetUser: TargetUserInfo = {
      id: contract.user?.id || (contract as any).user_id || "",
      name: contract.user?.name || "مدیر ساختمان",
      phone: contract.user?.phone || "",
      telegram_id: (contract.user as any)?.telegram_id,
      bale_id: (contract.user as any)?.bale_id,
    };
    setDmTargetUser(targetUser);
    setDmContextHint(`قرارداد #${contract.id.slice(0, 8)}`);
    setIsDmModalOpen(true);
  };

  // Submit Quote & Status Update
  const handleSaveQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContract) return;

    setIsUpdating(true);
    try {
      const payload: any = {
        status: modalForm.status,
        building_name: modalForm.building_name,
        employer_national_id: modalForm.employer_national_id,
        postal_code: modalForm.postal_code,
        registration_plate: modalForm.registration_plate,
        elevator_type: modalForm.elevator_type,
        usage_type: modalForm.usage_type,
        stops_count: modalForm.stops_count,
        capacity_kg: modalForm.capacity_kg,
        speed_ms: modalForm.speed_ms,
        payment_frequency: modalForm.payment_frequency,
      };

      if (modalForm.annual_price) {
        payload.annual_price = parseFloat(modalForm.annual_price);
      }
      if (modalForm.monthly_fee) {
        payload.monthly_fee = parseFloat(modalForm.monthly_fee);
      }
      if (modalForm.tax_amount) {
        payload.tax_amount = parseFloat(modalForm.tax_amount);
      }
      if (modalForm.start_date) {
        payload.start_date = new Date(modalForm.start_date).toISOString();
      }

      const response = await updateAdminContract(selectedContract.id, payload);
      toast.success("قرارداد سرویس با موفقیت به‌روزرسانی شد.");

      setContracts((prev) =>
        prev.map((item) =>
          item.id === selectedContract.id ? response.data : item
        )
      );
      setIsModalOpen(false);
    } catch (error: any) {
      console.error("Failed to update contract quote:", error);
      toast.error(error?.response?.data?.detail || "خطا در ثبت تغییرات قرارداد.");
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusBadge = (status: ContractStatus) => {
    switch (status) {
      case "PENDING":
        return {
          label: "درخواست اولیه (بررسی)",
          classes: "bg-amber-500/10 text-amber-600 border-amber-500/20",
        };
      case "QUOTED":
        return {
          label: "پیش‌فاکتور صادر شده",
          classes: "bg-blue-500/10 text-blue-600 border-blue-500/20",
        };
      case "ACTIVE":
        return {
          label: "قرارداد فعال",
          classes: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
        };
      case "REJECTED":
        return {
          label: "رد شده",
          classes: "bg-rose-500/10 text-rose-600 border-rose-500/20",
        };
      case "EXPIRED":
        return {
          label: "پایان قرارداد",
          classes: "bg-muted text-muted-foreground border-border",
        };
      default:
        return {
          label: status,
          classes: "bg-muted text-muted-foreground border-border",
        };
    }
  };

  const formatDate = (isoString?: string | null) => {
    if (!isoString) return "-";
    try {
      const date = new Date(isoString);
      return toPersianDigits(
        new Intl.DateTimeFormat("fa-IR", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).format(date)
      );
    } catch {
      return toPersianDigits(isoString);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300" dir="rtl">
      {/* Header Banner */}
      <div className="bg-primary text-primary-foreground rounded-2xl p-6 shadow-xl relative overflow-hidden border border-primary/20">
        <div className="absolute top-0 left-0 w-64 h-64 bg-accent/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="p-1.5 rounded-lg bg-accent/20 text-accent border border-accent/30">
                <Wrench className="w-5 h-5" />
              </span>
              <span className="text-xs font-semibold text-accent uppercase tracking-widest">
                مهندسی سرویس و نگهداری آسانسور
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              مدیریت قراردادهای سرویس (Admin)
            </h1>
            <p className="text-sm text-primary-foreground/75 mt-1">
              بررسی کارشناسی فنی، صدور پیش‌فاکتور قیمت سالیانه و اعلام زمان‌بندی سرویس دوره‌ای به مدیران ساختمان
            </p>
          </div>

          <button
            onClick={loadContracts}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-sm font-medium transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
            <span>به‌روزرسانی</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-card border border-border rounded-2xl p-4 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-muted-foreground absolute right-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجو بر اساس آدرس ساختمان، نوع آسانسور، نام کارفرما یا شماره تماس..."
              className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all placeholder:text-muted-foreground text-foreground"
            />
          </div>

          {/* Status Filter Chips */}
          <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            {[
              { id: "ALL", label: "همه قراردادها" },
              { id: "PENDING", label: "درخواست‌های اولیه" },
              { id: "QUOTED", label: "پیش‌فاکتور صادر شده" },
              { id: "ACTIVE", label: "قراردادهای فعال" },
              { id: "REJECTED", label: "رد شده" },
              { id: "EXPIRED", label: "پایان یافته" },
            ].map((chip) => (
              <button
                key={chip.id}
                onClick={() => setStatusFilter(chip.id as StatusFilterType)}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-bold transition-all border",
                  statusFilter === chip.id
                    ? "bg-accent text-accent-foreground border-accent shadow-sm"
                    : "bg-muted/50 text-muted-foreground border-border hover:bg-muted hover:text-foreground"
                )}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            {/* Table Header with bg-primary and text-white/text-accent */}
            <thead className="bg-primary text-primary-foreground font-bold border-b border-primary/30">
              <tr>
                <th className="py-4 px-4">شناسه</th>
                <th className="py-4 px-4">کارفرما / مدیر ساختمان</th>
                <th className="py-4 px-4">مشخصات آسانسور و آدرس</th>
                <th className="py-4 px-4">مبلغ سالیانه</th>
                <th className="py-4 px-4">وضعیت قرارداد</th>
                <th className="py-4 px-4 text-center">همگام‌سازی Core</th>
                <th className="py-4 px-4">تاریخ شروع</th>
                <th className="py-4 px-4 text-center">عملیات مدیریت</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-accent" />
                      <span>در حال دریافت قراردادهای سرویس...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredContracts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    هیچ قراردادی با فیلترهای انتخابی یافت نشد.
                  </td>
                </tr>
              ) : (
                filteredContracts.map((item) => {
                  const statusBadge = getStatusBadge(item.status);

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      {/* ID */}
                      <td className="py-3.5 px-4 font-mono font-bold text-foreground">
                        #{toPersianDigits(item.id.slice(0, 8))}
                      </td>

                      {/* Customer Info */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <div className="font-bold text-foreground">
                            {item.user?.name || "کارفرمای آسانرو"}
                          </div>
                          {item.user?.phone && (
                            <div
                              dir="ltr"
                              className="text-[11px] text-muted-foreground font-mono"
                            >
                              {toPersianDigits(item.user.phone)}
                            </div>
                          )}
                          {item.employer_national_id && (
                            <div className="text-[10px] text-accent font-mono">
                              کد ملی: {toPersianDigits(item.employer_national_id)}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Elevator Specs & Address */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="font-bold text-foreground line-clamp-1 flex items-center gap-1.5">
                          <Building className="w-3.5 h-3.5 text-accent shrink-0" />
                          <span>{item.building_name || "ساختمان بدون عنوان"}</span>
                          <span className="text-[10px] text-muted-foreground">({item.usage_type || "مسافری"})</span>
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                          {item.elevator_type || "آسانسور کششی/هیدرولیک"} - {toPersianDigits(item.stops_count || 5)} توقف
                          {item.capacity_kg ? ` (${toPersianDigits(item.capacity_kg)}kg)` : ""}
                        </div>
                        <div className="text-[10px] text-muted-foreground/80 mt-0.5 line-clamp-1">
                          {item.building_address || "کرمان"}
                        </div>
                      </td>

                      {/* Annual & Monthly Price */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-foreground">
                          {item.annual_price ? formatPersianCurrency(item.annual_price) : "در انتظار کارشناسی"}
                        </div>
                        {item.monthly_fee && (
                          <div className="text-[10px] text-muted-foreground mt-0.5">
                            ماهانه: {formatPersianCurrency(item.monthly_fee)}
                          </div>
                        )}
                        {item.payment_frequency && (
                          <div className="text-[9px] text-accent/90 mt-0.5">
                            {item.payment_frequency === "MONTHLY"
                              ? "تسویه ماهانه"
                              : item.payment_frequency === "QUARTERLY"
                              ? "تسویه سه‌ماهه"
                              : "تسویه توافقی"}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={cn(
                            "inline-flex items-center text-[10px] px-2.5 py-1 rounded-full font-bold border",
                            statusBadge.classes
                          )}
                        >
                          {statusBadge.label}
                        </span>
                      </td>

                      {/* Core App Sync Status */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {item.sync_status === "SYNCED" ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span>همگام با Core</span>
                          </div>
                        ) : item.sync_status === "FAILED" ? (
                          <div
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200"
                            title={item.sync_error || ""}
                          >
                            <AlertCircle className="w-3 h-3 text-rose-500" />
                            <span>خطای همگام‌سازی</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-muted text-muted-foreground border border-border">
                            <Database className="w-3 h-3 text-muted-foreground" />
                            <span>منتظر همگام‌سازی</span>
                          </div>
                        )}
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-4 text-muted-foreground font-mono text-[11px]">
                        {formatDate(item.start_date || item.created_at)}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center justify-center gap-2">
                          {/* Manual Sync to Core App */}
                          <button
                            type="button"
                            onClick={() => handleManualSync(item.id)}
                            disabled={syncingContractId === item.id}
                            title="همگام‌سازی مستقیم داده‌ها با پایگاه داده Core App"
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 border border-blue-500/25 font-bold transition-all disabled:opacity-50 cursor-pointer"
                          >
                            {syncingContractId === item.id ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
                            ) : (
                              <CloudUpload className="w-3.5 h-3.5" />
                            )}
                            <span>همگام‌سازی Core</span>
                          </button>

                          {/* Direct Message (Bot/CRM) */}
                          <button
                            type="button"
                            onClick={() => handleOpenDirectMessage(item)}
                            title="ارسال پیام مستقیم به تلگرام/بله مدیر ساختمان"
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-accent/15 text-accent hover:bg-accent/25 border border-accent/30 font-medium transition-colors"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>پیام مستقیم</span>
                          </button>

                          {/* Review & Quote Modal */}
                          <button
                            type="button"
                            onClick={() => handleOpenReviewModal(item)}
                            title="ویرایش قیمت و تایید قرارداد"
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 font-medium transition-colors"
                          >
                            <Edit className="w-3.5 h-3.5" />
                            <span>قیمت‌گذاری</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review & Quote Modal */}
      {isModalOpen && selectedContract && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="w-full max-w-2xl max-h-[90vh] bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col text-card-foreground animate-in zoom-in-95 duration-200"
            dir="rtl"
          >
            <div className="bg-primary text-primary-foreground px-6 py-4 flex items-center justify-between border-b border-primary/20 shrink-0">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Wrench className="w-4 h-4 text-accent" />
                کارشناسی و قیمت‌گذاری قرارداد #{toPersianDigits(selectedContract.id.slice(0, 8))}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-primary-foreground/70 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveQuote} className="p-6 space-y-6 overflow-y-auto flex-1">
              {/* Section 1: Building & Employer */}
              <div className="space-y-3">
                <h4 className="text-xs font-black text-accent uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b border-border">
                  <Building className="w-3.5 h-3.5" />
                  اطلاعات ساختمان و کارفرما
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">
                      نام ساختمان / مجتمع:
                    </label>
                    <input
                      type="text"
                      value={modalForm.building_name}
                      onChange={(e) =>
                        setModalForm({ ...modalForm, building_name: e.target.value })
                      }
                      className="w-full rounded-xl border border-border bg-background p-2.5 text-xs focus:ring-2 focus:ring-accent/50 focus:border-accent"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">
                      کد ملی / شناسه کارفرما:
                    </label>
                    <input
                      type="text"
                      value={modalForm.employer_national_id}
                      onChange={(e) =>
                        setModalForm({
                          ...modalForm,
                          employer_national_id: e.target.value,
                        })
                      }
                      className="w-full rounded-xl border border-border bg-background p-2.5 text-xs font-mono focus:ring-2 focus:ring-accent/50 focus:border-accent"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">
                      کد پستی ملک:
                    </label>
                    <input
                      type="text"
                      value={modalForm.postal_code}
                      onChange={(e) =>
                        setModalForm({ ...modalForm, postal_code: e.target.value })
                      }
                      className="w-full rounded-xl border border-border bg-background p-2.5 text-xs font-mono focus:ring-2 focus:ring-accent/50 focus:border-accent"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">
                      پلاک ثبتی یا شهرداری:
                    </label>
                    <input
                      type="text"
                      value={modalForm.registration_plate}
                      onChange={(e) =>
                        setModalForm({
                          ...modalForm,
                          registration_plate: e.target.value,
                        })
                      }
                      className="w-full rounded-xl border border-border bg-background p-2.5 text-xs focus:ring-2 focus:ring-accent/50 focus:border-accent"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">
                      نشانی کامل ساختمان:
                    </label>
                    <div className="p-2.5 rounded-xl bg-muted/40 border border-border text-foreground text-xs leading-relaxed">
                      {selectedContract.building_address}
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 2: Technical Specs */}
              <div className="space-y-3">
                <h4 className="text-xs font-black text-accent uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b border-border">
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  مشخصات فنی و بهره‌برداری آسانسور
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">
                      سیستم محرکه آسانسور:
                    </label>
                    <select
                      value={modalForm.elevator_type}
                      onChange={(e) =>
                        setModalForm({ ...modalForm, elevator_type: e.target.value })
                      }
                      className="w-full rounded-xl border border-border bg-background p-2.5 text-xs focus:ring-2 focus:ring-accent/50 focus:border-accent"
                    >
                      <option value="کششی گیربکس (Traction Geared)">کششی گیربکس (Traction Geared)</option>
                      <option value="کششی گیرلس (Gearless High-Speed)">کششی گیرلس (Gearless High-Speed)</option>
                      <option value="هیدرولیک (Hydraulic Passenger)">هیدرولیک (Hydraulic Passenger)</option>
                      <option value="روملس بدون موتورخانه (MRL)">روملس بدون موتورخانه (MRL)</option>
                      <option value="هوم‌لیفت / خانگی (Homelift)">هوم‌لیفت / خانگی (Homelift)</option>
                      <option value="باربر صنعتی / خودروبَر">باربر صنعتی / خودروبَر</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">
                      کاربری آسانسور:
                    </label>
                    <select
                      value={modalForm.usage_type}
                      onChange={(e) =>
                        setModalForm({ ...modalForm, usage_type: e.target.value })
                      }
                      className="w-full rounded-xl border border-border bg-background p-2.5 text-xs focus:ring-2 focus:ring-accent/50 focus:border-accent"
                    >
                      <option value="مسافری">مسافری</option>
                      <option value="باربری">باربری</option>
                      <option value="بیمارستانی / برانکاردبر">بیمارستانی</option>
                      <option value="خودروبر">خودروبر</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">
                      تعداد توقف:
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={60}
                      value={modalForm.stops_count}
                      onChange={(e) =>
                        setModalForm({
                          ...modalForm,
                          stops_count: parseInt(e.target.value) || 1,
                        })
                      }
                      className="w-full rounded-xl border border-border bg-background p-2.5 text-xs focus:ring-2 focus:ring-accent/50 focus:border-accent"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">
                      ظرفیت نامی (kg):
                    </label>
                    <input
                      type="number"
                      step={50}
                      value={modalForm.capacity_kg}
                      onChange={(e) =>
                        setModalForm({
                          ...modalForm,
                          capacity_kg: parseInt(e.target.value) || 100,
                        })
                      }
                      className="w-full rounded-xl border border-border bg-background p-2.5 text-xs focus:ring-2 focus:ring-accent/50 focus:border-accent"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">
                      سرعت نامی:
                    </label>
                    <input
                      type="text"
                      value={modalForm.speed_ms}
                      onChange={(e) =>
                        setModalForm({ ...modalForm, speed_ms: e.target.value })
                      }
                      className="w-full rounded-xl border border-border bg-background p-2.5 text-xs focus:ring-2 focus:ring-accent/50 focus:border-accent"
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Financial & Status */}
              <div className="space-y-3">
                <h4 className="text-xs font-black text-accent uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b border-border">
                  <FileCheck2 className="w-3.5 h-3.5" />
                  قیمت‌گذاری و شرایط مالی قرارداد
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">
                      وضعیت قرارداد:
                    </label>
                    <select
                      value={modalForm.status}
                      onChange={(e) =>
                        setModalForm({
                          ...modalForm,
                          status: e.target.value as ContractStatus,
                        })
                      }
                      className="w-full rounded-xl border border-border bg-background p-2.5 text-xs focus:ring-2 focus:ring-accent/50 focus:border-accent"
                    >
                      <option value="PENDING">درخواست اولیه (بررسی)</option>
                      <option value="QUOTED">پیش‌فاکتور صادر شده</option>
                      <option value="ACTIVE">قرارداد فعال (تایید نهایی)</option>
                      <option value="REJECTED">رد درخواست</option>
                      <option value="EXPIRED">پایان قرارداد</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">
                      دوره تسویه پرداخت:
                    </label>
                    <select
                      value={modalForm.payment_frequency}
                      onChange={(e) =>
                        setModalForm({
                          ...modalForm,
                          payment_frequency: e.target.value,
                        })
                      }
                      className="w-full rounded-xl border border-border bg-background p-2.5 text-xs focus:ring-2 focus:ring-accent/50 focus:border-accent"
                    >
                      <option value="MONTHLY">ماهانه (MONTHLY)</option>
                      <option value="QUARTERLY">سه‌ماهه (QUARTERLY)</option>
                      <option value="FLEXIBLE">توافقی / منعطف (FLEXIBLE)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">
                      مبلغ کل سالیانه قرارداد (ریال):
                    </label>
                    <input
                      type="number"
                      value={modalForm.annual_price}
                      onChange={(e) => {
                        const val = e.target.value;
                        const annual = parseFloat(val);
                        setModalForm({
                          ...modalForm,
                          annual_price: val,
                          monthly_fee: annual > 0 ? String(Math.round(annual / 12)) : modalForm.monthly_fee,
                        });
                      }}
                      placeholder="مثال: 60000000"
                      className="w-full rounded-xl border border-border bg-background p-2.5 text-xs focus:ring-2 focus:ring-accent/50 focus:border-accent font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">
                      مبلغ ماهانه / هر قسط (ریال):
                    </label>
                    <input
                      type="number"
                      value={modalForm.monthly_fee}
                      onChange={(e) =>
                        setModalForm({ ...modalForm, monthly_fee: e.target.value })
                      }
                      placeholder="مثال: 5000000"
                      className="w-full rounded-xl border border-border bg-background p-2.5 text-xs focus:ring-2 focus:ring-accent/50 focus:border-accent font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">
                      مبلغ مالیات و عوارض (ریال):
                    </label>
                    <input
                      type="number"
                      value={modalForm.tax_amount}
                      onChange={(e) =>
                        setModalForm({ ...modalForm, tax_amount: e.target.value })
                      }
                      placeholder="مثال: 0"
                      className="w-full rounded-xl border border-border bg-background p-2.5 text-xs focus:ring-2 focus:ring-accent/50 focus:border-accent font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">
                      تاریخ شروع تعهدات سرویس:
                    </label>
                    <input
                      type="date"
                      value={modalForm.start_date}
                      onChange={(e) =>
                        setModalForm({ ...modalForm, start_date: e.target.value })
                      }
                      className="w-full rounded-xl border border-border bg-background p-2.5 text-xs focus:ring-2 focus:ring-accent/50 focus:border-accent font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Core App Sync Controls */}
              <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div>
                  <span className="font-bold text-blue-700 dark:text-blue-400 block">
                    وضعیت پایگاه داده Core App (اپلیکیشن موبایل تکنسین‌ها):
                  </span>
                  <span className="text-[11px] text-muted-foreground font-mono mt-0.5 block">
                    {selectedContract.contract_number
                      ? `شماره قرارداد: ${selectedContract.contract_number}`
                      : "قرارداد هنوز با Core App همگام نشده است"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "px-2.5 py-1 rounded-full text-[10px] font-bold border",
                      selectedContract.sync_status === "SYNCED"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : selectedContract.sync_status === "FAILED"
                        ? "bg-rose-50 text-rose-700 border-rose-200"
                        : "bg-muted text-muted-foreground border-border"
                    )}
                  >
                    {selectedContract.sync_status === "SYNCED"
                      ? "همگام با Core App"
                      : selectedContract.sync_status === "FAILED"
                      ? "خطا در همگام‌سازی"
                      : "عدم همگام‌سازی"}
                  </span>

                  <button
                    type="button"
                    onClick={() => handleManualSync(selectedContract.id)}
                    disabled={syncingContractId === selectedContract.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-xs transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    {syncingContractId === selectedContract.id ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <CloudUpload className="w-3.5 h-3.5" />
                    )}
                    <span>همگام‌سازی دستی</span>
                  </button>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-border text-xs hover:bg-muted"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="px-5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 disabled:opacity-50"
                >
                  {isUpdating ? "در حال ثبت..." : "ذخیره تغییرات و صدور پیش‌فاکتور"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CRM Direct Message Modal */}
      <AdminDirectMessageModal
        isOpen={isDmModalOpen}
        onClose={() => setIsDmModalOpen(false)}
        user={dmTargetUser}
        contextHint={dmContextHint}
      />
    </div>
  );
}
