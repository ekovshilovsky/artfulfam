"use client"

import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import Link from "next/link"
import { useState } from "react"

export function MobileMenu() {
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Open menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left">
        <SheetHeader>
          <SheetTitle className="text-left">Menu</SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col gap-4 mt-8">
          <Link
            href="/products"
            className="text-lg font-medium hover:text-primary transition-colors py-2"
            onClick={() => setOpen(false)}
          >
            Shop
          </Link>
          <Link
            href="/artists"
            className="text-lg font-medium hover:text-primary transition-colors py-2"
            onClick={() => setOpen(false)}
          >
            Our Artists
          </Link>
          <Link
            href="/about"
            className="text-lg font-medium hover:text-primary transition-colors py-2"
            onClick={() => setOpen(false)}
          >
            About
          </Link>
        </nav>
      </SheetContent>
    </Sheet>
  )
}
