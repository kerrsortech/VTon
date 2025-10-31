/**
 * Production-Ready Enhancements
 * Edge case handling and quality improvements
 */

import type { CategoryConfig } from "./category-system"
import { sanitizeCategory, sanitizeDescription, validatePrompt, type ValidationResult } from "./production-validators"

/**
 * Enhances prompt with production-quality improvements
 */
export function enhancePromptForProduction(
  prompt: string,
  categoryConfig: CategoryConfig,
  detectedCategory: string,
): { enhancedPrompt: string; warnings: string[] } {
  const warnings: string[] = []
  let enhanced = prompt

  // Ensure single-person enforcement is strong
  if (!enhanced.includes("EXACTLY ONE") || !enhanced.includes("NO multiple")) {
    // Add stronger enforcement
    enhanced = `CRITICAL: Generate EXACTLY ONE person in ONE pose only. NO multiple people, NO multiple poses, NO duplicate subjects, NO clones, NO composite views.\n\n${enhanced}`
    warnings.push("Added explicit single-person enforcement to prompt")
  }

  // Ensure category-specific instructions are clear
  const categoryKeywords = getCategoryKeywords(categoryConfig.type)
  if (categoryKeywords.some((keyword) => !enhanced.toLowerCase().includes(keyword.toLowerCase()))) {
    warnings.push(`Prompt may not have strong category-specific guidance for ${categoryConfig.type}`)
  }

  // Ensure facial fidelity is emphasized
  if (!enhanced.includes("preserve") && !enhanced.includes("EXACT")) {
    enhanced = `CRITICAL: Preserve EXACT facial features, identity, and skin tone from user image. DO NOT alter face shape, facial features, or skin tone.\n\n${enhanced}`
    warnings.push("Added explicit facial fidelity enforcement")
  }

  // Ensure product fidelity is emphasized
  if (!enhanced.includes("reproduce") && !enhanced.includes("exact")) {
    enhanced = `CRITICAL: Reproduce product EXACTLY from product reference images - same colors, textures, logos, and scale.\n\n${enhanced}`
    warnings.push("Added explicit product fidelity enforcement")
  }

  return {
    enhancedPrompt: enhanced,
    warnings,
  }
}

/**
 * Gets category-specific keywords for validation
 */
function getCategoryKeywords(categoryType: string): string[] {
  const keywords: Record<string, string[]> = {
    HEADWEAR: ["head", "face", "sunglasses", "glasses", "cap", "hat"],
    FOOTWEAR: ["feet", "shoes", "footwear", "full-body"],
    CLOTHING_UPPER: ["upper body", "torso", "three-quarter"],
    CLOTHING_LOWER: ["lower body", "pants", "legs", "full-body"],
    CLOTHING_FULL: ["full-body", "dress", "jumpsuit"],
    ACCESSORY_BODY: ["wrist", "necklace", "jewelry", "watch"],
    ACCESSORY_CARRY: ["bag", "shoulder", "hand", "carry"],
    ACCESSORY_OTHER: ["belt", "scarf", "glove"],
  }

  return keywords[categoryType] || []
}

/**
 * Handles edge cases for body reconstruction
 */
export function enhanceBodyReconstructionInstructions(
  categoryConfig: CategoryConfig,
  userBodyAvailability: "full-body" | "upper-body" | "head-only",
  needsReconstruction: boolean,
): string {
  if (!needsReconstruction) {
    return ""
  }

  let instructions = "CRITICAL BODY RECONSTRUCTION REQUIREMENTS:\n"

  if (userBodyAvailability === "head-only") {
    instructions += `- User photo shows head/face only. You MUST reconstruct the full body.\n`
    instructions += `- Build realistic adult body proportions (7-8 head heights) based on face size.\n`
    instructions += `- Use neutral fitted clothing (simple t-shirt + tapered pants) for reconstruction.\n`
    instructions += `- Ensure reconstructed body matches the person's age, gender hints, and apparent build from facial features.\n`
  } else if (userBodyAvailability === "upper-body") {
    if (categoryConfig.requiresFullBody) {
      instructions += `- User photo shows upper body only, but product requires full body view.\n`
      instructions += `- Extend the body downward maintaining natural proportions.\n`
      instructions += `- Keep upper body exactly as shown, only add lower body below waist.\n`
    }
  }

  instructions += `- Reconstructed parts must be anatomically correct and proportional.\n`
  instructions += `- Still only ONE person in ONE pose - no duplicates.\n`

  return instructions
}

/**
 * Enhances product metadata with fallbacks
 */
