/**
 * Extract Shopify product data from page
 */

export interface ShopifyProduct {
  id: string
  title: string
  handle: string
  description: string
  product_type: string
  vendor?: string
  tags: string[]
  images: string[]
  variants: Array<{
    id: string
    title: string
    price: number
  }>
}

/**
 * Extract product from Shopify global object or DOM
 */
export function getShopifyProduct(): ShopifyProduct | null {
  // Method 1: Shopify global object (modern themes)
  if (typeof window !== "undefined" && (window as any).Shopify?.product) {
    const shopifyProduct = (window as any).Shopify.product
    return mapShopifyGlobalToProduct(shopifyProduct)
  }

  // Method 2: Extract from DOM meta tags
  const productJson = document.querySelector('script[type="application/json"][data-product-json]')
  if (productJson) {
    try {
      const product = JSON.parse(productJson.textContent || "{}")
      return mapShopifyGlobalToProduct(product)
    } catch (e) {
      console.error("Failed to parse product JSON:", e)
    }
  }

  // Method 3: Extract from theme-specific selectors (fallback)
  return extractFromDOM()
}

function mapShopifyGlobalToProduct(shopifyProduct: any): ShopifyProduct {
  return {
    id: shopifyProduct.id || shopifyProduct.product?.id || "",
    title: shopifyProduct.title || shopifyProduct.product?.title || "",
    handle: shopifyProduct.handle || shopifyProduct.product?.handle || "",
    description: shopifyProduct.description || shopifyProduct.product?.description || "",
    product_type: shopifyProduct.product_type || shopifyProduct.product?.type || "",
    vendor: shopifyProduct.vendor || shopifyProduct.product?.vendor,
    tags: shopifyProduct.tags || shopifyProduct.product?.tags || [],
    images: extractImages(shopifyProduct),
    variants: extractVariants(shopifyProduct),
  }
}

function extractImages(product: any): string[] {
  if (product.images && Array.isArray(product.images)) {
    return product.images.map((img: any) => 
      typeof img === "string" ? img : (img.url || img.src || "")
    ).filter(Boolean)
  }
  if (product.product?.images) {
    return product.product.images.map((img: any) => img.url || img.src || "").filter(Boolean)
  }
  // Extract from DOM
  const images = Array.from(document.querySelectorAll(".product-images img, .product-photos img, .product-media img"))
  return images.map(img => (img as HTMLImageElement).src || (img as HTMLImageElement).dataset.src || "").filter(Boolean)
}

function extractVariants(product: any): Array<{ id: string; title: string; price: number }> {
  if (product.variants && Array.isArray(product.variants)) {
    return product.variants.map((v: any) => ({
      id: v.id || "",
      title: v.title || "",
      price: typeof v.price === "number" ? v.price : parseFloat(v.price || "0"),
    }))
  }
  // Extract price from DOM
  const priceElement = document.querySelector(".product-price, .price, [data-product-price]")
  const priceText = priceElement?.textContent || ""
  const price = parseFloat(priceText.replace(/[^0-9.]/g, "")) || 0
  
  return [{
    id: "",
    title: "",
    price,
  }]
}

function extractFromDOM(): ShopifyProduct | null {
  const titleElement = document.querySelector("h1.product-title, h1.product__title, [data-product-title]")
  const title = titleElement?.textContent?.trim() || ""

  if (!title) return null

  return {
    id: window.location.pathname.split("/products/")[1]?.split("?")[0] || "",
    title,
    handle: window.location.pathname.split("/products/")[1]?.split("?")[0] || "",
    description: document.querySelector(".product-description, .product__description")?.textContent?.trim() || "",
    product_type: "",
    tags: [],
    images: extractImages({}),
    variants: extractVariants({}),
  }
}

/**
 * Map Shopify product to Closelook Product format
 */
export function mapToCloselookProduct(shopifyProduct: ShopifyProduct, shopDomain: string): any {
  const variant = shopifyProduct.variants[0] || { price: 0, title: "" }
  
  // Extract color from tags
  const colorTag = shopifyProduct.tags.find(tag => tag.toLowerCase().startsWith("color:"))
  const color = colorTag ? colorTag.replace(/^color:/i, "") : variant.title.split("/")[0]?.trim() || ""

  return {
    id: shopifyProduct.id || shopifyProduct.handle,
    name: shopifyProduct.title,
    category: shopifyProduct.product_type || "Uncategorized",
    type: shopifyProduct.product_type || "",
    color,
    price: variant.price,
    images: shopifyProduct.images,
    description: shopifyProduct.description,
    url: `https://${shopDomain}/products/${shopifyProduct.handle}`,
    sizes: shopifyProduct.variants.map(v => v.title).filter(Boolean),
  }
}

