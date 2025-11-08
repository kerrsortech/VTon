# Closelook Virtual Try-On Shopify Plugin

A revolutionary virtual try-on system powered by AI that creates photoreal images of customers wearing products. This is a Shopify app that can be installed in any Shopify store.

## Features

- **Floating Upload Widget**: Easy-to-use widget that floats on product pages
- **AI-Powered Try-On**: Generates photoreal images using advanced AI models
- **AI Shopping Assistant**: Chatbot for product recommendations and questions
- **Model/User Toggle**: Switch between model photos and personalized try-on results
- **Download & Share**: Download try-on images and share on social media

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **UI**: Shadcn/ui + Tailwind CSS v4
- **AI**: Advanced image generation and analysis models
- **Platform**: Shopify App with theme app extensions

## Getting Started

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Set Up Environment Variables

Create a `.env.local` file in the root directory:

```bash
# Shopify App Configuration
SHOPIFY_API_KEY=your_shopify_api_key
SHOPIFY_API_SECRET=your_shopify_api_secret
SHOPIFY_APP_URL=http://localhost:3000
SHOPIFY_SCOPES=read_products,read_content,read_orders,read_customers,write_customers
SHOPIFY_SESSION_SECRET=generate_a_random_secret_key

# Database
DATABASE_URL=your_postgresql_connection_string

# AI Services
REPLICATE_API_TOKEN=your_api_token_here
GOOGLE_GEMINI_API_KEY=your_api_key_here

# Optional
ENABLE_STRUCTURED_LOGGING=true
```

### 3. Initialize Database

```bash
pnpm db:init
pnpm db:migrate
```

### 4. Run Development Server

```bash
# Run Next.js app
pnpm dev

# Or run with Shopify CLI
pnpm shopify:dev
```

## Project Structure

```
├── app/
│   ├── api/                    # API routes
│   │   ├── try-on/            # Try-on generation endpoint
│   │   ├── chat/              # Chatbot endpoint
│   │   └── shopify/           # Shopify OAuth and webhooks
│   ├── admin/                 # Admin dashboard
│   └── install/               # App installation flow
├── components/                # React components
│   ├── closelook-widget.tsx   # Try-on widget component
│   ├── global-chatbot.tsx     # Chatbot component
│   └── ui/                    # Shadcn UI components
├── extensions/                 # Shopify theme app extensions
│   ├── chatbot-widget/        # Chatbot extension
│   └── closelook-widgets-extension/  # Try-on widget extension
├── widgets/                    # Standalone widget bundles
│   ├── chatbot-widget/        # Chatbot widget source
│   └── try-on-widget/         # Try-on widget source
├── lib/                       # Core library code
│   ├── closelook-plugin/      # Plugin architecture
│   │   ├── adapters/          # Platform adapters (Shopify, Demo)
│   │   └── types/             # TypeScript types
│   └── shopify/               # Shopify integration utilities
└── scripts/                   # Utility scripts
    ├── init-db.js             # Database initialization
    └── migrate-db.js          # Database migrations
```

## Core Components

### Shopify Extensions

The app includes two Shopify theme app extensions:

1. **Chatbot Widget** (`extensions/chatbot-widget/`)
   - AI shopping assistant
   - Context-aware product recommendations
   - Integrated with Shopify store data

2. **Closelook Widgets** (`extensions/closelook-widgets-extension/`)
   - Virtual try-on widget
   - Product image upload
   - AI-powered image generation

### API Endpoints

- `POST /api/try-on` - Generate try-on images
- `POST /api/chat` - Chatbot API
- `GET /api/shopify/products` - Fetch Shopify products
- `POST /api/shopify/auth/oauth` - OAuth callback
- `POST /api/shopify/webhooks/*` - Webhook handlers

### Plugin Architecture

The plugin uses a modular architecture that supports multiple e-commerce platforms:

- **Demo Adapter**: Static product data for testing
- **Shopify Adapter**: Real-time product data from Shopify stores

See `lib/closelook-plugin/README.md` for detailed integration guides.

## Development

### Build Widgets

```bash
pnpm build:widgets
```

### Database Migrations

```bash
pnpm db:migrate
```

### Production Build

```bash
pnpm build
```

## Deployment

1. Set up environment variables on your hosting platform
2. Run database migrations
3. Deploy the Next.js app
4. Deploy Shopify extensions using Shopify CLI

For detailed deployment instructions, see `docs/archive/` directory.

## License

MIT
