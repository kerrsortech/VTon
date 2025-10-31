/**
 * Production-Ready Validators
 * Comprehensive validation for production deployment
 */

import type { File } from "@web-std/file"

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

/**
 * Validates user photo for try-on generation
 */
export function validateUserPhoto(file: File): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // File size validation (max 10MB for reasonable processing)
  const maxSize = 10 * 1024 * 1024 // 10MB
  if (file.size > maxSize) {
    errors.push(`Image size too large: ${(file.size / 1024 / 1024).toFixed(2)}MB. Maximum allowed: 10MB`)
  }

  // Minimum size validation (too small images won't work well)
  const minSize = 10 * 1024 // 10KB
  if (file.size < minSize) {
    errors.push("Image file is too small or corrupted")
  }

  // Format validation
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/avif"]
  if (!allowedTypes.includes(file.type.toLowerCase())) {
    errors.push(`Unsupported image format: ${file.type}. Supported formats: JPEG, PNG, WebP, AVIF`)
  }

  // Name validation (basic check)
  if (!file.name || file.name.trim().length === 0) {
    warnings.push("Image file has no name")
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Validates product image(s) for try-on generation
 */
export function validateProductImages(files: File[]): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (!files || files.length === 0) {
    errors.push("At least one product image is required")
    return { isValid: false, errors, warnings }
  }

  // Maximum number of product images
  const maxImages = 5
  if (files.length > maxImages) {
    warnings.push(`Too many product images: ${files.length}. Using first ${maxImages} images.`)
  }

  // Validate each image
  files.forEach((file, index) => {
    const maxSize = 15 * 1024 * 1024 // 15MB per product image
    if (file.size > maxSize) {
      errors.push(`Product image ${index + 1} size too large: ${(file.size / 1024 / 1024).toFixed(2)}MB`)
    }

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/avif"]
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      errors.push(`Product image ${index + 1} has unsupported format: ${file.type}`)
    }

    const minSize = 10 * 1024 // 10KB
    if (file.size < minSize) {
      errors.push(`Product image ${index + 1} is too small or corrupted`)
    }
  })

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Validates product metadata from analysis
 */
export function validateProductMetadata(metadata: {
  productCategory?: string
  detailedVisualDescription?: string
  imageGenerationPrompt?: string
  userCharacteristics?: any
}): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Category validation
  if (!metadata.productCategory || metadata.productCategory === "Unknown") {
    warnings.push("Product category is unknown - using fallback category defaults")
  }

  // Description validation
  if (!metadata.detailedVisualDescription || metadata.detailedVisualDescription === "Unknown") {
    warnings.push("Product visual description is missing - using fallback description")
  } else if (metadata.detailedVisualDescription.length < 20) {
    warnings.push("Product visual description is too short")
  }

  // Image generation prompt validation
  if (!metadata.imageGenerationPrompt || metadata.imageGenerationPrompt === "Unknown") {
    warnings.push("Image generation prompt is missing - using fallback prompt")
  } else if (metadata.imageGenerationPrompt.length < 50) {
    warnings.push("Image generation prompt is too short - may affect output quality")
  }

  // User characteristics validation
  if (!metadata.userCharacteristics || typeof metadata.userCharacteristics !== "object") {
    warnings.push("User characteristics are missing - using default characteristics")
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Validates generated image URL
 */
export function validateGeneratedImageUrl(imageUrl: string | undefined): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (!imageUrl) {
    errors.push("Generated image URL is missing")
    return { isValid: false, errors, warnings }
  }

  if (typeof imageUrl !== "string") {
    errors.push("Generated image URL must be a string")
    return { isValid: false, errors, warnings }
  }

  // Check if it's a valid URL
  try {
    const url = new URL(imageUrl)
    if (!["http:", "https:"].includes(url.protocol)) {
      errors.push("Generated image URL must use HTTP or HTTPS protocol")
    }
  } catch {
    // If it's not a full URL, check if it's a data URL
    if (!imageUrl.startsWith("data:image/") && !imageUrl.startsWith("http")) {
      errors.push("Generated image URL is not a valid URL or data URL")
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Validates prompt before sending to image generation
 */
export function validatePrompt(prompt: string): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (!prompt || prompt.trim().length === 0) {
    errors.push("Prompt is empty")
    return { isValid: false, errors, warnings }
  }

  // Minimum length check
  if (prompt.length < 200) {
    warnings.push("Prompt is quite short - may affect output quality")
  }

  // Check for critical placeholders that weren't replaced
  const placeholders = [
    "{{USER_IMAGE_URL}}",
    "{{PRODUCT_IMAGE_URLS}}",
    "{{PRODUCT_CATEGORY}}",
    "{{TARGET_FRAMING}}",
    "{{CAMERA_HINT}}",
  ]

  const unreplacedPlaceholders = placeholders.filter((placeholder) => prompt.includes(placeholder))
  if (unreplacedPlaceholders.length > 0) {
    errors.push(`Unreplaced placeholders found: ${unreplacedPlaceholders.join(", ")}`)
  }

  // Check for critical single-person enforcement
  if (!prompt.includes("ONE person") && !prompt.includes("single person") && !prompt.includes("one person")) {
    warnings.push("Prompt may not have strong single-person enforcement")
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Sanitizes product category string for safe use in prompts
 */
export function sanitizeCategory(category: string): string {
  if (!category || category === "Unknown") {
    return "Fashion Accessory"
  }

  // Remove special characters that might break prompts
  let sanitized = category
    .trim()
    .replace(/[<>{}[\]]/g, "")
    .replace(/\n/g, " ")
    .replace(/\s+/g, " ")

  // Limit length
  if (sanitized.length > 100) {
    sanitized = sanitized.substring(0, 100).trim()
  }

  return sanitized
}

/**
 * Sanitizes product description for safe use in prompts
 */
export function sanitizeDescription(description: string): string {
  if (!description || description === "Unknown") {
    return "A stylish fashion product with premium design and quality materials."
  }

  // Remove special characters that might break prompts
  let sanitized = description
    .trim()
    .replace(/[<>{}[\]]/g, "")
    .replace(/\n/g, " ")
    .replace(/\s+/g, " ")

  // Limit length (descriptions should be reasonable)
  if (sanitized.length > 500) {
    sanitized = sanitized.substring(0, 500).trim()
  }

  return sanitized
}

/**
 * Validates that category type mapping worked correctly
 */
export function validateCategoryMapping(
  detectedCategory: string,
  mappedType: string,
): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (!detectedCategory || detectedCategory === "Unknown") {
    warnings.push("Category detection returned unknown - using fallback mapping")
  }

  if (mappedType === "UNKNOWN") {
    warnings.push("Category type mapping resulted in UNKNOWN - using default category config")
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  }
}

