import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import Link from "next/link"
import { getProducts } from "@/lib/shopify"
import { formatPrice, getArtistFromTags } from "@/lib/shopify/utils"

export const metadata = {
  title: "All Artwork - ArtsyFam",
  description: "Browse all artwork from our talented young artists",
}

export default async function ProductsPage() {
  const products = await getProducts({ first: 50 })

  return (
    <main className="min-h-screen">
      <Header />

      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h1
              className="text-4xl md:text-6xl font-bold mb-4 text-balance"
              style={{ fontFamily: "var(--font-display)" }}
            >
              All Artwork
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto text-pretty leading-relaxed">
              Discover amazing creations from our young artists
            </p>
          </div>

          {products.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-xl text-muted-foreground">No products available yet. Check back soon!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map((product) => {
                const image = product.images.edges[0]?.node
                const price = formatPrice(
                  product.priceRange.minVariantPrice.amount,
                  product.priceRange.minVariantPrice.currencyCode,
                )
                const artistInfo = getArtistFromTags(product.tags)

                return (
                  <Card
                    key={product.id}
                    className="group overflow-hidden border-2 hover:border-primary transition-all duration-300"
                  >
                    <Link href={`/products/${product.handle}`}>
                      <div className="relative aspect-square overflow-hidden bg-muted">
                        {image ? (
                          <Image
                            src={image.url || "/placeholder.svg"}
                            alt={image.altText || product.title}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                            No image
                          </div>
                        )}
                      </div>
                      <div className="p-4">
                        <h3 className="font-bold text-lg mb-1">{product.title}</h3>
                        {artistInfo && (
                          <p className="text-sm text-muted-foreground mb-3">
                            {artistInfo.name}
                            {artistInfo.age !== undefined && `, ${artistInfo.age}`}
                          </p>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-primary">{price}</span>
                          <Button size="sm" variant="outline">
                            View
                          </Button>
                        </div>
                      </div>
                    </Link>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </main>
  )
}
