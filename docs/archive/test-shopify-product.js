#!/usr/bin/env node

/**
 * Test script for Shopify Product Adapter
 * Tests fetching product details for product ID 8252597338298
 */

const { ShopifyProductAdapter } = require('./lib/closelook-plugin/adapters/shopify-adapter.ts')

// Configuration
const SHOP_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN || 'vt-test-5.myshopify.com'
const ACCESS_TOKEN = process.env.SHOPIFY_STOREFRONT_TOKEN
const PRODUCT_ID = '8252597338298'

async function testProductFetch() {
  console.log('🧪 Testing Shopify Product Adapter\n')
  console.log('Configuration:')
  console.log(`  Shop Domain: ${SHOP_DOMAIN}`)
  console.log(`  Access Token: ${ACCESS_TOKEN ? '***' + ACCESS_TOKEN.slice(-4) : 'NOT SET'}`)
  console.log(`  Product ID: ${PRODUCT_ID}\n`)

  if (!ACCESS_TOKEN) {
    console.error('❌ ERROR: SHOPIFY_STOREFRONT_TOKEN environment variable is not set!')
    console.error('   Please set it in your .env file or export it:')
    console.error('   export SHOPIFY_STOREFRONT_TOKEN=your_token_here')
    process.exit(1)
  }

  try {
    // Initialize adapter
    console.log('📦 Initializing Shopify Product Adapter...')
    const adapter = new ShopifyProductAdapter(SHOP_DOMAIN, ACCESS_TOKEN)

    // Convert product ID to GID format (as done in the chat API route)
    let productId = PRODUCT_ID
    if (productId && !productId.startsWith('gid://')) {
      const numericId = productId.replace(/^gid:\/\/shopify\/Product\//, '').replace(/[^0-9]/g, '')
      if (numericId) {
        productId = `gid://shopify/Product/${numericId}`
      }
    }

    console.log(`\n🔍 Fetching product details...`)
    console.log(`   Original ID: ${PRODUCT_ID}`)
    console.log(`   Converted ID: ${productId}\n`)

    // Fetch product
    const startTime = Date.now()
    const product = await adapter.getProduct(productId)
    const duration = Date.now() - startTime

    if (!product) {
      console.error('❌ Product not found!')
      console.error('   This could mean:')
      console.error('   - Product ID is incorrect')
      console.error('   - Access token does not have permission')
      console.error('   - Product is not available in the store')
      process.exit(1)
    }

    console.log('✅ Product fetched successfully!\n')
    console.log('═══════════════════════════════════════════════════════════')
    console.log('PRODUCT DETAILS:')
    console.log('═══════════════════════════════════════════════════════════\n')

    console.log(`ID: ${product.id}`)
    console.log(`Name: ${product.name || 'N/A'}`)
    console.log(`Category: ${product.category || 'N/A'}`)
    console.log(`Type: ${product.type || 'N/A'}`)
    console.log(`Color: ${product.color || 'N/A'}`)
    console.log(`Price: $${product.price || 0}`)
    console.log(`Sizes: ${product.sizes && product.sizes.length > 0 ? product.sizes.join(', ') : 'N/A'}`)
    console.log(`Description: ${product.description ? (product.description.substring(0, 200) + (product.description.length > 200 ? '...' : '')) : 'N/A'}`)
    console.log(`Description Length: ${product.description?.length || 0} characters`)
    console.log(`Images: ${product.images?.length || 0} image(s)`)
    
    if (product.images && product.images.length > 0) {
      console.log('\nImage URLs:')
      product.images.slice(0, 3).forEach((url, index) => {
        console.log(`  ${index + 1}. ${url}`)
      })
      if (product.images.length > 3) {
        console.log(`  ... and ${product.images.length - 3} more`)
      }
    }

    if (product.metadata) {
      console.log('\nMetadata:')
      if (product.metadata.vendor) console.log(`  Vendor: ${product.metadata.vendor}`)
      if (product.metadata.handle) console.log(`  Handle: ${product.metadata.handle}`)
      if (product.metadata.tags && product.metadata.tags.length > 0) {
        console.log(`  Tags: ${product.metadata.tags.join(', ')}`)
      }
      if (product.metadata.collections && product.metadata.collections.length > 0) {
        console.log(`  Collections: ${product.metadata.collections.map((c: any) => c.title).join(', ')}`)
      }
    }

    console.log(`\n⏱️  Fetch Duration: ${duration}ms`)
    console.log('\n═══════════════════════════════════════════════════════════')
    console.log('✅ TEST PASSED - Product data fetched successfully!')
    console.log('═══════════════════════════════════════════════════════════\n')

    // Also output as JSON for easy inspection
    console.log('\n📄 Full JSON Response:')
    console.log(JSON.stringify(product, null, 2))

  } catch (error) {
    console.error('\n❌ ERROR: Failed to fetch product\n')
    console.error('Error Details:')
    console.error(`  Message: ${error.message}`)
    console.error(`  Stack: ${error.stack}`)
    
    if (error.message.includes('401') || error.message.includes('Unauthorized')) {
      console.error('\n⚠️  This looks like an authentication error.')
      console.error('   Please check your SHOPIFY_STOREFRONT_TOKEN.')
    } else if (error.message.includes('403') || error.message.includes('Forbidden')) {
      console.error('\n⚠️  This looks like a permission error.')
      console.error('   The token may not have access to read products.')
    } else if (error.message.includes('404') || error.message.includes('Not Found')) {
      console.error('\n⚠️  Product or endpoint not found.')
      console.error('   Please verify the product ID and shop domain.')
    }
    
    process.exit(1)
  }
}

// Run the test
testProductFetch().catch((error) => {
  console.error('Unhandled error:', error)
  process.exit(1)
})
