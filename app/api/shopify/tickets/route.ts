import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/shopify/session-storage"
import { createCustomerNote } from "@/lib/shopify/ticket-system"
import { logger, sanitizeErrorForClient } from "@/lib/server-logger"

/**
 * POST /api/shopify/tickets
 * Create a support ticket/note for shop owner
 * Body: { shop: string, ticketData: { customerEmail?, customerId?, customerName?, issue: string, conversationHistory?, orderNumber? } }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { shop, ticketData } = body

    if (!shop) {
      return NextResponse.json(
        { error: "Shop is required" },
        { status: 400 }
      )
    }

    if (!ticketData?.issue) {
      return NextResponse.json(
        { error: "Issue description is required" },
        { status: 400 }
      )
    }

    const session = await getSession(shop)
    if (!session) {
      return NextResponse.json(
        { error: "Shop session not found. Please install the app first." },
        { status: 401 }
      )
    }

    if (!session.accessToken || session.accessToken === "") {
      return NextResponse.json(
        { error: "Invalid session: access token missing" },
        { status: 401 }
      )
    }

    const result = await createCustomerNote(session, ticketData)

    if (!result.success) {
      logger.error("Failed to create ticket", { error: result.error, shop })
      return NextResponse.json(
        { error: result.error || "Failed to create ticket" },
        { status: 500 }
      )
    }

    logger.info("Support ticket created successfully", { shop, noteId: result.noteId })

    return NextResponse.json({
      success: true,
      message: "Ticket created successfully. The shop owner has been notified.",
      noteId: result.noteId,
    })
  } catch (error: any) {
    logger.error("Ticket API Error", { error: error.message })
    const sanitizedError = sanitizeErrorForClient(error)
    return NextResponse.json(sanitizedError, { status: 500 })
  }
}

export const config = {
  maxDuration: 30,
}

