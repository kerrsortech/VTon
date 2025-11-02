// COMMENTED OUT: Analytics/Dashboard API routes - will work on later
// These routes are for dashboard functionality - not part of the core plugin

import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
      return NextResponse.json(
    { 
      message: "Analytics dashboard API is disabled",
      note: "This functionality will be worked on separately" 
    },
    { status: 503 }
  )
  }
