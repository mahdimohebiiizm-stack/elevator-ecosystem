"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  MessageSquare,
  Plus,
  Search,
  RefreshCw,
  Clock,
  Ticket as TicketIcon,
  CheckCircle2,
  MessageCircle,
  Star,
  X,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { toPersianDigits, cn } from "@/lib/utils";
import { TicketDto } from "@/lib/api/admin";
import {
  formatPersianDate,
  getStatusBadge,
  getPriorityBadge,
} from "@/app/admin/tickets/components/TicketChatModal";
import { toast } from "sonner";

export type TicketFilterType = "ALL" | "OPEN_OR_PROGRESS" | "REPLIED" | "CLOSED";

export interface StoredRating {
  rating: number; // 1 to 5
  comment?: string;
  ratedAt: string;
}

interface TicketListProps {
  tickets: TicketDto[];
  isLoading: boolean;
  onRefresh: () => void;
  onCreateTicket: () => void;
  onOpenChat: (ticket: TicketDto) => void;
}

export const TicketList: React.FC<TicketListProps> = ({
  tickets,
  isLoading,
  onRefresh,
  onCreateTicket,
  onOpenChat,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filter, setFilter] = useState<TicketFilterType>("ALL");

  // Ratings stored locally by ticket ID
  const [ratingsMap, setRatingsMap] = useState<Record<string, StoredRating>>({});

  // Rating Modal State
  const [ratingModalTicket, setRatingModalTicket] = useState<TicketDto | null>(null);
  const [selectedScore, setSelectedScore] = useState<number>(5);
  const [hoveredScore, setHoveredScore] = useState<number | null>(null);
  const [ratingComment, setRatingComment] = useState<string>("");

  // Load existing ratings from localStorage on mount
  useEffect(() => {
    try {
      const map: Record<string, StoredRating> = {};
      for (const t of tickets) {
        const saved = localStorage.getItem(`asanro_ticket_rating_${t.id}`);
        if (saved) {
          map[t.id] = JSON.parse(saved);
        }
      }
      setRatingsMap(map);
    } catch {
      // Local storage unavailable or failed
    }
  }, [tickets]);

  // Operational metrics
  const openCount = useMemo(
    () => tickets.filter((t) => t.status === "OPEN" || t.status === "IN_PROGRESS").length,
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

  // Filter and search
  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      // Status filter
      if (filter === "OPEN_OR_PROGRESS" && t.status !== "OPEN" && t.status !== "IN_PROGRESS") {
        return false;
      }
      if (filter === "REPLIED" && t.status !== "REPLIED") {
        return false;
      }
      if (filter === "CLOSED" && t.status !== "CLOSED") {
        return false;
      }

      // Search query
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const subject = (t.subject || "").toLowerCase();
      const id = (t.id || "").toLowerCase();
      return subject.includes(q) || id.includes(q);
    });
  }, [tickets, filter, searchQuery]);

  const handleOpenRatingModal = (ticket: TicketDto) => {
    const existing = ratingsMap[ticket.id];
    setRatingModalTicket(ticket);
    setSelectedScore(existing ? existing.rating : 5);
    setRatingComment(existing?.comment || "");
  };

  const handleSaveRating = () => {
    if (!ratingModalTicket) return;
    const ratingData: StoredRating = {
      rating: selectedScore,
      comment: ratingComment.trim() || undefined,
      ratedAt: new Date().toISOString(),
    };

    try {
      localStorage.setItem(
        `asanro_ticket_rating_${ratingModalTicket.id}`,
        JSON.stringify(ratingData)
      );
      setRatingsMap((prev) => ({
        ...prev,
        [ratingModalTicket.id]: ratingData,
      }));
      toast.success("امتیاز و نظر شما با موفقیت ثبت شد", {
        description: `امتیاز ${toPersianDigits(selectedScore)} ستاره برای تیکت #${toPersianDigits(ratingModalTicket.id.slice(0, 8))} ذخیره شد.`,
      });
    } catch {
      toast.error("خطا در ذخیره امتیاز");
    } finally {
      setRatingModalTicket(null);
    }
  };

  const getScoreLabel = (score: number) => {
    switch (score) {
      case 5:
        return "عالی و بسیار سریع (۵ از ۵)";
      case 4:
        return "بسیار خوب و رضایت‌بخش (۴ از ۵)";
      case 3:
        return "معمولی و متوسط (۳ از ۵)";
      case 2:
        return "پایین‌تر از حد انتظار (۲ از ۵)";
      case 1:
        return "ضعیف و نیاز به بهبود (۱ از ۵)";
      default:
        return "";
    }
  };

  return (
    <div className="w-full space-y-6 font-sans text-foreground" dir="rtl">
      {/* ==================================================================== */}
      {/* 1. Header Bar: Title, Subtitle & Primary Create Button                */}
      {/* ==================================================================== */}
      <div className="bg-card rounded-3xl p-6 sm:p-7 border border-border shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-accent/15 border border-accent/30 text-accent flex items-center justify-center shrink-0 shadow-xs">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                پشتیبانی و تیکت‌های فنی
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-muted border border-border text-xs font-bold text-muted-foreground">
                {isLoading ? "..." : `${toPersianDigits(tickets.length)} تیکت`}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground font-medium mt-0.5">
              پیگیری درخواست‌های آسانسور، مکاتبه با دپارتمان فنی و امتیازدهی به کیفیت خدمات
            </p>
          </div>
        </div>

        {/* Action Buttons: Pure Semantic Classes */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            className="p-2.5 rounded-xl bg-card hover:bg-muted text-muted-foreground hover:text-foreground border border-border transition-all cursor-pointer disabled:opacity-50"
            title="تازه‌سازی لیست تیکت‌ها"
          >
            <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin text-accent")} />
          </button>

          <button
            type="button"
            onClick={onCreateTicket}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-accent hover:bg-accent/90 text-accent-foreground font-black text-xs sm:text-sm transition-all shadow-md active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>ثبت تیکت جدید</span>
          </button>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 2. Metric KPI Cards (Total, In Progress, Replied, Closed)             */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Total */}
        <div className="bg-card rounded-2xl p-4 border border-border shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-muted-foreground block">کل تیکت‌ها</span>
            <span className="text-2xl font-black text-foreground mt-0.5 block font-sans">
              {isLoading ? "..." : toPersianDigits(tickets.length)}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-muted border border-border text-muted-foreground flex items-center justify-center">
            <TicketIcon className="w-5 h-5" />
          </div>
        </div>

        {/* In Progress (Red indicator) */}
        <div className="bg-card rounded-2xl p-4 border border-rose-500/20 shadow-xs flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              <span className="text-xs font-bold text-rose-600 dark:text-rose-400 block">در جریان بررسی</span>
            </div>
            <span className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1 block font-sans">
              {isLoading ? "..." : toPersianDigits(openCount)}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* Replied (Blue indicator) */}
        <div className="bg-card rounded-2xl p-4 border border-blue-500/20 shadow-xs flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400 block">پاسخ کارشناس</span>
            </div>
            <span className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1 block font-sans">
              {isLoading ? "..." : toPersianDigits(repliedCount)}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 flex items-center justify-center">
            <MessageCircle className="w-5 h-5" />
          </div>
        </div>

        {/* Closed (Green indicator) */}
        <div className="bg-card rounded-2xl p-4 border border-emerald-500/20 shadow-xs flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 block">بسته شده</span>
            </div>
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 block font-sans">
              {isLoading ? "..." : toPersianDigits(closedCount)}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 3. Search Bar & Status Filter Tabs                                   */}
      {/* ==================================================================== */}
      <div className="bg-card rounded-2xl p-4 border border-border shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3.5">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="جستجو در موضوع، شماره تیکت یا متن..."
            className="w-full pl-4 pr-10 py-2.5 rounded-xl bg-muted/50 border border-border text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-all font-sans"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <button
            type="button"
            onClick={() => setFilter("ALL")}
            className={cn(
              "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer",
              filter === "ALL"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            همه ({toPersianDigits(tickets.length)})
          </button>
          <button
            type="button"
            onClick={() => setFilter("OPEN_OR_PROGRESS")}
            className={cn(
              "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer",
              filter === "OPEN_OR_PROGRESS"
                ? "bg-rose-600 text-white shadow-xs"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            در جریان ({toPersianDigits(openCount)})
          </button>
          <button
            type="button"
            onClick={() => setFilter("REPLIED")}
            className={cn(
              "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer",
              filter === "REPLIED"
                ? "bg-blue-600 text-white shadow-xs"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            پاسخ داده شده ({toPersianDigits(repliedCount)})
          </button>
          <button
            type="button"
            onClick={() => setFilter("CLOSED")}
            className={cn(
              "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer",
              filter === "CLOSED"
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            بسته شده ({toPersianDigits(closedCount)})
          </button>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 4. Tickets Data Table & Rating Badge System                          */}
      {/* ==================================================================== */}
      {isLoading ? (
        <div className="bg-card rounded-2xl shadow-xs border border-border p-6 space-y-4 animate-pulse">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between border-b border-border/50 pb-4">
              <div className="space-y-2">
                <div className="h-4 bg-muted rounded w-48" />
                <div className="h-3 bg-muted/60 rounded w-32" />
              </div>
              <div className="h-8 bg-muted rounded-xl w-24" />
            </div>
          ))}
        </div>
      ) : filteredTickets.length === 0 ? (
        <div className="bg-card rounded-2xl shadow-xs border border-border p-12 text-center space-y-3.5">
          <div className="w-16 h-16 rounded-2xl bg-accent/15 border border-accent/30 text-accent flex items-center justify-center mx-auto">
            <MessageSquare className="w-8 h-8 opacity-70" />
          </div>
          <h3 className="text-base font-black text-foreground">
            {searchQuery.trim()
              ? "تیکتی با این مشخصات یافت نشد"
              : "هنوز هیچ تیکت پشتیبانی ثبت نکرده‌اید"}
          </h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            {searchQuery.trim()
              ? `عبارت "${searchQuery}" در میان تیکت‌های شما موجود نیست.`
              : "هرگونه سوال فنی، درخواست سرویس دوره‌ای یا هماهنگی بارگیری را از طریق ثبت تیکت ارسال فرمایید."}
          </p>
          {!searchQuery.trim() && (
            <button
              type="button"
              onClick={onCreateTicket}
              className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-accent-foreground font-black text-xs shadow-md cursor-pointer hover:bg-accent/90 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>ثبت اولین تیکت پشتیبانی</span>
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block bg-card rounded-2xl shadow-xs border border-border overflow-hidden">
            <table className="w-full text-right border-collapse text-sm" dir="rtl">
              <thead>
                <tr className="bg-muted/50 border-b border-border text-xs font-bold text-muted-foreground">
                  <th className="py-4 px-4 text-center w-14">ردیف</th>
                  <th className="py-4 px-4">شناسه</th>
                  <th className="py-4 px-5">موضوع تیکت</th>
                  <th className="py-4 px-4">تاریخ ثبت</th>
                  <th className="py-4 px-4 text-center">اولویت</th>
                  <th className="py-4 px-4 text-center">وضعیت</th>
                  <th className="py-4 px-5 text-center">اقدام</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 text-sm">
                {filteredTickets.map((t, idx) => {
                  const priority = getPriorityBadge(t.priority);
                  const status = getStatusBadge(t.status);
                  const msgCount = t.messages?.length || 0;
                  const isClosed = t.status === "CLOSED";
                  const rating = ratingsMap[t.id];

                  return (
                    <tr key={t.id} className="hover:bg-muted/30 transition-colors group">
                      {/* Row Index */}
                      <td className="py-4 px-4 text-center align-middle font-bold text-muted-foreground text-xs font-sans">
                        {toPersianDigits(idx + 1)}
                      </td>

                      {/* ID */}
                      <td className="py-4 px-4 align-middle whitespace-nowrap">
                        <span className="font-mono font-bold text-xs text-foreground bg-muted px-2.5 py-1 rounded-md border border-border">
                          {toPersianDigits(t.id.slice(0, 8))}
                        </span>
                      </td>

                      {/* Subject */}
                      <td className="py-4 px-5 align-middle">
                        <div className="flex items-center gap-2">
                          <span
                            onClick={() => onOpenChat(t)}
                            className="font-black text-foreground block text-sm group-hover:text-accent transition-colors cursor-pointer"
                          >
                            {t.subject}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-muted text-[11px] font-bold text-muted-foreground border border-border">
                            {toPersianDigits(msgCount)} پیام
                          </span>
                        </div>
                      </td>

                      {/* Date */}
                      <td className="py-4 px-4 align-middle whitespace-nowrap text-xs text-muted-foreground font-sans">
                        {formatPersianDate(t.created_at)}
                      </td>

                      {/* Priority */}
                      <td className="py-4 px-4 align-middle text-center whitespace-nowrap">
                        <span
                          className={cn(
                            "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border",
                            priority.classes
                          )}
                        >
                          {priority.label}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4 align-middle text-center whitespace-nowrap">
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

                      {/* Actions & Rating Feature */}
                      <td className="py-4 px-5 align-middle text-center whitespace-nowrap">
                        <div className="inline-flex items-center justify-center gap-2">
                          {/* If closed, show Rating button or rated stars */}
                          {isClosed ? (
                            rating ? (
                              <button
                                type="button"
                                onClick={() => handleOpenRatingModal(t)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-accent/15 hover:bg-accent/25 text-accent border border-accent/30 text-xs font-bold transition-colors cursor-pointer"
                                title="مشاهده / ویرایش امتیاز ثبت شده"
                              >
                                <div className="flex items-center gap-0.5 text-accent" dir="ltr">
                                  {Array.from({ length: 5 }).map((_, i) => (
                                    <Star
                                      key={i}
                                      className={cn(
                                        "w-3.5 h-3.5",
                                        i < rating.rating
                                          ? "fill-accent text-accent"
                                          : "text-muted-foreground/30"
                                      )}
                                    />
                                  ))}
                                </div>
                                <span className="font-mono text-[11px] font-black mr-1 text-foreground">
                                  {toPersianDigits(rating.rating)}
                                </span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleOpenRatingModal(t)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent hover:bg-accent/90 text-accent-foreground font-black text-xs transition-all shadow-xs cursor-pointer"
                              >
                                <Star className="w-3.5 h-3.5 fill-current" />
                                <span>ثبت امتیاز</span>
                              </button>
                            )
                          ) : (
                            /* Open / Progress / Replied tickets show View Chat button */
                            <button
                              type="button"
                              onClick={() => onOpenChat(t)}
                              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs transition-all shadow-xs cursor-pointer"
                              title="مشاهده گفتگو"
                            >
                              <MessageCircle className="w-3.5 h-3.5 text-accent" />
                              <span>مشاهده</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card Grid View */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {filteredTickets.map((t) => {
              const priority = getPriorityBadge(t.priority);
              const status = getStatusBadge(t.status);
              const msgCount = t.messages?.length || 0;
              const isClosed = t.status === "CLOSED";
              const rating = ratingsMap[t.id];

              return (
                <div
                  key={t.id}
                  className="bg-card rounded-2xl p-4 border border-border shadow-xs space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <span className="font-mono text-[10px] text-muted-foreground block">
                        #{toPersianDigits(t.id.slice(0, 8))}
                      </span>
                      <h4
                        onClick={() => onOpenChat(t)}
                        className="font-black text-sm text-foreground mt-0.5 truncate cursor-pointer hover:text-accent"
                      >
                        {t.subject}
                      </h4>
                    </div>
                    <span
                      className={cn(
                        "text-[10px] font-black px-2 py-0.5 rounded-full border shrink-0 flex items-center gap-1",
                        status.classes
                      )}
                    >
                      <span className={cn("w-1.5 h-1.5 rounded-full", status.dot)} />
                      {status.label}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/50">
                    <span
                      className={cn(
                        "text-[11px] font-bold px-2 py-0.5 rounded-full border",
                        priority.classes
                      )}
                    >
                      {priority.label}
                    </span>
                    <span className="font-sans">{formatPersianDate(t.created_at)}</span>
                  </div>

                  <div className="pt-2 flex items-center justify-between gap-2 border-t border-border/50">
                    <span className="text-xs text-muted-foreground">
                      پیام‌ها: <strong className="text-foreground">{toPersianDigits(msgCount)}</strong>
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onOpenChat(t)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-muted hover:bg-muted/80 text-foreground font-bold text-xs border border-border"
                      >
                        <MessageCircle className="w-3.5 h-3.5 text-accent" />
                        <span>گفتگو</span>
                      </button>

                      {isClosed && (
                        <button
                          type="button"
                          onClick={() => handleOpenRatingModal(t)}
                          className={cn(
                            "inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl font-bold text-xs",
                            rating
                              ? "bg-accent/20 text-accent-foreground border border-accent/40"
                              : "bg-accent text-accent-foreground shadow-xs"
                          )}
                        >
                          <Star className="w-3.5 h-3.5 fill-current" />
                          <span>{rating ? `${toPersianDigits(rating.rating)} ستاره` : "امتیاز"}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ==================================================================== */}
      {/* 5. Interactive 5-Star Ticket Rating Modal                            */}
      {/* ==================================================================== */}
      {ratingModalTicket && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setRatingModalTicket(null)}
        >
          <div
            className="w-full max-w-md bg-card rounded-3xl p-6 sm:p-7 shadow-2xl border border-border text-card-foreground space-y-5"
            onClick={(e) => e.stopPropagation()}
            dir="rtl"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-accent/20 text-accent flex items-center justify-center shrink-0">
                  <Star className="w-5 h-5 fill-accent text-accent" />
                </div>
                <div>
                  <h3 className="text-base font-black text-foreground">
                    ثبت امتیاز و کیفیت پشتیبانی
                  </h3>
                  <span className="text-xs text-muted-foreground font-mono">
                    تیکت #{toPersianDigits(ratingModalTicket.id.slice(0, 8))}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setRatingModalTicket(null)}
                className="w-8 h-8 rounded-xl bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Ticket Subject summary */}
            <div className="bg-muted/30 p-3.5 rounded-2xl border border-border text-xs space-y-1">
              <span className="text-muted-foreground block font-medium">موضوع تیکت بسته شده:</span>
              <p className="font-black text-foreground line-clamp-2">
                {ratingModalTicket.subject}
              </p>
            </div>

            {/* 5-Star Interactive Rating Picker */}
            <div className="space-y-3 text-center py-2">
              <span className="text-xs font-bold text-foreground block">
                میزان رضایت خود از پاسخگویی و رفع مشکل را مشخص نمایید:
              </span>

              {/* Stars Row */}
              <div className="flex items-center justify-center gap-2" dir="ltr">
                {[1, 2, 3, 4, 5].map((star) => {
                  const effectiveScore = hoveredScore !== null ? hoveredScore : selectedScore;
                  const isFilled = star <= effectiveScore;

                  return (
                    <button
                      key={star}
                      type="button"
                      onMouseEnter={() => setHoveredScore(star)}
                      onMouseLeave={() => setHoveredScore(null)}
                      onClick={() => setSelectedScore(star)}
                      className="p-1.5 transition-transform hover:scale-125 focus:outline-none cursor-pointer"
                    >
                      <Star
                        className={cn(
                          "w-8 h-8 transition-colors duration-150",
                          isFilled
                            ? "fill-accent text-accent drop-shadow-sm"
                            : "text-muted-foreground/30 hover:text-accent/50"
                        )}
                      />
                    </button>
                  );
                })}
              </div>

              {/* Score text label */}
              <div className="h-6">
                <span className="text-xs font-black text-accent-foreground bg-accent/20 px-3 py-1 rounded-full border border-accent/30 inline-block animate-in fade-in">
                  {getScoreLabel(hoveredScore !== null ? hoveredScore : selectedScore)}
                </span>
              </div>
            </div>

            {/* Customer Comment textarea */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground block">
                توضیحات و بازخورد تکمیلی شما (اختیاری):
              </label>
              <textarea
                rows={3}
                value={ratingComment}
                onChange={(e) => setRatingComment(e.target.value)}
                placeholder="نکات مثبت یا انتقادات سازنده در رابطه با عملکرد پشتیبانی آسانرو..."
                className="w-full p-3 rounded-2xl bg-muted/40 border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all resize-none font-sans"
              />
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setRatingModalTicket(null)}
                className="px-4 py-2.5 rounded-xl border border-border text-muted-foreground hover:bg-muted font-bold text-xs transition-colors cursor-pointer"
              >
                انصراف
              </button>

              <button
                type="button"
                onClick={handleSaveRating}
                className="px-5 py-2.5 rounded-xl bg-accent hover:bg-accent/90 text-accent-foreground font-black text-xs transition-all shadow-md active:scale-95 flex items-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 fill-current" />
                <span>ثبت نهایی امتیاز</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
