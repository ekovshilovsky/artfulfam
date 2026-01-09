import {useRef, useState} from 'react';
import {Container} from './atoms/container';

export function Newsletter() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    const email = String(inputRef.current?.value || '').trim();
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address.');
      setLoading(false);
      return;
    }

    // TODO: Implement newsletter signup with Shopify Customer API or email service
    // For now, just show success
    setTimeout(() => {
      setSuccess(true);
      if (inputRef.current) inputRef.current.value = '';
      setLoading(false);
      setTimeout(() => setSuccess(false), 5000);
    }, 1000);
  };

  return (
    <section className="py-16 md:py-24">
      <Container>
        <div className="max-w-2xl mx-auto bg-gradient-to-br from-primary to-accent text-primary-foreground rounded-2xl p-8 md:p-12 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 font-display">
            Stay in the Loop!
          </h2>
          <p className="text-lg mb-8 opacity-90 leading-relaxed">
            Get updates on new artwork, special offers, and stories from our young artists
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <input
              type="email"
              placeholder="Enter your email"
              ref={inputRef}
              required
              className="bg-background text-foreground border-0 h-12 flex-1 rounded-md px-4 focus:outline-none focus:ring-2 focus:ring-primary-foreground"
              disabled={loading}
            />
            <button
              type="submit"
              className="h-12 px-8 rounded-md bg-secondary text-secondary-foreground font-medium hover:bg-secondary/90 transition-colors disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Subscribing...' : 'Subscribe'}
            </button>
          </form>

          {success && (
            <div className="mt-4 inline-flex items-center gap-2 bg-background/20 text-primary-foreground px-4 py-2 rounded-lg">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-sm">Thanks for subscribing!</span>
            </div>
          )}

          {error && (
            <div className="mt-4 max-w-md mx-auto bg-destructive text-destructive-foreground px-4 py-2 rounded-lg">
              <p className="text-sm">{error}</p>
            </div>
          )}
        </div>
      </Container>
    </section>
  );
}
