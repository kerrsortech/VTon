# Shopify Extension - Complete Feature Implementation Todo List

## 📋 Overview
This document outlines ALL features from the original demo site that must be implemented in the Shopify extension, along with technical approach for Shopify data integration.

## 🔍 Technical Evaluation: Shopify Data Access

### Current Approach (Recommended ✅)
**Using Shopify Admin API (Server-Side)**
- ✅ **Security**: API tokens never exposed to client
- ✅ **Full Access**: Complete access to orders, customers, products, policies
- ✅ **Performance**: Server-side caching possible
- ✅ **Scalability**: Handles large catalogs efficiently

**How it works:**
1. Extension passes `shop` domain and `customerInternal` to backend
2. Backend fetches session from database using shop domain
3. Backend uses Shopify Admin API (GraphQL) to fetch:
   - Customer orders
   - Product catalog
   - Store policies
   - Customer info
4. Backend passes data to chatbot API

### Alternative: Shopify AJAX API (Client-Side)
**Limitations:**
- ❌ **No Order History**: Cannot fetch customer orders (requires authentication)
- ❌ **No Customer Data**: Cannot get customer info (requires authentication)
- ❌ **No Store Policies**: Cannot fetch policies (Admin API only)
- ✅ **Product Catalog**: Can fetch products (public endpoint)
- ✅ **Current Product**: Can detect from page context

### Conclusion
**Keep current server-side approach** - It's the only way to access order history, customer data, and store policies. Client-side can only access public product data.

---

## ✅ Complete Feature Checklist

### 🎨 UI/UX Features

#### 1. Chatbot Button & Panel
- [x] Glassmorphic button with animated gradient border (chatbot-shine)
- [x] First-click state with special animation
- [x] Toggle button states (open/close)
- [x] Chat panel with material bounce animation
- [x] White theme only (no dark mode)
- [x] Animated gradient blob in header
- [x] Product info display in header (when on product page)
- [x] Close button functionality

#### 2. Chat Interface
- [x] Message bubbles (user/assistant styling)
- [x] Auto-scroll to bottom on new messages
- [ ] Context-aware prompt templates (home/product/other)
- [x] Loading indicators during API calls
- [x] Error messages with user-friendly text
- [x] Input field with send button
- [x] Enter key to send message

#### 3. Product Features
- [x] Product recommendations with images and prices
- [x] Clickable product recommendation cards
- [x] Product info display in header
- [x] Try-on button integrated in chat interface
- [x] Try-on button disabled on non-product pages

#### 4. Try-On Features
- [x] Upload dialog with dual photo sections (full body/portrait)
- [x] Drag-and-drop image upload
- [x] Live image preview
- [x] Remove image functionality
- [x] Privacy notice in upload dialog
- [x] Check for saved user images before try-on
- [x] Upload dialog opens if no saved images
- [x] Fetch product image from Shopify product page
- [x] Send product images to try-on API
- [x] Display try-on result in chat
- [x] Full-screen image viewer
- [x] Download try-on image

#### 5. Interaction Feedback
- [ ] Sound feedback on button clicks (Web Audio API)
- [ ] Haptic feedback (vibration API)
- [x] Loading states with spinners
- [x] Error states with messages
- [x] Success states with messages

---

### 🔧 Functionality Features

#### 6. Chatbot Core
- [x] Send messages to backend API
- [x] Conversation history tracking
- [x] Page context detection (home/product/other)
- [x] Product recommendations extraction
- [x] Ticket creation (escalation after 3-5 messages)
- [ ] Prompt templates based on context
- [x] Auto-scroll on message updates

#### 7. Shopify Integration
- [x] Detect shop domain from multiple sources:
  - window.Shopify.shop
  - meta[name="shopify-shop"]
  - URL hostname parsing
- [x] Detect current product from Shopify context:
  - window.Shopify.product (primary)
  - JSON-LD structured data
  - Meta tags (og:title, og:image)
  - DOM extraction (fallback)
- [ ] Detect customer info (if logged in):
  - window.Shopify.customer
  - Customer cookie detection
