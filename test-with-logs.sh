#!/bin/bash

echo "=== Testing Product Fetch with Detailed Output ==="
echo ""

PRODUCT_ID="8252597338298"
SHOP_DOMAIN="vt-test-5.myshopify.com"
BACKEND_URL="https://vton-1-hqmc.onrender.com"

PAYLOAD=$(cat <<JSON
{
  "message": "Tell me more about this product",
  "pageContext": "product",
  "shop": "$SHOP_DOMAIN",
  "currentProduct": {
    "id": "$PRODUCT_ID",
    "name": "",
    "category": "snowboard",
    "type": "snowboard",
    "url": "https://vt-test-5.myshopify.com/products/the-collection-snowboard-hydrogen"
  }
}
JSON
)

echo "1. Testing with minimal product data (what widget sends)"
echo "--------------------------------------------------------"
echo "Product ID: $PRODUCT_ID"
echo "Expected: Backend should fetch complete product details from Shopify"
echo ""

RESPONSE=$(curl -s -X POST "$BACKEND_URL/api/chat" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD")

echo "Response:"
echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
echo ""

# Extract message
MESSAGE=$(echo "$RESPONSE" | jq -r '.message' 2>/dev/null)
if [ "$MESSAGE" != "null" ] && [ -n "$MESSAGE" ]; then
  echo "Chatbot Response:"
  echo "$MESSAGE"
  echo ""
  
  # Check if response mentions the product
  if echo "$MESSAGE" | grep -qi "snowboard\|product\|item"; then
    echo "✅ Response mentions product-related terms"
  else
    echo "⚠️ Response doesn't seem product-specific"
  fi
else
  echo "❌ No message in response"
fi

echo ""
echo "2. Checking if product was fetched (would be in logs)"
echo "-----------------------------------------------------"
echo "Note: Check Render dashboard logs for:"
echo "  - 'Fetching complete product details from Shopify'"
echo "  - 'Successfully fetched complete product details'"
echo "  - Product name, description, images count"
