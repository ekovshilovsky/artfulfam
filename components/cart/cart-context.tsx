"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import type { ShopifyProduct, ProductVariant } from "@/lib/shopify/types"
import { createCartAction, addToCartAction, getCartAction } from "@/lib/shopify/actions"

type CartItem = {
  variantId: string
  productTitle: string
  variantTitle: string
  quantity: number
  price: string
  currencyCode: string
  image?: string
  handle: string
}

type CartContextType = {
  items: CartItem[]
  addItem: (variant: ProductVariant, product: Pick<ShopifyProduct, "title" | "handle">) => Promise<void>
  removeItem: (variantId: string) => void
  clearCart: () => void
  itemCount: number
  totalPrice: string
  checkoutUrl: string | null
  isLoading: boolean
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [cartId, setCartId] = useState<string | null>(null)
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCartId = localStorage.getItem("shopify-cart-id")
    if (savedCartId) {
      setCartId(savedCartId)
      getCartAction(savedCartId).then((result) => {
        if (result.success && result.cart) {
          const cartItems = result.cart.lines.edges.map((edge) => ({
            variantId: edge.node.merchandise.id,
            productTitle: edge.node.merchandise.product.title,
            variantTitle: edge.node.merchandise.title,
            quantity: edge.node.quantity,
            price: edge.node.merchandise.price.amount,
            currencyCode: edge.node.merchandise.price.currencyCode,
            image: edge.node.merchandise.product.images.edges[0]?.node.url,
            handle: edge.node.merchandise.product.handle || "",
          }))
          setItems(cartItems)
          setCheckoutUrl(result.cart.checkoutUrl)
        }
      })
    }
  }, [])

  const addItem = async (variant: ProductVariant, product: Pick<ShopifyProduct, "title" | "handle">) => {
    setIsLoading(true)
    try {
      let currentCartId = cartId

      // Create cart if it doesn't exist
      if (!currentCartId) {
        const result = await createCartAction()
        if (!result.success || !result.cart) {
          throw new Error(result.error || "Failed to create cart")
        }
        currentCartId = result.cart.id
        setCartId(currentCartId)
        localStorage.setItem("shopify-cart-id", currentCartId)
      }

      const result = await addToCartAction(currentCartId, variant.id, 1)
      if (!result.success || !result.cart) {
        throw new Error(result.error || "Failed to add item")
      }

      // Update local state
      const cartItems = result.cart.lines.edges.map((edge) => ({
        variantId: edge.node.merchandise.id,
        productTitle: edge.node.merchandise.product.title,
        variantTitle: edge.node.merchandise.title,
        quantity: edge.node.quantity,
        price: edge.node.merchandise.price.amount,
        currencyCode: edge.node.merchandise.price.currencyCode,
        image: edge.node.merchandise.product.images.edges[0]?.node.url,
        handle: edge.node.merchandise.product.handle || "",
      }))

      setItems(cartItems)
      setCheckoutUrl(result.cart.checkoutUrl)
    } catch (error) {
      console.error("Error adding item to cart:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const removeItem = (variantId: string) => {
    setItems((prevItems) => prevItems.filter((item) => item.variantId !== variantId))
  }

  const clearCart = () => {
    setItems([])
    setCartId(null)
    setCheckoutUrl(null)
    localStorage.removeItem("shopify-cart-id")
  }

  const itemCount = items.reduce((total, item) => total + item.quantity, 0)

  const totalPrice =
    items.length > 0
      ? new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: items[0].currencyCode,
        }).format(items.reduce((total, item) => total + Number.parseFloat(item.price) * item.quantity, 0))
      : "$0.00"

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        clearCart,
        itemCount,
        totalPrice,
        checkoutUrl,
        isLoading,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider")
  }
  return context
}
