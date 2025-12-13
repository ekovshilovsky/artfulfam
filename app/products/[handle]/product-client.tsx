"use client"

import { useState, useCallback } from "react"
import { Badge } from "@/components/ui/badge"
import { VariantSelector } from "@/components/product/variant-selector"
import { AddToCart } from "@/components/cart/add-to-cart"
import { formatPrice } from "@/lib/shopify/utils"
import type { ShopifyProduct, ProductVariant } from "@/lib/shopify/types"

export function ProductClient({ product }: { product: ShopifyProduct }) {
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant>(product.variants.edges[0]?.node)

  const handleVariantChange = useCallback((variant: ProductVariant) => {
    setSelectedVariant(variant)
  }, [])

  const price = selectedVariant
    ? formatPrice(selectedVariant.price.amount, selectedVariant.price.currencyCode)
    : formatPrice(product.priceRange.minVariantPrice.amount, product.priceRange.minVariantPrice.currencyCode)

  return (
    <>
      <div className="flex items-center gap-3 mb-6">
        <span className="text-3xl font-bold text-primary">{price}</span>
        {selectedVariant?.availableForSale ? (
          <Badge variant="outline" className="text-green-600 border-green-600">
            In Stock
          </Badge>
        ) : (
          <Badge variant="outline" className="text-red-600 border-red-600">
            Out of Stock
          </Badge>
        )}
      </div>

      {/* Variant Selector - shows size, color, etc. options */}
      {product.options.length > 0 && product.options[0].values.length > 1 && (
        <div className="mb-6">
          <VariantSelector
            options={product.options}
            variants={product.variants.edges}
            onVariantChange={handleVariantChange}
          />
        </div>
      )}

      <AddToCart variant={selectedVariant} productTitle={product.title} productHandle={product.handle} />
    </>
  )
}
