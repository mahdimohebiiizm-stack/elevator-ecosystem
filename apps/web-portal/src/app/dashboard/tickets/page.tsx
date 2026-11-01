"use client";

import React, { useState, useEffect } from "react";
import { TicketDto } from "@/lib/api/admin";
import { fetchMyTickets } from "@/lib/api/tickets";
import { CreateTicketModal } from "./components/CreateTicketModal";
import { CustomerTicketChatModal } from "./components/CustomerTicketChatModal";
import { TicketList } from "@/components/tickets/TicketList";
import { useAuthStore } from "@/store/useAuthStore";
import { toast } from "sonner";

export default function CustomerTicketsPage() {
  const [tickets, setTickets] = useState<TicketDto[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<TicketDto | null>(null);
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);

  const loadTickets = async () => {
    setIsLoading(true);
    try {
      const res = await fetchMyTickets();
      const data = Array.isArray(res.data) ? res.data : (res as any)?.data || [];
      setTickets(data);
    } catch (error: any) {
      console.warn("Could not fetch customer tickets:", error);
      setTickets([]);
      const status = error?.response?.status;
      if (status === 401) {
        toast.error("نشست کاربری شما منقضی شده است.");
        useAuthStore.getState().logout();
        useAuthStore.getState().toggleLoginModal(true);
      } else {
        toast.error("خطا در بارگذاری تیکت‌های شما", {
          description: error?.response?.data?.detail || "برقراری ارتباط با سرور برقرار نشد.",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, []);

  const handleOpenChat = (t: TicketDto) => {
    setSelectedTicket(t);
    setIsChatModalOpen(true);
  };

  return (
    <div className="w-full font-sans" dir="rtl">
      <TicketList
        tickets={tickets}
        isLoading={isLoading}
        onRefresh={loadTickets}
        onCreateTicket={() => setIsCreateModalOpen(true)}
        onOpenChat={handleOpenChat}
      />

      {/* Modals */}
      <CreateTicketModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          loadTickets();
        }}
      />

      <CustomerTicketChatModal
        isOpen={isChatModalOpen}
        onClose={() => {
          setIsChatModalOpen(false);
          setSelectedTicket(null);
        }}
        ticket={selectedTicket}
        onSuccess={() => {
          loadTickets();
        }}
      />
    </div>
  );
}
