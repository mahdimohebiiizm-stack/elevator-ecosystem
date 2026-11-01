"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  MessageSquare,
  Search,
  RefreshCw,
  Send,
  Eye,
  SlidersHorizontal,
  Clock,
  User as UserIcon,
  Phone,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Filter,
} from "lucide-react";
import {
  fetchAdminTickets,
  updateTicketStatus,
  TicketDto,
} from "@/lib/api/admin";
import {
  TicketChatModal,
  formatPersianDate,
  getStatusBadge,
  getPriorityBadge,
} from "@/app/admin/tickets/components/TicketChatModal";
import {
  AdminDirectMessageModal,
  TargetUserInfo,
} from "@/components/admin/AdminDirectMessageModal";
import { toPersianDigits, cn } from "@/lib/utils";
import { toast } from "sonner";

type StatusFilterType = "ALL" | "OPEN" | "IN_PROGRESS" | "REPLIED" | "CLOSED";

export default function AdminTicketsDataGridPage() {
  const [tickets, setTickets] = useState<TicketDto[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<StatusFilterType>("ALL");
  const [selectedTicket, setSelectedTicket] = useState<TicketDto | null>(null);
  const [isChatModalOpen, setIsChatModalOpen] = useState<boolean>(false);

  // CRM Direct Message Modal state
  const [dmTargetUser, setDmTargetUser] = useState<TargetUserInfo | null>(null);
  const [dmContextHint, setDmContextHint] = useState<string>("");
  const [isDmModalOpen, setIsDmModalOpen] = useState<boolean>(false);

  const loadTickets = async () => {
    setIsLoading(true);
    try {
      const response = await fetchAdminTickets();
      const data = Array.isArray(response.data)
        ? response.data
        : (response as any)?.data || [];
      setTickets(data);
    } catch (error: any) {
      console.warn("Could not fetch admin tickets:", error);
      setTickets([]);
      toast.error("خطا در دریافت لیست تیکت‌ها از سرور");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, []);

  const handleStatusChange = async (ticketId: string, newStatus: string) => {
    try {
      await updateTicketStatus(ticketId, newStatus);
      toast.success("وضعیت تیکت با موفقیت تغییر کرد.");
      setTickets((prev) =>
        prev.map((t) => (t.id === ticketId ? { ...t, status: newStatus } : t))
      );
    } catch (err: any) {
      console.error("Status update error:", err);
      toast.error("خطا در تغییر وضعیت تیکت");
    }
  };

  const openTicketChat = (ticket: TicketDto) => {
    setSelectedTicket(ticket);
    setIsChatModalOpen(true);
  };

  const openDirectMessage = (ticket: TicketDto) => {
    const targetUser: TargetUserInfo = {
      id: ticket.user?.id || (ticket as any).user_id || "",
      name: ticket.user?.name || "کاربر",
      phone: ticket.user?.phone || "",
      telegram_id: (ticket.user as any)?.telegram_id,
      bale_id: (ticket.user as any)?.bale_id,
    };
    setDmTargetUser(targetUser);
    setDmContextHint(`تیکت #${ticket.id.slice(0, 6)}`);
    setIsDmModalOpen(true);
  };

  // Filter & Search Logic
  const filteredTickets = useMemo(() => {
    return tickets.filter((item) => {
      if (statusFilter !== "ALL" && item.status?.toUpperCase() !== statusFilter) {
        return false;
      }
      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase();
      const subject = (item.title || item.subject || "").toLowerCase();
      const userName = (item.user?.name || "").toLowerCase();
      const userPhone = (item.user?.phone || "").toLowerCase();
      const ticketId = (item.id || "").toLowerCase();

      return (
        subject.includes(q) ||
        userName.includes(q) ||
        userPhone.includes(q) ||
        ticketId.includes(q)
      );
    });
  }, [tickets, statusFilter, searchQuery]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300" dir="rtl">
      {/* Header Banner */}
      <div className="bg-primary text-primary-foreground rounded-2xl p-6 shadow-xl relative overflow-hidden border border-primary/20">
        <div className="absolute top-0 left-0 w-64 h-64 bg-accent/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="p-1.5 rounded-lg bg-accent/20 text-accent border border-accent/30">
                <MessageSquare className="w-5 h-5" />
              </span>
              <span className="text-xs font-semibold text-accent uppercase tracking-widest">
                میز خدمت و تیکتینگ مشتریان
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              مدیریت و پاسخگویی به تیکت‌ها
            </h1>
            <p className="text-sm text-primary-foreground/75 mt-1">
              بررسی شکایات، سوالات فنی و پشتیبانی آسانسور به همراه امکان پاسخگویی مستقیم و اطلاع‌رسانی ربات
            </p>
          </div>

          <button
            onClick={loadTickets}
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
              placeholder="جستجو بر اساس موضوع تیکت، نام کاربر، شماره تماس یا شناسه..."
              className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all placeholder:text-muted-foreground text-foreground"
            />
          </div>

          {/* Status Filter Chips */}
          <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            {[
              { id: "ALL", label: "همه تیکت‌ها" },
              { id: "OPEN", label: "باز / در انتظار" },
              { id: "IN_PROGRESS", label: "در حال بررسی" },
              { id: "REPLIED", label: "پاسخ داده شده" },
              { id: "CLOSED", label: "بسته شده" },
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
                <th className="py-4 px-4">مشتری / کاربر</th>
                <th className="py-4 px-4">موضوع و دپارتمان</th>
                <th className="py-4 px-4">اولویت</th>
                <th className="py-4 px-4">وضعیت تیکت</th>
                <th className="py-4 px-4">تاریخ ثبت</th>
                <th className="py-4 px-4 text-center">عملیات مدیریت</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-accent" />
                      <span>در حال دریافت تیکت‌های پشتیبانی...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    هیچ تیکتی با فیلترهای انتخابی یافت نشد.
                  </td>
                </tr>
              ) : (
                filteredTickets.map((item) => {
                  const statusBadge = getStatusBadge(item.status);
                  const priorityBadge = getPriorityBadge(item.priority);

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      {/* Ticket ID */}
                      <td className="py-3.5 px-4 font-mono font-bold text-foreground">
                        #{toPersianDigits(item.id.slice(0, 8))}
                      </td>

                      {/* User Info */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <div className="font-bold text-foreground">
                            {item.user?.name || "ناشناس"}
                          </div>
                          {item.user?.phone && (
                            <div
                              dir="ltr"
                              className="text-[11px] text-muted-foreground font-mono"
                            >
                              {toPersianDigits(item.user.phone)}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Subject & Department */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="font-bold text-foreground line-clamp-1">
                          {item.title || item.subject || "بدون عنوان"}
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                          {item.department || "پشتیبانی عمومی"}
                        </div>
                      </td>

                      {/* Priority */}
                      <td className="py-3.5 px-4">
                        <span
                          className={cn(
                            "inline-flex items-center text-[10px] px-2 py-0.5 rounded-full font-bold border",
                            priorityBadge.classes
                          )}
                        >
                          {priorityBadge.label}
                        </span>
                      </td>

                      {/* Status Dropdown */}
                      <td className="py-3.5 px-4">
                        <select
                          value={item.status?.toUpperCase() || "OPEN"}
                          onChange={(e) =>
                            handleStatusChange(item.id, e.target.value)
                          }
                          className={cn(
                            "text-xs font-bold rounded-lg border px-2.5 py-1 bg-background focus:outline-none focus:ring-1 focus:ring-accent transition-all cursor-pointer",
                            statusBadge.classes
                          )}
                        >
                          <option value="OPEN">باز / در انتظار</option>
                          <option value="IN_PROGRESS">در حال بررسی</option>
                          <option value="REPLIED">پاسخ داده شده</option>
                          <option value="CLOSED">بسته شده</option>
                        </select>
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-4 text-muted-foreground font-mono text-[11px]">
                        {formatPersianDate(item.created_at)}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center justify-center gap-2">
                          {/* Direct Message (Bot/CRM) */}
                          <button
                            type="button"
                            onClick={() => openDirectMessage(item)}
                            title="ارسال پیام مستقیم به تلگرام/بله کاربر"
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-accent/15 text-accent hover:bg-accent/25 border border-accent/30 font-medium transition-colors"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>پیام مستقیم</span>
                          </button>

                          {/* Open Chat Modal */}
                          <button
                            type="button"
                            onClick={() => openTicketChat(item)}
                            title="مشاهده پیام‌ها و پاسخ"
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 font-medium transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>گفتگو</span>
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

      {/* Ticket Chat Modal */}
      <TicketChatModal
        isOpen={isChatModalOpen}
        onClose={() => setIsChatModalOpen(false)}
        ticket={selectedTicket}
        onSuccess={loadTickets}
      />

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
