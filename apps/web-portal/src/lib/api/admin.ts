import { api } from "@/lib/api";

export interface TransactionDto {
  id: string;
  gateway_name: string;
  amount: number;
  authority?: string;
  ref_id?: string;
  receipt_url?: string;
  status: "PENDING" | "SUCCESS" | "FAILED" | string;
  transaction_type: "ORDER_PAYMENT" | "WALLET_DEPOSIT" | string;
  created_at: string;
  [key: string]: any;
}

export interface OrderItemDto {
  id?: string;
  product_id?: string;
  quantity?: number;
  unit_price_at_purchase?: number;
  product?: {
    id?: string;
    title?: string;
    sku?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

export interface OrderDto {
  id: string;
  user_id: string;
  total_price: number;
  status: string;
  shipping_method?: string | null;
  tracking_code?: string | null;
  created_at: string;
  updated_at?: string;
  address_snapshot?: {
    full_name?: string;
    title?: string;
    phone?: string;
    company?: string;
    province?: string;
    city?: string;
    postal_code?: string;
    full_address?: string;
    [key: string]: any;
  };
  items?: OrderItemDto[];
  transactions?: TransactionDto[];
  user?: {
    id?: string;
    phone?: string;
    name?: string;
    messenger_id?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

export interface ProductDto {
  id: string;
  sku: string;
  title: string;
  price: number;
  stock_count: number;
  is_active: boolean;
  category_id?: string;
  category?: {
    id: string;
    name: string;
  };
  created_at: string;
  brand?: string | null;
  country_of_origin?: string | null;
  warranty_months?: number | null;
  weight_kg?: number | null;
  technical_specs?: Record<string, any> | null;
  [key: string]: any;
}

/**
 * Enterprise Admin API Services
 * Fetches all orders for Admin ERP portal from FastAPI backend
 */
export const fetchAdminOrders = async () => {
  return await api.get<OrderDto[]>("/orders/admin/all");
};

/**
 * Fetches all products and elevator packages for Admin PIM portal
 */
export const fetchAdminProducts = async () => {
  return await api.get<ProductDto[]>("/products/admin/all");
};

/**
 * Create a new product in the catalog
 */
export const createProduct = async (data: Partial<ProductDto>) => {
  return await api.post<ProductDto>("/products/admin", data);
};

/**
 * Update an existing product in the catalog
 */
export const updateProduct = async (id: string, data: Partial<ProductDto>) => {
  return await api.patch<ProductDto>(`/products/admin/${id}`, data);
};

/**
 * Update order status and optionally matching transaction status
 */
export const updateOrderStatus = async (
  orderId: string,
  status: string,
  transactionId?: string,
  transactionStatus?: string,
  trackingCode?: string
) => {
  return await api.patch(`/orders/admin/${orderId}/status`, {
    status,
    transaction_id: transactionId,
    transaction_status: transactionStatus,
    tracking_code: trackingCode,
  });
};

export interface SiteSettingDto {
  id: string;
  hero_banners: string[];
  contact_phone?: string | null;
  contact_email?: string | null;
  about_text?: string | null;
  updated_at?: string;
  [key: string]: any;
}

/**
 * Fetch global CMS site configuration and hero banners
 */
export const fetchSiteSettings = async () => {
  return await api.get<SiteSettingDto>("/cms/admin/settings");
};

/**
 * Update global CMS site configuration and hero banners
 */
export const updateSiteSettings = async (data: Partial<SiteSettingDto>) => {
  return await api.patch<SiteSettingDto>("/cms/admin/settings", data);
};

/**
 * Upload hero banner image via multipart/form-data
 */
export const uploadBannerImage = async (formData: FormData) => {
  return await api.post<{ url: string; filename: string }>(
    "/cms/admin/banners/upload",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );
};

export interface TicketUserDto {
  id: string;
  phone?: string | null;
  role: string;
  [key: string]: any;
}

export interface TicketMessageDto {
  id: string;
  ticket_id: string;
  sender_id: string;
  content: string;
  is_from_admin: boolean;
  created_at: string;
  sender?: TicketUserDto | null;
  [key: string]: any;
}

export interface TicketDto {
  id: string;
  user_id: string;
  subject: string;
  status: "OPEN" | "IN_PROGRESS" | "REPLIED" | "CLOSED" | string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | string;
  created_at: string;
  updated_at: string;
  user?: TicketUserDto | null;
  messages?: TicketMessageDto[];
  [key: string]: any;
}

/**
 * Fetch all CRM support tickets for Admin dashboard
 */
export const fetchAdminTickets = async () => {
  return await api.get<TicketDto[]>("/tickets/admin");
};

/**
 * Admin reply to a support ticket thread
 */
export const replyAdminTicket = async (ticketId: string, content: string) => {
  return await api.post<TicketMessageDto>(`/tickets/admin/${ticketId}/reply`, {
    content,
  });
};

/**
 * Update ticket lifecycle status (OPEN, IN_PROGRESS, REPLIED, CLOSED)
 */
export const updateTicketStatus = async (ticketId: string, status: string) => {
  return await api.patch<TicketDto>(`/tickets/admin/${ticketId}/status`, {
    status,
  });
};

export interface UserAdminDto {
  id: string;
  phone?: string | null;
  name?: string | null;
  role: "ADMIN" | "CUSTOMER" | string;
  is_active: boolean;
  wallet_balance?: number;
  messenger_id?: string | null;
  telegram_id?: string | null;
  bale_id?: string | null;
  created_at: string;
  updated_at?: string;
  [key: string]: any;
}

/**
 * Fetch all registered users for Admin CRM dashboard
 */
export const fetchAdminUsers = async () => {
  return await api.get<UserAdminDto[]>("/users/admin/all");
};

/**
 * Bulk deactivate selected users atomically
 */
export const bulkDeactivateUsers = async (userIds: string[]) => {
  return await api.patch<{ affected_count: number; message: string }>(
    "/users/admin/bulk-deactivate",
    {
      user_ids: userIds,
    }
  );
};

/**
 * Quick toggle single user active/deactive status
 */
export const toggleUserStatus = async (userId: string, active: boolean) => {
  return await api.patch<UserAdminDto>(
    `/users/admin/${userId}/status?active=${active}`
  );
};

/**
 * Update user details by Admin (Name, Phone, Role, Password, is_active)
 */
export const updateAdminUser = async (
  userId: string,
  data: {
    name?: string;
    phone?: string;
    role?: string;
    password?: string;
    is_active?: boolean;
  }
) => {
  return await api.patch<UserAdminDto>(`/users/admin/${userId}`, data);
};

/**
 * Bulk update status for multiple orders
 */
export const bulkUpdateOrderStatus = async (
  orderIds: string[],
  newStatus: string
) => {
  return await api.patch<{ affected_count: number; message: string }>(
    "/orders/admin/bulk-status",
    {
      order_ids: orderIds,
      new_status: newStatus,
    }
  );
};

/**
 * Bulk action on products (deactivate, activate, delete)
 */
export const bulkActionProducts = async (
  productIds: string[],
  action: "deactivate" | "activate" | "delete"
) => {
  return await api.patch<{ affected_count: number; message: string }>(
    "/products/admin/bulk-action",
    {
      product_ids: productIds,
      action: action,
    }
  );
};

/**
 * Direct Omnichannel Push Notification to User (Telegram / Bale / In-app)
 */
export const notifyUserDirect = async (payload: {
  user_id: string;
  message: string;
  channel?: "auto" | "telegram" | "bale" | string;
}) => {
  return await api.post<{
    success: boolean;
    channel_dispatched: string;
    message: string;
  }>("/admin/notify-user", payload);
};

