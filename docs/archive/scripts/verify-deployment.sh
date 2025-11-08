#!/bin/bash

# Deployment Verification Script
# Checks if deployment was successful and all services are running

set -e

echo "🔍 Deployment Verification Script"
echo "================================"
echo ""

BACKEND_URL="${1:-https://vton-1-hqmc.onrender.com}"
echo "🎯 Verifying deployment: $BACKEND_URL"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

CHECKS_PASSED=0
CHECKS_FAILED=0

check() {
    local check_name="$1"
    local check_command="$2"
    
    echo -n "Checking: $check_name... "
    
    if eval "$check_command" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ OK${NC}"
        CHECKS_PASSED=$((CHECKS_PASSED + 1))
        return 0
    else
        echo -e "${RED}❌ FAILED${NC}"
        CHECKS_FAILED=$((CHECKS_FAILED + 1))
        return 1
    fi
}

# 1. Backend Reachability
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🌐 Backend Reachability"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

check "Backend responds to HTTP requests" \
    "curl -f -s --max-time 10 $BACKEND_URL/api/health"

check "Health endpoint returns 200" \
    "curl -f -s -o /dev/null -w '%{http_code}' $BACKEND_URL/api/health | grep -q 200"

echo ""

# 2. Service Health
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🏥 Service Health"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

HEALTH_DATA=$(curl -s $BACKEND_URL/api/health)

check "Overall status is healthy" \
    "echo '$HEALTH_DATA' | jq -e '.status == \"healthy\"'"

check "Database is connected" \
    "echo '$HEALTH_DATA' | jq -e '.services.database == \"healthy\"'"

check "Gemini API is configured" \
    "echo '$HEALTH_DATA' | jq -e '.services.gemini == \"configured\"'"

check "Replicate API is configured" \
    "echo '$HEALTH_DATA' | jq -e '.services.replicate == \"configured\" or .services.replicate == \"not_configured\"'"

echo ""

# 3. API Endpoints
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔌 API Endpoints"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

check "Chat API endpoint accessible" \
    "curl -f -s -X OPTIONS $BACKEND_URL/api/chat"

check "Try-on API endpoint accessible" \
    "curl -f -s -X OPTIONS $BACKEND_URL/api/try-on"

check "User images API endpoint accessible" \
    "curl -f -s -X OPTIONS $BACKEND_URL/api/user-images"

check "Products API endpoint accessible" \
    "curl -f -s -X OPTIONS $BACKEND_URL/api/products"

echo ""

# 4. CORS Configuration
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🌐 CORS Configuration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

check "CORS headers present (myshopify.com)" \
    "curl -s -H 'Origin: https://test.myshopify.com' -X OPTIONS $BACKEND_URL/api/chat | grep -i 'access-control-allow-origin'"

check "CORS headers present (custom domain)" \
    "curl -s -H 'Origin: https://www.example.com' -X OPTIONS $BACKEND_URL/api/chat | grep -i 'access-control-allow-origin'"

echo ""

# 5. Database (if DATABASE_URL is set)
if [ ! -z "$DATABASE_URL" ]; then
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🗄️  Database"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    check "Database connection works" \
        "psql \"$DATABASE_URL\" -c 'SELECT 1'"
    
    check "shopify_sessions table exists" \
        "psql \"$DATABASE_URL\" -t -c \"SELECT 1 FROM information_schema.tables WHERE table_name='shopify_sessions'\" | grep -q 1"
    
    check "Session table has required columns" \
        "psql \"$DATABASE_URL\" -t -c \"SELECT column_name FROM information_schema.columns WHERE table_name='shopify_sessions' AND column_name IN ('shop', 'access_token', 'storefront_token')\" | wc -l | grep -q 3"
    
    echo ""
fi

# 6. Extension Deployment (manual check)
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 Shopify Extension"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "⚠️  Manual verification required:"
echo "  1. Go to Shopify Partner Dashboard"
echo "  2. Check extension version is deployed"
echo "  3. Verify extension appears in store theme editor"
echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Verification Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Checks Passed: $CHECKS_PASSED"
echo "Checks Failed: $CHECKS_FAILED"
echo ""

if [ $CHECKS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ Deployment verification successful!${NC}"
    echo ""
    echo "🎉 All systems operational"
    echo ""
    echo "Next steps:"
    echo "  1. Test on development store"
    echo "  2. Verify OAuth flow works"
    echo "  3. Test all features"
    echo "  4. Monitor logs for 24 hours"
    echo ""
    exit 0
else
    echo -e "${RED}❌ Deployment verification failed${NC}"
    echo ""
    echo "Please fix the failing checks before proceeding."
    echo ""
    echo "Debug steps:"
    echo "  1. Check Render.com logs"
    echo "  2. Verify environment variables"
    echo "  3. Check database connection"
    echo "  4. Review CORS configuration"
    echo ""
    exit 1
fi

