"use client"

import { Button } from "@/components/ui/button"
import { useCart } from "./cart-context"
import type { ProductVariant } from "@/lib/shopify/types"
import { useState } from "react"
import { Loader2 } from "lucide-react"

export function AddToCart({
  variant,
  productTitle,
  productHandle,
}: {
  variant: ProductVariant
  productTitle: string
  productHandle: string
}) {
  const { addItem, isLoading } = useCart()
  const [localLoading, setLocalLoading] = useState(false)

  const handleAddToCart = async () => {
    if (!variant?.availableForSale) return

    setLocalLoading(true)
    try {
      await addItem(variant, {
        title: productTitle,
        handle: productHandle,
      })
    } catch (error) {
      console.error("Error adding to cart:", error)
    } finally {
      setLocalLoading(false)
    }
  }

  const loading = isLoading || localLoading

  return (
    <Button
      size="lg"
      className="w-full md:w-auto"
      disabled={!variant?.availableForSale || loading}
      onClick={handleAddToCart}
    >
      {loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Adding...
        </>
      ) : (
        "Add to Cart"
      )}
    </Button>
  )
}
