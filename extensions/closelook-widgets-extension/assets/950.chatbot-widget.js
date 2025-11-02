"use strict";
(self["webpackChunkCloselookChatbotWidget"] = self["webpackChunkCloselookChatbotWidget"] || []).push([[950],{

/***/ 950:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   detectShopifyCustomer: () => (/* binding */ detectShopifyCustomer)
/* harmony export */ });
/**
 * Helper to detect customer context from Shopify storefront
 * Checks for customer information in Shopify storefront context
 */
/**
 * Detect customer from Shopify storefront context
 * Checks for window.Shopify.customer or customer access token
 */
function detectShopifyCustomer() {
    if (typeof window === "undefined") {
        return { isLoggedIn: false };
    }
    try {
        // Method 1: Check window.Shopify.customer (if available)
        const shopify = window.Shopify;
        if (shopify?.customer) {
            const firstName = shopify.customer.first_name;
            const lastName = shopify.customer.last_name;
            const name = firstName || lastName ? `${firstName || ""} ${lastName || ""}`.trim() : undefined;
            return {
                name: name || undefined,
                isLoggedIn: !!shopify.customer.email,
                _internal: {
                    id: shopify.customer.id?.toString(),
                    email: shopify.customer.email,
                },
            };
        }
        // Method 2: Check for customer name from cookies or meta tags
        const customerName = getCookie("customer_name") ||
            document.querySelector('meta[name="shopify-customer-name"]')?.getAttribute("content");
        if (customerName) {
            return {
                name: customerName,
                isLoggedIn: true,
            };
        }
        // Method 3: Check for customer ID in meta tags (if present) - for internal use only
        const customerMeta = document.querySelector('meta[name="shopify-customer-id"]');
        const customerAccessToken = getCookie("customer_access_token") ||
            getCookie("customer_auth_token");
        if (customerMeta || customerAccessToken) {
            const customerId = customerMeta?.getAttribute("content");
            return {
                isLoggedIn: true,
                _internal: {
                    id: customerId || undefined,
                    accessToken: customerAccessToken || undefined,
                },
            };
        }
        // Method 4: Check document for customer data in Shopify theme
        try {
            const themeCustomer = window.customer || document.customer;
            if (themeCustomer) {
                const firstName = themeCustomer.first_name || themeCustomer.firstName;
                const lastName = themeCustomer.last_name || themeCustomer.lastName;
                const name = firstName || lastName ? `${firstName || ""} ${lastName || ""}`.trim() : undefined;
                return {
                    name: name || undefined,
                    isLoggedIn: !!(themeCustomer.email || themeCustomer.id),
                    _internal: {
                        id: themeCustomer.id?.toString(),
                        email: themeCustomer.email,
                    },
                };
            }
        }
        catch (e) {
            // Ignore errors
        }
        return { isLoggedIn: false };
    }
    catch (error) {
        console.warn("Error detecting Shopify customer:", error);
        return { isLoggedIn: false };
    }
}
/**
 * Get cookie value by name
 */
function getCookie(name) {
    if (typeof document === "undefined")
        return null;
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
        return parts.pop()?.split(";").shift() || null;
    }
    return null;
}


/***/ })

}]);