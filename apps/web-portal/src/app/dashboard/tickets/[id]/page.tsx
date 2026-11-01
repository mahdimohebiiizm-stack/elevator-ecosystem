"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowRight,
  Ticket,
  Clock,
  User,
  ShieldCheck,
  Send,
  Loader2,
  RefreshCw,
  AlertCircle,
  MessageCircle,
} from "lucide-react";
import { toPersianDigits, cn } from "@/lib/utils";
import { TicketDto, TicketMessageDto } from "@/lib/api/admin";
import { fetchTicketDetails, replyToTicket } from "@/lib/api/tickets";
import {
  formatPersianDate,
  getStatusBadge,
  getPriorityBadge,
} from "@/app/admin/tickets/components/TicketChatModal";
import { useAuthStore } from "@/store/useAuthStore";
import { toast } from "sonner";

export default function CustomerTicketDetailPage() {
  const params = useParams();
  const router = useRouter();
  const ticketId = params?.id as string;

  const [ticket, setTicket] = useState<TicketDto | null>(null);
  const [messages, setMessages] = useState<TicketMessageDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [replyText, setReplyText] = useState("");
  const [isSending, setIsSending] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const loadTicket = async () => {
    if (!ticketId) return;
    setIsLoading(true);
    try {
      const res = await fetchTicketDetails(ticketId);
      const data = res.data;
      setTicket(data);
      setMessages(data.messages || []);
    } catch (error: any) {
      console.error("Failed to load ticket:", error);
      const status = error?.response?.status;
      if (status === 401) {
        toast.error("نشست کاربری شما منقضی شده است.");
        useAuthStore.getState().logout();
        useAuthStore.getState().toggleLoginModal(true);
        router.push("/dashboard");
        return;
      }
      toast.error("خطا در بارگذاری تیکت پشتیبانی", {
        description: error?.response?.data?.detail || "تیکت یافت نشد.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTicket();
  }, [ticketId]);

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior });
    }
  };

  useEffect(() => {
    if (!isLoading && messages.length > 0) {
      setTimeout(() => {
        scrollToBottom("auto");
      }, 100);
    }
  }, [isLoading, messages.length]);

  const handleSendReply = async () => {
    const content = replyText.trim();
    if (!content || isSending || !ticketId) return;

    setIsSending(true);
    try {
      const res = await replyToTicket(ticketId, content);
      setMessages((prev) => [...prev, res.data]);
      setReplyText("");
      toast.success("پاسخ شما با موفقیت ارسال گردید.");

      setTimeout(() => {
        scrollToBottom("smooth");
        textareaRef.current?.focus();
      }, 80);
    } catch (error: any) {
      console.error("Failed to reply:", error);
      toast.error("خطا در ارسال پاسخ تیکت");
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendReply();
    }
  };

  if (isLoading) {
    return (
      <div className="w-full space-y-4 font-sans text-foreground" dir="rtl">
        <div className="bg-card rounded-3xl p-6 border border-border shadow-xs animate-pulse">
          <div className="h-6 bg-muted rounded w-48 mb-3" />
          <div className="h-4 bg-muted/60 rounded w-72" />
        </div>
        <div className="bg-card rounded-3xl p-6 border border-border shadow-xs h-[400px] animate-pulse flex flex-col justify-end space-y-3">
          <div className="h-12 bg-muted/60 rounded-2xl w-2/3 self-end" />
          <div className="h-16 bg-muted rounded-2xl w-3/4 self-start" />
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="w-full bg-card rounded-3xl p-10 border border-border text-center space-y-4 font-sans" dir="rtl">
        <div className="w-16 h-16 rounded-3xl bg-muted border border-border flex items-center justify-center mx-auto text-muted-foreground">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-base font-black text-foreground">تیکت مورد نظر یافت نشد</h2>
        <p className="text-xs text-muted-foreground">ممکن است شناسه تیکت اشتباه باشد یا دسترسی مشاهده آن را نداشته باشید.</p>
        <Link
          href="/dashboard/tickets"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold"
        >
          <ArrowRight className="w-4 h-4" />
          <span>بازگشت به لیست تیکت‌ها</span>
        </Link>
      </div>
    );
  }

  const priorityInfo = getPriorityBadge(ticket.priority);
  const statusInfo = getStatusBadge(ticket.status);
  const isClosed = ticket.status === "CLOSED";

  return (
    <div className="w-full space-y-4 font-sans text-foreground flex flex-col h-[calc(100dvh-120px)] min-h-[580px]" dir="rtl">
      {/* Top Header Card */}
      <div className="bg-card rounded-3xl p-4 sm:p-6 border border-border shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/dashboard/tickets"
            className="w-10 h-10 rounded-2xl bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground border border-border flex items-center justify-center transition-colors cursor-pointer flex-shrink-0"
            title="بازگشت"
          >
            <ArrowRight className="w-5 h-5" />
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-lg font-black text-foreground truncate">
                {ticket.subject}
              </h1>
              <span className={cn("text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-full border", priorityInfo.classes)}>
                {priorityInfo.label}
              </span>
              <span className={cn("text-[10px] sm:text-[11px] font-black px-2 py-0.5 rounded-full border flex items-center gap-1", statusInfo.classes)}>
                <span className={cn("w-1.5 h-1.5 rounded-full", statusInfo.dot)} />
                {statusInfo.label}
              </span>
            </div>
            <p className="text-xs text-muted-foreground font-medium mt-0.5">
              شناسه تیکت: <strong className="font-mono text-foreground">{toPersianDigits(ticket.id.slice(0, 8))}</strong> • تاریخ ایجاد: {formatPersianDate(ticket.created_at)}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={loadTicket}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-muted text-muted-foreground hover:text-foreground text-xs font-bold transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>تازه‌سازی گفتگو</span>
        </button>
      </div>

      {/* Main Chat Container */}
      <div className="bg-card rounded-3xl border border-border shadow-xs flex-1 flex flex-col overflow-hidden">
        {/* Messages Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-50/50 dark:bg-slate-950/20">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-muted-foreground space-y-2">
              <MessageCircle className="w-10 h-10 opacity-40 text-primary" />
              <p className="text-xs sm:text-sm font-bold">هنوز پیامی در این تیکت ثبت نشده است.</p>
            </div>
          ) : (
            messages.map((msg, idx) => {
              const isAdmin = msg.is_from_admin;
              return (
                <div
                  key={msg.id || idx}
                  className={cn("flex flex-col w-full", isAdmin ? "items-start" : "items-end")}
                >
                  <div
                    className={cn(
                      "max-w-[88%] sm:max-w-[78%] rounded-2xl p-3.5 sm:p-4 text-xs sm:text-sm shadow-xs transition-all",
                      isAdmin
                        ? "bg-emerald-500/10 border border-emerald-500/20 text-foreground rounded-tr-2xl rounded-tl-xs"
                        : "bg-card border border-border text-foreground rounded-tl-2xl rounded-tr-xs"
                    )}
                  >
                    <div className="flex items-center justify-between gap-3 pb-1 mb-1.5 border-b border-border/50 text-[10px] sm:text-[11px]">
                      <div className="flex items-center gap-1.5 font-bold">
                        {isAdmin ? (
                          <>
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                            <span className="text-emerald-700 dark:text-emerald-400 font-black">کارشناس پشتیبانی آسان‌رو</span>
                          </>
                        ) : (
                          <>
                            <User className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                            <span className="text-foreground font-black">شما</span>
                          </>
                        )}
                      </div>
                      <div className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{formatPersianDate(msg.created_at)}</span>
                      </div>
                    </div>
                    <p className="whitespace-pre-wrap leading-relaxed text-foreground font-medium text-xs sm:text-sm">
                      {msg.content}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Footer Area */}
        <div className="p-3 sm:p-4 border-t border-border bg-card flex flex-col gap-2 flex-shrink-0">
          {isClosed ? (
            <div className="rounded-xl bg-muted/60 p-3 text-center text-xs font-bold text-muted-foreground">
              این تیکت توسط کارشناس پشتیبانی بسته شده است. در صورت نیاز، تیکت جدیدی ایجاد نمایید.
            </div>
          ) : (
            <div className="flex gap-2 items-end">
              <textarea
                ref={textareaRef}
                rows={2}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isSending}
                placeholder="پاسخ خود را بنویسید (Enter برای ارسال)..."
                className="flex-1 resize-none rounded-2xl bg-muted/40 border border-border p-3 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all font-sans"
              />
              <button
                type="button"
                onClick={handleSendReply}
                disabled={isSending || !replyText.trim()}
                className="px-5 py-3 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed h-full flex-shrink-0"
              >
                {isSending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Send className="w-4 h-4 rotate-180" />
                    <span>ارسال</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
