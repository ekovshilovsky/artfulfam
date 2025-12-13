import { Button } from "@/components/ui/button"
import { Sparkles } from "lucide-react"

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-secondary via-background to-muted py-20 md:py-32">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-accent/10 text-accent px-4 py-2 rounded-full mb-6 animate-fade-in">
            <Sparkles className="h-4 w-4" />
            <span className="text-sm font-medium">Art by Kids, For Everyone</span>
          </div>

          <h1
            className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 text-balance"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Creativity Comes in All Sizes
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground mb-8 text-pretty max-w-2xl mx-auto leading-relaxed">
            Discover unique artwork created by young artists, now available on t-shirts, mugs, prints, and more through
            our print-on-demand shop
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="text-base h-12 px-8">
              Explore Art
            </Button>
            <Button size="lg" variant="outline" className="text-base h-12 px-8 bg-transparent">
              Meet the Artists
            </Button>
          </div>
        </div>
      </div>

      {/* Decorative elements */}
      <div className="absolute top-20 left-10 w-20 h-20 bg-accent/20 rounded-full blur-2xl animate-pulse" />
      <div className="absolute bottom-20 right-10 w-32 h-32 bg-primary/20 rounded-full blur-3xl animate-pulse delay-1000" />
    </section>
  )
}
