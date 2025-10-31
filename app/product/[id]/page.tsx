import { notFound } from "next/navigation"
import { getProductById } from "@/lib/demo-products"
import { ProductView } from "@/components/product-view"

interface ProductPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { id } = await params
  const product = getProductById(id)

  if (!product) {
    notFound()
  }

  return <ProductView product={product} />
}
