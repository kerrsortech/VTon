/**
 * Type declarations for prompts.js
 */

export interface Context {
  pageType?: string;
  currentProduct?: {
    title?: string;
    name?: string;
    price?: {
      min: number;
      max?: number;
      currency?: string;
    } | number;
    description?: string;
    productType?: string;
    type?: string;
    vendor?: string;
    available?: boolean;
    variants?: Array<{
      title?: string;
      price?: number;
      available?: boolean;
    }>;
    tags?: string[];
  };
  recommendedProducts?: Array<{
    title?: string;
    name?: string;
    id: string;
    price?: {
      min: number;
      currency?: string;
    } | number;
    productType?: string;
    type?: string;
    tags?: string[];
    available?: boolean;
  }>;
  customer?: {
    logged_in?: boolean;
    id?: string;
  };
  cart?: {
    item_count?: number;
    total_price?: number;
  };
}

export interface ConversationMessage {
  role: string;
  content: string;
}

export function getSystemPrompt(): string;

export function buildContextPrompt(
  context: Context,
  userMessage?: string
): string;

export function buildFullPrompt(
  context: Context,
  userMessage: string,
  conversationHistory?: ConversationMessage[]
): string;
