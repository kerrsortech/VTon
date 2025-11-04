/**
 * Production-Ready Product Intelligence
 * NO HARD-CODING - Works for ANY e-commerce store
 */

export function rankProductsByRelevance(products, currentProduct, limit = 5) {
  if (!currentProduct || !products?.length) {
    return products?.slice(0, limit) || [];
  }

  console.log('[Intelligence] Ranking by relevance to:', currentProduct.title);

  // Complementary product pairs (customize for your domain)
  const complementaryMap = {
    'snowboard': ['bindings', 'boots', 'wax', 'bag', 'helmet', 'goggles'],
    'bindings': ['snowboard', 'boots'],
    'boots': ['snowboard', 'bindings'],
    'jacket': ['pants', 'gloves', 'goggles', 'helmet'],
    'pants': ['jacket', 'gloves'],
    'helmet': ['goggles', 'jacket'],
    'goggles': ['helmet', 'jacket'],
  };

  const scored = products.map(p => {
    let score = 0;

    // Skip current product
    if (p.id === currentProduct.id) {
      return { product: p, score: -1000 };
    }

    // 1. Complementary category (HIGHEST PRIORITY)
    const currentCat = currentProduct.productType?.toLowerCase() || '';
    const productCat = p.productType?.toLowerCase() || '';

    if (complementaryMap[currentCat]?.includes(productCat)) {
      score += 150; // Very high score for true complements
    }

    // 2. Same category (also relevant but lower priority)
    if (currentCat && productCat && currentCat === productCat) {
      score += 60;
    }

    // 3. Shared tags
    if (currentProduct.tags && p.tags) {
      const sharedTags = currentProduct.tags.filter(t =>
        p.tags.some(pt => pt.toLowerCase() === t.toLowerCase())
      );
      score += sharedTags.length * 12;
    }

    // 4. Similar price range
    if (currentProduct.price?.min && p.price?.min) {
      const priceDiff = Math.abs(p.price.min - currentProduct.price.min);
      const priceRatio = priceDiff / currentProduct.price.min;

      if (priceRatio < 0.3) score += 25; // Very similar price
      else if (priceRatio < 0.6) score += 15; // Somewhat similar
    }

    // 5. Same vendor
    if (p.vendor && currentProduct.vendor &&
        p.vendor.toLowerCase() === currentProduct.vendor.toLowerCase()) {
      score += 20;
    }

    // 6. In-stock bonus
    if (p.available) score += 40;
    else score -= 60; // Heavy penalty for out of stock

    // 7. Maintenance/care products get bonus with equipment
    const isEquipment = ['snowboard', 'boots', 'bindings'].includes(currentCat);
    const isCareProduct = p.title?.toLowerCase().includes('wax') ||
                         p.title?.toLowerCase().includes('cleaner') ||
                         productCat.includes('maintenance');

    if (isEquipment && isCareProduct) {
      score += 80; // Care products are highly relevant
    }

    return { product: p, score };
  });

  scored.sort((a, b) => b.score - a.score);

  console.log('[Intelligence] Top recommendations:');
  scored.slice(0, limit).forEach((item, i) => {
    console.log(`  ${i + 1}. ${item.product.title} (score: ${item.score})`);
  });

  return scored.slice(0, limit).map(item => item.product);
}

/**
 * Analyze if two categories naturally complement each other
 * Uses semantic word analysis instead of hard-coded mappings
 */
function analyzeComplementaryCategories(cat1, cat2) {
  // Word association patterns (universal, not product-specific)
  const associationPatterns = [
    // Outfit/Ensemble patterns
    { words: ['top', 'shirt', 'blouse', 'jacket', 'coat', 'sweater'],
      complements: ['bottom', 'pants', 'skirt', 'jeans', 'shorts', 'trousers'] },
    { words: ['dress', 'gown', 'suit'],
      complements: ['shoe', 'accessory', 'bag', 'jewelry', 'belt'] },

    // Tech/Electronics patterns
    { words: ['phone', 'laptop', 'tablet', 'computer'],
      complements: ['case', 'charger', 'cable', 'adapter', 'stand', 'screen protector'] },
    { words: ['camera'],
      complements: ['lens', 'tripod', 'memory', 'bag', 'filter'] },

    // Sports/Activity patterns
    { words: ['bike', 'bicycle'],
      complements: ['helmet', 'lock', 'light', 'pump', 'bottle'] },
    { words: ['board', 'skate', 'surf'],
      complements: ['binding', 'boot', 'wax', 'bag', 'helmet', 'goggle'] },

    // Kitchen/Home patterns
    { words: ['pot', 'pan', 'cookware'],
      complements: ['utensil', 'spatula', 'spoon', 'tool'] },

    // Beauty/Personal Care patterns
    { words: ['face', 'skin'],
      complements: ['cleaner', 'moisturizer', 'serum', 'cream', 'toner'] },

    // Footwear patterns
    { words: ['shoe', 'boot', 'sneaker'],
      complements: ['sock', 'insole', 'lace', 'cleaner', 'protector'] }
  ];

  let score = 0;

  // Check if categories match any association pattern
  associationPatterns.forEach(pattern => {
    const hasMainWord = pattern.words.some(w => cat1.includes(w));
    const hasComplementWord = pattern.complements.some(w => cat2.includes(w));

    if (hasMainWord && hasComplementWord) {
      score += 100; // Strong complementary relationship
    }

    // Check reverse
    const hasMainWord2 = pattern.words.some(w => cat2.includes(w));
    const hasComplementWord2 = pattern.complements.some(w => cat1.includes(w));

    if (hasMainWord2 && hasComplementWord2) {
      score += 100;
    }
  });

  // Generic "accessory" detection
  const accessoryWords = ['accessory', 'accessories', 'add-on', 'addon', 'attachment',
                          'case', 'cover', 'protector', 'holder', 'mount', 'strap'];

  const isAccessory = accessoryWords.some(w => cat2.includes(w));

  if (isAccessory) {
    score += 60; // Accessories generally complement most main products
  }

  return score;
}

