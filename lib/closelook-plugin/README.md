# Closelook Plugin Architecture

## Overview

The Closelook plugin is designed to be platform-agnostic and easily integrable with any e-commerce platform including Shopify, WooCommerce, and custom implementations.

## Architecture

### Core Components

1. **Types** (`types/index.ts`)
   - Platform-agnostic interfaces
   - Shared data structures
   - Configuration types

2. **Adapters** (`adapters/`)
   - `base-adapter.ts` - Interface that all adapters must implement
   - `demo-adapter.ts` - Static demo data for development
   - `shopify-adapter.ts` - Shopify Storefront API integration
   - `woocommerce-adapter.ts` - (Coming soon) WooCommerce REST API integration

3. **Configuration** (`config.ts`)
   - Centralized configuration management
   - Automatic adapter initialization
   - Singleton pattern for global access

## Usage

### Demo Mode (Development)

\`\`\`typescript
import { initializeCloselookPlugin } from '@/lib/closelook-plugin'

const plugin = initializeCloselookPlugin({
  platform: 'demo',
  enableChatbot: true,
  enableTryOn: true
})

const adapter = plugin.getAdapter()
const product = await adapter.getProduct('nike-vomero-plus')
\`\`\`

### Shopify Integration

\`\`\`typescript
import { initializeCloselookPlugin } from '@/lib/closelook-plugin'

const plugin = initializeCloselookPlugin({
  platform: 'shopify',
  platformConfig: {
    storeDomain: 'your-store.myshopify.com',
    accessToken: process.env.SHOPIFY_STOREFRONT_TOKEN
  },
  merchantId: 'your-merchant-id',
  geminiApiKey: process.env.GOOGLE_GEMINI_API_KEY
})

const adapter = plugin.getAdapter()
const products = await adapter.getAllProducts({ limit: 20 })
\`\`\`

### WooCommerce Integration (Coming Soon)

\`\`\`typescript
import { initializeCloselookPlugin } from '@/lib/closelook-plugin'

const plugin = initializeCloselookPlugin({
  platform: 'woocommerce',
  platformConfig: {
    siteUrl: 'https://your-store.com',
    consumerKey: process.env.WC_CONSUMER_KEY,
    consumerSecret: process.env.WC_CONSUMER_SECRET
  }
})
\`\`\`

### Custom Integration

\`\`\`typescript
import { initializeCloselookPlugin, ProductAdapter } from '@/lib/closelook-plugin'

// Implement your custom adapter
class MyCustomAdapter implements ProductAdapter {
  async getProduct(id: string) {
    // Your custom logic
  }
  // ... implement other methods
}

const plugin = initializeCloselookPlugin({
  platform: 'custom',
  platformConfig: {
    customAdapter: new MyCustomAdapter()
  }
})
\`\`\`

## Creating a New Platform Adapter

To add support for a new e-commerce platform:

1. Create a new file in `adapters/` (e.g., `woocommerce-adapter.ts`)
2. Implement the `ProductAdapter` interface
3. Add platform initialization logic in `config.ts`
4. Update the types in `types/index.ts` if needed

Example:

\`\`\`typescript
import type { ProductAdapter } from './base-adapter'
import type { CloselookProduct } from '../types'

export class WooCommerceAdapter implements ProductAdapter {
  private siteUrl: string
  private consumerKey: string
  private consumerSecret: string

  constructor(siteUrl: string, consumerKey: string, consumerSecret: string) {
    this.siteUrl = siteUrl
    this.consumerKey = consumerKey
    this.consumerSecret = consumerSecret
  }

  async getProduct(id: string): Promise<CloselookProduct | null> {
    // Implement WooCommerce API call
    const response = await fetch(
      `${this.siteUrl}/wp-json/wc/v3/products/${id}`,
      {
        headers: {
          'Authorization': `Basic ${btoa(`${this.consumerKey}:${this.consumerSecret}`)}`
        }
      }
    )
    
    const wcProduct = await response.json()
    
    // Map WooCommerce product to CloselookProduct
    return {
      id: wcProduct.id.toString(),
      name: wcProduct.name,
      category: wcProduct.categories[0]?.name || 'Uncategorized',
      type: wcProduct.type,
      color: wcProduct.attributes.find(a => a.name === 'Color')?.options[0] || '',
      price: parseFloat(wcProduct.price),
      images: wcProduct.images.map(img => img.src),
      description: wcProduct.description,
      metadata: {
        platform: 'woocommerce',
        wcId: wcProduct.id
      }
    }
  }

  // Implement other required methods...
}
\`\`\`

## API Routes

The plugin works with the following API routes:

- `POST /api/try-on` - Generate virtual try-on images
- `POST /api/analyze-product` - Analyze product images
- `POST /api/chat` - Chatbot interactions

These routes are platform-agnostic and work with any adapter.

## Environment Variables

\`\`\`env
# Required
GOOGLE_GEMINI_API_KEY=your_gemini_api_key

# Shopify (if using Shopify adapter)
SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
SHOPIFY_STOREFRONT_TOKEN=your_storefront_access_token

# WooCommerce (if using WooCommerce adapter)
WC_SITE_URL=https://your-store.com
WC_CONSUMER_KEY=your_consumer_key
WC_CONSUMER_SECRET=your_consumer_secret
\`\`\`

## Widget Integration

The Closelook widget is designed to work with any product data source:

\`\`\`tsx
import { CloselookWidget } from '@/components/closelook-widget'
import { getCloselookPlugin } from '@/lib/closelook-plugin'

export default async function ProductPage({ params }) {
  const plugin = getCloselookPlugin()
  const adapter = plugin.getAdapter()
  const product = await adapter.getProduct(params.id)

  return (
    <div>
      {/* Your product page UI */}
      <CloselookWidget product={product} />
    </div>
  )
}
\`\`\`

## Future Enhancements

- [ ] WooCommerce adapter implementation
- [ ] BigCommerce adapter
- [ ] Magento adapter
- [ ] Custom webhook support
- [ ] Analytics integration
- [ ] A/B testing framework
- [ ] Multi-language support
- [ ] CDN integration for faster image loading
