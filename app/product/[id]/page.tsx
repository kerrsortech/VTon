import { notFound } from "next/navigation"
import { getCloselookPlugin } from "@/lib/closelook-plugin"
import { ProductView } from "@/components/product-view"
import type { Product } from "@/lib/closelook-types"
import type { CloselookProduct } from "@/lib/closelook-plugin/types"

interface ProductPageProps {
  params: Promise<{
    id: string
  }>
}

// Helper to convert CloselookProduct to Product for compatibility
function closelookProductToProduct(closelookProduct: CloselookProduct): Product {
  return {
    id: closelookProduct.id,
    name: closelookProduct.name,
    category: closelookProduct.category,
    type: closelookProduct.type,
    color: closelookProduct.color,
    price: closelookProduct.price,
    images: closelookProduct.images,
    description: closelookProduct.description,
    sizes: closelookProduct.sizes,
  }
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { id } = await params
  
  // Use the plugin adapter (currently using demo adapter, but demonstrates Shopify adapter pattern)
  const plugin = getCloselookPlugin()
  const adapter = plugin.getAdapter()
  const closelookProduct = await adapter.getProduct(id)

  if (!closelookProduct) {
    notFound()
  }

  // Convert to Product type for ProductView component
  const product = closelookProductToProduct(closelookProduct)

  return <ProductView product={product} />
}