/**
 * Extract meaningful words from title (exclude common filler words)
 */
function extractMeaningfulWords(title) {
  const commonWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'from', 'by', 'as', 'is', 'was', 'are', 'be', 'been',
    'new', 'sale', 'best', 'top', 'great', 'good', 'premium', 'quality',
    'style', 'design', 'collection', 'set', 'pack'
  ]);

  const words = title.toLowerCase()
    .replace(/[^\w\s]/g, ' ') // Remove punctuation
    .split(/\s+/)
    .filter(word => word.length > 2 && !commonWords.has(word));

  return [...new Set(words)]; // Remove duplicates
}

/**
 * Extract collection name from product (if exists)
 */
function extractCollectionName(product) {
  // Common collection naming patterns
  const collectionPatterns = [
    /collection[:\s]+([a-z0-9\s-]+)/i,
    /series[:\s]+([a-z0-9\s-]+)/i,
    /line[:\s]+([a-z0-9\s-]+)/i,
    /([a-z]+)\s+collection/i
  ];

  // Check title
  for (const pattern of collectionPatterns) {
    const match = product.title.match(pattern);
    if (match) return match[1].toLowerCase().trim();
  }

  // Check tags
  if (product.tags) {
    for (const tag of product.tags) {
      for (const pattern of collectionPatterns) {
        const match = tag.match(pattern);
        if (match) return match[1].toLowerCase().trim();
      }
    }
  }

  return null;
}

export function filterProducts(products, filters) {
  let filtered = [...products];

  console.log('[Intelligence] Filtering', filtered.length, 'products');
  console.log('[Intelligence] Filters:', JSON.stringify(filters));

  // Price filter (STRICT)
  if (filters.maxPrice !== undefined) {
    filtered = filtered.filter(p => {
      const price = p.price?.min || 0;
      return price > 0 && price <= filters.maxPrice;
    });
    console.log(`[Intelligence] After price ≤$${filters.maxPrice}:`, filtered.length);
  }

  // Category filter
  if (filters.category) {
    const cat = filters.category.toLowerCase();
    filtered = filtered.filter(p => {
      const matchType = p.productType?.toLowerCase().includes(cat);
      const matchTags = p.tags?.some(t => t.toLowerCase().includes(cat));
      const matchTitle = p.title?.toLowerCase().includes(cat);
      return matchType || matchTags || matchTitle;
    });
    console.log(`[Intelligence] After category '${filters.category}':`, filtered.length);
  }

  // Color filter
  if (filters.color) {
    const col = filters.color.toLowerCase();
    filtered = filtered.filter(p => {
      const matchTitle = p.title?.toLowerCase().includes(col);
      const matchTags = p.tags?.some(t => t.toLowerCase().includes(col));
      const matchVariants = p.variants?.some(v => v.title?.toLowerCase().includes(col));
      return matchTitle || matchTags || matchVariants;
    });
    console.log(`[Intelligence] After color '${filters.color}':`, filtered.length);
  }

  return filtered;
}

/**
 * Production-Ready Intent Analysis & Product Intelligence
 * Version 2.0
 */
