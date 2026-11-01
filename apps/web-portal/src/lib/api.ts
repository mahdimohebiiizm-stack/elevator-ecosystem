import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from "axios";
import { toast } from "sonner";
import { useAuthStore } from "@/store/useAuthStore";

/**
 * Enterprise Axios client configured with JWT Bearer headers, HttpOnly cookie credentials,
 * and centralized RFC 7807 error handling with Sonner toasts.
 * Uses strictly relative path "/api/v1" to dynamically support both local development and Ngrok tunnels.
 */
const API_BASE_URL = "/api/v1";

export const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Sends and receives HttpOnly cookies
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: Error | null = null) => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else {
      promise.resolve();
    }
  });
  failedQueue = [];
};

// Request Interceptor: Attaches JWT Bearer token from useAuthStore
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = useAuthStore.getState().token;
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Silent Refresh Flow & Global Error Management
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // If no response received (Network Error / CORS Block / Backend Offline)
    if (!error.response) {
      toast.error("خطا در برقراری ارتباط با سرور", {
        description: "لطفاً اتصال اینترنت خود یا وضعیت سرویس را بررسی نمایید.",
      });
      return Promise.reject(error);
    }

    const { status, data } = error.response as {
      status: number;
      data?: {
        message?: string;
        detail?: string;
        title?: string;
        code?: string;
      };
    };

    // Extract user-friendly error message from RFC 7807 problem details or standard FastAPI error
    const errorMessage =
      data?.message ||
      data?.detail ||
      data?.title ||
      "خطایی در انجام عملیات رخ داد.";

    // Handle 401 Unauthorized
    if (status === 401) {
      // Don't loop refresh on auth routes themselves
      if (
        originalRequest?.url?.includes("/users/login") ||
        originalRequest?.url?.includes("/users/bot-auth") ||
        originalRequest?.url?.includes("/users/refresh")
      ) {
        toast.error("احراز هویت ناموفق", {
          description: errorMessage,
        });
        return Promise.reject(error);
      }

      if (originalRequest && !originalRequest._retry) {
        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          })
            .then(() => {
              return api(originalRequest);
            })
            .catch((err) => {
              return Promise.reject(err);
            });
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
          // Attempt silent token refresh via HttpOnly cookie
          await axios.post(
            `${API_BASE_URL}/users/refresh`,
            {},
            { withCredentials: true }
          );

          processQueue(null);
          return api(originalRequest);
        } catch (refreshError) {
          processQueue(refreshError as Error);
          useAuthStore.getState().logout();
          useAuthStore.getState().toggleLoginModal(true);
          toast.error("نشست شما منقضی شده است", {
            description: "لطفاً مجدداً وارد حساب کاربری خود شوید.",
          });
          if (typeof window !== "undefined" && window.location.pathname.startsWith("/admin")) {
            window.location.href = "/";
          }
          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      }

      // If retry already failed or not applicable, trigger logout and prompt login
      useAuthStore.getState().logout();
      useAuthStore.getState().toggleLoginModal(true);
      if (typeof window !== "undefined" && window.location.pathname.startsWith("/admin")) {
        window.location.href = "/";
      }
    }

    // Handle other HTTP status errors
    switch (status) {
      case 400:
        toast.error("درخواست نامعتبر", { description: errorMessage });
        break;
      case 403:
        toast.error("عدم دسترسی کافی", { description: errorMessage });
        break;
      case 404:
        toast.error("موردی یافت نشد", { description: errorMessage });
        break;
      case 409:
        toast.error("مغایرت داده یا موجودی", { description: errorMessage });
        break;
      case 422:
        toast.error("خطای اعتبارسنجی فرم", {
          description: "اطلاعات ارسالی مطابق با ساختار مورد نظر نیست.",
        });
        break;
      case 500:
      case 502:
      case 503:
        toast.error("خطای سیستمی سرور", {
          description: errorMessage || "سرور در حال حاضر قادر به پاسخگویی نیست.",
        });
        break;
      default:
        toast.error("خطا", { description: errorMessage });
        break;
    }

    return Promise.reject(error);
  }
);

/**
 * Authentication DTOs for FastAPI POST /api/v1/users/login
 */
export interface LoginRequest {
  phone: string;
  otpCode: string;
  messenger_id?: string;
}

export interface LoginResponse {
  access_token: string;
  token_type?: string;
  user?: {
    id: string;
    name?: string;
    phone: string;
    role: string;
    [key: string]: any;
  };
  id?: string;
  role?: string;
  phone?: string;
  [key: string]: any;
}

/**
 * Authenticates user via FastAPI /api/v1/users/login
 */
export const apiLogin = async (
  payload: LoginRequest
): Promise<LoginResponse> => {
  const cleanPhone = payload.phone.trim();
  const response = await api.post<LoginResponse>("/users/login", {
    phone: cleanPhone,
    otpCode: payload.otpCode.trim(),
    messenger_id: payload.messenger_id || `web_${cleanPhone.replace("+", "")}`,
  });
  return response.data;
};

/**
 * Pydantic Schema Aligned Contracts for FastAPI POST /api/v1/orders
 */
export interface OrderItemRequest {
  product_id: string; // UUID format
  quantity: number;
}

export interface OrderCreateRequest {
  user_id: string; // UUID format
  items: OrderItemRequest[];
  address_snapshot: {
    full_name: string;
    phone: string;
    project_details: string;
    type: string;
    total_price?: number;
    [key: string]: any;
  };
}

export interface OrderItemResponse {
  id: string;
  product_id: string;
  quantity: number;
  unit_price_at_purchase: number;
  created_at: string;
}

export interface OrderResponse {
  id: string;
  user_id: string;
  total_price: number;
  status: string;
  address_snapshot: Record<string, any>;
  created_at: string;
  updated_at: string;
  items: OrderItemResponse[];
}

/**
 * Submits an order or inquiry payload to FastAPI POST /api/v1/orders
 */
export const submitOrder = async (
  payload: OrderCreateRequest
): Promise<OrderResponse> => {
  const response = await api.post<OrderResponse>("/orders", payload);
  return response.data;
};

/**
 * Uploads physical or digital bank deposit receipt for order manual payment verification.
 */
export const uploadBankReceipt = async (
  orderId: string,
  formData: FormData
) => {
  return await api.post(`/orders/${orderId}/receipt`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

export interface NotificationDto {
  id: string;
  user_id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface NotificationListDto {
  items: NotificationDto[];
  unread_count: number;
}

/**
 * Fetch notifications for authenticated user (lazy loaded on mount, no polling)
 */
export const fetchMyNotifications = async () => {
  return await api.get<NotificationListDto>("/notifications/my");
};

/**
 * Mark a single notification as read
 */
export const markNotificationRead = async (id: string) => {
  return await api.patch<NotificationDto>(`/notifications/${id}/read`);
};

/**
 * Mark all notifications as read
 */
export const markAllNotificationsRead = async () => {
  return await api.patch<NotificationListDto>("/notifications/read-all");
};

// Re-export Admin ERP, Ticketing, and Public Storefront services
export * from "./api/admin";
export * from "./api/tickets";
export * from "./api/public";
export * from "./api/contracts";

export default api;
