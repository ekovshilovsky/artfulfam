import Link from "next/link"
import { Instagram, Facebook, Mail } from "lucide-react"

export function Footer() {
  return (
    <footer className="bg-muted border-t border-border py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="text-2xl font-bold text-primary mb-4" style={{ fontFamily: "var(--font-display)" }}>
              ArtsyFam
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Celebrating creativity, one masterpiece at a time.
            </p>
          </div>

          <div>
            <h3 className="font-bold mb-4">Shop</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/shop" className="hover:text-foreground transition-colors">
                  All Products
                </Link>
              </li>
              <li>
                <Link href="/shop/apparel" className="hover:text-foreground transition-colors">
                  Apparel
                </Link>
              </li>
              <li>
                <Link href="/shop/prints" className="hover:text-foreground transition-colors">
                  Prints
                </Link>
              </li>
              <li>
                <Link href="/shop/accessories" className="hover:text-foreground transition-colors">
                  Accessories
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold mb-4">About</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/artists" className="hover:text-foreground transition-colors">
                  Our Artists
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-foreground transition-colors">
                  Our Story
                </Link>
              </li>
              <li>
                <Link href="/faq" className="hover:text-foreground transition-colors">
                  FAQ
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-foreground transition-colors">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold mb-4">Connect</h3>
            <div className="flex gap-3">
              <a
                href="#"
                className="w-10 h-10 bg-background rounded-full flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors"
              >
                <Instagram className="h-4 w-4" />
              </a>
              <a
                href="#"
                className="w-10 h-10 bg-background rounded-full flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors"
              >
                <Facebook className="h-4 w-4" />
              </a>
              <a
                href="#"
                className="w-10 h-10 bg-background rounded-full flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors"
              >
                <Mail className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-border pt-8 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} ArtsyFam. All rights reserved. Made with ❤️ by young artists.</p>
        </div>
      </div>
    </footer>
  )
}
