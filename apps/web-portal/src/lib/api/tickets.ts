import { api } from "@/lib/api";
import { TicketDto, TicketMessageDto } from "@/lib/api/admin";

export interface CreateTicketData {
  subject: string;
  initial_message?: string;
  content?: string;
  priority?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | string;
}

/**
 * Fetch all tickets created by the authenticated customer
 */
export const fetchMyTickets = async () => {
  return await api.get<TicketDto[]>("/tickets/my");
};

/**
 * Create a new customer support ticket with an initial message
 */
export const createTicket = async (data: CreateTicketData) => {
  const payload = {
    subject: data.subject.trim(),
    content: (data.content || data.initial_message || "").trim(),
    priority: data.priority || "MEDIUM",
  };
  return await api.post<TicketDto>("/tickets", payload);
};

/**
 * Fetch full ticket thread details by ticket ID
 */
export const fetchTicketDetails = async (id: string) => {
  return await api.get<TicketDto>(`/tickets/${id}`);
};

/**
 * Customer reply to an existing support ticket thread
 */
export const replyToTicket = async (id: string, content: string) => {
  return await api.post<TicketMessageDto>(`/tickets/${id}/reply`, {
    content: content.trim(),
  });
};
