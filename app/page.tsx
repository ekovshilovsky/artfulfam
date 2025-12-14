import { Hero } from "@/components/hero"
import { FeaturedProducts } from "@/components/featured-products"
import { AboutSection } from "@/components/about-section"
import { Newsletter } from "@/components/newsletter"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { ComingSoonContent } from "@/components/coming-soon/coming-soon-content"
import { cookies } from "next/headers"
import { checkStoreAccessAction } from "@/lib/shopify/actions"

// Force dynamic rendering since we check store access
export const dynamic = 'force-dynamic'

async function hasStoreAccess() {
  const cookieStore = await cookies()
  const hasAccessCookie = cookieStore.get("store_access")?.value === "granted"

  const { isPasswordProtected } = await checkStoreAccessAction()

  console.log("[v0] Store access check:", { hasAccessCookie, isPasswordProtected })

  // If store is not password protected, grant access
  if (!isPasswordProtected) {
    return true
  }

  // If store is password protected, check for access cookie
  return hasAccessCookie
}

export default async function Home() {
  const hasAccess = await hasStoreAccess()

  if (!hasAccess) {
    return <ComingSoonContent />
  }

  return (
    <main className="min-h-screen">
      <Header />
      <Hero />
      <FeaturedProducts />
      <AboutSection />
      <Newsletter />
      <Footer />
    </main>
  )
}
