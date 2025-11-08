/**
 * Test script to verify product fetching works
 * Tests with product ID: 8252597338298
 */

import { ShopifyProductAdapter } from './lib/closelook-plugin/adapters/shopify-adapter'
import { ensureStorefrontToken } from './lib/shopify/storefront-token'

async function testProductFetch() {
  const shop = 'vt-test-5.myshopify.com'
  const productId = '8252597338298'
  const gidProductId = `gid://shopify/Product/${productId}`

  console.log('🧪 Testing Product Fetch')
  console.log('═══════════════════════════════════════════════════════════')
  console.log('')
  console.log(`Shop: ${shop}`)
  console.log(`Product ID (numeric): ${productId}`)
  console.log(`Product ID (GID): ${gidProductId}`)
  console.log('')

  try {
    // Step 1: Ensure we have a Storefront token
    console.log('Step 1: Ensuring Storefront Access Token...')
    const storefrontToken = await ensureStorefrontToken(shop)
    
    if (!storefrontToken) {
      console.error('❌ ERROR: Could not get Storefront Access Token')
      console.error('')
      console.error('Possible causes:')
      console.error('  1. SHOPIFY_STOREFRONT_TOKEN not set in environment')
      console.error('  2. No session exists for this shop')
      console.error('  3. No Admin access token available to create Storefront token')
      console.error('')
      console.error('To fix:')
      console.error('  - Set SHOPIFY_STOREFRONT_TOKEN in .env.local')
      console.error('  - Or install the app via OAuth to create a session')
      process.exit(1)
    }

    console.log(`✅ Storefront token obtained (${storefrontToken.length} chars)`)
    console.log('')

    // Step 2: Initialize adapter
    console.log('Step 2: Initializing Shopify Product Adapter...')
    const adapter = new ShopifyProductAdapter(shop, storefrontToken)
    console.log('✅ Adapter initialized')
    console.log('')

    // Step 3: Fetch product
    console.log(`Step 3: Fetching product details...`)
    const startTime = Date.now()
    const product = await adapter.getProduct(gidProductId)
    const duration = Date.now() - startTime

    if (!product) {
      console.error('❌ Product not found!')
      console.error('')
      console.error('Possible causes:')
      console.error('  1. Product ID is incorrect')
      console.error('  2. Storefront token does not have required permissions')
      console.error('  3. Product is not available in the store')
      process.exit(1)
    }

    console.log('✅ Product fetched successfully!')
    console.log('')
    console.log('═══════════════════════════════════════════════════════════')
    console.log('PRODUCT DETAILS:')
    console.log('═══════════════════════════════════════════════════════════')
    console.log('')
    console.log(`ID: ${product.id}`)
    console.log(`Name: ${product.name || 'N/A'}`)
    console.log(`Category: ${product.category || 'N/A'}`)
    console.log(`Type: ${product.type || 'N/A'}`)
    console.log(`Color: ${product.color || 'N/A'}`)
    console.log(`Price: $${product.price || 0}`)
    console.log(`Sizes: ${product.sizes && product.sizes.length > 0 ? product.sizes.join(', ') : 'N/A'}`)
    console.log(`Description Length: ${product.description?.length || 0} characters`)
    console.log(`Images: ${product.images?.length || 0} image(s)`)
    console.log(`⏱️  Fetch Duration: ${duration}ms`)
    console.log('')
    console.log('═══════════════════════════════════════════════════════════')
    console.log('✅ TEST PASSED - Product data fetched successfully!')
    console.log('═══════════════════════════════════════════════════════════')
    console.log('')
    console.log('Full Product Data:')
    console.log(JSON.stringify(product, null, 2))

  } catch (error) {
    console.error('')
    console.error('❌ ERROR: Failed to fetch product')
    console.error('')
    console.error('Error Details:')
    console.error(`  Message: ${error instanceof Error ? error.message : String(error)}`)
    if (error instanceof Error && error.stack) {
      console.error(`  Stack: ${error.stack}`)
    }
    process.exit(1)
  }
}

testProductFetch().catch((error) => {
  console.error('Unhandled error:', error)
  process.exit(1)
})
