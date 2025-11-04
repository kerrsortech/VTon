# Shopify Extension Configuration Guide

## ✅ Extension Deployed Successfully!

**Version**: `my-v0-project-35`  
**Status**: Released to users  
**Extension**: `closelook-widgets-extension` (includes context-aware chatbot)

## 🔧 Configure Backend URL in Theme Settings

### Step 1: Access Theme Customizer

1. **Go to Shopify Admin**
   - Navigate to: `Online Store > Themes`
   
2. **Click "Customize"** on your active theme

### Step 2: Find the Extension Block

1. In the theme customizer, look for **"Closelook AI Widgets"** block
2. The block should be in the **Body** section (since it's a body target)

### Step 3: Configure Backend URL

1. **Click on the "Closelook AI Widgets" block**
2. In the settings panel, you'll see:
   - **Backend API URL** field
   - **Enable AI Chatbot** checkbox (should be checked)
   - **Enable Virtual Try-On** checkbox

3. **Set the Backend URL**:
   - **For Render Deployment**: `https://vton-1-hqmc.onrender.com`
   - **For Local Development**: Use your Shopify CLI tunnel URL (e.g., `https://abc123.ngrok.io`)
   - **For Vercel**: Use your Vercel deployment URL

4. **Save the settings**

### Step 4: Verify Configuration

1. **Preview the store** in the customizer
2. **Open browser console** (F12)
3. **Look for**:
   ```
   [Context Manager] Initializing...
   ✅ Context Manager initialized
   ```
4. **Navigate to a product page**
5. **Check console for**:
   ```
   [Context Manager] ✅ Product captured: {...}
   ```

## 📋 Current Configuration

Based on your `shopify.app.toml`:
- **Backend URL**: `https://vton-1-hqmc.onrender.com`
- **Application URL**: `https://vton-1-hqmc.onrender.com`

## 🔍 Verification Steps

### 1. Check Extension is Loaded
- Open browser console on any page
- Look for: `🤖 Closelook Widgets script loaded`
- Look for: `✅ Context Manager initialized`

### 2. Test Context Capture
- Navigate to a product page
- Open console
- Look for: `[Context Manager] ✅ Product captured`
- Check for product ID in the context

### 3. Test Chatbot with Context
- Open chatbot widget
- Ask: "What sizes are available?"
- Should respond with actual sizes from that product
- Check Network tab for POST to `/api/chat` with `context` object

## 🎯 What Was Deployed

### Files Added to Extension:
- ✅ `context-manager.js` - Context capture system
- ✅ Updated `closelook-widgets.js` - Integrated context manager
- ✅ Updated `closelook-widgets.liquid` - Loads context manager

### Features Enabled:
- ✅ Real-time product context capture
- ✅ Customer login status detection
- ✅ Cart state monitoring
- ✅ Navigation detection
- ✅ Context sent to backend API
- ✅ Session-based context storage

## 🔗 Quick Links

- **Extension Dashboard**: https://dev.shopify.com/dashboard/190236565/apps/293063884801/versions/776827437057
- **Theme Customizer**: Shopify Admin → Online Store → Themes → Customize

## 📝 Configuration Checklist

- [ ] Backend URL set in theme settings
- [ ] Enable AI Chatbot checkbox checked
- [ ] Context manager loads (check console)
- [ ] Product context captured on product pages
- [ ] Chatbot responds with product-specific information

## 🚨 Troubleshooting

### Extension Not Showing
1. Check if extension is enabled in theme
2. Verify block is added to body section
3. Check theme customizer for "Closelook AI Widgets" block

### Context Not Captured
1. Check browser console for errors
2. Verify `context-manager.js` is loaded
3. Check if `window.ShopifyAnalytics` exists on product pages

### Backend Not Responding
1. Verify backend URL is correct in theme settings
2. Check Render deployment status
3. Verify environment variables are set on Render
4. Check Render logs for errors

## 🎉 Next Steps

1. **Configure Backend URL** in theme settings (see above)
2. **Test on product page** - verify context capture
3. **Test chatbot** - ask product-specific questions
4. **Monitor logs** - check Render logs for context storage

## 📞 Support

If you encounter issues:
1. Check browser console for errors
2. Check Render logs for backend errors
3. Verify all environment variables are set
4. Test backend API directly with curl (see TESTING_GUIDE.md)

