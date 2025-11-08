#!/bin/bash

# Test Backend API with Context
# Usage: ./scripts/test-backend-api.sh <backend-url> <shop-domain> <product-id>

BACKEND_URL="${1:-https://your-backend.vercel.app}"
SHOP_DOMAIN="${2:-yourstore.myshopify.com}"
PRODUCT_ID="${3:-8234567890}"

echo "🧪 Testing Backend API with Context..."
echo "Backend URL: $BACKEND_URL"
echo "Shop Domain: $SHOP_DOMAIN"
echo "Product ID: $PRODUCT_ID"
echo ""

# Test 1: Basic chat request with context
echo "Test 1: Chat request with product context"
RESPONSE=$(curl -s -X POST "$BACKEND_URL/api/chat" \
  -H "Content-Type: application/json" \
  -d "{
    \"session_id\": \"test_session_$(date +%s)\",
    \"message\": \"What sizes are available?\",
    \"context\": {
      \"page_type\": \"product\",
      \"current_product\": {
        \"id\": \"$PRODUCT_ID\",
        \"handle\": \"test-product\"
      },
      \"shop_domain\": \"$SHOP_DOMAIN\",
      \"customer\": {
        \"logged_in\": false,
        \"id\": null
      },
      \"cart\": null
    },
    \"shop_domain\": \"$SHOP_DOMAIN\"
  }")

if [ $? -eq 0 ]; then
  echo "✅ Request successful"
  echo "Response:"
  echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
else
  echo "❌ Request failed"
fi

echo ""
echo "Test 2: Chat request without product context (homepage)"
RESPONSE2=$(curl -s -X POST "$BACKEND_URL/api/chat" \
  -H "Content-Type: application/json" \
  -d "{
    \"session_id\": \"test_session_$(date +%s)\",
    \"message\": \"What products do you have?\",
    \"context\": {
      \"page_type\": \"home\",
      \"current_product\": null,
      \"shop_domain\": \"$SHOP_DOMAIN\",
      \"customer\": {
        \"logged_in\": false,
        \"id\": null
      },
      \"cart\": null
    },
    \"shop_domain\": \"$SHOP_DOMAIN\"
  }")

if [ $? -eq 0 ]; then
  echo "✅ Request successful"
  echo "Response:"
  echo "$RESPONSE2" | jq '.' 2>/dev/null || echo "$RESPONSE2"
else
  echo "❌ Request failed"
fi

echo ""
echo "✅ Backend API test complete!"

