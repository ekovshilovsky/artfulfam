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
  const [localBuyNowLoading, setLocalBuyNowLoading] = useState(false)

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

    setLocalBuyNowLoading(true)
    try {
      const checkoutUrl = await addItem(variant, {
        title: productTitle,
        handle: productHandle,
      })

      if (checkoutUrl) {
        window.location.assign(checkoutUrl)
      }
    } catch (error) {
      console.error("Error buying now:", error)
    } finally {
      setLocalBuyNowLoading(false)
    }
  }

  const addToCartLoading = isLoading || localLoading
  const buyNowLoading = isLoading || localBuyNowLoading

  return (
    <div className="flex flex-col gap-3 w-full md:flex-row">
      <Button
        size="lg"
        className="w-full md:w-auto"
        disabled={!variant?.availableForSale || addToCartLoading}
        onClick={handleAddToCart}
      >
        {addToCartLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Adding...
          </>
        ) : (
          "Add to Cart"
        )}
      </Button>

      <Button
        size="lg"
        variant="secondary"
        className="w-full md:w-auto"
        disabled={!variant?.availableForSale || buyNowLoading}
        onClick={handleBuyNow}
      >
        {buyNowLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Redirecting...
          </>
        ) : (
          "Buy Now"
        )}
      </Button>
    </div>
  )
}
