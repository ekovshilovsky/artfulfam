import { Palette, Heart, Sparkles } from "lucide-react"

export function AboutSection() {
  return (
    <section className="py-16 md:py-24 bg-secondary/30">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2
            className="text-3xl md:text-5xl font-bold mb-6 text-balance"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Supporting Young Artists
          </h2>
          <p className="text-lg text-muted-foreground text-pretty leading-relaxed">
            ArtsyFam celebrates the boundless creativity of children by turning their artwork into beautiful products.
            Every purchase supports young artists and encourages creative expression.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 text-primary rounded-full mb-4">
              <Palette className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-bold mb-2">Original Art</h3>
            <p className="text-muted-foreground leading-relaxed">
              Every design is an authentic creation by a real child artist
            </p>
          </div>

          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-accent/10 text-accent rounded-full mb-4">
              <Heart className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-bold mb-2">Quality Products</h3>
            <p className="text-muted-foreground leading-relaxed">Premium print-on-demand items from trusted partners</p>
          </div>

          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-chart-2/30 text-chart-2 rounded-full mb-4">
              <Sparkles className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-bold mb-2">Support Creativity</h3>
            <p className="text-muted-foreground leading-relaxed">
              Proceeds help fund art supplies and programs for kids
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
