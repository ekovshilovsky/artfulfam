import { NextResponse } from "next/server"
import { getCart as shopifyGetCart } from "@/lib/shopify"

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { cartId?: string }
    const cartId = body.cartId

    if (!cartId || typeof cartId !== "string") {
      return NextResponse.json({ checkoutUrl: null }, { status: 400 })
    }

    const cart = await shopifyGetCart(cartId)
    return NextResponse.json({ checkoutUrl: cart?.checkoutUrl ?? null })
  } catch (error) {
    console.error("[checkout-url] Error:", error)
    return NextResponse.json({ checkoutUrl: null }, { status: 500 })
  }
}

