import {useCallback, useRef} from 'react';
import {useFetcher} from 'react-router';

/**
 * Hook for intent-based cart prefetching.
 * 
 * Triggers a lightweight cart fetch when user shows intent
 * (hover, focus) to warm the cache before actual add-to-cart.
 * 
 * Includes debouncing and deduplication to avoid excessive requests.
 */
export function usePrefetchCart() {
  const fetcher = useFetcher();
  const prefetchedRef = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const prefetchCart = useCallback(() => {
    // Skip if already prefetched in this session
    if (prefetchedRef.current) return;
    
    // Skip if currently loading
    if (fetcher.state === 'loading') return;

    // Clear any pending timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Debounce: wait 200ms before prefetching
    // This avoids requests on accidental hovers
    timeoutRef.current = setTimeout(() => {
      // Use fetcher to trigger cart route loader
      // This leverages React Router's caching
      fetcher.load('/cart');
      prefetchedRef.current = true;
    }, 200);
  }, [fetcher]);

  const cancelPrefetch = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  return {prefetchCart, cancelPrefetch};
}
