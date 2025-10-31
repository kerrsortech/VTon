# Closelook Virtual Try-On Plugin

A revolutionary virtual try-on system powered by Google Gemini 2.5 Flash Image AI that creates photoreal images of customers wearing products.

## Features

- **Floating Upload Widget**: Easy-to-use widget that floats on product pages
- **AI-Powered Try-On**: Generates photoreal images using Google Gemini AI
- **Model/User Toggle**: Switch between model photos and personalized try-on results
- **Download & Share**: Download try-on images and share on social media
- **Demo Mode**: Test the UI without API calls when quota is exceeded
- **Demo Store**: Complete e-commerce demo with 8 sample products

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **UI**: Shadcn/ui + Tailwind CSS v4
- **AI**: Google Gemini 2.5 Flash Image via @google/genai SDK
- **Styling**: Tailwind CSS with custom design tokens

## Getting Started

1. **Install dependencies**:
   \`\`\`bash
   npm install
   \`\`\`

2. **Set up environment variables**:
   Create a `.env.local` file in the root directory:
   \`\`\`bash
   GOOGLE_GEMINI_API_KEY=your_google_gemini_api_key_here
   
   # Optional: Enable demo mode to test UI without API calls
   NEXT_PUBLIC_DEMO_MODE=false
   \`\`\`
   
   Get your API key from: https://aistudio.google.com/apikey

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
│   │   └── generate-image/  # Generic image generation endpoint
│   ├── product/[id]/        # Product detail pages
│   └── page.tsx             # Homepage with product grid
├── components/
│   ├── closelook-widget.tsx      # Floating upload widget
│   ├── closelook-provider.tsx    # Context provider for state
│   ├── product-view.tsx          # Product page with try-on
│   ├── try-on-actions.tsx        # Download/share functionality
│   └── ui/                       # Shadcn UI components
└── lib/
    ├── closelook-types.ts        # TypeScript types
    └── demo-products.ts          # Sample product data
\`\`\`

## API Endpoints

### POST /api/try-on

Generates a photoreal try-on image using Google Gemini API.

**Request (FormData)**:
- `userPhoto`: File - User's photo
- `productImage`: File - Product image
- `productName`: string - Product name
- `productCategory`: string - Product category
- `productType`: string - Product type
- `productColor`: string - Product color

**Response**:
\`\`\`json
{
  "imageUrl": "data:image/png;base64,...",
  "productName": "Nike ZoomX Vomero Plus",
  "metadata": { "model": "gemini-2.5-flash-image", "timestamp": "..." }
}
\`\`\`

### POST /api/generate-image

Generic image generation with custom prompts using Google Gemini API.

**Request (FormData)**:
- `image1`: File - First input image
- `image2`: File - Second input image
- `prompt`: string - Custom generation prompt

**Response**:
\`\`\`json
{
  "imageUrl": "data:image/png;base64,...",
  "metadata": { "model": "gemini-2.5-flash-image", "timestamp": "..." }
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

## Demo Mode

If you encounter API quota limits or want to test the UI without making real API calls, enable **Demo Mode**:

1. Set the environment variable:
   \`\`\`bash
   NEXT_PUBLIC_DEMO_MODE=true
   \`\`\`

2. In demo mode:
   - No API calls are made to Google Gemini
   - The uploaded user photo is returned as a placeholder
   - All UI flows work normally for testing and demonstration
   - A blue info banner indicates demo mode is active

This is useful for:
- Testing the UI when API quota is exceeded
- Demonstrating the plugin to stakeholders
- Development without consuming API credits

## Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Import your repository in Vercel
3. Add the environment variables in Vercel dashboard:
   - `GOOGLE_GEMINI_API_KEY`: Your Google Gemini API key
   - `NEXT_PUBLIC_DEMO_MODE`: Set to `true` for demo mode (optional)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

### Environment Variables

The app supports the following environment variables:

- `GOOGLE_GEMINI_API_KEY` (required): Your Google Gemini API key from https://aistudio.google.com/apikey
- `NEXT_PUBLIC_DEMO_MODE` (optional): Set to `true` to enable demo mode without API calls

You can add these in the Vercel dashboard under Settings > Environment Variables, or in the v0 Vars section of the in-chat sidebar.

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

Modify the `generateCloselookPrompt` function in `app/api/try-on/route.ts` to adjust AI generation behavior.

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
