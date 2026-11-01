"use client";

import React, { useState } from "react";
import {
  X,
  Send,
  MessageSquare,
  Bot,
  User as UserIcon,
  Phone,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { notifyUserDirect } from "@/lib/api/admin";
import { toPersianDigits } from "@/lib/utils";
import { toast } from "sonner";

export interface TargetUserInfo {
  id: string;
  name?: string | null;
  phone?: string | null;
  telegram_id?: string | null;
  bale_id?: string | null;
  messenger_id?: string | null;
  role?: string | null;
}

interface AdminDirectMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: TargetUserInfo | null;
  contextHint?: string; // Optional context such as "سفارش #123" or "تیکت #45"
}

const MESSAGE_TEMPLATES = [
  {
    title: "صدور پیش‌فاکتور",
    text: "سلام و احترام، پیش‌فاکتور جدید سفارش شما صادر گردید. لطفاً جهت مشاهده و پرداخت به پنل کاربری آسانرو اعتماد امیر مراجعه فرمایید.",
  },
  {
    title: "تغییر وضعیت سفارش",
    text: "کاربر گرامی، وضعیت سفارش شما به روزرسانی شد. مراحل بسته‌بندی و تحویل قطعات آسانسور در حال پیگیری است.",
  },
  {
    title: "پاسخ به تیکت",
    text: "کاربر گرامی، پاسخ جدیدی از سوی تیم فنی و مهندسی آسانرو به تیکت پشتیبانی شما ارسال گردید.",
  },
  {
    title: "یادآوری سرویس دوره‌ای",
    text: "مشترک گرامی، موعد سرویس و نگهداری دوره‌ای آسانسور شما فرا رسیده است. تکنسین‌های آسانرو جهت هماهنگی با شما تماس خواهند گرفت.",
  },
];

