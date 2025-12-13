// Simple in-memory cache for password protection status
let passwordStatusCache: {
  isPasswordProtected: boolean
  timestamp: number
} | null = null

const CACHE_DURATION = 60 * 1000 // 1 minute in milliseconds

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
  console.log("[v0] Cached password status for 1 minute")
}

export function clearPasswordStatusCache() {
  passwordStatusCache = null
  console.log("[v0] Cleared password status cache")
}
