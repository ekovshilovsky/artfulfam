"use client"

import { Button } from "@/components/ui/button"
import { useCart } from "./cart-context"
import type { ProductVariant } from "@/lib/shopify/types"
import { useState } from "react"
import { Loader2, ShoppingCart, Zap } from "lucide-react"
import { buyNowAction } from "@/lib/shopify/actions"

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
  const [buyNowLoading, setBuyNowLoading] = useState(false)

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

  const handleBuyNow = async () => {
    if (!variant?.availableForSale) return

    setBuyNowLoading(true)
    try {
      const result = await buyNowAction(variant.id, 1)
      if (result.success && result.checkoutUrl) {
        // Redirect to Shopify checkout
        window.location.href = result.checkoutUrl
      } else {
        console.error("Failed to create checkout:", result.error)
      }
    } catch (error) {
      console.error("Error with buy now:", error)
    } finally {
      setBuyNowLoading(false)
    }
  }

  const loading = isLoading || localLoading
  const isDisabled = !variant?.availableForSale

  return (
    <div className="flex flex-col sm:flex-row gap-3 mb-6">
      <Button
        size="lg"
        variant="outline"
        className="w-full sm:w-auto"
        disabled={isDisabled || loading}
        onClick={handleAddToCart}
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Adding...
          </>
        ) : (
          <>
            <ShoppingCart className="mr-2 h-4 w-4" />
            Add to Cart
          </>
        )}
      </Button>
      <Button
        size="lg"
        className="w-full sm:w-auto"
        disabled={isDisabled || buyNowLoading}
        onClick={handleBuyNow}
      >
        {buyNowLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <Zap className="mr-2 h-4 w-4" />
            Buy Now
          </>
        )}
      </Button>
    </div>
  )
}
