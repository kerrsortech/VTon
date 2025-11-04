/**
 * Context Service
 * Builds context strings for Gemini from structured context data
 */

import { getContext } from './redis.js';
import type { Product } from './closelook-types';

/**
 * Format price for display
 */
function formatPrice(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD',
  }).format(amount);
}

/**
 * Build context string for Gemini
 * Converts structured context into natural language
 */
export function buildContextString(context: any): string {
  if (!context) {
    return 'No context available. User is browsing the store.';
  }

  const parts: string[] = [];

  // 1. Page context
  if (context.page_type) {
    const pageDescriptions: Record<string, string> = {
      product: 'viewing a product page',
      collection: 'browsing a collection',
      cart: 'on the shopping cart page',
      home: 'on the homepage',
      account: 'on their account page',
    };

    const pageDesc =
      pageDescriptions[context.page_type] || 'browsing the store';
    parts.push(`The customer is currently ${pageDesc}.`);
  }

  // 2. Product context (MOST IMPORTANT)
  if (context.current_product) {
    const product = context.current_product;

    let productContext = `\n**Current Product:**\n`;
    productContext += `- **Name:** ${product.name || product.title || 'N/A'}\n`;

    if (product.price) {
      const priceFormatted = formatPrice(
        typeof product.price === 'number' ? product.price : product.price.min,
        product.price?.currency || 'USD'
      );
      productContext += `- **Price:** ${priceFormatted}`;

      if (product.price.min !== product.price.max) {
        const maxPrice = formatPrice(product.price.max, product.price.currency);
        productContext += ` - ${maxPrice}`;
      }
      productContext += '\n';
    }

    if (product.description) {
      const shortDesc = product.description.substring(0, 300);
      productContext += `- **Description:** ${shortDesc}${
        product.description.length > 300 ? '...' : ''
      }\n`;
    }

    if (product.available !== undefined) {
      productContext += `- **Availability:** ${
        product.available ? '✅ In Stock' : '❌ Out of Stock'
      }\n`;
    }

    if (product.inventory) {
      productContext += `- **Total Inventory:** ${product.inventory} units\n`;
    }

    if (product.variants && product.variants.length > 0) {
      productContext += `- **Variants:** ${product.variants.length} options available\n`;

      // List available variants
      const availableVariants = product.variants.filter(
        (v: any) => v.available !== false
      );
      if (availableVariants.length > 0 && availableVariants.length <= 10) {
        productContext += `  Available options:\n`;
        availableVariants.forEach((variant: any) => {
          const variantPrice = formatPrice(
            variant.price || 0,
            variant.currency || 'USD'
          );
          const optionsStr = variant.options
            ? variant.options.map((o: any) => o.value || o).join(', ')
            : variant.title || 'N/A';
          productContext += `  - ${optionsStr} (${variantPrice})${
            variant.quantity ? ` - ${variant.quantity} in stock` : ''
          }\n`;
        });
      }
    }

    if (product.options && product.options.length > 0) {
      product.options.forEach((option: any) => {
        const values = Array.isArray(option.values)
          ? option.values.join(', ')
          : option.values;
        productContext += `- **${option.name}:** ${values}\n`;
      });
    }

    if (product.sizes && product.sizes.length > 0) {
      productContext += `- **Available Sizes:** ${product.sizes.join(', ')}\n`;
    }

    if (product.vendor) {
      productContext += `- **Brand:** ${product.vendor}\n`;
    }

    if (product.productType || product.category) {
      productContext += `- **Category:** ${product.productType || product.category}\n`;
    }

    if (product.tags && product.tags.length > 0) {
      productContext += `- **Tags:** ${product.tags.join(', ')}\n`;
    }

    if (product.id) {
      productContext += `- **Product ID:** ${product.id}\n`;
    }

    parts.push(productContext);
  }

  // 3. Customer context
  if (context.customer) {
    if (context.customer.logged_in) {
      parts.push(
        `\n**Customer Status:** Logged in (ID: ${context.customer.id || 'N/A'})`
      );
    } else {
      parts.push(`\n**Customer Status:** Guest user (not logged in)`);
    }
  }

  // 4. Cart context
  if (context.cart && context.cart.item_count > 0) {
    let cartContext = `\n**Shopping Cart:**\n`;
    cartContext += `- **Items:** ${context.cart.item_count}\n`;

    if (context.cart.total_price) {
      const cartTotal = formatPrice(
        typeof context.cart.total_price === 'number'
          ? context.cart.total_price / 100
          : context.cart.total_price,
        context.cart.currency || 'USD'
      );
      cartContext += `- **Total:** ${cartTotal}\n`;
    }

    if (context.cart.items && context.cart.items.length > 0) {
      cartContext += `- **Products in cart:**\n`;
      context.cart.items.forEach((item: any) => {
        const itemPrice = formatPrice(
          typeof item.price === 'number' ? item.price / 100 : item.price,
          context.cart.currency || 'USD'
        );
        cartContext += `  - ${item.title} x${item.quantity || 1} (${itemPrice})\n`;
      });
    }

    parts.push(cartContext);
  }

  return parts.join('\n');
}

/**
 * Get enriched context for session
 */
export async function getEnrichedContext(sessionId: string): Promise<{
  raw: any;
  contextString: string;
} | null> {
  const context = await getContext(sessionId);

  if (!context) {
    return null;
  }

  return {
    raw: context,
    contextString: buildContextString(context),
  };
}

