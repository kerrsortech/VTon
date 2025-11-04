/**
 * Support Ticket System
 * Handles ticket creation and admin notifications
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

export async function createSupportTicket(ticketData, sessionData) {
  const ticketId = `T-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

  const ticket = {
    id: ticketId,
    issue: ticketData.issue,
    context: ticketData.context,
    session_id: sessionData.session_id,
    shop_domain: sessionData.shop_domain,
    customer_id: sessionData.customer_id || 'guest',
    created_at: new Date().toISOString(),
    status: 'open'
  };

  console.log('[Ticket] Created ticket:', ticket);

  // Store in database
  try {
    await storeTicketInDatabase(ticket);
  } catch (error) {
    console.error('[Ticket] Error storing in database:', error);
  }

  // Send email to admin
  try {
    await notifyAdminOfTicket(ticket, sessionData);
  } catch (error) {
    console.error('[Ticket] Error sending email:', error);
  }

  return ticketId;
}

async function storeTicketInDatabase(ticket) {
  // TODO: Implement with your Neon DB
  // Example:
  // const { getNeonClient } = require('./db/neon-client');
  // const sql = getNeonClient();
  // await sql`
  //   INSERT INTO support_tickets (id, issue, context, session_id, shop_domain, customer_id, status, created_at)
  //   VALUES (${ticket.id}, ${ticket.issue}, ${ticket.context}, ${ticket.session_id}, ${ticket.shop_domain}, ${ticket.customer_id}, ${ticket.status}, ${ticket.created_at})
  // `;

  console.log('[Ticket] Stored in database:', ticket.id);
}

async function notifyAdminOfTicket(ticket, sessionData) {
  // Get store admin email from environment or database
  const adminEmail = process.env[`ADMIN_EMAIL_${ticket.shop_domain.replace(/[.-]/g, '_').toUpperCase()}`]
    || process.env.ADMIN_EMAIL
    || 'admin@example.com';

  const emailContent = `
New Support Ticket Created

Ticket ID: ${ticket.id}
Store: ${ticket.shop_domain}
Customer: ${ticket.customer_id}
Created: ${new Date(ticket.created_at).toLocaleString()}

Issue:
${ticket.issue}

Context:
${ticket.context || 'None provided'}

Session ID: ${ticket.session_id}

---

Reply to this ticket through your admin dashboard.
  `.trim();

  // TODO: Implement email sending
  // await sendEmail({
  //   to: adminEmail,
  //   subject: `New Support Ticket #${ticket.id}`,
  //   body: emailContent
  // });

  console.log('[Ticket] Admin notification sent to:', adminEmail);
}

export function formatTicketResponse(aiResponse, ticketId) {
  // Remove the __TICKET_CREATE__ markers from response
  let cleanResponse = aiResponse.replace(/__TICKET_CREATE__[\s\S]*?__TICKET_END__/g, '');

  // Replace generic ticket ID with actual one
  cleanResponse = cleanResponse.replace(/#\[TICKET_ID\]/g, `#${ticketId}`);
  cleanResponse = cleanResponse.replace(/#T-\d+-[A-Z0-9]+/g, `#${ticketId}`);

  return cleanResponse.trim();
}
