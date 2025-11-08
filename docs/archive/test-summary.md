# Shopify Product API Test Summary

## ✅ What's Been Done

1. **Fixed API Version**: Updated Shopify adapter from `2024-01` to `2024-10`
2. **Updated Token Creation Script**: Matches official Shopify documentation format
3. **Created Test Scripts**: Ready to test product fetch with ID `8252597338298`

## 📋 Test Scripts Available

### 1. `test-create-storefront-token.sh`
Creates a Storefront Access Token using the Admin API (matches official docs)

**Usage:**
```bash
export SHOPIFY_ADMIN_TOKEN=your_admin_token
./test-create-storefront-token.sh
```

### 2. `test-product-api.sh`
Tests fetching product details for product ID `8252597338298`

**Usage:**
```bash
export SHOPIFY_STOREFRONT_TOKEN=your_storefront_token
./test-product-api.sh
```

## 📤 Product API Payload Structure

**Endpoint:** `https://vt-test-5.myshopify.com/api/2024-10/graphql.json`

**Headers:**
- `Content-Type: application/json`
- `X-Shopify-Storefront-Access-Token: [YOUR_TOKEN]`

**Product ID Conversion:**
- Numeric ID: `8252597338298`
- GID Format: `gid://shopify/Product/8252597338298`

**GraphQL Query:**
- Fetches: id, title, description, descriptionHtml, handle, productType, vendor, tags
- Pricing: priceRange (min/max variant prices)
- Images: up to 10 images with full details
- Variants: up to 100 variants with pricing, availability, options
- Options: Size, Color, etc.
- SEO: title and description
- Collections: up to 5 collections
- Metafields: up to 10 metafields

## 🧪 To Test Now

**Option 1: If you have a Storefront token:**
```bash
export SHOPIFY_STOREFRONT_TOKEN=your_token
./test-product-api.sh
```

**Option 2: Create a token first:**
```bash
export SHOPIFY_ADMIN_TOKEN=your_admin_token
./test-create-storefront-token.sh
# Then use the token it outputs
```

**Option 3: Test against deployed API**
If your Render deployment has `SHOPIFY_STOREFRONT_TOKEN` configured, you can test the `/api/chat` endpoint which internally uses the Shopify adapter.
