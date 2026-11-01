"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Send,
  User,
  ShieldCheck,
  Clock,
  Ticket,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  MessageCircle,
} from "lucide-react";
import { toPersianDigits, cn } from "@/lib/utils";
import {
  TicketDto,
  TicketMessageDto,
  replyAdminTicket,
  updateTicketStatus,
} from "@/lib/api/admin";
import { toast } from "sonner";

interface TicketChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticket: TicketDto | null;
  onSuccess: () => void;
}

export function formatPersianDate(dateStr?: string | null): string {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return toPersianDigits(dateStr);
    const formatted = new Intl.DateTimeFormat("fa-IR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
    return toPersianDigits(formatted);
  } catch {
    return toPersianDigits(dateStr);
  }
}

export function getStatusBadge(status: string) {
  switch (status?.toUpperCase()) {
    case "OPEN":
      return {
        label: "باز / در انتظار",
        classes: "bg-rose-500/10 text-rose-600 border-rose-500/30",
        dot: "bg-rose-500 animate-pulse",
      };
    case "IN_PROGRESS":
      return {
        label: "در حال بررسی",
        classes: "bg-amber-500/10 text-amber-600 border-amber-500/30",
        dot: "bg-amber-500",
      };
    case "REPLIED":
      return {
        label: "پاسخ داده شده",
        classes: "bg-blue-500/10 text-blue-600 border-blue-500/30",
        dot: "bg-blue-500",
      };
    case "CLOSED":
      return {
        label: "بسته شده",
        classes: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
        dot: "bg-emerald-500",
      };
    default:
      return {
        label: status,
        classes: "bg-muted text-muted-foreground border-border",
        dot: "bg-muted-foreground",
      };
  }
}

export function getPriorityBadge(priority: string) {
  switch (priority?.toUpperCase()) {
    case "CRITICAL":
      return {
        label: "فوری / بحرانی",
        classes: "bg-red-500/10 text-red-600 border-red-500/30",
      };
    case "HIGH":
      return {
        label: "اولویت بالا",
        classes: "bg-amber-500/10 text-amber-600 border-amber-500/30",
      };
    case "MEDIUM":
      return {
        label: "اولویت متوسط",
        classes: "bg-blue-500/10 text-blue-600 border-blue-500/30",
      };
    case "LOW":
    default:
      return {
        label: "اولویت عادی",
        classes: "bg-slate-500/10 text-slate-600 border-slate-500/30",
      };
  }
}

