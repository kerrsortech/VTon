# Shopify Theme App Extensions Setup Guide

## ✅ COMPLETED: Theme Extensions Created

I've created proper theme app extensions to fix the app embed blocks not appearing issue. Here's what was implemented:

### Created Extensions Structure:
```
shopify-app/extensions/
├── chatbot-extension/
│   ├── assets/
│   │   ├── chatbot-widget.js
│   │   └── 950.chatbot-widget.js
│   ├── blocks/
│   │   └── chatbot-embed.liquid
│   ├── locales/
│   │   ├── en.default.json
│   │   └── en.default.schema.json
│   ├── package.json
│   └── shopify.extension.toml
└── try-on-extension/
    ├── assets/
    │   └── try-on-widget.js
    ├── blocks/
    │   └── try-on-embed.liquid
    ├── locales/
    │   ├── en.default.json
    │   └── en.default.schema.json
    ├── package.json
    └── shopify.extension.toml
```

### Key Features Implemented:

1. **Proper Schema Configuration**: Both extensions use `"target": "body"` for floating widgets
2. **Asset References**: Extensions load JavaScript from `{{ "widget-name.js" | asset_url }}`
3. **Deep Linking**: Post-installation page now has direct links to enable each widget
4. **Merchant Onboarding**: Automatic redirection to theme editor with app embeds highlighted

## 🚀 NEXT STEPS: Deployment & Testing

### 1. Enable Development Store Preview (CRITICAL)

**Go to Shopify Partner Dashboard:**
- Navigate to **Apps** → **[Your App]** → **Extensions**
- Find your theme extensions (`chatbot-extension`, `try-on-extension`)
- **Toggle ON "Development Store Preview"** for both extensions
- This allows you to see draft changes without deploying

### 2. Deploy Extensions

```bash
# Test deployment without releasing (recommended first)
shopify app deploy --no-release

# Check deployment status
shopify app versions list

# If successful, release to make live
shopify app release
```

### 3. Test Locally First

```bash
# Start development server
shopify app dev

# This will show your extensions in development stores
```

### 4. Install & Test on Development Store

1. Go to your development store
2. Install the app: `/install?shop=your-dev-store.myshopify.com`
3. After OAuth, you'll be redirected to the admin page with deep link buttons
4. Click "Enable AI Chatbot" or "Enable Virtual Try-On"
5. This opens theme editor directly to App Embeds section
6. Toggle the widget ON and Save

## 🔧 Configuration Details

### Extension Schema Configuration:
- **Target**: `"body"` (correct for floating widgets)
- **Settings**: Backend URL and enable/disable toggle
- **Assets**: JavaScript files loaded via Shopify's `asset_url` filter

### Deep Link URLs:
```
Chatbot: https://{store}/admin/themes/current/editor?context=apps&activateAppId=95615e8665f0cb731eab0dbd66b69ebd/chatbot-embed
Try-On: https://{store}/admin/themes/current/editor?context=apps&activateAppId=95615e8665f0cb731eab0dbd66b69ebd/try-on-embed
```

Where:
- `{store}` = merchant's store domain
- `95615e8665f0cb731eab0dbd66b69ebd` = your app's client_id
- `chatbot-embed` / `try-on-embed` = liquid file handles

## 🐛 Troubleshooting

### If Extensions Don't Appear:

1. **Check Development Store Preview**: Must be enabled in Partner Dashboard
2. **Verify Deployment**: Run `shopify app versions list` to confirm release
3. **Clear Caches**: Hard refresh browser (Ctrl+Shift+R)
4. **Reinstall App**: If deployed after initial installation

### Common Issues:

- **"target": "body"** not **"target": "section"** (app blocks vs app embeds)
- **Development Store Preview** toggle must be ON
- **Extensions deployed AND released** (not just deployed)
- **Backend accessible** with proper CORS for Shopify domains

## 🔄 Merchant Experience

After app installation, merchants now get:

1. **Automatic redirection** to admin page with setup instructions
2. **One-click deep links** to enable each widget
3. **Clear API URL configuration** displayed
4. **Fallback manual instructions** if deep linking fails

## 📋 Deployment Checklist

- [ ] Enable Development Store Preview in Partner Dashboard
- [ ] Run `shopify app dev` and test locally
- [ ] Deploy with `shopify app deploy --no-release`
- [ ] Test on development store with released version
- [ ] Install app and test deep linking flow
- [ ] Verify widgets appear in theme customizer
- [ ] Run `shopify app release` for production
- [ ] Test full merchant experience on fresh dev store

## 🎯 Key Improvements Made

1. **Fixed Extension Structure**: Proper theme app extensions vs empty block directories
2. **Correct Schema**: `"target": "body"` for floating widgets
3. **Deep Linking**: Automatic theme editor opening with app embeds highlighted
4. **Merchant UX**: One-click activation instead of manual navigation
5. **Asset Loading**: Proper Shopify asset_url references
6. **Error Prevention**: Clear configuration and troubleshooting steps

The core issue was that Shopify app embed blocks are disabled by default, and without proper theme extensions + deep linking, merchants had a poor activation experience. This implementation addresses all the issues you described.
