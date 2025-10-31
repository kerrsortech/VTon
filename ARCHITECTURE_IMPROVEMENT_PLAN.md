# Virtual Try-On Architecture Improvement Plan

## Current Issues

1. **Inconsistent Output Quality**: Generic prompts don't account for category-specific requirements (sunglasses vs T-shirts vs shoes)
2. **Unconstrained Category Detection**: Gemini returns free-form categories, not aligned with supported categories
3. **Weak Body Reconstruction**: Basic filename-based detection, not reliable for production
4. **Generic Prompt Template**: One-size-fits-all approach doesn't optimize for different product types
5. **No Category-Specific Rules**: Missing specialized framing, scale, and positioning logic per category

## Solution Architecture

### 1. Category Normalization System
- Map any client-provided category/subcategory to our standardized category taxonomy
- Create category hierarchy: Main Category → Category Type → Product Class
- Example: "Men's Clothing" > "T-Shirts & Polos" → Normalize to "Clothing_Upper"

### 2. Category-Aware Prompt Templates
- **Headwear Category** (Sunglasses, Optical Glasses, Hats): Head-and-shoulders framing, focus on facial features
- **Clothing Category** (T-Shirts, Jackets, etc.): Upper-body to full-body depending on garment type
- **Footwear Category**: Full-body mandatory, focus on feet positioning
- **Accessories Category** (Watches, Jewelry, Bags): Mid-shot to upper-body, product visibility priority
- **Lower Body Category** (Pants, Jeans, Shorts): Full-body mandatory, natural standing pose

### 3. Enhanced Body Reconstruction Logic
- Use image analysis (aspect ratio + content detection) instead of filename heuristics
- Category-aware reconstruction: 
  - Head-only + Footwear → Full body reconstruction required
  - Head-only + Clothing → Upper body reconstruction sufficient
  - Upper-body + Lower body items → Full body extension

### 4. Category-Specific Generation Rules

Each category gets:
- **Optimal Framing**: Pre-defined framing rules (head-and-shoulders, mid-shot, full-body)
- **Scale Ratios**: Pre-calculated product-to-head ratios per category
- **Camera Settings**: Category-specific focal length and positioning hints
- **Pose Requirements**: Natural poses that showcase the product best
- **Body Reconstruction Strategy**: When and how to reconstruct missing body parts

### 5. Two-Stage Analysis Pipeline

**Stage 1: Category Normalization**
- Map client category → Standard category → Category Type (headwear/clothing/footwear/accessory)
- Determine if body reconstruction needed based on category + user photo analysis

**Stage 2: Enhanced Gemini Analysis**
- Constrain Gemini to use our supported categories only
- Provide category-specific guidance in the analysis prompt
- Get detailed metadata aligned with category requirements

### 6. Fallback & Validation System
- Validate Gemini output matches supported categories
- Automatic fallback to category defaults if analysis fails
- Quality scoring system to detect low-confidence outputs
- Retry logic with stricter prompts if validation fails

## Implementation Plan

### Phase 1: Category Infrastructure
1. Create `lib/categories.ts` with normalized category mapping
2. Build category classifier utility (maps input → standardized category)
3. Create category type enums (HEADWEAR, CLOTHING_UPPER, CLOTHING_LOWER, FOOTWEAR, ACCESSORY)

### Phase 2: Category-Specific Prompt Templates
1. Create template library in `lib/category-prompts.ts`
2. Each template has category-optimized instructions
3. Template selector picks appropriate template based on category

### Phase 3: Enhanced Analysis
1. Update `analyze-product` to accept category constraints
2. Add category-specific analysis prompts
3. Enhance body detection using image analysis (not just filename)

### Phase 4: Generation Pipeline Updates
1. Update `try-on` route to use category-aware templates
2. Implement category-specific fallbacks and defaults
3. Add validation and retry logic

### Phase 5: Quality Assurance
1. Add output validation checks
2. Implement quality scoring
3. Create monitoring/logging for category-specific performance

## Expected Improvements

1. **Consistency**: Category-specific templates ensure uniform output quality
2. **Accuracy**: Constrained category detection reduces errors
3. **Edge Case Handling**: Better body reconstruction for head-only uploads
4. **Scalability**: Easy to add new categories with predefined templates
5. **Maintainability**: Centralized category logic, easier to update rules

## Category Mapping Strategy

**Supported Category Types:**
- `HEADWEAR` → Sunglasses, Optical Glasses, Caps, Hats, Beanies
- `CLOTHING_UPPER` → T-Shirts, Shirts, Hoodies, Sweaters, Jackets
- `CLOTHING_LOWER` → Jeans, Trousers, Shorts, Skirts
- `CLOTHING_FULL` → Dresses, Jumpsuits
- `FOOTWEAR` → All shoe types
- `ACCESSORY_BODY` → Necklaces, Earrings, Watches, Bracelets
- `ACCESSORY_CARRY` → Bags, Backpacks, Wallets
- `ACCESSORY_OTHER` → Belts, Scarves, Gloves

**Mapping Logic:**
- Client provides: "Men's Clothing" > "T-Shirts & Polos"
- System maps to: `CLOTHING_UPPER` → Uses clothing-upper template
- Gemini constrained to return: "T-Shirt" or "Polo" (not free-form)

## Technical Decisions

1. **Keep Hybrid Approach**: Template-based with AI analysis (best of both worlds)
2. **Category Normalization Layer**: Pre-process before Gemini analysis
3. **Template Hierarchy**: Base template + category-specific overrides
4. **Smart Defaults**: Category-specific defaults when Gemini analysis fails
5. **Progressive Enhancement**: If basic analysis fails, fall back to category defaults gracefully

