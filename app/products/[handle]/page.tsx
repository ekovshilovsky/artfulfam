import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Badge } from "@/components/ui/badge"
import Image from "next/image"
import { getProduct } from "@/lib/shopify"
import { getArtistFromTags } from "@/lib/shopify/utils"
import { notFound } from "next/navigation"
import { ProductClient } from "./product-client"

export default async function ProductPage({
  params,
}: {
  params: Promise<{ handle: string }>
}) {
  const { handle } = await params
  const product = await getProduct(handle)

  if (!product) {
    notFound()
  }

  const mainImage = product.images.edges[0]?.node
  const artistInfo = getArtistFromTags(product.tags)

  return (
    <main className="min-h-screen">
      <Header />

      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
            {/* Product Images */}
            <div className="space-y-4">
              <div className="relative aspect-square overflow-hidden rounded-lg bg-muted border-2">
                {mainImage ? (
                  <Image
                    src={mainImage.url || "/placeholder.svg"}
                    alt={mainImage.altText || product.title}
                    fill
                    className="object-cover"
                    priority
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    No image available
                  </div>
                )}
              </div>

              {/* Thumbnail gallery */}
              {product.images.edges.length > 1 && (
                <div className="grid grid-cols-4 gap-2">
                  {product.images.edges.map((edge, idx) => (
                    <div
                      key={idx}
                      className="relative aspect-square overflow-hidden rounded border-2 cursor-pointer hover:border-primary transition-colors"
                    >
                      <Image
                        src={edge.node.url || "/placeholder.svg"}
                        alt={edge.node.altText || `${product.title} - Image ${idx + 1}`}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Product Info */}
            <div>
              <h1
                className="text-4xl md:text-5xl font-bold mb-2 text-balance"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {product.title}
              </h1>

              {artistInfo && (
                <p className="text-xl text-muted-foreground mb-4">
                  by {artistInfo.name}
                  {artistInfo.age !== undefined && `, Age ${artistInfo.age}`}
                </p>
              )}

              <ProductClient product={product} />

              <div className="prose prose-sm mb-6 text-muted-foreground leading-relaxed">
                <div dangerouslySetInnerHTML={{ __html: product.descriptionHtml }} />
              </div>

              {product.productType && (
                <div className="mb-6">
                  <span className="text-sm font-medium text-muted-foreground">Product Type: {product.productType}</span>
                </div>
              )}

              {product.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {product.tags
                    .filter((tag) => !tag.startsWith("birthdate:"))
                    .map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                </div>
              )}

              <div className="mt-8 pt-8 border-t">
                <h3 className="font-bold mb-2">About This Artwork</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Each piece is printed on demand with high-quality materials. Your purchase directly supports our young
                  artists and their creative journey!
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
