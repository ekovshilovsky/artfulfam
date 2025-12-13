import Link from "next/link"
import { CartDrawer } from "@/components/cart/cart-drawer"
import { MobileMenu } from "@/components/mobile-menu"
import { Button } from "@/components/ui/button"
import { User } from "lucide-react"
import { parseShopifyDomain } from "@/lib/shopify/parse-shopify-domain"

export function Header() {
  const rawStoreDomain = process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN
  const storeDomain = rawStoreDomain ? parseShopifyDomain(rawStoreDomain) : null
  const accountUrl = storeDomain ? `https://${storeDomain}/account/login` : "/"

  return (
    <header className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="text-2xl font-bold text-primary" style={{ fontFamily: "var(--font-display)" }}>
            ArtsyFam
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          <Link href="/products" className="text-sm font-medium hover:text-primary transition-colors">
            Shop
          </Link>
          <Link href="/artists" className="text-sm font-medium hover:text-primary transition-colors">
            Our Artists
          </Link>
          <Link href="/about" className="text-sm font-medium hover:text-primary transition-colors">
            About
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" asChild>
            <a href={accountUrl} aria-label="Account">
              <User className="h-5 w-5" />
            </a>
          </Button>
          <CartDrawer />
          <MobileMenu />
        </div>
      </div>
    </header>
  )
}
