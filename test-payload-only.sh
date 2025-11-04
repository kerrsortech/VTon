#!/bin/bash
# Shows the exact GraphQL payload that will be sent

PRODUCT_ID="8252597338298"
GID_PRODUCT_ID="gid://shopify/Product/${PRODUCT_ID}"
API_VERSION="2024-10"
SHOP_DOMAIN="vt-test-5.myshopify.com"

echo "📋 GraphQL Payload Structure"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "Endpoint: https://${SHOP_DOMAIN}/api/${API_VERSION}/graphql.json"
echo ""
echo "Headers:"
echo "  Content-Type: application/json"
echo "  X-Shopify-Storefront-Access-Token: [YOUR_TOKEN]"
echo ""
echo "Request Body (variables):"
cat <<JSON
{
  "query": "query getProduct(\$id: ID!) { ... }",
  "variables": {
    "id": "${GID_PRODUCT_ID}"
  }
}
JSON

echo ""
echo "Product ID Conversion:"
echo "  Numeric ID: ${PRODUCT_ID}"
echo "  GID Format: ${GID_PRODUCT_ID}"
echo ""
