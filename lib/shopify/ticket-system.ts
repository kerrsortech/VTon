/**
 * Shopify ticket/escalation system
 * Creates customer notes or alerts for shop owners when chatbot can't resolve issues
 */

import { shopifyRequest } from "./api-client"
import type { ShopifySession } from "./types"

export interface TicketData {
  customerEmail?: string
  customerId?: string
  customerName?: string
  issue: string
  conversationHistory?: Array<{ role: string; content: string }>
  orderNumber?: string
}

/**
 * Create a customer note in Shopify (visible in Shopify admin)
 * This alerts the shop owner about the customer issue
 */
export async function createCustomerNote(
  session: ShopifySession,
  ticketData: TicketData
): Promise<{ success: boolean; noteId?: string; error?: string }> {
  try {
    // First, find the customer by email or ID
    let customerId: string | null = null

    if (ticketData.customerId) {
      customerId = ticketData.customerId
    } else if (ticketData.customerEmail) {
      // Find customer by email
      const query = `
        query findCustomer($email: String!) {
          customers(first: 1, query: $email) {
            edges {
              node {
                id
              }
            }
          }
        }
      `

      const response = await shopifyRequest(session, "/graphql.json", {
        method: "POST",
        body: JSON.stringify({
          query,
          variables: { email: `email:${ticketData.customerEmail}` },
        }),
      })

      if (response.ok) {
        const data = await response.json()
        const customer = data.data?.customers?.edges?.[0]?.node
        if (customer) {
          customerId = customer.id
        }
      }
    }

    if (!customerId) {
      // If no customer found, create a draft order note or use a different method
      return createDraftOrderNote(session, ticketData)
    }

    // Create customer note using Admin API
    const mutation = `
      mutation createCustomerNote($customerId: ID!, $note: String!) {
        customerUpdate(customer: {id: $customerId, note: $note}) {
          customer {
            id
          }
          userErrors {
            field
            message
          }
        }
      }
    `

    const noteText = formatTicketNote(ticketData)
    
    const response = await shopifyRequest(session, "/graphql.json", {
      method: "POST",
      body: JSON.stringify({
        query: mutation,
        variables: {
          customerId,
          note: noteText,
        },
      }),
    })

    if (!response.ok) {
      return { success: false, error: `API error: ${response.statusText}` }
    }

    const data = await response.json()
    const errors = data.data?.customerUpdate?.userErrors || []

    if (errors.length > 0) {
      return { success: false, error: errors.map((e: any) => e.message).join(", ") }
    }

    return { success: true, noteId: data.data?.customerUpdate?.customer?.id }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

/**
 * Create a draft order note if customer not found
 * This creates a visible draft order that shop owners can see
 */
async function createDraftOrderNote(
  session: ShopifySession,
  ticketData: TicketData
): Promise<{ success: boolean; draftOrderId?: string; error?: string }> {
  try {
    const mutation = `
      mutation createDraftOrder($input: DraftOrderInput!) {
        draftOrderCreate(input: $input) {
          draftOrder {
            id
            name
          }
          userErrors {
            field
            message
          }
        }
      }
    `

    const noteText = formatTicketNote(ticketData)
    
    const input: any = {
      note: `[SUPPORT TICKET] ${noteText}`,
      tags: ["support-ticket", "chatbot-escalation"],
    }

    if (ticketData.customerEmail) {
      input.email = ticketData.customerEmail
    }

    if (ticketData.customerName) {
      input.customAttributes = [
        { key: "Customer Name", value: ticketData.customerName },
      ]
    }

    const response = await shopifyRequest(session, "/graphql.json", {
      method: "POST",
      body: JSON.stringify({
        query: mutation,
        variables: { input },
      }),
    })

    if (!response.ok) {
      return { success: false, error: `API error: ${response.statusText}` }
    }

    const data = await response.json()
    const errors = data.data?.draftOrderCreate?.userErrors || []

    if (errors.length > 0) {
      return { success: false, error: errors.map((e: any) => e.message).join(", ") }
    }

    return {
      success: true,
      draftOrderId: data.data?.draftOrderCreate?.draftOrder?.id,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

/**
 * Format ticket note for Shopify
 */
function formatTicketNote(ticketData: TicketData): string {
  let note = `🚨 SUPPORT TICKET - CHATBOT ESCALATION 🚨\n\n`
  
  if (ticketData.customerName) {
    note += `Customer: ${ticketData.customerName}\n`
  }
  if (ticketData.customerEmail) {
    note += `Email: ${ticketData.customerEmail}\n`
  }
  if (ticketData.orderNumber) {
    note += `Order: ${ticketData.orderNumber}\n`
  }
  
  note += `\nIssue Description:\n${ticketData.issue}\n`
  
  if (ticketData.conversationHistory && ticketData.conversationHistory.length > 0) {
    note += `\nConversation History:\n`
    ticketData.conversationHistory.slice(-5).forEach((msg: any, idx: number) => {
      note += `${idx + 1}. ${msg.role === "user" ? "Customer" : "Chatbot"}: ${msg.content.substring(0, 200)}\n`
    })
  }
  
  note += `\nThis ticket was created because the chatbot was unable to resolve the customer's issue. Please review and contact the customer directly.`
  
  return note
}

