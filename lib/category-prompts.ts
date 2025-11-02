/**
 * Category-Specific Prompt Templates
 * Provides enhanced prompts optimized for each category type
 */

import type { CategoryConfig } from "./category-system"

/**
 * Detects bag type from product category string
 */
function detectBagType(category: string): "handbag" | "shoulder" | "crossbody" | "backpack" | "tote" | "clutch" | "belt-bag" | "generic" {
  if (!category) return "generic"
  const lower = category.toLowerCase()

  if (lower.includes("handbag") || lower.includes("hand bag") || lower.includes("purse") || lower.includes("mini purse") || lower.includes("clutch")) {
    return lower.includes("clutch") ? "clutch" : "handbag"
  }
  if (lower.includes("shoulder bag") || lower.includes("shoulder")) {
    return "shoulder"
  }
  if (lower.includes("crossbody") || lower.includes("cross body")) {
    return "crossbody"
  }
  if (lower.includes("backpack") || lower.includes("back pack")) {
    return "backpack"
  }
  if (lower.includes("tote") || lower.includes("tote bag")) {
    return "tote"
  }
  if (lower.includes("belt bag") || lower.includes("beltbag") || lower.includes("fanny pack") || lower.includes("waist bag")) {
    return "belt-bag"
  }

  return "generic"
}

/**
 * Gets bag-specific instructions based on bag type
 */
function getBagSpecificInstructions(bagType: string): string {
  switch (bagType) {
    case "handbag":
      return `HANDBAG: User holds the handbag in one hand at waist/hip level. Preserve all product features exactly from reference: handles, logos, hardware (buckles, zippers, clasps), textures, and colors. DO NOT add, remove, or alter any straps, handles, or product features.`

    case "clutch":
      return `CLUTCH: User holds the clutch in hand at waist/chest level. Preserve all product features exactly from reference: design, logos, hardware, textures, and colors. DO NOT add straps or alter the product design.`

    case "shoulder":
      return `SHOULDER BAG: User wears the shoulder bag on one shoulder with strap visible, exactly as designed. Preserve all product features exactly from reference: strap style and length, logos, hardware, textures, and colors. DO NOT alter strap length, style, or product features.`

    case "crossbody":
      return `CROSSBODY BAG: User wears the crossbody bag diagonally across the body with strap visible, exactly as designed. Preserve all product features exactly from reference: strap length and diagonal positioning, logos, hardware, textures, and colors. DO NOT alter strap length, positioning, or product features.`

    case "backpack":
      return `BACKPACK: User wears the backpack on back with both straps over shoulders, exactly as designed. Preserve all product features exactly from reference: dual straps, logos, hardware, textures, and colors. DO NOT alter strap configuration or product features.`

    case "tote":
      return `TOTE BAG: User holds the tote bag by handles or wears on shoulder (if strap present), exactly as shown in product reference. Preserve all product features exactly from reference: handles/straps, logos, hardware, textures, and colors. DO NOT add or remove handles/straps.`

    case "belt-bag":
      return `BELT BAG: User wears the belt bag around waist with strap visible, exactly as designed. Preserve all product features exactly from reference: waist strap, buckle, logos, hardware, textures, and colors. DO NOT alter strap or buckle configuration.`

    default:
      return `BAG: Positioned based on design from product reference. Preserve all product features exactly: handles, straps, logos, hardware, textures, and colors from reference image. DO NOT manipulate or alter product features.`
  }
}

/**
 * Base prompt template that all category templates extend
 * Optimized for speed and clarity
 */
const BASE_TEMPLATE = `The person from {{USER_IMAGE_URL}} wearing the product from {{PRODUCT_IMAGE_URLS}}.

PRESERVE EXACTLY:
- User identity: face, hair, skin tone, body type
- Product: colors, textures, logos, hardware, scale from {{PRODUCT_SCALE_CATEGORY}}
- For BAGS: Preserve exact handles, straps, hardware configuration, logos, and design structure from product reference. DO NOT add, remove, or alter any product features.
- Gender: {{USER_GENDER}}
- ONE person only, NO duplicates/clones/multi-poses

POSE & FRAMING:
- {{TARGET_FRAMING}}: {{POSE_DESCRIPTION}}
- Camera: {{CAMERA_HINT}}
- Background: {{BACKGROUND_INSTRUCTION}}

SCALE: Product width = {{PRODUCT_SCALE_RATIO}}x head width

{{CLOTHING_SWAP_INSTRUCTIONS}}

{{CATEGORY_SPECIFIC_INSTRUCTIONS}}

STUDIO PHOTO:
- Photorealistic, natural skin, 2K quality
- Cinematic soft lighting: key + fill + rim (NO visible light stands/equipment in frame)
- Professional photo shoot style with clean grey studio background
- NO lighting setups visible, NO equipment visible
- Do NOT add logos to reflective surfaces unless in product image

{{POSITIVE_PROMPT}}

AVOID: {{NEGATIVE_PROMPT}}

Product: {{PRODUCT_CATEGORY}} — {{PRODUCT_DESCRIPTION}}`

