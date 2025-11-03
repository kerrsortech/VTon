# 🐛 CHATBOT BUTTON NOT OPENING - TROUBLESHOOTING

## Issue
Clicking the chatbot button (`#chatbot-open-btn`) doesn't open the panel.

## ✅ Code Review Results

The JavaScript code is **correct**:
- ✅ Event listener is set up (line 81-86 in closelook-widgets.js)
- ✅ `updateUI()` function exists (line 233-263)
- ✅ `init()` is called at bottom of file (line 1702)
- ✅ CSS `.chatbot-panel.open` exists

## 🔍 Possible Causes & Fixes

### 1. **JavaScript Not Loading** (Most Likely)

**Check in Browser:**
1. Open browser DevTools (F12)
2. Go to **Console** tab
3. Look for: `🤖 Closelook Widgets script loaded`
4. If missing → JavaScript file isn't loading

**Fix:**
```liquid
<!-- At end of closelook-widgets.liquid -->
{{ 'closelook-widgets.css' | asset_url | stylesheet_tag }}
<script src="{{ 'closelook-widgets.js' | asset_url }}" async></script>
```

**Or try without async:**
```liquid
<script src="{{ 'closelook-widgets.js' | asset_url }}"></script>
```

### 2. **Elements Not Found** 

**Check in Console:**
```javascript
// Paste in browser console:
console.log('Button:', document.getElementById('chatbot-open-btn'));
console.log('Panel:', document.getElementById('chatbot-panel'));
```

If both return `null` → Elements aren't in DOM

**Fix:** Ensure app block is added to theme:
1. Shopify Admin → Online Store → Themes
2. Customize → Add app block
3. Search "Closelook AI Widgets"
4. Add to theme

### 3. **Console Errors**

**Check for errors:**
1. Open DevTools → Console
2. Look for red error messages
3. Common errors:
   - `Uncaught ReferenceError`
   - `Uncaught TypeError`
   - CORS errors

**If CORS error:**
- Backend must allow your domain
- Check `lib/cors-headers.ts`

### 4. **App Block Not Enabled**

**Check:**
```liquid
{% if block.settings.enable_chatbot %}
```

**Fix:**
1. Theme Customizer → App blocks
2. Find "Closelook AI Widgets"
3. Enable "Enable AI Chatbot" checkbox
4. Save

### 5. **Conflicting CSS**

**Check if panel is hidden:**
```javascript
// In console:
const panel = document.getElementById('chatbot-panel');
console.log('Display:', window.getComputedStyle(panel).display);
console.log('Visibility:', window.getComputedStyle(panel).visibility);
console.log('Opacity:', window.getComputedStyle(panel).opacity);
```

**Fix:** Add `!important` to ensure panel shows:
```css
.chatbot-panel.open {
  opacity: 1 !important;
  transform: translateX(0) !important;
  pointer-events: auto !important;
  display: flex !important;
}
```

### 6. **JavaScript Execution Order**

**Issue:** Script runs before DOM elements exist

**Fix:** Script already wraps in `DOMContentLoaded`, but verify:
```javascript
// At line 49-54 in closelook-widgets.js
function init() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initChatbot);
  } else {
    initChatbot();
  }
}
```

## 🧪 Quick Test Commands

**Paste these in browser console:**

```javascript
// 1. Check if script loaded
console.log('Script loaded:', typeof init !== 'undefined');

// 2. Check button exists
const btn = document.getElementById('chatbot-open-btn');
console.log('Button exists:', !!btn);

// 3. Check panel exists  
const panel = document.getElementById('chatbot-panel');
console.log('Panel exists:', !!panel);

// 4. Manually trigger open
if (btn && panel) {
  panel.classList.add('open');
  console.log('Panel classes:', panel.className);
  console.log('Panel display:', window.getComputedStyle(panel).display);
}

// 5. Check for event listeners
console.log('Event listeners:', getEventListeners(btn));
```

## 🔧 Manual Fix (Temporary)

If nothing works, add inline script in Liquid:

```liquid
<script>
document.addEventListener('DOMContentLoaded', function() {
  const btn = document.getElementById('chatbot-open-btn');
  const panel = document.getElementById('chatbot-panel');
  
  if (btn && panel) {
    btn.addEventListener('click', function() {
      console.log('Button clicked!');
      panel.classList.add('open');
      panel.style.display = 'flex';
      panel.style.opacity = '1';
      panel.style.transform = 'translateX(0)';
    });
    console.log('✅ Chatbot button handler attached');
  } else {
    console.error('❌ Button or panel not found:', {btn, panel});
  }
});
</script>
```

## 📋 Deployment Checklist

Before testing:
1. ✅ Push code to GitHub
2. ✅ Deploy Shopify extension (`shopify app deploy`)
3. ✅ Install/reinstall app in Shopify store
4. ✅ Add app block in Theme Customizer
5. ✅ Enable "AI Chatbot" setting
6. ✅ Save theme
7. ✅ Clear browser cache (Cmd+Shift+R / Ctrl+F5)
8. ✅ Test in incognito/private window

## 🆘 Still Not Working?

**Get detailed diagnostics:**

```javascript
// Paste in console for full report
(function() {
  console.group('🔍 Chatbot Diagnostic Report');
  
  const btn = document.getElementById('chatbot-open-btn');
  const panel = document.getElementById('chatbot-panel');
  const script = document.querySelector('script[src*="closelook-widgets.js"]');
  const css = document.querySelector('link[href*="closelook-widgets.css"]');
  
  console.log('1. Files Loaded:');
  console.log('   JS:', !!script, script?.src);
  console.log('   CSS:', !!css, css?.href);
  
  console.log('2. DOM Elements:');
  console.log('   Button:', !!btn, btn);
  console.log('   Panel:', !!panel, panel);
  
  console.log('3. Button State:');
  if (btn) {
    console.log('   Display:', window.getComputedStyle(btn).display);
    console.log('   Visibility:', window.getComputedStyle(btn).visibility);
    console.log('   Position:', btn.getBoundingClientRect());
  }
  
  console.log('4. Panel State:');
  if (panel) {
    console.log('   Classes:', panel.className);
    console.log('   Display:', window.getComputedStyle(panel).display);
    console.log('   Opacity:', window.getComputedStyle(panel).opacity);
    console.log('   Transform:', window.getComputedStyle(panel).transform);
  }
  
  console.log('5. Console Errors:');
  console.log('   Check above for any red errors');
  
  console.groupEnd();
})();
```

**Send this output to debug further!**

---

## ✅ Expected Behavior

When working correctly, clicking the button should:
1. Log: `Button clicked!` (if logging enabled)
2. Add class `open` to panel
3. Panel slides in from right
4. Shows chatbot interface

The issue is most likely **JavaScript not loading** or **app block not added to theme**.

