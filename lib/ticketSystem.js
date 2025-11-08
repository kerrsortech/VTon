/**
 * Support Ticket System
 * Handles ticket creation and admin notifications
 * Now uses Shopify integration to create customer notes visible in Shopify admin
 */

export function extractTicketData(aiResponse) {
  const ticketRegex = /__TICKET_CREATE__([\s\S]*?)__TICKET_END__/;
  const match = aiResponse.match(ticketRegex);

  if (!match) return null;

  const ticketContent = match[1].trim();
  const lines = ticketContent.split('\n');

  const ticket = {
    issue: '',
    context: ''
  };

  lines.forEach(line => {
    if (line.startsWith('Issue:')) {
      ticket.issue = line.replace('Issue:', '').trim();
    } else if (line.startsWith('Context:')) {
      ticket.context = line.replace('Context:', '').trim();
    }
  });

  return ticket;
}

/**
 * Create a support ticket using Shopify integration
 * This creates a customer note in Shopify admin (visible to shop owners)
 * @param {Object} ticketData - Ticket data with issue and context
 * @param {Object} sessionData - Session data with shop_domain, session_id, customer_id
 * @param {Object} additionalData - Additional data like customerName, customerEmail, conversationHistory
 * @returns {Promise<string>} Ticket ID
 */
export async function createSupportTicket(ticketData, sessionData, additionalData = {}) {
  const ticketId = `T-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

  // Try to use Shopify integration if shop domain and session are available
  if (sessionData.shop_domain) {
    try {
      // Dynamic import to avoid circular dependencies
      const { getSession } = await import('./shopify/session-storage');
      const { createCustomerNote } = await import('./shopify/ticket-system');
      
      const session = await getSession(sessionData.shop_domain);
      if (session && session.accessToken) {
        // Combine issue and context into a single issue description
        const issueDescription = ticketData.context 
          ? `${ticketData.issue}\n\nContext: ${ticketData.context}`
          : ticketData.issue;

        const result = await Promise.race([
          createCustomerNote(session, {
            issue: issueDescription.substring(0, 1000),
            customerName: additionalData.customerName?.substring(0, 100),
            customerEmail: additionalData.customerEmail?.substring(0, 255),
            customerId: sessionData.customer_id?.substring(0, 200),
            conversationHistory: additionalData.conversationHistory || [],
          }),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Ticket creation timeout")), 10000)
          ),
        ]);

        if (result.success) {
          // Also store in database for internal tracking
          try {
            await storeTicketInDatabase({
              id: ticketId,
              issue: ticketData.issue,
              context: ticketData.context,
              session_id: sessionData.session_id,
              shop_domain: sessionData.shop_domain,
              customer_id: sessionData.customer_id || 'guest',
              created_at: new Date().toISOString(),
              status: 'open',
              shopify_note_id: result.noteId || result.draftOrderId,
            });
          } catch (dbError) {
            // Log but don't fail - Shopify ticket creation succeeded
            console.error('[Ticket] Error storing in database:', dbError);
          }

          return ticketId;
        } else {
          throw new Error(result.error || 'Failed to create ticket in Shopify');
        }
      }
    } catch (error) {
      console.error('[Ticket] Error creating ticket in Shopify:', error);
      // Fall through to database-only storage
    }
  }

  // Fallback: Store in database only (if Shopify integration fails)
  const ticket = {
    id: ticketId,
    issue: ticketData.issue,
    context: ticketData.context,
    session_id: sessionData.session_id,
    shop_domain: sessionData.shop_domain || 'unknown',
    customer_id: sessionData.customer_id || 'guest',
    created_at: new Date().toISOString(),
    status: 'open'
  };

  try {
    await storeTicketInDatabase(ticket);
  } catch (error) {
    console.error('[Ticket] Error storing in database:', error);
  }

  return ticketId;
}

async function storeTicketInDatabase(ticket) {
  try {
    const { getNeonClient } = await import('./db/neon-client');
    const sql = getNeonClient();
    
    // Check if table exists, if not, create it (for backwards compatibility)
    try {
      await sql`
        INSERT INTO support_tickets (id, issue, context, session_id, shop_domain, customer_id, status, created_at, shopify_note_id)
        VALUES (${ticket.id}, ${ticket.issue || ''}, ${ticket.context || ''}, ${ticket.session_id || ''}, ${ticket.shop_domain || ''}, ${ticket.customer_id || 'guest'}, ${ticket.status || 'open'}, ${ticket.created_at}, ${ticket.shopify_note_id || null})
        ON CONFLICT (id) DO NOTHING
      `;
      console.log('[Ticket] Stored in database:', ticket.id);
    } catch (tableError) {
      // Table might not exist yet - that's okay, we'll log it
      console.log('[Ticket] Table may not exist yet, skipping database storage:', tableError.message);
    }
  } catch (error) {
    // Database might not be configured - that's okay
    console.log('[Ticket] Database storage skipped:', error.message);
  }
}

export function formatTicketResponse(aiResponse, ticketId) {
  if (!aiResponse) return '';
  
  // Remove the __TICKET_CREATE__ markers from response
  let cleanResponse = aiResponse.replace(/__TICKET_CREATE__[\s\S]*?__TICKET_END__/g, '');

  // Remove any remaining technical markers or formatting
  cleanResponse = cleanResponse.replace(/Issue:\s*/gi, '');
  cleanResponse = cleanResponse.replace(/Context:\s*/gi, '');
  
  // Replace generic ticket ID with actual one
  cleanResponse = cleanResponse.replace(/#\[TICKET_ID\]/g, `#${ticketId}`);
  cleanResponse = cleanResponse.replace(/#T-\d+-[A-Z0-9]+/g, `#${ticketId}`);

  // Clean up extra whitespace
  cleanResponse = cleanResponse.replace(/\n{3,}/g, '\n\n').trim();

  return cleanResponse;
}
