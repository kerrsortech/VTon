/**
 * API client for widget to communicate with backend
 */

export interface TryOnRequest {
  shopDomain: string
  productId: string
  productData?: any
  userPhoto: File
}

export interface TryOnResponse {
  imageUrl: string
  productName: string
  metadata?: any
}

/**
 * Make try-on API request
 */
export async function requestTryOn(
  apiUrl: string,
  request: TryOnRequest
): Promise<TryOnResponse> {
  const formData = new FormData()
  formData.append("userPhoto", request.userPhoto)
  formData.append("shopDomain", request.shopDomain)
  formData.append("productId", request.productId)

  if (request.productData) {
    // Append product data as JSON
    formData.append("productData", JSON.stringify(request.productData))
  }

  const response = await fetch(`${apiUrl}/try-on`, {
    method: "POST",
    body: formData,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Failed to generate try-on" }))
    throw new Error(error.error || "Failed to generate try-on")
  }

  return response.json()
}

