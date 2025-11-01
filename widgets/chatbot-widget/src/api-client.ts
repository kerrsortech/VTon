/**
 * API client for chatbot widget
 */

export interface ChatRequest {
  shopDomain: string
  message: string
  conversationHistory?: Array<{ role: string; content: string }>
  currentProduct?: any
}

export interface ChatResponse {
  message: string
  recommendations?: Array<{
    id: string
    name: string
    price: number
    reason: string
  }>
}

/**
 * Send chat message
 */
export async function sendChatMessage(
  apiUrl: string,
  request: ChatRequest
): Promise<ChatResponse> {
  const response = await fetch(`${apiUrl}/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Domain": request.shopDomain,
    },
    body: JSON.stringify({
      message: request.message,
      conversationHistory: request.conversationHistory || [],
      currentProduct: request.currentProduct,
      pageContext: request.currentProduct ? "product" : "home",
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Failed to get response" }))
    throw new Error(error.error || "Failed to get response")
  }

  return response.json()
}

