/**
 * Type declarations for ticketSystem.js
 */

export interface TicketData {
  issue: string;
  context?: string;
}

export interface SessionData {
  session_id: string;
  shop_domain: string;
  customer_id?: string;
}

export interface Ticket {
  id: string;
  issue: string;
  context: string;
  session_id: string;
  shop_domain: string;
  customer_id: string;
  created_at: string;
  status: string;
}

export function extractTicketData(aiResponse: string): TicketData | null;

export function createSupportTicket(
  ticketData: TicketData,
  sessionData: SessionData
): Promise<string>;

export function formatTicketResponse(
  aiResponse: string,
  ticketId: string
): string;
