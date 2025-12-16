import { Link } from 'react-router';

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-secondary via-background to-muted py-20 md:py-32">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-accent/10 text-foreground px-4 py-2 rounded-full mb-6 animate-fade-in">
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
              />
            </svg>
            <span className="text-sm font-medium">Art by Kids, For Everyone</span>
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 font-display">
            Creativity Comes in All Sizes
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
            Discover unique artwork created by young artists, now available on t-shirts, mugs, prints, and more through
            our print-on-demand shop
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/collections"
              className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring bg-primary text-primary-foreground hover:bg-primary/90 h-12 px-8 text-base"
            >
              Explore Art
            </Link>
            <Link
              to="/about"
              className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring border border-input bg-transparent hover:bg-accent hover:text-accent-foreground h-12 px-8 text-base"
            >
              Meet the Artists
            </Link>
          </div>
        </div>
      </div>

      {/* Decorative elements */}
      <div className="absolute top-20 left-10 w-20 h-20 bg-accent/20 rounded-full blur-2xl animate-pulse" />
      <div className="absolute bottom-20 right-10 w-32 h-32 bg-primary/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}} />
    </section>
  );
}