/**
 * Category-specific instructions to inject into base template
 */
export function getCategorySpecificInstructions(
  categoryConfig: CategoryConfig,
  detectedCategory?: string,
): string {
  switch (categoryConfig.type) {
    case "HEADWEAR":
      return `HEADWEAR: Product fits naturally on head. Face focus.`

    case "FOOTWEAR":
      return `FOOTWEAR: Full-body, both feet visible, natural fit.`

    case "CLOTHING_UPPER":
      return `CLOTHING_UPPER: Three-quarter body. Maintain fit style.`

    case "CLOTHING_LOWER":
      return `CLOTHING_LOWER: Full-body. Maintain fit style.`

    case "CLOTHING_FULL":
      return `CLOTHING_FULL: Full-body. Maintain silhouette.`

    case "ACCESSORY_BODY":
      return `ACCESSORY_BODY: Properly worn, visible positioning.`

    case "ACCESSORY_CARRY":
      // Determine bag type from product category for specific instructions
      const bagType = detectBagType(detectedCategory || "")
      return getBagSpecificInstructions(bagType)

    case "ACCESSORY_OTHER":
      return `ACCESSORY_OTHER: Properly worn, clearly visible.`

    default:
      return `Category: General try-on.`
  }
}

/**
 * Gets clothing swap instructions based on category
 */
export function getClothingSwapInstructions(categoryConfig: CategoryConfig): string {
  switch (categoryConfig.type) {
    case "HEADWEAR":
    case "FOOTWEAR":
    case "ACCESSORY_BODY":
    case "ACCESSORY_CARRY":
    case "ACCESSORY_OTHER":
      return `Accessory: Keep clothing, add product.`

    case "CLOTHING_UPPER":
      return `Clothing: Replace upper only.`

    case "CLOTHING_LOWER":
      return `Clothing: Replace lower only.`

    case "CLOTHING_FULL":
      return `Clothing: Replace full outfit.`

    default:
      return `Clothing: Replace as needed.`
  }
}

/**
 * Builds the complete category-specific prompt
 */
export function buildCategoryPrompt(
  categoryConfig: CategoryConfig,
  values: {
    userImageUrl: string
    productImageUrls: string
    productCategory: string
    productDescription: string
    genImageInstructions: string
    userCharacteristicsJson: string
    userGender: string
    cameraHint: string
    productScaleRatio: string
    productScaleCategory: string
    targetFraming: string
    backgroundInstruction: string
    positivePrompt: string
    negativePrompt: string
  },
): string {
  const categoryInstructions = getCategorySpecificInstructions(categoryConfig, values.productCategory)
  const clothingSwapInstructions = getClothingSwapInstructions(categoryConfig)

  let prompt = BASE_TEMPLATE
    .replace(/\{\{USER_IMAGE_URL\}\}/g, values.userImageUrl)
    .replace(/\{\{PRODUCT_IMAGE_URLS\}\}/g, values.productImageUrls)
    .replace(/\{\{PRODUCT_CATEGORY\}\}/g, values.productCategory)
    .replace(/\{\{PRODUCT_DESCRIPTION\}\}/g, values.productDescription)
    .replace(/\{\{GEN_IMAGE_INSTRUCTIONS\}\}/g, values.genImageInstructions)
    .replace(/\{\{USER_CHARACTERISTICS_JSON\}\}/g, values.userCharacteristicsJson)
    .replace(/\{\{USER_GENDER\}\}/g, values.userGender)
    .replace(/\{\{CAMERA_HINT\}\}/g, values.cameraHint)
    .replace(/\{\{PRODUCT_SCALE_RATIO\}\}/g, values.productScaleRatio)
    .replace(/\{\{PRODUCT_SCALE_CATEGORY\}\}/g, values.productScaleCategory)
    .replace(/\{\{TARGET_FRAMING\}\}/g, values.targetFraming)
    .replace(/\{\{BACKGROUND_INSTRUCTION\}\}/g, values.backgroundInstruction)
    .replace(/\{\{POSITIVE_PROMPT\}\}/g, values.positivePrompt)
    .replace(/\{\{NEGATIVE_PROMPT\}\}/g, values.negativePrompt)
    .replace(/\{\{POSE_DESCRIPTION\}\}/g, categoryConfig.poseDescription)
    .replace(/\{\{CATEGORY_SPECIFIC_INSTRUCTIONS\}\}/g, categoryInstructions)
    .replace(/\{\{CLOTHING_SWAP_INSTRUCTIONS\}\}/g, clothingSwapInstructions)

  return prompt
}

