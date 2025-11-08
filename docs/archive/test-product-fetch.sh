#!/bin/bash

echo "Testing Shopify Product Fetch via Chat API"
echo "==========================================="
echo ""

# Product details from widget
PRODUCT_ID="8252597338298"
SHOP_DOMAIN="vt-test-5.myshopify.com"
PRODUCT_URL="https://vt-test-5.myshopify.com/products/the-collection-snowboard-hydrogen?variant=45287583711418"

# Backend URL
BACKEND_URL="https://vton-1-hqmc.onrender.com"

echo "Product ID: $PRODUCT_ID"
echo "Shop Domain: $SHOP_DOMAIN"
echo "Backend URL: $BACKEND_URL"
echo ""

# Test payload - simulates what widget sends
PAYLOAD=$(cat <<JSON
{
  "message": "Tell me more about this product",
  "conversationHistory": [],
  "pageContext": "product",
  "shop": "$SHOP_DOMAIN",
  "currentProduct": {
    "id": "$PRODUCT_ID",
    "name": "",
    "category": "snowboard",
    "type": "snowboard",
    "color": "",
    "description": "",
    "images": [],
    "price": 0,
    "sizes": [],
    "url": "$PRODUCT_URL"
  }
}
JSON
)

echo "Request Payload:"
echo "$PAYLOAD" | jq '.' 2>/dev/null || echo "$PAYLOAD"
echo ""
echo "Making API call..."
echo ""

# Make API call
curl -X POST "$BACKEND_URL/api/chat" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD" \
  -w "\n\nHTTP Status: %{http_code}\n" \
  2>&1 | head -100

echo ""
echo "Test complete!"
