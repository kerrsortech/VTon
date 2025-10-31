# Closelook Virtual Try-On Plugin

A revolutionary virtual try-on system powered by Replicate's SeeDream-4 AI that creates photoreal images of customers wearing products.

## Features

- **Floating Upload Widget**: Easy-to-use widget that floats on product pages
- **AI-Powered Try-On**: Generates photoreal images using Replicate SeeDream-4
- **Model/User Toggle**: Switch between model photos and personalized try-on results
- **Download & Share**: Download try-on images and share on social media
- **Demo Store**: Complete e-commerce demo with 8 sample products

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **UI**: Shadcn/ui + Tailwind CSS v4
- **AI**: Replicate SeeDream-4 via Replicate SDK
- **Styling**: Tailwind CSS with custom design tokens

## Getting Started

1. **Install dependencies**:
   \`\`\`bash
   npm install
   \`\`\`

2. **Set up environment variables**:
   Create a `.env.local` file in the root directory:
   \`\`\`bash
   REPLICATE_API_TOKEN=your_replicate_api_token_here
   \`\`\`
   
   Get your API token from: https://replicate.com/account/api-tokens

3. **Run the development server**:
   \`\`\`bash
   npm run dev
   \`\`\`

4. **Open the demo store**:
   Navigate to `http://localhost:3000`

## Project Structure

\`\`\`
├── app/
│   ├── api/
│   │   ├── try-on/          # Main try-on generation endpoint
│   │   ├── analyze-product/ # Product analysis endpoint
│   │   └── generate-image/  # Generic image generation endpoint
│   ├── product/[id]/        # Product detail pages
│   └── page.tsx             # Homepage with product grid
├── components/
│   ├── closelook-widget.tsx      # Floating upload widget
│   ├── closelook-provider.tsx    # Context provider for state
│   ├── product-view.tsx          # Product page with try-on
│   ├── product-chatbot.tsx       # AI shopping assistant
│   ├── try-on-actions.tsx        # Download/share functionality
│   └── ui/                       # Shadcn UI components
└── lib/
    ├── closelook-plugin/         # Plugin architecture
    │   ├── adapters/             # Platform adapters (Shopify, WooCommerce, etc.)
    │   ├── types/                # TypeScript types
    │   └── config.ts             # Plugin configuration
    └── demo-products.ts          # Sample product data
\`\`\`

## API Endpoints

### POST /api/try-on

Generates a photoreal try-on image using Replicate SeeDream-4 API.

**Request (FormData)**:
- `userPhoto`: File - User's photo
- `productImage`: File - Product image
- `productName`: string - Product name
- `productCategory`: string - Product category

**Response**:
\`\`\`json
{
  "imageUrl": "https://replicate.delivery/...",
  "productName": "Nike ZoomX Vomero Plus",
  "metadata": { 
    "model": "bytedance/seedream-4", 
    "timestamp": "...",
    "productAnalysis": { ... }
  }
}
\`\`\`

### POST /api/analyze-product

Analyzes product images to extract category and description using Replicate's vision models.

**Request (FormData)**:
- `productImage`: File - Product image to analyze

**Response**:
\`\`\`json
{
  "success": true,
  "metadata": {
    "productCategory": "Running Shoes",
    "shortDescription": "White and blue athletic running shoes..."
  }
}
\`\`\`

### POST /api/generate-image

Generic image generation with custom prompts using Replicate SeeDream-4.

**Request (FormData)**:
- `image1`: File - First input image
- `image2`: File - Second input image
- `prompt`: string - Custom generation prompt

**Response**:
\`\`\`json
{
  "imageUrl": "https://replicate.delivery/...",
  "metadata": { "model": "bytedance/seedream-4", "timestamp": "..." }
}
\`\`\`

## Prompt Engineering

The system uses sophisticated prompts that ensure:
- **Facial Fidelity**: Exact preservation of facial features
- **Skin Tone Consistency**: Uniform skin tone across all visible body parts
- **Clothing Fit Accuracy**: Maintains original garment fit (loose/fitted)
- **Professional Quality**: Studio-grade backgrounds and lighting

Prompts are automatically customized based on product category (shoes, accessories, clothing, etc.).

## Usage

### Basic Integration

\`\`\`tsx
import { CloselookWidget } from "@/components/closelook-widget"
import { CloselookProvider } from "@/components/closelook-provider"

function ProductPage({ product }) {
  return (
    <CloselookProvider>
      <div>
        {/* Your product page content */}
        <CloselookWidget 
          product={product}
          onTryOnComplete={(result) => console.log(result)}
        />
      </div>
    </CloselookProvider>
  )
}
\`\`\`

### Using the Context

\`\`\`tsx
import { useCloselook } from "@/components/closelook-provider"

function MyComponent() {
  const { getTryOnResult, addTryOnResult } = useCloselook()
  
  const result = getTryOnResult(productId)
  // Use the try-on result
}
\`\`\`

## Plugin Architecture

Closelook is built with a modular plugin architecture that supports multiple e-commerce platforms:

### Supported Platforms
- **Demo Mode**: Static product data (current implementation)
- **Shopify**: Coming soon
- **WooCommerce**: Coming soon
- **Custom**: Extensible adapter system

### Creating Custom Adapters

\`\`\`typescript
import { ProductAdapter } from "@/lib/closelook-plugin/adapters/base-adapter"

class MyPlatformAdapter extends ProductAdapter {
  async getProduct(id: string) {
    // Fetch from your platform
  }
  
  async getAllProducts() {
    // Fetch all products
  }
}
\`\`\`

See `lib/closelook-plugin/README.md` for detailed integration guides.

## Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Import your repository in Vercel
3. Add the environment variable in Vercel dashboard:
   - `REPLICATE_API_TOKEN`: Your Replicate API token

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

### Environment Variables

The app requires the following environment variable:

- `REPLICATE_API_TOKEN` (required): Your Replicate API token from https://replicate.com/account/api-tokens

You can add this in the Vercel dashboard under Settings > Environment Variables, or in the v0 Vars section of the in-chat sidebar.

## Customization

### Adding Products

Edit `lib/demo-products.ts` to add or modify products:

\`\`\`ts
{
  id: "unique-id",
  name: "Product Name",
  category: "Clothing|Footwear|Accessories",
  type: "Specific Type",
  color: "Color",
  price: 99,
  images: ["/path/to/image.jpg"],
  description: "Product description"
}
\`\`\`

### Customizing Prompts

Modify the `buildDynamicTryOnPrompt` function in `app/api/try-on/route.ts` to adjust AI generation behavior.

### Styling

Update design tokens in `app/globals.css` to match your brand:

\`\`\`css
:root {
  --primary: oklch(...);
  --background: oklch(...);
  /* etc */
}
\`\`\`

## License

MIT

## Support

For issues or questions, please open an issue on GitHub.
