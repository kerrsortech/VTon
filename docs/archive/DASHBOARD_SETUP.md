# Analytics Dashboard

Complete analytics dashboard setup for Shopify store owners.

## Overview

A complete B2B analytics dashboard for Shopify store owners to monitor try-on usage, conversions, and plan limits. The dashboard provides real-time insights into:

**For deployment instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md).**

- **Try-On Analytics**: Track total try-ons, top products, and usage patterns
- **Conversion Tracking**: Monitor conversions from try-ons to orders
- **Plan Management**: View current plan limits and usage status
- **Product Performance**: See which products get the most try-ons and their conversion rates

## Database Setup

### Migration

Run the analytics database migration:

```bash
psql $DATABASE_URL < lib/db/migrations/002_create_analytics_schema.sql
```

Or if using Neon:

```bash
psql $DATABASE_URL < lib/db/migrations/002_create_analytics_schema.sql
```

### Schema

The migration creates:

1. **stores** - Merchant/store information with plan details
2. **try_on_events** - All try-on events per store and product
3. **orders** - Shopify orders tracked for conversion analysis
4. **order_conversions** - Links try-ons to orders (conversion tracking)

## Features

### Dashboard Page

Access the dashboard at `/admin?shop=your-store.myshopify.com`

**Features:**
- Overview statistics (Total Try-Ons, Orders, Conversions, Conversion Rate)
- Time range filters (7 days, 30 days, 90 days, All time)
- Plan usage display with progress bars
- Top products table with try-on counts and conversion rates
- Product images and links to Shopify product pages

### Analytics Tracking

**Try-On Events:**
- Automatically tracked when users try on products
- Includes product ID, name, image, URL, and customer information
- Tracked via the `/api/try-on` endpoint

**Orders:**
- Tracked via Shopify webhook `/api/shopify/webhooks/orders-create`
- Automatically matched to try-on events for conversion tracking
- 30-day conversion window (configurable)

**Conversion Calculation:**
- Conversion = Try-on event → Order within 30 days
- Conversion Rate = (Conversions / Total Try-Ons) × 100

## API Endpoints

### Analytics APIs

**GET `/api/analytics/dashboard`**
- Get dashboard statistics and top products
- Query params: `shop` (required), `timeRange` (7d|30d|90d|all)

**POST `/api/analytics/track-try-on`**
- Track a try-on event
- Body: `{ shop_domain, product_id, product_name, ... }`

**POST `/api/analytics/orders`**
- Track an order from Shopify
- Body: `{ shop_domain, shopify_order_id, ... }`

### Webhooks

**POST `/api/shopify/webhooks/orders-create`**
- Shopify webhook handler for order creation
- Automatically tracks orders and matches to try-ons

## Integration

### Try-On Widget

The try-on widget automatically includes tracking data:
- Shop domain (from `window.Shopify.shop`)
- Product ID and information
- Customer ID (if authenticated)
- Customer email (if available)

No additional configuration needed - tracking happens automatically when users try on products.

### Store Setup

Stores are automatically created when they install the app via OAuth:
- OAuth callback creates store record in database
- Default plan: "Free Plan" with 100 try-ons limit
- Plan limits and usage tracked automatically

## Plan Management

### Default Plans

Stores start with the "Free Plan":
- Try-ons: 100
- Orders: 1000

### Updating Plans

Use the `updateStorePlan` function in `lib/db/analytics.ts`:

```typescript
await updateStorePlan(shopDomain, planId, planName, {
  try_ons: 500,
  orders: 5000
})
```

Or update directly in database:
```sql
UPDATE stores
SET plan_id = 'premium',
    plan_name = 'Premium Plan',
    plan_limits = '{"try_ons": 500, "orders": 5000}'::jsonb
WHERE shop_domain = 'store.myshopify.com';
```

## Dashboard UI Features

### Statistics Cards
- **Total Try-Ons**: All-time and period-specific
- **Total Orders**: All-time and period-specific
- **Conversions**: All-time and period-specific
- **Conversion Rate**: Overall and period-specific

### Plan Usage Card
- Current plan name
- Usage progress bars for try-ons and orders
- Shows used / total (e.g., "45 / 100")

### Top Products Table
- Product image, name, and link
- Try-on count
- Order count
- Conversion rate percentage
- Sorted by try-on count

### Time Filters
- 7 Days
- 30 Days
- 90 Days
- All Time

## Webhook Configuration

### Shopify Setup

1. Go to Shopify Admin → Settings → Notifications → Webhooks
2. Create webhook:
   - Event: Order creation
   - Format: JSON
   - URL: `https://your-domain.com/api/shopify/webhooks/orders-create`
   - HMAC verification: Enabled (if implemented)

## Usage Tracking

Usage is automatically updated:
- Try-on events increment `plan_usage.try_ons`
- Orders increment `plan_usage.orders`
- Updates happen in real-time

## Data Flow

1. **User tries on product** → Try-on event tracked
2. **User purchases product** → Order webhook received
3. **System matches order to try-on** → Conversion created
4. **Dashboard displays** → Real-time analytics

## Production Checklist

- [ ] Database migration run successfully
- [ ] Webhook configured in Shopify
- [ ] OAuth flow creates store records
- [ ] Try-on tracking working
- [ ] Order tracking working
- [ ] Dashboard accessible to store owners
- [ ] Plan limits configured
- [ ] Usage tracking accurate

## Future Enhancements

- Plan upgrade flows
- Email notifications for plan limits
- More detailed analytics (revenue, AOV, etc.)
- Export functionality
- Custom date ranges
- Product-level insights
- Customer journey tracking