export const AdminDirectMessageModal: React.FC<AdminDirectMessageModalProps> = ({
  isOpen,
  onClose,
  user,
  contextHint,
}) => {
  const [message, setMessage] = useState("");
  const [channel, setChannel] = useState<"auto" | "telegram" | "bale">("auto");
  const [loading, setLoading] = useState(false);

  if (!isOpen || !user) return null;

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!message.trim()) {
      toast.error("لطفاً متن پیام را وارد کنید.");
      return;
    }

    try {
      setLoading(true);
      const res = await notifyUserDirect({
        user_id: user.id,
        message: message.trim(),
        channel: channel,
      });

      const dispatchedChannel = res.data?.channel_dispatched || "کانال انتخابی";
      toast.success(`پیام با موفقیت از طریق ${dispatchedChannel} ارسال شد.`);
      setMessage("");
      onClose();
    } catch (err: any) {
      console.error("Direct notify error:", err);
      const errMsg =
        err.response?.data?.detail ||
        "خطا در ارسال پیام به کاربر. لطفاً ارتباط با پیام‌رسان‌ها را بررسی کنید.";
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const applyTemplate = (text: string) => {
    setMessage(text);
  };

  const hasTelegram = Boolean(user.telegram_id);
  const hasBale = Boolean(user.bale_id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-card-foreground animate-in zoom-in-95 duration-200"
        dir="rtl"
      >
        {/* Header */}
        <div className="bg-primary text-primary-foreground px-6 py-4 flex items-center justify-between border-b border-primary/20">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-accent/20 text-accent border border-accent/30">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg flex items-center gap-2">
                ارسال پیام مستقیم CRM
                {contextHint && (
                  <span className="text-xs bg-white/10 text-white/90 px-2 py-0.5 rounded-full font-normal">
                    {contextHint}
                  </span>
                )}
              </h3>
              <p className="text-xs text-primary-foreground/70 mt-0.5">
                ارسال بلادرنگ به ربات تلگرام، بله و اعلان درون‌برنامه‌ای کاربر
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-1.5 rounded-lg text-primary-foreground/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Snapshot Bar */}
        <div className="bg-muted/50 px-6 py-3 border-b border-border flex flex-wrap items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-foreground font-medium">
              <UserIcon className="w-4 h-4 text-accent" />
              <span>{user.name || "کاربر ناشناس"}</span>
            </div>
            {user.phone && (
              <div className="flex items-center gap-1.5 text-muted-foreground text-xs font-mono" dir="ltr">
                <Phone className="w-3.5 h-3.5 text-accent" />
                <span>{toPersianDigits(user.phone)}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium border ${
                hasTelegram
                  ? "bg-sky-500/10 text-sky-600 border-sky-500/20"
                  : "bg-muted text-muted-foreground border-border"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${hasTelegram ? "bg-sky-500" : "bg-muted-foreground"}`} />
              تلگرام: {hasTelegram ? "فعال" : "نامتصل"}
            </span>
            <span
              className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium border ${
                hasBale
                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                  : "bg-muted text-muted-foreground border-border"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${hasBale ? "bg-emerald-500" : "bg-muted-foreground"}`} />
              بله: {hasBale ? "فعال" : "نامتصل"}
            </span>
          </div>
        </div>

        {/* Body Content */}
        <form onSubmit={handleSend} className="p-6 space-y-4 overflow-y-auto">
          {/* Channel Selector */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-2">
              کانال ارسال پیام:
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setChannel("auto")}
                className={`py-2 px-3 rounded-xl border text-xs font-medium transition-all ${
                  channel === "auto"
                    ? "bg-accent/15 border-accent text-accent font-bold shadow-sm"
                    : "bg-card border-border hover:bg-muted text-foreground"
                }`}
              >
                ⚡ هوشمند (Omnichannel)
              </button>
              <button
                type="button"
                onClick={() => setChannel("telegram")}
                className={`py-2 px-3 rounded-xl border text-xs font-medium transition-all ${
                  channel === "telegram"
                    ? "bg-sky-500/15 border-sky-500 text-sky-600 font-bold shadow-sm"
                    : "bg-card border-border hover:bg-muted text-foreground"
                }`}
              >
                ✈️ تلگرام مستقیم
              </button>
              <button
                type="button"
                onClick={() => setChannel("bale")}
                className={`py-2 px-3 rounded-xl border text-xs font-medium transition-all ${
                  channel === "bale"
                    ? "bg-emerald-500/15 border-emerald-500 text-emerald-600 font-bold shadow-sm"
                    : "bg-card border-border hover:bg-muted text-foreground"
                }`}
              >
                🌿 بله مستقیم
              </button>
            </div>
          </div>

          {/* Quick Templates */}
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-2">
              <Sparkles className="w-3.5 h-3.5 text-accent" />
              <span>قالب‌های آماده اداری:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {MESSAGE_TEMPLATES.map((tmpl, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => applyTemplate(tmpl.text)}
                  className="text-xs bg-muted hover:bg-accent/10 hover:border-accent/30 hover:text-accent border border-border px-3 py-1.5 rounded-lg transition-colors text-right"
                >
                  {tmpl.title}
                </button>
              ))}
            </div>
          </div>

          {/* Message Textarea */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-2">
              متن پیام ارسالی:
            </label>
            <textarea
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="پیام خود را جهت ارسال مستقیم به کاربر تایپ کنید..."
              className="w-full rounded-xl border border-border bg-background p-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all resize-none leading-relaxed text-foreground placeholder:text-muted-foreground"
            />
            <div className="flex justify-between items-center mt-1.5 text-xs text-muted-foreground">
              <span>اعلان درون‌برنامه‌ای همزمان در پنل مشتری ذخیره می‌شود.</span>
              <span className="font-mono">{toPersianDigits(message.length)} کاراکتر</span>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-5 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
            >
              انصراف
            </button>
            <button
              type="submit"
              disabled={loading || !message.trim()}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-medium text-sm transition-all shadow-md shadow-primary/20 disabled:opacity-50 disabled:pointer-events-none"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>در حال مخابره...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 text-accent" />
                  <span>ارسال به پیام‌رسان کاربر</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
