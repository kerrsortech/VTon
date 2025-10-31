/**
 * Async version of body detection (for future use with image analysis APIs)
 * Currently falls back to sync version for server-side compatibility
 */
export async function detectBodyAvailability(
  file: File,
): Promise<"full-body" | "upper-body" | "head-only"> {
  // Note: In a browser environment, you could use actual image analysis here
  // For Node.js server environment, we use sync version
  // In production, you could integrate an image analysis API (e.g., Google Vision, AWS Rekognition)
  // For now, fall back to sync detection
  return detectBodyAvailabilitySync(file)
}

/**
 * Synchronous fallback for body availability detection
 * Used when async detection isn't available
 */
export function detectBodyAvailabilitySync(file: File): "full-body" | "upper-body" | "head-only" {
  const fileName = file.name.toLowerCase()

  if (fileName.includes("full") || fileName.includes("body")) {
    return "full-body"
  }
  if (fileName.includes("head") || fileName.includes("face")) {
    return "head-only"
  }

  return "upper-body"
}

/**
 * Validates Gemini output for quality and completeness
 */
export function validateGeminiOutput(metadata: {
  productCategory?: string
  detailedVisualDescription?: string
  imageGenerationPrompt?: string
}): {
  isValid: boolean
  issues: string[]
  confidence: "high" | "medium" | "low"
} {
  const issues: string[] = []

  // Check for missing or Unknown values
  if (!metadata.productCategory || metadata.productCategory === "Unknown") {
    issues.push("Product category is unknown")
  }

  if (!metadata.detailedVisualDescription || metadata.detailedVisualDescription === "Unknown") {
    issues.push("Visual description is missing")
  }

  if (!metadata.imageGenerationPrompt || metadata.imageGenerationPrompt === "Unknown") {
    issues.push("Image generation prompt is missing")
  }

  // Check for low-confidence indicators
  const lowConfidenceWords = ["i think", "maybe", "possibly", "might be", "could be", "uncertain"]
  const allText =
    `${metadata.productCategory} ${metadata.detailedVisualDescription} ${metadata.imageGenerationPrompt}`.toLowerCase()

  if (lowConfidenceWords.some((word) => allText.includes(word))) {
    issues.push("Low confidence indicators detected")
  }

  // Check minimum length for imageGenerationPrompt
  if (metadata.imageGenerationPrompt && metadata.imageGenerationPrompt.length < 100) {
    issues.push("Image generation prompt is too short")
  }

  // Determine confidence level
  let confidence: "high" | "medium" | "low" = "high"
  if (issues.length > 2) {
    confidence = "low"
  } else if (issues.length > 0) {
    confidence = "medium"
  }

  return {
    isValid: issues.length === 0,
    issues,
    confidence,
  }
}

/**
 * Fills prompt template with dynamic values
 */
export function fillPromptPlaceholders(
  template: string,
  values: {
    userImageUrl: string
    productImageUrls: string
    productCategory: string
    productDescription: string
    genImageInstructions: string
    userGenderHint: string
    userBodyAvailability: string
    cameraHint: string
    productScaleRatio: string // Added productScaleRatio parameter
    productScaleCategory: string // Added productScaleCategory parameter
    userCharacteristicsJson: string
    targetFraming: string
    backgroundInstruction: string
    positivePrompt: string
    negativePrompt: string
  },
): string {
  return template
    .replace(/\{\{USER_IMAGE_URL\}\}/g, values.userImageUrl)
    .replace(/\{\{PRODUCT_IMAGE_URLS\}\}/g, values.productImageUrls)
    .replace(/\{\{PRODUCT_CATEGORY\}\}/g, values.productCategory)
    .replace(/\{\{PRODUCT_DESCRIPTION\}\}/g, values.productDescription)
    .replace(/\{\{GEN_IMAGE_INSTRUCTIONS\}\}/g, values.genImageInstructions)
    .replace(/\{\{USER_GENDER_HINT\}\}/g, values.userGenderHint)
    .replace(/\{\{USER_BODY_AVAILABILITY\}\}/g, values.userBodyAvailability)
    .replace(/\{\{CAMERA_HINT\}\}/g, values.cameraHint)
    .replace(/\{\{PRODUCT_SCALE_RATIO\}\}/g, values.productScaleRatio) // Added scale ratio replacement
    .replace(/\{\{PRODUCT_SCALE_CATEGORY\}\}/g, values.productScaleCategory) // Added scale category replacement
    .replace(/\{\{USER_CHARACTERISTICS_JSON\}\}/g, values.userCharacteristicsJson)
    .replace(/\{\{TARGET_FRAMING\}\}/g, values.targetFraming)
    .replace(/\{\{BACKGROUND_INSTRUCTION\}\}/g, values.backgroundInstruction)
    .replace(/\{\{POSITIVE_PROMPT\}\}/g, values.positivePrompt)
    .replace(/\{\{NEGATIVE_PROMPT\}\}/g, values.negativePrompt)
}
