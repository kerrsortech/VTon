# Closelook Virtual Try-On Shopify Plugin

A revolutionary virtual try-on system powered by AI that creates photoreal images of customers wearing products. This is a Shopify app that can be installed in any Shopify store.

## 🎉 Production Ready!

**Your Closelook plugin is fully production-ready!** 

**👉 [START DEPLOYING NOW →](./DEPLOY.md)**

Follow the complete deployment guide to get your plugin live in under 1 hour.

## Features

- **Floating Upload Widget**: Easy-to-use widget that floats on product pages
- **AI-Powered Try-On**: Generates photoreal images using advanced AI models
- **AI Shopping Assistant**: Chatbot for product recommendations and questions
- **Model/User Toggle**: Switch between model photos and personalized try-on results
- **Download & Share**: Download try-on images and share on social media
- **Demo Store**: Complete demo website to test and see the UI

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **UI**: Shadcn/ui + Tailwind CSS v4
- **AI**: Advanced image generation and analysis models
- **Platform**: Shopify App with theme app extensions

## Getting Started

1. **Install dependencies**:
   \`\`\`bash
   pnpm install
   \`\`\`

2. **Set up environment variables**:
   Create a `.env.local` file in the root directory:
   \`\`\`bash
   # Shopify App Configuration
   SHOPIFY_API_KEY=your_shopify_api_key
   SHOPIFY_API_SECRET=your_shopify_api_secret
   SHOPIFY_APP_URL=http://localhost:3000
   SHOPIFY_SCOPES=read_products,read_content
   SHOPIFY_SESSION_SECRET=generate_a_random_secret_key

   # AI Services
   REPLICATE_API_TOKEN=your_api_token_here
   GOOGLE_GEMINI_API_KEY=your_api_key_here

   # Optional
   ENABLE_STRUCTURED_LOGGING=true
   \`\`\`

3. **Run the development server**:
   \`\`\`bash
   pnpm dev
   \`\`\`

4. **Test the demo store**:
   Navigate to `http://localhost:3000` to see the demo UI with chat button

## Deployment

**📘 [Complete Deployment Guide →](./DEPLOY.md)**

Follow the step-by-step guide in `DEPLOY.md` to deploy your plugin to Shopify stores in under 1 hour. Perfect for junior developers!

For more detailed information:
- Database setup: [DATABASE_SETUP.md](./DATABASE_SETUP.md)
- Dashboard setup: [DASHBOARD_SETUP.md](./DASHBOARD_SETUP.md)
- Production readiness: [PRODUCTION_READINESS.md](./PRODUCTION_READINESS.md)

## Project Structure

\`\`\`
├── app/
│   ├── api/
│   │   ├── try-on/          # Main try-on generation endpoint
│   │   ├── chat/            # Chatbot endpoint
│   │   ├── products/       # Products API (for demo)
│   │   └── shopify/        # Shopify OAuth and webhooks
│   ├── product/[id]/       # Demo product detail pages
│   ├── admin/              # Admin dashboard for Shopify app
│   └── page.tsx            # Demo homepage
├── components/
│   ├── closelook-widget.tsx      # Floating upload widget (UI for Shopify)
│   ├── global-chatbot.tsx        # Chat button and chatbot (UI for Shopify)
│   ├── product-view.tsx          # Product page with try-on
│   └── ui/                       # Shadcn UI components
├── shopify-app/
│   └── blocks/                   # Shopify theme app extensions
│       ├── closelook-widget/     # Try-on widget block
│       └── closelook-chatbot/    # Chatbot block
├── widgets/
│   ├── try-on-widget/            # Standalone widget bundle
│   └── chatbot-widget/          # Standalone chatbot bundle
└── lib/
    ├── closelook-plugin/         # Plugin architecture
    │   ├── adapters/             # Platform adapters (Shopify, Demo)
    │   └── types/                # TypeScript types
    └── shopify/                  # Shopify integration utilities
\`\`\`

## UI Components for Shopify

The following components are used in the Shopify plugin:

- **CloselookWidget** (`components/closelook-widget.tsx`): The try-on widget component
- **GlobalChatbot** (`components/global-chatbot.tsx`): The chat button and chatbot interface with integrated upload functionality

These can be customized in this repository and will be reflected in the Shopify plugin UI.

## API Endpoints

### POST /api/try-on

Generates a photoreal try-on image using AI image generation.

**Request (FormData)**:
- `userPhoto`: File - User's photo
- `productImage`: File[] - Product images
- `productName`: string - Product name
- `productCategory`: string - Product category

### POST /api/chat

AI shopping assistant for product recommendations.

**Request (JSON)**:
\`\`\`json
{
  "message": "Show me shoes",
  "conversationHistory": [...],
  "pageContext": "home|product|other",
  "currentProduct": {...},
  "allProducts": [...]
}
\`\`\`

## Plugin Architecture

Closelook uses a modular plugin architecture that supports multiple e-commerce platforms:

- **Demo Adapter**: Static product data for testing
- **Shopify Adapter**: Real-time product data from Shopify stores

See `lib/closelook-plugin/README.md` for detailed integration guides.

## Demo Website

The demo website (`app/page.tsx` and `app/product/[id]/page.tsx`) is kept for:
- Testing the UI components (chat button, upload icon)
- Visual reference for Shopify plugin UI
- Development and debugging

## License

MIT

## Support

For issues or questions, please open an issue on GitHub.
