"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

export default function CartRedirectPage() {
  const router = useRouter()
  const [message, setMessage] = useState("Sending you to checkout…")

  useEffect(() => {
    const checkoutUrl = localStorage.getItem("shopify-checkout-url")
    if (checkoutUrl) {
      window.location.assign(checkoutUrl)
      return
    }

    const cartId = localStorage.getItem("shopify-cart-id")
    if (!cartId) {
      setMessage("Your cart is empty.")
      router.replace("/products")
      return
    }

    ;(async () => {
      try {
        const response = await fetch("/api/checkout-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cartId }),
        })

        if (!response.ok) {
          throw new Error(`Failed to fetch checkout URL: ${response.status}`)
        }

        const data = (await response.json()) as { checkoutUrl?: string }
        if (data.checkoutUrl) {
          localStorage.setItem("shopify-checkout-url", data.checkoutUrl)
          window.location.assign(data.checkoutUrl)
          return
        }

        setMessage("Your cart is empty.")
        router.replace("/products")
      } catch (error) {
        console.error(error)
        setMessage("Could not start checkout.")
        router.replace("/products")
      }
    })()
  }, [router])

  return (
    <main className="container mx-auto px-4 py-10">
      <p className="text-sm text-muted-foreground">{message}</p>
    </main>
  )
}

