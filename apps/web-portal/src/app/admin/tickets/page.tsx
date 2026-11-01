"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  MessageSquare,
  Search,
  RefreshCw,
  MessageCircle,
  AlertCircle,
  CheckCircle2,
  Clock,
  User,
  SlidersHorizontal,
  Ticket as TicketIcon,
  HelpCircle,
  AlertTriangle,
} from "lucide-react";
import { toPersianDigits, cn } from "@/lib/utils";
import { fetchAdminTickets, TicketDto } from "@/lib/api/admin";
import {
  TicketChatModal,
  formatPersianDate,
  getStatusBadge,
  getPriorityBadge,
} from "./components/TicketChatModal";
import { toast } from "sonner";

type StatusFilterType = "ALL" | "OPEN" | "IN_PROGRESS" | "REPLIED" | "CLOSED";

export default function AdminTicketsPage() {
  const [tickets, setTickets] = useState<TicketDto[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<StatusFilterType>("ALL");
  const [selectedTicket, setSelectedTicket] = useState<TicketDto | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // Fetch all admin support tickets from backend
  const loadTickets = async () => {
    setIsLoading(true);
    try {
      const response = await fetchAdminTickets();
      const data = Array.isArray(response.data)
        ? response.data
        : (response as any)?.data || [];
      setTickets(data);
    } catch (error: any) {
      console.warn("Could not fetch admin tickets from backend:", error);
      setTickets([]);

      const status = error?.response?.status;
      if (status === 404) {
        toast.info("ماژول پشتیبانی و CRM در بک‌اند", {
          description: "اندپوینت تیکت‌های ادمین در دسترس نیست.",
        });
      } else {
        toast.error("خطا در بارگذاری تیکت‌های پشتیبانی", {
          description:
            error?.response?.data?.detail ||
            "برقراری ارتباط با سرور یا احراز هویت مدیر با خطا مواجه شد.",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, []);

  // Filter and search logic
  const filteredTickets = useMemo(() => {
    return tickets.filter((item) => {
      // 1. Status Filter
      if (statusFilter !== "ALL" && item.status !== statusFilter) {
        return false;
      }

      // 2. Search Query (Subject, Customer Phone, ID)
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase().trim();
      const subject = (item.subject || "").toLowerCase();
      const phone = (item.user?.phone || "").toLowerCase();
      const id = (item.id || "").toLowerCase();

      return subject.includes(query) || phone.includes(query) || id.includes(query);
    });
  }, [tickets, statusFilter, searchQuery]);

  // Operational metrics
  const openCount = useMemo(
    () => tickets.filter((t) => t.status === "OPEN").length,
    [tickets]
  );
  const inProgressCount = useMemo(
    () => tickets.filter((t) => t.status === "IN_PROGRESS").length,
    [tickets]
  );
  const repliedCount = useMemo(
    () => tickets.filter((t) => t.status === "REPLIED").length,
    [tickets]
  );
  const closedCount = useMemo(
    () => tickets.filter((t) => t.status === "CLOSED").length,
    [tickets]
  );

  // Open modal handler
  const handleOpenChat = (ticket: TicketDto) => {
    setSelectedTicket(ticket);
    setIsModalOpen(true);
  };

  return (
    <div className="w-full space-y-6 font-sans text-foreground" dir="rtl">
      {/* ==================================================================== */}
      {/* 1. Header Bar: Title, Description & Refresh Action                   */}
      {/* ==================================================================== */}
      <div className="bg-card rounded-3xl p-6 sm:p-7 border border-border shadow-[0_2px_15px_rgba(0,0,0,0.03)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center flex-shrink-0">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                پشتیبانی و تیکت‌ها
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-muted border border-border text-xs font-bold text-muted-foreground">
                {isLoading ? "..." : `${toPersianDigits(tickets.length)} تیکت`}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground font-medium mt-0.5">
              مرکز مدیریت درخواست‌های فنی، استعلام قیمت قطعات و پاسخ‌گویی به مشتریان آسانرو
            </p>
          </div>
        </div>

        {/* Top Actions */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={loadTickets}
            disabled={isLoading}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-card hover:bg-muted text-foreground border border-border text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
          >
            <RefreshCw
              className={cn("w-4 h-4 text-muted-foreground", isLoading && "animate-spin")}
            />
            <span>تازه‌سازی</span>
          </button>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 2. Metric KPI Cards                                                  */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Total Tickets */}
        <div className="bg-card rounded-2xl p-4 sm:p-5 border border-border shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-muted-foreground block">
              کل تیکت‌های سامانه
            </span>
            <span className="text-2xl font-black text-foreground mt-1 block">
              {isLoading ? "..." : toPersianDigits(tickets.length)}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-muted border border-border text-muted-foreground flex items-center justify-center">
            <TicketIcon className="w-5 h-5" />
          </div>
        </div>

        {/* Open Tickets (Critical Focus) */}
        <div className="bg-card rounded-2xl p-4 sm:p-5 border border-rose-500/20 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-rose-600 dark:text-rose-400 block">
              باز / در انتظار پاسخ
            </span>
            <span className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1 block">
              {isLoading ? "..." : toPersianDigits(openCount)}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 flex items-center justify-center">
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>

        {/* In Progress */}
        <div className="bg-card rounded-2xl p-4 sm:p-5 border border-amber-500/20 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400 block">
              در حال پیگیری فنی
            </span>
            <span className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1 block">
              {isLoading ? "..." : toPersianDigits(inProgressCount)}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* Closed or Replied */}
        <div className="bg-card rounded-2xl p-4 sm:p-5 border border-emerald-500/20 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 block">
              بسته شده / خاتمه یافته
            </span>
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 block">
              {isLoading ? "..." : toPersianDigits(closedCount)}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 3. Search and Status Filter Tabs                                     */}
      {/* ==================================================================== */}
      <div className="bg-card rounded-2xl p-4 border border-border shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="جستجو در موضوع، شماره تلفن مشتری یا شناسه تیکت..."
            className="w-full pl-4 pr-10 py-2.5 rounded-xl bg-muted/40 border border-border text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all font-sans"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <button
            type="button"
            onClick={() => setStatusFilter("ALL")}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer",
              statusFilter === "ALL"
                ? "bg-foreground text-background shadow-xs"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            همه ({toPersianDigits(tickets.length)})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("OPEN")}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer",
              statusFilter === "OPEN"
                ? "bg-rose-600 text-white shadow-xs"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            باز ({toPersianDigits(openCount)})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("IN_PROGRESS")}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer",
              statusFilter === "IN_PROGRESS"
                ? "bg-amber-600 text-white shadow-xs"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            در حال بررسی ({toPersianDigits(inProgressCount)})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("REPLIED")}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer",
              statusFilter === "REPLIED"
                ? "bg-blue-600 text-white shadow-xs"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            پاسخ داده شده ({toPersianDigits(repliedCount)})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("CLOSED")}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer",
              statusFilter === "CLOSED"
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            بسته شده ({toPersianDigits(closedCount)})
          </button>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 4. Tickets Data Table                                                */}
      {/* ==================================================================== */}
      <div className="bg-card rounded-2xl shadow-xs border border-border overflow-hidden font-sans">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse text-sm" dir="rtl">
            <thead>
              <tr className="bg-muted/60 border-b border-border text-xs font-bold text-muted-foreground">
                <th className="py-4 px-5 text-center w-16">ردیف</th>
                <th className="py-4 px-5">شناسه تیکت</th>
                <th className="py-4 px-5">مشتری</th>
                <th className="py-4 px-5">موضوع</th>
                <th className="py-4 px-5 text-center">اولویت</th>
                <th className="py-4 px-5 text-center">وضعیت</th>
                <th className="py-4 px-5 text-center">اقدام</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-sm">
              {isLoading ? (
                // Skeleton Loader
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-4 px-5 text-center">
                      <div className="h-4 bg-muted rounded w-6 mx-auto" />
                    </td>
                    <td className="py-4 px-5">
                      <div className="h-4 bg-muted rounded w-20" />
                    </td>
                    <td className="py-4 px-5">
                      <div className="h-4 bg-muted rounded w-28 mb-1" />
                    </td>
                    <td className="py-4 px-5">
                      <div className="h-4 bg-muted rounded w-48 mb-1.5" />
                      <div className="h-3 bg-muted/60 rounded w-24" />
                    </td>
                    <td className="py-4 px-5 text-center">
                      <div className="h-6 bg-muted rounded-full w-20 mx-auto" />
                    </td>
                    <td className="py-4 px-5 text-center">
                      <div className="h-6 bg-muted rounded-full w-24 mx-auto" />
                    </td>
                    <td className="py-4 px-5 text-center">
                      <div className="h-8 bg-muted rounded-xl w-24 mx-auto" />
                    </td>
                  </tr>
                ))
              ) : filteredTickets.length === 0 ? (
                // Empty State
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="w-16 h-16 rounded-3xl bg-muted border border-border flex items-center justify-center text-muted-foreground">
                        <MessageSquare className="w-8 h-8 opacity-40" />
                      </div>
                      <div className="text-sm font-black text-foreground">
                        هیچ تیکتی یافت نشد
                      </div>
                      <p className="text-xs text-muted-foreground max-w-sm">
                        {searchQuery.trim()
                          ? `عبارت "${searchQuery}" با موضوع یا شماره مشتری هیچ تیکتی مطابقت ندارد.`
                          : "هنوز هیچ تیکت پشتیبانی در این بخش ثبت نشده است."}
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
                // Ticket Rows
                filteredTickets.map((ticket, index) => {
                  const priority = getPriorityBadge(ticket.priority);
                  const status = getStatusBadge(ticket.status);
                  const customerPhone = ticket.user?.phone || "کاربر ناشناس";
                  const messagesCount = ticket.messages?.length || 0;

                  return (
                    <tr
                      key={ticket.id}
                      className="hover:bg-muted/40 transition-colors group"
                    >
                      {/* 1. Row Index */}
                      <td className="py-4 px-5 text-center align-middle font-bold text-muted-foreground text-xs">
                        {toPersianDigits(index + 1)}
                      </td>

                      {/* 2. Ticket ID */}
                      <td className="py-4 px-5 align-middle whitespace-nowrap">
                        <span className="font-mono font-bold text-xs text-foreground bg-muted/80 px-2.5 py-1 rounded-md border border-border">
                          {toPersianDigits(ticket.id.slice(0, 8))}
                        </span>
                      </td>

                      {/* 3. Customer */}
                      <td className="py-4 px-5 align-middle">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-muted text-muted-foreground flex items-center justify-center flex-shrink-0">
                            <User className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <span className="font-bold text-xs text-foreground block">
                              {toPersianDigits(customerPhone)}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {formatPersianDate(ticket.created_at)}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* 4. Subject */}
                      <td className="py-4 px-5 align-middle">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-foreground block text-sm group-hover:text-primary transition-colors">
                            {ticket.subject}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-muted text-[11px] font-bold text-muted-foreground border border-border">
                            {toPersianDigits(messagesCount)} پیام
                          </span>
                        </div>
                      </td>

                      {/* 5. Priority */}
                      <td className="py-4 px-5 align-middle text-center whitespace-nowrap">
                        <span
                          className={cn(
                            "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border",
                            priority.classes
                          )}
                        >
                          {priority.label}
                        </span>
                      </td>

                      {/* 6. Status */}
                      <td className="py-4 px-5 align-middle text-center whitespace-nowrap">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black border",
                            status.classes
                          )}
                        >
                          <span className={cn("w-1.5 h-1.5 rounded-full", status.dot)} />
                          {status.label}
                        </span>
                      </td>

                      {/* 7. Action Button */}
                      <td className="py-4 px-5 align-middle text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleOpenChat(ticket)}
                          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all shadow-xs cursor-pointer"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>مشاهده و پاسخ</span>
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

      {/* ==================================================================== */}
      {/* 5. Ticket Chat Modal                                                 */}
      {/* ==================================================================== */}
      <TicketChatModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedTicket(null);
        }}
        ticket={selectedTicket}
        onSuccess={() => {
          loadTickets();
        }}
      />
    </div>
  );
}