export function TicketChatModal({
  isOpen,
  onClose,
  ticket,
  onSuccess,
}: TicketChatModalProps) {
  const [messages, setMessages] = useState<TicketMessageDto[]>([]);
  const [currentStatus, setCurrentStatus] = useState<string>("OPEN");
  const [replyText, setReplyText] = useState<string>("");
  const [isSending, setIsSending] = useState<boolean>(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync state with incoming ticket prop
  useEffect(() => {
    if (ticket) {
      setMessages(ticket.messages || []);
      setCurrentStatus(ticket.status || "OPEN");
      setReplyText("");
    }
  }, [ticket]);

  // Auto-scroll chat area to the very bottom
  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior });
    }
  };

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        scrollToBottom("auto");
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, messages]);

  if (!isOpen || !ticket) return null;

  // Handle status update
  const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value;
    if (newStatus === currentStatus) return;

    setIsUpdatingStatus(true);
    try {
      await updateTicketStatus(ticket.id, newStatus);
      setCurrentStatus(newStatus);
      toast.success("وضعیت تیکت به‌روزرسانی گردید.", {
        description: `وضعیت جدید: ${getStatusBadge(newStatus).label}`,
      });
      onSuccess();
    } catch (error: any) {
      console.error("Failed to update ticket status:", error);
      toast.error("خطا در به‌روزرسانی وضعیت تیکت", {
        description:
          error?.response?.data?.detail || "لطفاً مجدداً تلاش فرمایید.",
      });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Handle sending admin reply
  const handleSendReply = async () => {
    const content = replyText.trim();
    if (!content || isSending) return;

    setIsSending(true);
    try {
      const res = await replyAdminTicket(ticket.id, content);
      const newMsg = res.data;

      // Optimistically/gracefully append message to modal
      setMessages((prev) => [...prev, newMsg]);
      setCurrentStatus("REPLIED");
      setReplyText("");

      toast.success("پاسخ مدیر سامانه با موفقیت ارسال شد.");
      onSuccess();

      // Scroll after DOM update
      setTimeout(() => {
        scrollToBottom("smooth");
        textareaRef.current?.focus();
      }, 80);
    } catch (error: any) {
      console.error("Failed to send admin reply:", error);
      toast.error("خطا در ارسال پاسخ تیکت", {
        description:
          error?.response?.data?.detail || "ارتباط با سرور برقرار نشد.",
      });
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

  const priorityInfo = getPriorityBadge(ticket.priority);
  const statusInfo = getStatusBadge(currentStatus);
  const customerPhone = ticket.user?.phone || "کاربر ناشناس";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 font-sans"
      dir="rtl"
    >
      <div className="bg-card w-full max-w-3xl rounded-3xl border border-border shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-foreground">
        {/* ==================================================================== */}
        {/* 1. MODAL HEADER: Subject, Customer Info, Priority & Status Selector  */}
        {/* ==================================================================== */}
        <div className="p-4 sm:p-6 border-b border-border bg-muted/30 flex flex-col gap-3.5 flex-shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center flex-shrink-0">
                <Ticket className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base sm:text-lg font-black text-foreground truncate">
                    {ticket.subject}
                  </h2>
                  <span
                    className={cn(
                      "text-[11px] font-bold px-2 py-0.5 rounded-full border",
                      priorityInfo.classes
                    )}
                  >
                    {priorityInfo.label}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
                  <span className="flex items-center gap-1 font-medium">
                    <User className="w-3.5 h-3.5" />
                    مشتری:{" "}
                    <strong className="text-foreground">
                      {toPersianDigits(customerPhone)}
                    </strong>
                  </span>
                  <span>•</span>
                  <span>
                    شناسه:{" "}
                    <span className="font-mono font-bold text-foreground">
                      {toPersianDigits(ticket.id.slice(0, 8))}
                    </span>
                  </span>
                  <span>•</span>
                  <span>{formatPersianDate(ticket.created_at)}</span>
                </div>
              </div>
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-card hover:bg-muted text-muted-foreground hover:text-foreground border border-border flex items-center justify-center transition-colors cursor-pointer flex-shrink-0"
              title="بستن پنجره"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Lifecycle Status Control */}
          <div className="flex items-center justify-between gap-3 pt-3 border-t border-border/60">
            <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
              <span>وضعیت تیکت:</span>
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black border",
                  statusInfo.classes
                )}
              >
                <span className={cn("w-1.5 h-1.5 rounded-full", statusInfo.dot)} />
                {statusInfo.label}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="ticket-status-select" className="text-xs text-muted-foreground font-medium hidden sm:inline">
                تغییر وضعیت:
              </label>
              <div className="relative">
                <select
                  id="ticket-status-select"
                  value={currentStatus}
                  onChange={handleStatusChange}
                  disabled={isUpdatingStatus}
                  className="px-3 py-1.5 rounded-xl bg-card border border-border text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all cursor-pointer disabled:opacity-50"
                >
                  <option value="OPEN">باز / در انتظار</option>
                  <option value="IN_PROGRESS">در حال بررسی</option>
                  <option value="REPLIED">پاسخ داده شده</option>
                  <option value="CLOSED">بسته شده</option>
                </select>
                {isUpdatingStatus && (
                  <span className="absolute left-2 top-1/2 -translate-y-1/2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ==================================================================== */}
        {/* 2. CHAT BODY: Scrollable Message Thread                              */}
        {/* ==================================================================== */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-50/50 dark:bg-slate-950/20 min-h-[320px]">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-muted-foreground space-y-2">
              <MessageCircle className="w-10 h-10 opacity-40 text-primary" />
              <p className="text-sm font-bold">هنوز پیامی در این تیکت ثبت نشده است.</p>
            </div>
          ) : (
            messages.map((msg, idx) => {
              const isAdmin = msg.is_from_admin;

              return (
                <div
                  key={msg.id || idx}
                  className={cn(
                    "flex flex-col w-full",
                    // In RTL: Admin aligned to Left (self-end), Customer aligned to Right (self-start)
                    isAdmin ? "items-start sm:items-start" : "items-end sm:items-end"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[85%] sm:max-w-[75%] rounded-2xl p-3.5 sm:p-4 text-xs sm:text-sm shadow-xs transition-all",
                      isAdmin
                        ? "bg-primary/10 border border-primary/20 text-foreground rounded-tr-2xl rounded-tl-xs"
                        : "bg-card border border-border text-foreground rounded-tl-2xl rounded-tr-xs"
                    )}
                  >
                    {/* Message Bubble Header */}
                    <div className="flex items-center justify-between gap-3 pb-1.5 mb-1.5 border-b border-border/50 text-[11px]">
                      <div className="flex items-center gap-1.5 font-bold">
                        {isAdmin ? (
                          <>
                            <ShieldCheck className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                            <span className="text-primary font-black">
                              پشتیبانی آسان‌رو (مدیر سیستم)
                            </span>
                          </>
                        ) : (
                          <>
                            <User className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                            <span className="text-foreground font-black">
                              مشتری ({toPersianDigits(customerPhone)})
                            </span>
                          </>
                        )}
                      </div>

                      <div className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{formatPersianDate(msg.created_at)}</span>
                      </div>
                    </div>

                    {/* Message Text Content */}
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

        {/* ==================================================================== */}
        {/* 3. REPLY FOOTER: Admin Reply Input & Send Button                     */}
        {/* ==================================================================== */}
        <div className="p-4 sm:p-5 border-t border-border bg-card flex flex-col gap-2.5 flex-shrink-0">
          <div className="flex gap-2.5 items-end">
            <textarea
              ref={textareaRef}
              rows={3}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isSending}
              placeholder="پاسخ خود را به عنوان مدیر فنی سامانه تایپ نمایید... (کلید Enter برای ارسال)"
              className="flex-1 resize-none rounded-2xl bg-muted/40 border border-border p-3 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all font-sans"
            />

            <button
              type="button"
              onClick={handleSendReply}
              disabled={isSending || !replyText.trim()}
              className="px-5 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed h-full flex-shrink-0"
            >
              {isSending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>در حال ارسال...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 rotate-180" />
                  <span>ارسال پاسخ</span>
                </>
              )}
            </button>
          </div>
          <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
            <span>
              نکته: ارسال پاسخ توسط ادمین، وضعیت تیکت را به شکل خودکار به{" "}
              <strong className="text-blue-600 dark:text-blue-400">
                «پاسخ داده شده»
              </strong>{" "}
              تغییر می‌دهد.
            </span>
            <span className="hidden sm:inline">Shift + Enter برای خط جدید</span>
          </div>
        </div>
      </div>
    </div>
  );
}
