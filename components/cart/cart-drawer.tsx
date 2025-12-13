"use client"

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { ShoppingBag, X } from "lucide-react"
import { useCart } from "./cart-context"
import Image from "next/image"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"

export function CartDrawer() {
  const { items, removeItem, itemCount, totalPrice, checkoutUrl } = useCart()

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <ShoppingBag className="h-5 w-5" />
          {itemCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs">
              {itemCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg flex flex-col p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b">
          <SheetTitle>Shopping Cart ({itemCount})</SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
            <ShoppingBag className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">Your cart is empty</p>
            <p className="text-sm text-muted-foreground mb-6">Add some amazing artwork to get started!</p>
            <Button asChild>
              <Link href="/products">Browse Products</Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="space-y-4">
                {items.map((item) => (
                  <div key={item.variantId} className="flex gap-4 pb-4 border-b last:border-b-0">
                    <div className="relative w-20 h-20 rounded overflow-hidden bg-muted flex-shrink-0">
                      {item.image ? (
                        <Image
                          src={item.image || "/placeholder.svg"}
                          alt={item.productTitle}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                          No image
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link href={`/products/${item.handle}`} className="font-medium hover:text-primary line-clamp-2">
                        {item.productTitle}
                      </Link>
                      {item.variantTitle !== "Default Title" && (
                        <p className="text-sm text-muted-foreground">{item.variantTitle}</p>
                      )}
                      <p className="text-sm font-medium mt-1">
                        {new Intl.NumberFormat("en-US", {
                          style: "currency",
                          currency: item.currencyCode,
                        }).format(Number.parseFloat(item.price))}
                      </p>
                      <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removeItem(item.variantId)} className="h-8 w-8">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t px-6 py-4 space-y-4 bg-background">
              <div className="flex justify-between items-center text-lg font-bold">
                <span>Total</span>
                <span>{totalPrice}</span>
              </div>
              {checkoutUrl && (
                <Button asChild size="lg" className="w-full">
                  <a href={checkoutUrl}>Proceed to Checkout</a>
                </Button>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
