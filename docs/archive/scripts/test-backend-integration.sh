#!/bin/bash

# Comprehensive Backend Integration Test
# Tests Redis, context storage, product enrichment, and API responses

set -e

BACKEND_URL="${1:-https://your-backend.vercel.app}"
SHOP_DOMAIN="${2:-yourstore.myshopify.com}"
TEST_PRODUCT_ID="${3:-8234567890}"

echo "🧪 Backend Integration Test Suite"
echo "=================================="
echo "Backend URL: $BACKEND_URL"
echo "Shop Domain: $SHOP_DOMAIN"
echo "Test Product ID: $TEST_PRODUCT_ID"
echo ""

PASSED=0
FAILED=0

# Test function
test_api() {
  local test_name="$1"
  local expected_status="$2"
  local payload="$3"
  
  echo "Testing: $test_name"
  
  RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BACKEND_URL/api/chat" \
    -H "Content-Type: application/json" \
    -d "$payload" 2>&1)
  
  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
  BODY=$(echo "$RESPONSE" | sed '$d')
  
  if [ "$HTTP_CODE" = "$expected_status" ]; then
    echo "✅ $test_name - Status: $HTTP_CODE"
    PASSED=$((PASSED + 1))
    
    # Try to parse JSON response
    if command -v jq &> /dev/null; then
      echo "   Response:"
      echo "$BODY" | jq '.' 2>/dev/null | head -20 || echo "$BODY" | head -5
    fi
  else
    echo "❌ $test_name - Expected: $expected_status, Got: $HTTP_CODE"
    echo "   Response: $BODY"
    FAILED=$((FAILED + 1))
  fi
  echo ""
}

# Test 1: Basic chat with product context
SESSION_ID="test_session_$(date +%s)_1"
PAYLOAD1=$(cat <<EOF
{
  "session_id": "$SESSION_ID",
  "message": "What sizes are available?",
  "context": {
    "page_type": "product",
    "current_product": {
      "id": "$TEST_PRODUCT_ID",
      "handle": "test-product"
    },
    "shop_domain": "$SHOP_DOMAIN",
    "customer": {
      "logged_in": false,
      "id": null
    },
    "cart": null
  },
  "shop_domain": "$SHOP_DOMAIN"
}
EOF
)

test_api "Chat with product context" "200" "$PAYLOAD1"

# Test 2: Chat without product context (homepage)
SESSION_ID="test_session_$(date +%s)_2"
PAYLOAD2=$(cat <<EOF
{
  "session_id": "$SESSION_ID",
  "message": "What products do you have?",
  "context": {
    "page_type": "home",
    "current_product": null,
    "shop_domain": "$SHOP_DOMAIN",
    "customer": {
      "logged_in": false,
      "id": null
    },
    "cart": null
  },
  "shop_domain": "$SHOP_DOMAIN"
}
EOF
)

test_api "Chat without product context" "200" "$PAYLOAD2"

# Test 3: Chat with customer context
SESSION_ID="test_session_$(date +%s)_3"
PAYLOAD3=$(cat <<EOF
{
  "session_id": "$SESSION_ID",
  "message": "Where is my order?",
  "context": {
    "page_type": "account",
    "current_product": null,
    "shop_domain": "$SHOP_DOMAIN",
    "customer": {
      "logged_in": true,
      "id": "12345"
    },
    "cart": null
  },
  "shop_domain": "$SHOP_DOMAIN"
}
EOF
)

test_api "Chat with customer context" "200" "$PAYLOAD3"

# Test 4: Chat with cart context
SESSION_ID="test_session_$(date +%s)_4"
PAYLOAD4=$(cat <<EOF
{
  "session_id": "$SESSION_ID",
  "message": "What's in my cart?",
  "context": {
    "page_type": "cart",
    "current_product": null,
    "shop_domain": "$SHOP_DOMAIN",
    "customer": {
      "logged_in": false,
      "id": null
    },
    "cart": {
      "item_count": 2,
      "total_price": 5999,
      "currency": "USD",
      "items": [
        {
          "product_id": "$TEST_PRODUCT_ID",
          "title": "Test Product",
          "quantity": 1,
          "price": 2999
        }
      ]
    }
  },
  "shop_domain": "$SHOP_DOMAIN"
}
EOF
)

test_api "Chat with cart context" "200" "$PAYLOAD4"

# Test 5: Invalid request (missing message)
SESSION_ID="test_session_$(date +%s)_5"
PAYLOAD5=$(cat <<EOF
{
  "session_id": "$SESSION_ID",
  "context": {
    "page_type": "product",
    "current_product": {"id": "$TEST_PRODUCT_ID"},
    "shop_domain": "$SHOP_DOMAIN"
  }
}
EOF
)

test_api "Invalid request (missing message)" "400" "$PAYLOAD5"

# Test 6: Context persistence (same session)
SESSION_ID="test_session_$(date +%s)_6"

# First message
PAYLOAD6A=$(cat <<EOF
{
  "session_id": "$SESSION_ID",
  "message": "What sizes are available?",
  "context": {
    "page_type": "product",
    "current_product": {"id": "$TEST_PRODUCT_ID"},
    "shop_domain": "$SHOP_DOMAIN"
  },
  "shop_domain": "$SHOP_DOMAIN"
}
EOF
)

test_api "First message (context storage)" "200" "$PAYLOAD6A"

sleep 1

# Second message (should use stored context)
PAYLOAD6B=$(cat <<EOF
{
  "session_id": "$SESSION_ID",
  "message": "What about colors?",
  "context": {
    "page_type": "product",
    "current_product": {"id": "$TEST_PRODUCT_ID"},
    "shop_domain": "$SHOP_DOMAIN"
  },
  "shop_domain": "$SHOP_DOMAIN"
}
EOF
)

test_api "Second message (context retrieval)" "200" "$PAYLOAD6B"

# Summary
echo "=================================="
echo "Test Results:"
echo "  ✅ Passed: $PASSED"
echo "  ❌ Failed: $FAILED"
echo "=================================="

if [ $FAILED -eq 0 ]; then
  echo "✅ All backend tests passed!"
  exit 0
else
  echo "❌ Some tests failed"
  exit 1
fi

