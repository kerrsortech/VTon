#!/bin/bash

# Test script for Shopify Storefront GraphQL API
# Tests fetching product details for product ID 8252597338298

SHOP_DOMAIN="${SHOPIFY_STORE_DOMAIN:-vt-test-5.myshopify.com}"
ACCESS_TOKEN="${SHOPIFY_STOREFRONT_TOKEN}"
PRODUCT_ID="8252597338298"
API_VERSION="2024-10"

# Convert numeric ID to GID format
GID_PRODUCT_ID="gid://shopify/Product/${PRODUCT_ID}"

echo "🧪 Testing Shopify Storefront GraphQL API"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "Configuration:"
echo "  Shop Domain: ${SHOP_DOMAIN}"
echo "  API Version: ${API_VERSION}"
echo "  Product ID (numeric): ${PRODUCT_ID}"
echo "  Product ID (GID): ${GID_PRODUCT_ID}"
echo "  Access Token: ${ACCESS_TOKEN:0:10}...${ACCESS_TOKEN: -4}"
echo ""

if [ -z "$ACCESS_TOKEN" ]; then
  echo "❌ ERROR: SHOPIFY_STOREFRONT_TOKEN environment variable is not set!"
  echo "   Please set it:"
  echo "   export SHOPIFY_STOREFRONT_TOKEN=your_token_here"
  exit 1
fi

# GraphQL query (same as in shopify-adapter.ts)
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
    
    # Pricing
    priceRange {
      minVariantPrice {
        amount
        currencyCode
      }
      maxVariantPrice {
        amount
        currencyCode
      }
    }
    
    # Images
    images(first: 10) {
      edges {
        node {
          id
          url
          altText
          width
          height
        }
      }
    }
    
    # Variants
    variants(first: 100) {
      edges {
        node {
          id
          title
          sku
          price {
            amount
            currencyCode
          }
          availableForSale
          quantityAvailable
          selectedOptions {
            name
            value
          }
          image {
            url
          }
        }
      }
    }
    
    # Options (Size, Color, etc.)
    options {
      id
      name
      values
    }
    
    # SEO
    seo {
      title
      description
    }
    
    # Availability
    availableForSale
    totalInventory
    
    # Collections
    collections(first: 5) {
      edges {
        node {
          id
          title
          handle
        }
      }
    }
    
    # Metafields
    metafields(first: 10) {
      edges {
        node {
          namespace
          key
          value
        }
      }
    }
  }
}'

# Variables
VARIABLES=$(cat <<EOF
{
  "id": "${GID_PRODUCT_ID}"
}
EOF
)

# Payload
PAYLOAD=$(cat <<EOF
{
  "query": $(echo "$QUERY" | jq -Rs .),
  "variables": $VARIABLES
}
EOF
)

echo "📤 Sending GraphQL request..."
echo ""
echo "Endpoint: https://${SHOP_DOMAIN}/api/${API_VERSION}/graphql.json"
echo ""

# Make the request
RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X POST \
  -H "Content-Type: application/json" \
  -H "X-Shopify-Storefront-Access-Token: ${ACCESS_TOKEN}" \
  -d "$PAYLOAD" \
  "https://${SHOP_DOMAIN}/api/${API_VERSION}/graphql.json")

# Extract HTTP status code (last line)
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
# Extract response body (everything except last line)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "📥 Response Status: ${HTTP_CODE}"
echo ""

if [ "$HTTP_CODE" != "200" ]; then
  echo "❌ ERROR: Request failed with HTTP ${HTTP_CODE}"
  echo ""
  echo "Response Body:"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
  exit 1
fi

# Parse and display response
echo "═══════════════════════════════════════════════════════════"
echo "RESPONSE:"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Check for GraphQL errors
ERRORS=$(echo "$BODY" | jq -r '.errors // [] | length' 2>/dev/null)

if [ "$ERRORS" != "0" ] && [ "$ERRORS" != "null" ] && [ -n "$ERRORS" ]; then
  echo "⚠️  GraphQL Errors Detected:"
  echo "$BODY" | jq '.errors' 2>/dev/null || echo "$BODY"
  echo ""
fi

# Check if product data exists
PRODUCT=$(echo "$BODY" | jq '.data.product' 2>/dev/null)

if [ "$PRODUCT" = "null" ] || [ -z "$PRODUCT" ]; then
  echo "❌ Product not found!"
  echo ""
  echo "Full Response:"
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
echo "FULL RESPONSE (JSON):"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
