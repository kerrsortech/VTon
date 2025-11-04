#!/bin/bash

# Complete test script for Shopify Product API
# Tests product ID: 8252597338298

SHOP_DOMAIN="${SHOPIFY_STORE_DOMAIN:-vt-test-5.myshopify.com}"
ACCESS_TOKEN="${SHOPIFY_STOREFRONT_TOKEN}"
PRODUCT_ID="8252597338298"
API_VERSION="2024-10"
GID_PRODUCT_ID="gid://shopify/Product/${PRODUCT_ID}"

echo "🧪 Testing Shopify Product Fetch API"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "Configuration:"
echo "  Shop Domain: ${SHOP_DOMAIN}"
echo "  API Version: ${API_VERSION}"
echo "  Product ID (numeric): ${PRODUCT_ID}"
echo "  Product ID (GID): ${GID_PRODUCT_ID}"
echo "  Access Token: ${ACCESS_TOKEN:+✅ Set (${#ACCESS_TOKEN} chars)}${ACCESS_TOKEN:-❌ NOT SET}"
echo ""

if [ -z "$ACCESS_TOKEN" ]; then
  echo "❌ ERROR: SHOPIFY_STOREFRONT_TOKEN is required!"
  echo ""
  echo "Options:"
  echo "  1. If you have a token, set it:"
  echo "     export SHOPIFY_STOREFRONT_TOKEN=your_token"
  echo ""
  echo "  2. If you need to create one, run:"
  echo "     ./test-create-storefront-token.sh"
  echo ""
  echo "  3. Or test against your deployed API on Render (which should have the token)"
  exit 1
fi

echo "📤 Sending GraphQL request..."
echo ""

# Read the GraphQL query from shopify-adapter.ts structure
QUERY='query getProduct($id: ID!) {
  product(id: $id) {
    id
    title
    description
    descriptionHtml
    handle
    productType
    vendor
    tags
    priceRange {
      minVariantPrice { amount currencyCode }
      maxVariantPrice { amount currencyCode }
    }
    images(first: 10) {
      edges {
        node {
          id url altText width height
        }
      }
    }
    variants(first: 100) {
      edges {
        node {
          id title sku
          price { amount currencyCode }
          availableForSale
          quantityAvailable
          selectedOptions { name value }
          image { url }
        }
      }
    }
    options { id name values }
    seo { title description }
    availableForSale
    totalInventory
    collections(first: 5) {
      edges {
        node {
          id title handle
        }
      }
    }
    metafields(first: 10) {
      edges {
        node {
          namespace key value
        }
      }
    }
  }
}'

# Create payload
PAYLOAD=$(cat <<JSON
{
  "query": "$(echo "$QUERY" | sed 's/"/\\"/g' | tr '\n' ' ')",
  "variables": {
    "id": "${GID_PRODUCT_ID}"
  }
}
JSON
)

echo "Endpoint: https://${SHOP_DOMAIN}/api/${API_VERSION}/graphql.json"
echo ""
echo "Payload:"
echo "$PAYLOAD" | jq '.' 2>/dev/null || echo "$PAYLOAD"
echo ""

# Make request
RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X POST \
  -H "Content-Type: application/json" \
  -H "X-Shopify-Storefront-Access-Token: ${ACCESS_TOKEN}" \
  -d "$PAYLOAD" \
  "https://${SHOP_DOMAIN}/api/${API_VERSION}/graphql.json")

HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "═══════════════════════════════════════════════════════════"
echo "RESPONSE (HTTP ${HTTP_CODE}):"
echo "═══════════════════════════════════════════════════════════"
echo ""

if [ "$HTTP_CODE" != "200" ]; then
  echo "❌ ERROR: Request failed!"
  echo ""
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
  exit 1
fi

# Check for errors
ERRORS=$(echo "$BODY" | jq -r '.errors // [] | length' 2>/dev/null)
if [ "$ERRORS" != "0" ] && [ "$ERRORS" != "null" ] && [ -n "$ERRORS" ]; then
  echo "⚠️  GraphQL Errors:"
  echo "$BODY" | jq '.errors' 2>/dev/null
  echo ""
fi

# Check if product exists
PRODUCT=$(echo "$BODY" | jq -r '.data.product' 2>/dev/null)
if [ "$PRODUCT" = "null" ] || [ -z "$PRODUCT" ]; then
  echo "❌ Product not found!"
  echo ""
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
  exit 1
fi

echo "✅ Product Found!"
echo ""
echo "Product Summary:"
echo "$BODY" | jq '{
  id: .data.product.id,
  title: .data.product.title,
  productType: .data.product.productType,
  vendor: .data.product.vendor,
  handle: .data.product.handle,
  price: .data.product.priceRange.minVariantPrice.amount,
  currency: .data.product.priceRange.minVariantPrice.currencyCode,
  imageCount: (.data.product.images.edges | length),
  variantCount: (.data.product.variants.edges | length),
  availableForSale: .data.product.availableForSale,
  hasDescription: (.data.product.description != null),
  descriptionLength: (.data.product.description | length),
  tags: .data.product.tags,
  collections: [.data.product.collections.edges[].node.title]
}' 2>/dev/null

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "FULL RESPONSE:"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
