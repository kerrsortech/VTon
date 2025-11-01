/**
 * Standalone Try-On Widget
 * Self-contained widget bundle for Shopify storefronts
 */

import { getShopifyProduct, mapToCloselookProduct } from "./shopify-integration"
import { requestTryOn } from "./api-client"

interface WidgetConfig {
  container: HTMLElement
  product: any
  shopDomain: string
  apiUrl: string
}

let widgetInitialized = false

/**
 * Initialize widget
 */
export function init(config: WidgetConfig) {
  if (widgetInitialized) {
    console.warn("Closelook widget already initialized")
    return
  }

  widgetInitialized = true

  const { container, product, shopDomain, apiUrl } = config

  // Map Shopify product to Closelook format
  const closelookProduct = mapToCloselookProduct(product, shopDomain)

  // Create widget UI
  createWidgetUI(container, closelookProduct, shopDomain, apiUrl)
}

function createWidgetUI(
  container: HTMLElement,
  product: any,
  shopDomain: string,
  apiUrl: string
) {
  // Create button
  const button = document.createElement("button")
  button.className = "closelook-try-on-button"
  button.innerHTML = `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
      <polyline points="17 8 12 3 7 8"></polyline>
      <line x1="12" y1="3" x2="12" y2="15"></line>
    </svg>
    <span>Try On</span>
  `

  // Add styles
  const style = document.createElement("style")
  style.textContent = `
    .closelook-try-on-button {
      position: fixed;
      bottom: 24px;
      right: 24px;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 9999;
      transition: all 0.3s ease;
    }
    .closelook-try-on-button:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
    }
    .closelook-try-on-button:active {
      transform: translateY(0);
    }
    .closelook-try-on-button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .closelook-loading {
      display: inline-block;
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `
  document.head.appendChild(style)

  // File input (hidden)
  const fileInput = document.createElement("input")
  fileInput.type = "file"
  fileInput.accept = "image/*"
  fileInput.style.display = "none"

  let isLoading = false

  button.addEventListener("click", () => {
    if (isLoading) return
    fileInput.click()
  })

  fileInput.addEventListener("change", async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file) return

    isLoading = true
    button.disabled = true
    button.innerHTML = '<span class="closelook-loading"></span> <span>Creating...</span>'

    try {
      const result = await requestTryOn(apiUrl, {
        shopDomain,
        productId: product.id,
        productData: product,
        userPhoto: file,
      })

      // Show result in modal
      showResultModal(result.imageUrl, product.name)
    } catch (error) {
      alert(`Error: ${error instanceof Error ? error.message : "Failed to generate try-on"}`)
    } finally {
      isLoading = false
      button.disabled = false
      button.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="17 8 12 3 7 8"></polyline>
          <line x1="12" y1="3" x2="12" y2="15"></line>
        </svg>
        <span>Try On</span>
      `
    }
  })

  container.appendChild(button)
  container.appendChild(fileInput)
}

function showResultModal(imageUrl: string, productName: string) {
  const modal = document.createElement("div")
  modal.className = "closelook-modal"
  modal.innerHTML = `
    <div class="closelook-modal-overlay"></div>
    <div class="closelook-modal-content">
      <button class="closelook-modal-close">&times;</button>
      <h2>Your Try-On Result</h2>
      <img src="${imageUrl}" alt="${productName}" />
    </div>
  `

  const modalStyle = document.createElement("style")
  modalStyle.textContent = `
    .closelook-modal {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 10000;
    }
    .closelook-modal-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.8);
    }
    .closelook-modal-content {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      border-radius: 12px;
      padding: 24px;
      max-width: 90vw;
      max-height: 90vh;
      overflow: auto;
    }
    .closelook-modal-close {
      position: absolute;
      top: 12px;
      right: 12px;
      background: none;
      border: none;
      font-size: 24px;
      cursor: pointer;
      color: #666;
    }
    .closelook-modal-content img {
      max-width: 100%;
      height: auto;
      border-radius: 8px;
    }
  `
  document.head.appendChild(modalStyle)

  modal.querySelector(".closelook-modal-close")?.addEventListener("click", () => {
    modal.remove()
  })
  modal.querySelector(".closelook-modal-overlay")?.addEventListener("click", () => {
    modal.remove()
  })

  document.body.appendChild(modal)
}

// Expose globally for App Block integration
if (typeof window !== "undefined") {
  (window as any).CloselookTryOnWidget = { init }
}

