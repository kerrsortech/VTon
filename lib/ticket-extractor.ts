/**
 * Extract ticket creation requests from chatbot response
 */

export interface TicketRequest {
  issue: string
  customerName?: string
}

/**
 * Extract TICKET_CREATION format from response
 * Format: TICKET_CREATION: {"issue": "description", "customerName": "name"}
 */
export function extractTicketRequest(
  text: string,
  customerName?: string
): TicketRequest | null {
  // Look for TICKET_CREATION format
  const ticketPattern = /TICKET_CREATION:\s*(\{.*?\})/is
  const match = text.match(ticketPattern)
  
  if (match) {
    try {
      const ticketData = JSON.parse(match[1])
      return {
        issue: ticketData.issue || "",
        customerName: ticketData.customerName || customerName,
      }
    } catch (error) {
      // Invalid JSON, try to extract issue from text
      const issueMatch = text.match(/TICKET_CREATION:.*?"issue":\s*"([^"]+)"/is)
      if (issueMatch) {
        return {
          issue: issueMatch[1],
          customerName: customerName,
        }
      }
    }
  }
  
  // Check if customer explicitly wants to create a ticket
  const explicitKeywords = [
    /(?:yes|yeah|sure|okay|ok|create|make).*(?:ticket|support|help|issue)/i,
    /(?:create|make).*(?:ticket|support)/i,
    /(?:i want|i need).*(?:ticket|support|help)/i,
  ]
  
  // Only extract if explicitly requested and customer confirms
  const hasExplicitRequest = explicitKeywords.some(pattern => pattern.test(text))
  
  if (hasExplicitRequest) {
    // Extract issue description from the message
    // Look for text after confirmation keywords
    const issuePattern = /(?:yes|yeah|sure|okay|ok|create|make|ticket|support).*?:\s*(.+)/is
    const issueMatch = text.match(issuePattern)
    
    if (issueMatch) {
      return {
        issue: issueMatch[1].trim(),
        customerName: customerName,
      }
    }
  }
  
  return null
}

