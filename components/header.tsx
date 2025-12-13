import Link from "next/link"
import { CartDrawer } from "@/components/cart/cart-drawer"
import { MobileMenu } from "@/components/mobile-menu"
import { UserAccountButton } from "@/components/user-account-button"

export function Header() {
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

        <div className="flex items-center gap-1">
          <UserAccountButton />
          <CartDrawer />
          <MobileMenu />
        </div>
      </div>
    </header>
  )
}
