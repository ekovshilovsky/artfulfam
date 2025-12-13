"use client"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { User, LogIn, ShoppingBag, Settings } from "lucide-react"
import { useEffect, useState } from "react"

export function UserAccountButton() {
  const [shopDomain, setShopDomain] = useState<string | null>(null)

  useEffect(() => {
    // Get the shop domain from environment
    const domain = process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN
    if (domain) {
      const cleanDomain = domain.replace(".myshopify.com", "")
      setShopDomain(cleanDomain)
    }
  }, [])

  const handleLogin = () => {
    if (shopDomain) {
      // Redirect to Shopify customer account login
      // This uses Shopify's new customer accounts which supports Shop login
      window.location.href = `https://${shopDomain}.myshopify.com/account/login`
    }
  }

  const handleAccount = () => {
    if (shopDomain) {
      window.location.href = `https://${shopDomain}.myshopify.com/account`
    }
  }

  const handleOrders = () => {
    if (shopDomain) {
      window.location.href = `https://${shopDomain}.myshopify.com/account/orders`
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <User className="h-5 w-5" />
          <span className="sr-only">Account</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={handleLogin} className="cursor-pointer">
          <LogIn className="mr-2 h-4 w-4" />
          <span>Sign in with Shop</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleAccount} className="cursor-pointer">
          <Settings className="mr-2 h-4 w-4" />
          <span>My Account</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleOrders} className="cursor-pointer">
          <ShoppingBag className="mr-2 h-4 w-4" />
          <span>Order History</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