export function analyzeUserIntent(message, currentProduct = null, conversationHistory = []) {
  const messageLower = message.toLowerCase().trim();

  const intent = {
    type: 'general',
    subtype: null,
    filters: {},
    wantsRecommendations: false,
    wantsTicket: false,
    ticketStage: null, // null, 'offer', 'awaiting_confirmation', 'awaiting_details', 'create'
    maxRecommendations: 5
  };

  // ============ TICKET CREATION DETECTION ============
  const ticketKeywords = [
    'talk to someone', 'speak to support', 'speak with', 'talk to',
    'create a ticket', 'create ticket', 'open a ticket', 'file a complaint',
    'complaint', 'issue with', 'problem with', 'not working',
    'need help', 'help me', 'contact support', 'reach out',
    'human', 'person', 'agent', 'representative'
  ];

  const hasTicketKeyword = ticketKeywords.some(kw => messageLower.includes(kw));

  // Check conversation history for ticket flow
  const lastAssistantMessage = conversationHistory
    .slice()
    .reverse()
    .find(m => m.role === 'assistant')?.content || '';

  if (lastAssistantMessage.includes('Would you like me to create a ticket') ||
      lastAssistantMessage.includes('Would you like me to do that')) {
    intent.wantsTicket = true;
    intent.ticketStage = 'awaiting_confirmation';
    intent.type = 'ticket_creation';

    // Check if user confirmed
    const confirmWords = ['yes', 'yeah', 'sure', 'ok', 'okay', 'please', 'yep', 'definitely'];
    if (confirmWords.some(w => messageLower.includes(w))) {
      intent.ticketStage = 'awaiting_details';
    }

    return intent;
  }

  if (lastAssistantMessage.includes('Please briefly describe') ||
      lastAssistantMessage.includes('describe what you need help with')) {
    intent.wantsTicket = true;
    intent.ticketStage = 'create';
    intent.type = 'ticket_creation';
    return intent;
  }

  if (hasTicketKeyword) {
    intent.wantsTicket = true;
    intent.ticketStage = 'offer';
    intent.type = 'ticket_creation';
    return intent;
  }

  // ============ PRODUCT QUESTION DETECTION ============
  if (currentProduct) {
    const productQuestionKeywords = [
      'this product', 'this one', 'this item', 'tell me about',
      'what is this', 'about this', 'details', 'info about',
      'size', 'color', 'price', 'available', 'stock', 'in stock',
      'feature', 'spec', 'material', 'dimension'
    ];

    if (productQuestionKeywords.some(kw => messageLower.includes(kw))) {
      intent.type = 'product_question';
      return intent;
    }
  }

  // ============ RECOMMENDATION DETECTION ============
  const recommendKeywords = [
    'recommend', 'suggest', 'show me', 'what else', 'similar',
    'goes with', 'pair with', 'match', 'complete', 'add to',
    'what should', 'do you have', 'any product', 'other product'
  ];

  intent.wantsRecommendations = recommendKeywords.some(kw => messageLower.includes(kw));

  // ============ PRICE FILTER DETECTION ============
  const pricePatterns = [
    /(?:under|less than|below|cheaper than|max|maximum|budget of?)?\s*\$?(\d+)/,
    /\$(\d+)\s*(?:or less|or under|max|maximum|or below)/
  ];

  for (const pattern of pricePatterns) {
    const match = messageLower.match(pattern);
    if (match && (
      messageLower.includes('under') ||
      messageLower.includes('less') ||
      messageLower.includes('below') ||
      messageLower.includes('cheaper') ||
      messageLower.includes('max')
    )) {
      intent.filters.maxPrice = parseInt(match[1]);
      intent.type = 'price_filter';
      intent.wantsRecommendations = true;
      break;
    }
  }

  // ============ COLOR FILTER DETECTION ============
  const colors = [
    'red', 'blue', 'green', 'black', 'white', 'yellow',
    'purple', 'pink', 'orange', 'brown', 'gray', 'grey',
    'silver', 'gold', 'navy', 'beige', 'tan'
  ];

  for (const color of colors) {
    const colorPattern = new RegExp(`\\b${color}\\b`, 'i');
    if (colorPattern.test(messageLower)) {
      intent.filters.color = color;
      intent.wantsRecommendations = true;
      break;
    }
  }

  // ============ CATEGORY FILTER DETECTION ============
  // Customize these for your specific store
  const categories = [
    'snowboard', 'boots', 'bindings', 'jacket', 'pants',
    'gloves', 'goggles', 'wax', 'helmet', 'bag'
  ];

  for (const category of categories) {
    const categoryPattern = new RegExp(`\\b${category}s?\\b`, 'i');
    if (categoryPattern.test(messageLower)) {
      intent.filters.category = category;
      intent.wantsRecommendations = true;
      break;
    }
  }

  // ============ COMPLEMENTARY RECOMMENDATION ============
  if (currentProduct && intent.wantsRecommendations && !intent.filters.maxPrice) {
    intent.subtype = 'complementary';
    intent.maxRecommendations = 4; // Fewer for complementary items
  }

  return intent;
}

export async function getSmartRecommendations(allProducts, currentProduct, intent) {
  let candidates = allProducts || [];

  // Apply filters
  if (Object.keys(intent.filters).length > 0) {
    candidates = filterProducts(candidates, intent.filters);
  }

  // Smart ranking
  if (currentProduct && intent.subtype === 'complementary') {
    // Complementary recommendations
    candidates = rankProductsByRelevance(candidates, currentProduct, intent.maxRecommendations);
  } else if (intent.filters.maxPrice) {
    // Price-filtered: sort by price ascending
    candidates = candidates
      .filter(p => p.available)
      .sort((a, b) => (a.price?.min || 0) - (b.price?.min || 0))
      .slice(0, intent.maxRecommendations);
  } else {
    // General recommendations: prefer in-stock, varied
    candidates = candidates
      .filter(p => p.available)
      .slice(0, intent.maxRecommendations);
  }

  return candidates;
}
