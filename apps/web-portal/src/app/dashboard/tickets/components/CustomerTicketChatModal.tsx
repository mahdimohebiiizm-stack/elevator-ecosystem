"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Send,
  User,
  ShieldCheck,
  Clock,
  Ticket,
  Loader2,
  MessageCircle,
} from "lucide-react";
import { toPersianDigits, cn } from "@/lib/utils";
import { TicketDto, TicketMessageDto } from "@/lib/api/admin";
import { replyToTicket } from "@/lib/api/tickets";
import {
  formatPersianDate,
  getStatusBadge,
  getPriorityBadge,
} from "@/app/admin/tickets/components/TicketChatModal";
import { useAuthStore } from "@/store/useAuthStore";
import { toast } from "sonner";

interface CustomerTicketChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticket: TicketDto | null;
  onSuccess: () => void;
}

export function CustomerTicketChatModal({
  isOpen,
  onClose,
  ticket,
  onSuccess,
}: CustomerTicketChatModalProps) {
  const [messages, setMessages] = useState<TicketMessageDto[]>([]);
  const [replyText, setReplyText] = useState("");
  const [isSending, setIsSending] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (ticket) {
      setMessages(ticket.messages || []);
      setReplyText("");
    }
  }, [ticket]);

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

  const handleSendReply = async () => {
    const content = replyText.trim();
    if (!content || isSending) return;

    setIsSending(true);
    try {
      const res = await replyToTicket(ticket.id, content);
      const newMsg = res.data;

      setMessages((prev) => [...prev, newMsg]);
      setReplyText("");
      toast.success("پاسخ شما با موفقیت ارسال شد.");
      onSuccess();

      setTimeout(() => {
        scrollToBottom("smooth");
        textareaRef.current?.focus();
      }, 80);
    } catch (error: any) {
      console.error("Failed to send customer reply:", error);
      const status = error?.response?.status;
      if (status === 401) {
        toast.error("نشست کاربری شما منقضی شده است.", {
          description: "لطفاً مجدداً وارد حساب کاربری خود شوید.",
        });
        useAuthStore.getState().logout();
        useAuthStore.getState().toggleLoginModal(true);
        return;
      }

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
  const statusInfo = getStatusBadge(ticket.status);
  const isClosed = ticket.status === "CLOSED";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-5 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 font-sans"
      dir="rtl"
    >
      <div className="bg-card w-full max-w-2xl rounded-3xl border border-border shadow-2xl flex flex-col h-[94vh] sm:h-[85vh] max-h-[820px] overflow-hidden text-foreground">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-border bg-muted/30 flex items-start justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center flex-shrink-0">
              <Ticket className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-black text-foreground truncate">
                  {ticket.subject}
                </h3>
                <span
                  className={cn(
                    "text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-full border",
                    priorityInfo.classes
                  )}
                >
                  {priorityInfo.label}
                </span>
                <span
                  className={cn(
                    "text-[10px] sm:text-[11px] font-black px-2 py-0.5 rounded-full border flex items-center gap-1",
                    statusInfo.classes
                  )}
                >
                  <span className={cn("w-1.5 h-1.5 rounded-full", statusInfo.dot)} />
                  {statusInfo.label}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                <span>
                  شناسه:{" "}
                  <strong className="font-mono text-foreground">
                    {toPersianDigits(ticket.id.slice(0, 8))}
                  </strong>
                </span>
                <span>•</span>
                <span>{formatPersianDate(ticket.created_at)}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-card hover:bg-muted text-muted-foreground hover:text-foreground border border-border flex items-center justify-center transition-colors cursor-pointer flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Chat Body */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-5 space-y-3.5 bg-slate-50/50 dark:bg-slate-950/20">
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
                  className={cn(
                    "flex flex-col w-full",
                    // Customer: user's message aligned right (items-end in RTL), admin aligned left (items-start in RTL)
                    isAdmin ? "items-start" : "items-end"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[88%] sm:max-w-[78%] rounded-2xl p-3 sm:p-4 text-xs sm:text-sm shadow-xs transition-all",
                      isAdmin
                        ? "bg-emerald-500/10 border border-emerald-500/20 text-foreground rounded-tr-2xl rounded-tl-xs"
                        : "bg-card border border-border text-foreground rounded-tl-2xl rounded-tr-xs"
                    )}
                  >
                    {/* Bubble Header */}
                    <div className="flex items-center justify-between gap-3 pb-1 mb-1.5 border-b border-border/50 text-[10px] sm:text-[11px]">
                      <div className="flex items-center gap-1.5 font-bold">
                        {isAdmin ? (
                          <>
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                            <span className="text-emerald-700 dark:text-emerald-400 font-black">
                              کارشناس پشتیبانی آسان‌رو
                            </span>
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

                    {/* Bubble Content */}
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

        {/* Reply Footer */}
        <div className="p-3 sm:p-4 border-t border-border bg-card flex flex-col gap-2 flex-shrink-0">
          {isClosed ? (
            <div className="rounded-xl bg-muted/60 p-3 text-center text-xs font-bold text-muted-foreground">
              این تیکت توسط کارشناس پشتیبانی بسته شده است. در صورت نیاز به پیگیری مجدد، لطفاً تیکت جدیدی ثبت فرمایید یا با پشتیبانی تماس بگیرید.
            </div>
          ) : (
            <>
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
                  className="px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed h-full flex-shrink-0"
                >
                  {isSending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="w-4 h-4 rotate-180" />
                      <span className="hidden sm:inline">ارسال</span>
                    </>
                  )}
                </button>
              </div>
              <div className="flex items-center justify-between text-[10px] text-muted-foreground px-1">
                <span>پیام شما مستقیماً برای تیم فنی آسان‌رو ارسال می‌گردد.</span>
                <span className="hidden sm:inline">Shift + Enter برای خط جدید</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
