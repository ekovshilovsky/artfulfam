// Simple in-memory cache for password protection status
// Note: Since we're now using environment variables (which are static at runtime),
// this cache is primarily useful for reducing redundant environment variable reads
// and validation logic during the same request lifecycle
let passwordStatusCache: {
  isPasswordProtected: boolean
  timestamp: number
} | null = null

const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes in milliseconds (longer since env vars don't change at runtime)

export function getCachedPasswordStatus(): { isPasswordProtected: boolean } | null {
  if (!passwordStatusCache) return null

  const now = Date.now()
  const isExpired = now - passwordStatusCache.timestamp > CACHE_DURATION

  if (isExpired) {
    console.log("[v0] Cache expired, will fetch fresh status")
    passwordStatusCache = null
    return null
  }

  console.log("[v0] Using cached password status")
  return { isPasswordProtected: passwordStatusCache.isPasswordProtected }
}

export function setCachedPasswordStatus(isPasswordProtected: boolean) {
  passwordStatusCache = {
    isPasswordProtected,
    timestamp: Date.now(),
  }
  console.log("[v0] Cached password status for 5 minutes")
}

export function clearPasswordStatusCache() {
  passwordStatusCache = null
  console.log("[v0] Cleared password status cache")
}