- [x] Fetch product catalog via Shopify AJAX API (client-side)
- [x] Pass shop domain to backend API
- [x] Pass current product URL to chatbot API
- [x] Pass product catalog to chatbot API
- [ ] Pass customer context to backend (for order history)

#### 8. Try-On Pipeline
- [x] Only enable on product pages
- [x] Check for saved user images
- [x] Upload user images to backend
- [x] Fetch product images from Shopify
- [x] Send product image URL to try-on API
- [x] Send product metadata (name, category, type, color)
- [x] Send shop domain and customer info
- [x] Display result with download option

---

### 🔌 Backend API Integration

#### 9. Chatbot API (`/api/chat`)
- [x] Send message
- [x] Conversation history
- [x] Page context
- [x] Shop domain
- [x] Customer name (for personalization)
- [x] Current product (with URL, images, metadata)
- [x] Product catalog
- [ ] Order history (backend fetches via Shopify Admin API)
- [ ] Store policies (backend fetches via Shopify Admin API)
- [x] Receive product recommendations
- [x] Receive ticket creation confirmation

#### 10. Try-On API (`/api/try-on`)
- [x] User images (fullBodyUrl or halfBodyUrl)
- [x] Product image URL (from Shopify)
- [x] Product metadata (name, category, type, color)
- [x] Product URL
- [x] Shop domain
- [x] Shopify customer ID (if available)
- [x] Customer email (if available)
- [x] Receive try-on result image URL

#### 11. User Images API
- [x] POST `/api/upload-user-images` - Save user photos
- [x] GET `/api/user-images` - Fetch saved user photos

---

### 📊 Shopify Data Access (Backend)

#### 12. Shopify Admin API Integration (Server-Side)
The backend uses Shopify Admin API to fetch:
- [ ] Customer orders (via `fetchCustomerOrders`)
- [ ] Order by name (via `fetchOrderByName`)
- [ ] Customer by email (via `fetchCustomerByEmail`)
- [ ] Store policies (via `fetchStorePolicies`)
- [ ] Product catalog (via `fetchShopifyProducts`)

**Implementation:**
- Backend receives `shop` domain and `customerInternal` from extension
- Backend fetches Shopify session from database
- Backend calls Shopify Admin API GraphQL endpoints
- Backend passes data to chatbot API

---

## 🚀 Implementation Priority

### Phase 1: Core Functionality (In Progress)
1. ✅ White theme enforcement
2. ✅ Product detection from Shopify
3. ✅ Try-on only on product pages
4. ✅ Product image fetching
5. ✅ Product URL passing to chatbot

### Phase 2: Shopify Data Integration
6. ⏳ Product catalog fetching (client-side via AJAX API)
7. ⏳ Customer detection (if logged in)
8. ⏳ Pass customer context to backend
9. ⏳ Backend fetches order history via Admin API
10. ⏳ Backend fetches store policies via Admin API

### Phase 3: UI Polish
11. ⏳ Context-aware prompt templates
12. ⏳ Sound/haptic feedback
13. ⏳ Auto-scroll improvements
14. ⏳ Ticket creation UI

### Phase 4: Advanced Features
15. ⏳ Enhanced error handling
16. ⏳ Performance optimization
17. ⏳ Analytics integration

---

## 📝 Notes

### Why Not "Shopify MCP"?
After research, "Shopify MCP" (Model Context Protocol) is not a Shopify-specific feature. The current approach using:
- **Client-side**: Shopify AJAX API for public product data
- **Server-side**: Shopify Admin API for secure data (orders, customers, policies)

This is the **correct and secure** approach. The backend handles all authenticated Shopify API calls.

### Security Considerations
- Never expose Shopify Admin API tokens to client
- Always use server-side API calls for sensitive data
- Client-side can only access public endpoints (product catalog)

---

## ✅ Current Status

**Completed:** 35 features
**In Progress:** 8 features  
**Pending:** 12 features

**Next Steps:**
1. Complete product catalog fetching
2. Implement customer detection
3. Add prompt templates
4. Add sound/haptic feedback
5. Test end-to-end flow

