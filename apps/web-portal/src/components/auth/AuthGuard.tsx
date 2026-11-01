"use client";

import React, { useEffect, useState, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { Loader2, ShieldAlert } from "lucide-react";

export interface AuthGuardProps {
  children: ReactNode;
  requireAdmin?: boolean;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({
  children,
  requireAdmin = false,
}) => {
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const { user, isAuthenticated, toggleLoginModal } = useAuthStore();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    if (!isAuthenticated) {
      router.replace("/");
      toggleLoginModal(true);
      return;
    }

    if (requireAdmin && user?.role !== "ADMIN") {
      router.replace("/dashboard/orders");
      return;
    }
  }, [mounted, isAuthenticated, requireAdmin, user?.role, router, toggleLoginModal]);

  // Loading state during hydration or redirect checks
  if (!mounted) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center bg-[#0b1221] text-amber-500 gap-3"
        dir="rtl"
      >
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
        <span className="text-sm font-bold tracking-wide">در حال بررسی هویت...</span>
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center bg-[#0b1221] text-amber-500 gap-3"
        dir="rtl"
      >
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
        <span className="text-sm font-bold tracking-wide">
          نیاز به احراز هویت. در حال انتقال به صفحه ورود...
        </span>
      </div>
    );
  }

  // Admin access check failed
  if (requireAdmin && user?.role !== "ADMIN") {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center bg-[#0b1221] text-rose-500 gap-3"
        dir="rtl"
      >
        <ShieldAlert className="w-10 h-10 text-rose-500 animate-pulse" />
        <span className="text-sm font-bold tracking-wide">
          دسترسی غیرمجاز. فقط مدیران سیستم مجاز هستند. در حال بازگشت...
        </span>
      </div>
    );
  }

  return <>{children}</>;
};

export default AuthGuard;
