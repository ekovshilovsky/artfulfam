"use client"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { User, LogIn, LogOut, ShoppingBag, Loader2 } from "lucide-react"
import { useAuth } from "@/components/auth/auth-context"

export function UserAccountButton() {
  const { customer, isLoggedIn, isLoading, login, logout } = useAuth()

  // Get display name
  const displayName = customer?.firstName 
    ? `${customer.firstName}${customer.lastName ? ` ${customer.lastName}` : ""}`
    : customer?.email || "Account"

  const handleOrders = () => {
    const domain = process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN
    if (domain) {
      const cleanDomain = domain.replace(".myshopify.com", "")
      window.location.href = `https://${cleanDomain}.myshopify.com/account/orders`
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : isLoggedIn ? (
            <div className="relative">
              <User className="h-5 w-5" />
              <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-green-500" />
            </div>
          ) : (
            <User className="h-5 w-5" />
          )}
          <span className="sr-only">Account</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {isLoggedIn && customer ? (
          <>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{displayName}</p>
                {customer.email && (
                  <p className="text-xs leading-none text-muted-foreground">
                    {customer.email}
                  </p>
                )}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleOrders} className="cursor-pointer">
              <ShoppingBag className="mr-2 h-4 w-4" />
              <span>Order History</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="cursor-pointer text-red-600">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sign Out</span>
            </DropdownMenuItem>
          </>
        ) : (
          <>
            <DropdownMenuItem onClick={login} className="cursor-pointer">
              <LogIn className="mr-2 h-4 w-4" />
              <span>Sign in with Shop</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <div className="px-2 py-1.5">
              <p className="text-xs text-muted-foreground">
                Sign in for faster checkout and to track your orders
              </p>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
