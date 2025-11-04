#!/bin/bash

# Script to create a Storefront Access Token via Shopify Admin API
# Usage: ./test-create-storefront-token.sh

SHOP_DOMAIN="${SHOPIFY_STORE_DOMAIN:-vt-test-5.myshopify.com}"
ADMIN_TOKEN="${SHOPIFY_ADMIN_TOKEN}"
API_VERSION="2025-10"

echo "🔑 Creating Shopify Storefront Access Token"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "Configuration:"
echo "  Shop Domain: ${SHOP_DOMAIN}"
echo "  API Version: ${API_VERSION}"
echo "  Admin Token: ${ADMIN_TOKEN:0:10}...${ADMIN_TOKEN: -4}"
echo ""

if [ -z "$ADMIN_TOKEN" ]; then
  echo "❌ ERROR: SHOPIFY_ADMIN_TOKEN environment variable is not set!"
  echo ""
  echo "To create a Storefront Access Token, you need:"
  echo "  1. A Shopify Admin API access token"
  echo "  2. Set it as: export SHOPIFY_ADMIN_TOKEN=your_admin_token"
  echo ""
  echo "You can get an Admin API token from:"
  echo "  - Shopify Admin > Settings > Apps and sales channels > Develop apps"
  echo "  - Or use Shopify CLI"
  echo ""
  exit 1
fi

# GraphQL mutation to create Storefront Access Token
# Matches official Shopify documentation format
MUTATION='mutation StorefrontAccessTokenCreate($input: StorefrontAccessTokenInput!) {
  storefrontAccessTokenCreate(input: $input) {
    userErrors {
      field
      message
    }
    shop {
      id
    }
    storefrontAccessToken {
      accessScopes {
        handle
      }
      accessToken
      title
      id
      createdAt
    }
  }
}'

VARIABLES='{
  "input": {
    "title": "Closelook Storefront Token"
  }
}'

PAYLOAD=$(cat <<EOF
{
  "query": $(echo "$MUTATION" | jq -Rs .),
  "variables": $VARIABLES
}
EOF
)

echo "📤 Sending request to create Storefront Access Token..."
echo ""
echo "Endpoint: https://${SHOP_DOMAIN}/admin/api/${API_VERSION}/graphql.json"
echo ""

# Make the request
RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X POST \
  -H "Content-Type: application/json" \
  -H "X-Shopify-Access-Token: ${ADMIN_TOKEN}" \
  -d "$PAYLOAD" \
  "https://${SHOP_DOMAIN}/admin/api/${API_VERSION}/graphql.json")

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

# Check for GraphQL errors
ERRORS=$(echo "$BODY" | jq -r '.data.storefrontAccessTokenCreate.userErrors // [] | length' 2>/dev/null)

if [ "$ERRORS" != "0" ] && [ "$ERRORS" != "null" ] && [ -n "$ERRORS" ]; then
  echo "⚠️  GraphQL Errors Detected:"
  echo "$BODY" | jq '.data.storefrontAccessTokenCreate.userErrors' 2>/dev/null || echo "$BODY"
  echo ""
fi

# Extract token
TOKEN=$(echo "$BODY" | jq -r '.data.storefrontAccessTokenCreate.storefrontAccessToken.accessToken' 2>/dev/null)

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo "❌ Failed to create Storefront Access Token"
  echo ""
  echo "Full Response:"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
  exit 1
fi

echo "✅ Storefront Access Token created successfully!"
echo ""
echo "═══════════════════════════════════════════════════════════"
echo "TOKEN DETAILS:"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "$BODY" | jq '.data.storefrontAccessTokenCreate.storefrontAccessToken' 2>/dev/null
echo ""
echo "═══════════════════════════════════════════════════════════"
echo "🔑 YOUR STOREFRONT ACCESS TOKEN:"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "$TOKEN"
echo ""
echo "⚠️  IMPORTANT: Save this token securely!"
echo ""
echo "To use it, set it as an environment variable:"
echo "  export SHOPIFY_STOREFRONT_TOKEN=\"$TOKEN\""
echo ""
echo "Or add it to your .env.local file:"
echo "  SHOPIFY_STOREFRONT_TOKEN=$TOKEN"
echo ""