export function enhanceProductMetadata(
  metadata: any,
  productName: string,
  productCategory: string,
  categoryConfig: CategoryConfig,
): any {
  const enhanced = { ...metadata }

  // Sanitize category
  enhanced.productCategory = sanitizeCategory(metadata.productCategory || productCategory || "Fashion Accessory")

  // Sanitize description
  enhanced.detailedVisualDescription =
    metadata.detailedVisualDescription && metadata.detailedVisualDescription !== "Unknown"
      ? sanitizeDescription(metadata.detailedVisualDescription)
      : `${sanitizeDescription(productName)} - A stylish ${enhanced.productCategory} with premium design and quality materials.`

  // Enhance image generation prompt with category specifics
  if (!enhanced.imageGenerationPrompt || enhanced.imageGenerationPrompt === "Unknown") {
    enhanced.imageGenerationPrompt = buildFallbackImagePrompt(categoryConfig, enhanced.productCategory)
  }

  // Ensure user characteristics object exists
  if (!enhanced.userCharacteristics || typeof enhanced.userCharacteristics !== "object") {
    enhanced.userCharacteristics = {
      visibility: "Unknown",
      genderHint: "unknown",
      ageRange: "Unknown",
      bodyBuild: "Unknown",
      skinTone: "Unknown",
    }
  }

  return enhanced
}

/**
 * Builds fallback image generation prompt based on category
 */
function buildFallbackImagePrompt(categoryConfig: CategoryConfig, category: string): string {
  const base = `Show the person wearing the ${category} in a natural, confident pose. Position the product prominently so it's clearly visible. Use professional studio lighting and a clean background.`

  switch (categoryConfig.type) {
    case "HEADWEAR":
      return `Use product reference images to reproduce exact colors, textures, and scale. Frame as head-and-shoulders shot, face centered, product clearly visible. ${categoryConfig.cameraHint}. Preserve user identity and skin tone exactly. Photorealistic, high-resolution, studio product shot suitable for e-commerce.`

    case "FOOTWEAR":
      return `Use product reference images to reproduce exact colors, textures, and scale. Frame as full-body shot, feet clearly visible in foreground. ${categoryConfig.cameraHint}. Preserve user identity and skin tone exactly. Ensure both feet are visible and properly aligned. Photorealistic, high-resolution, studio product shot suitable for e-commerce.`

    case "CLOTHING_UPPER":
      return `Use product reference images to reproduce exact colors, textures, and scale. Frame as three-quarter body shot showing upper body garment. ${categoryConfig.cameraHint}. Preserve user identity and skin tone exactly. Garment must maintain exact fit from product reference. Photorealistic, high-resolution, studio product shot suitable for e-commerce.`

    case "CLOTHING_LOWER":
      return `Use product reference images to reproduce exact colors, textures, and scale. Frame as full-body shot showing lower body garment. ${categoryConfig.cameraHint}. Preserve user identity and skin tone exactly. Garment must maintain exact fit from product reference. Photorealistic, high-resolution, studio product shot suitable for e-commerce.`

    case "ACCESSORY_BODY":
      return `Use product reference images to reproduce exact colors, textures, and scale. Frame appropriately to showcase the ${category}. ${categoryConfig.cameraHint}. Preserve user identity and skin tone exactly. Ensure accessory is properly worn and visible. Photorealistic, high-resolution, studio product shot suitable for e-commerce.`

    case "ACCESSORY_CARRY":
      return `Use product reference images to reproduce exact colors, textures, and scale. Frame as three-quarter body shot with ${category} worn/carried naturally. ${categoryConfig.cameraHint}. Preserve user identity and skin tone exactly. Ensure bag is properly positioned and fully visible. Photorealistic, high-resolution, studio product shot suitable for e-commerce.`

    default:
      return base
  }
}

/**
 * Validates and logs prompt quality
 */
export function validatePromptQuality(
  prompt: string,
  categoryConfig: CategoryConfig,
): ValidationResult {
  const validation = validatePrompt(prompt)
  const categoryKeywords = getCategoryKeywords(categoryConfig.type)

  // Check for category-specific guidance
  const hasCategoryGuidance = categoryKeywords.some((keyword) =>
    prompt.toLowerCase().includes(keyword.toLowerCase()),
  )

  if (!hasCategoryGuidance) {
    validation.warnings.push("Prompt may lack category-specific guidance")
  }

  // Check for single-person enforcement
  const singlePersonTerms = ["one person", "single person", "exactly one", "no multiple"]
  const hasSinglePersonEnforcement = singlePersonTerms.some((term) =>
    prompt.toLowerCase().includes(term),
  )

  if (!hasSinglePersonEnforcement) {
    validation.warnings.push("Prompt may lack strong single-person enforcement")
  }

  return validation
}

