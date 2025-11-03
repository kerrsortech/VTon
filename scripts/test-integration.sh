#!/bin/bash

# Automated Integration Testing Script
# Tests all critical Shopify integration points

set -e  # Exit on error

echo "🧪 Integration Testing Script"
echo "================================"
echo ""

BACKEND_URL="${1:-https://vton-1-hqmc.onrender.com}"
echo "🎯 Testing backend: $BACKEND_URL"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

TESTS_PASSED=0
TESTS_FAILED=0

# Test function
run_test() {
    local test_name="$1"
    local test_command="$2"
    
    echo "▶️  Testing: $test_name"
    
    if eval "$test_command"; then
        echo -e "${GREEN}✅ PASS${NC}: $test_name"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "${RED}❌ FAIL${NC}: $test_name"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
    echo ""
}

# Test 1: Health Endpoint
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🏥 Backend Health Tests"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

run_test "Health endpoint responds" \
    "curl -f -s $BACKEND_URL/api/health > /dev/null"

run_test "Health endpoint returns JSON" \
    "curl -s $BACKEND_URL/api/health | jq . > /dev/null"

run_test "Health status is 'healthy'" \
    "curl -s $BACKEND_URL/api/health | jq -e '.status == \"healthy\"' > /dev/null"

run_test "Database service is healthy" \
    "curl -s $BACKEND_URL/api/health | jq -e '.services.database == \"healthy\"' > /dev/null"

# Test 2: CORS Headers
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🌐 CORS Configuration Tests"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

run_test "CORS allows myshopify.com domains" \
    "curl -s -H 'Origin: https://test.myshopify.com' -H 'Access-Control-Request-Method: POST' -X OPTIONS $BACKEND_URL/api/chat | grep -i 'access-control-allow-origin' > /dev/null"

run_test "CORS allows custom HTTPS domains" \
    "curl -s -H 'Origin: https://www.example.com' -H 'Access-Control-Request-Method: POST' -X OPTIONS $BACKEND_URL/api/chat | grep -i 'access-control-allow-origin' > /dev/null"

# Test 3: API Endpoints
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔌 API Endpoint Tests"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

run_test "Chat API endpoint exists" \
    "curl -s -X OPTIONS $BACKEND_URL/api/chat | grep -i 'access-control' > /dev/null"

run_test "Try-on API endpoint exists" \
    "curl -s -X OPTIONS $BACKEND_URL/api/try-on | grep -i 'access-control' > /dev/null"

run_test "User images API endpoint exists" \
    "curl -s -X OPTIONS $BACKEND_URL/api/user-images | grep -i 'access-control' > /dev/null"

# Test 4: Database Connection (if DATABASE_URL is set)
if [ ! -z "$DATABASE_URL" ]; then
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🗄️  Database Tests"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    run_test "Database connection works" \
        "psql \"$DATABASE_URL\" -c 'SELECT 1' > /dev/null 2>&1"
    
    run_test "shopify_sessions table exists" \
        "psql \"$DATABASE_URL\" -t -c \"SELECT 1 FROM information_schema.tables WHERE table_name='shopify_sessions'\" | grep -q 1"
    
    run_test "user_images table exists" \
        "psql \"$DATABASE_URL\" -t -c \"SELECT 1 FROM information_schema.tables WHERE table_name='user_images'\" | grep -q 1"
else
    echo -e "${YELLOW}⚠️  Skipping database tests (DATABASE_URL not set)${NC}"
    echo ""
fi

# Test 5: Environment Variables
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔐 Environment Configuration Tests"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if critical env vars are set (on Render)
if [ ! -z "$DATABASE_URL" ]; then
    echo -e "${GREEN}✅${NC} DATABASE_URL is set"
else
    echo -e "${YELLOW}⚠️${NC}  DATABASE_URL is not set"
fi

if [ ! -z "$SHOPIFY_API_KEY" ]; then
    echo -e "${GREEN}✅${NC} SHOPIFY_API_KEY is set"
else
    echo -e "${YELLOW}⚠️${NC}  SHOPIFY_API_KEY is not set"
fi

if [ ! -z "$GOOGLE_GEMINI_API_KEY" ]; then
    echo -e "${GREEN}✅${NC} GOOGLE_GEMINI_API_KEY is set"
else
    echo -e "${YELLOW}⚠️${NC}  GOOGLE_GEMINI_API_KEY is not set"
fi

if [ ! -z "$REPLICATE_API_TOKEN" ]; then
    echo -e "${GREEN}✅${NC} REPLICATE_API_TOKEN is set"
else
    echo -e "${YELLOW}⚠️${NC}  REPLICATE_API_TOKEN is not set"
fi

echo ""

# Test Results Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Test Results Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Tests Passed: $TESTS_PASSED"
echo "Tests Failed: $TESTS_FAILED"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed!${NC}"
    echo ""
    echo "🎉 Your Shopify integration is ready!"
    echo ""
    exit 0
else
    echo -e "${RED}❌ Some tests failed${NC}"
    echo ""
    echo "Please fix the failing tests before deploying to production."
    echo ""
    exit 1
fi

