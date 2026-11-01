"use client";

import React, { useState } from "react";
import {
  X,
  Send,
  Ticket,
  AlertCircle,
  HelpCircle,
  Loader2,
  FileText,
  SlidersHorizontal,
} from "lucide-react";
import { createTicket } from "@/lib/api/tickets";
import { useAuthStore } from "@/store/useAuthStore";
import { toast } from "sonner";

interface CreateTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateTicketModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateTicketModalProps) {
  const [subject, setSubject] = useState("");
  const [priority, setPriority] = useState<string>("MEDIUM");
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  if (!isOpen) return null;

  const validate = () => {
    const newErrors: { [key: string]: string } = {};
    if (!subject.trim()) {
      newErrors.subject = "لطفاً موضوع تیکت را وارد نمایید.";
    } else if (subject.trim().length < 3) {
      newErrors.subject = "موضوع تیکت باید حداقل ۳ کاراکتر باشد.";
    }

    if (!content.trim()) {
      newErrors.content = "لطفاً شرح درخواست یا پیام اولیه خود را وارد نمایید.";
    } else if (content.trim().length < 5) {
      newErrors.content = "شرح پیام باید حداقل ۵ کاراکتر باشد.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await createTicket({
        subject: subject.trim(),
        content: content.trim(),
        priority,
      });

      toast.success("تیکت پشتیبانی شما با موفقیت ثبت گردید.", {
        description: "کارشناسان آسان‌رو در اسرع وقت پاسخ شما را ارسال خواهند کرد.",
      });

      // Reset form & close
      setSubject("");
      setContent("");
      setPriority("MEDIUM");
      setErrors({});
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Failed to create ticket:", error);
      const status = error?.response?.status;
      if (status === 401) {
        toast.error("نشست کاربری شما منقضی شده است.", {
          description: "لطفاً مجدداً وارد حساب کاربری خود شوید.",
        });
        useAuthStore.getState().logout();
        useAuthStore.getState().toggleLoginModal(true);
        return;
      }

      toast.error("خطا در ثبت تیکت پشتیبانی", {
        description:
          error?.response?.data?.detail || "برقراری ارتباط با سرور با خطا مواجه شد.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 font-sans"
      dir="rtl"
    >
      <div className="bg-card w-full max-w-lg rounded-3xl border border-border shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-foreground">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-border bg-muted/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center flex-shrink-0">
              <Ticket className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-foreground">
                ثبت تیکت پشتیبانی جدید
              </h3>
              <p className="text-xs text-muted-foreground font-medium mt-0.5">
                طرح سوالات فنی، استعلام قیمت، خدمات پس از فروش و بازرسی
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-card hover:bg-muted text-muted-foreground hover:text-foreground border border-border flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 overflow-y-auto">
          {/* Subject Field */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <span>موضوع تیکت</span>
              <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => {
                setSubject(e.target.value);
                if (errors.subject) setErrors((prev) => ({ ...prev, subject: "" }));
              }}
              placeholder="مثال: استعلام قطعات گیربکس یا سرویس دوره‌ای آسانسور"
              className="w-full px-3.5 py-2.5 rounded-xl bg-muted/40 border border-border text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all font-sans"
            />
            {errors.subject && (
              <p className="text-[11px] font-bold text-rose-500 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                <span>{errors.subject}</span>
              </p>
            )}
          </div>

          {/* Priority Field */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <span>اولویت پیگیری</span>
              <span className="text-rose-500">*</span>
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-card border border-border text-xs sm:text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all cursor-pointer font-sans"
            >
              <option value="LOW">پایین (سوالات عمومی و کاتالوگ)</option>
              <option value="MEDIUM">متوسط (استعلام قیمت و امور مالی)</option>
              <option value="HIGH">بالا (درخواست سرویس دوره‌ای و قرارداد)</option>
              <option value="CRITICAL">فوری / بحرانی (خرابی و توقف آسانسور)</option>
            </select>
          </div>

          {/* Message Content Field */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <span>شرح پیام اولیه</span>
              <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={4}
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                if (errors.content) setErrors((prev) => ({ ...prev, content: "" }));
              }}
              placeholder="لطفاً شرح کامل سوال یا درخواست خود، مدل دستگاه، نام مجتمع یا شماره فاکتور مربوطه را یادداشت فرمایید..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-muted/40 border border-border text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all font-sans resize-none"
            />
            {errors.content && (
              <p className="text-[11px] font-bold text-rose-500 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                <span>{errors.content}</span>
              </p>
            )}
          </div>

          {/* Notice Banner */}
          <div className="rounded-xl bg-primary/5 border border-primary/15 p-3 text-[11px] text-muted-foreground leading-relaxed">
            کارشناسان فنی شرکت مهندسی «آسان‌رو اطمینان امیر کرمان» در ساعات اداری ظرف کمتر از ۲ ساعت کاری پاسخ شما را ثبت خواهند کرد.
          </div>

          {/* Footer Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl bg-card hover:bg-muted text-muted-foreground hover:text-foreground border border-border text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
            >
              انصراف
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-black flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>در حال ثبت...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 rotate-180" />
                  <span>ارسال و ثبت تیکت</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
