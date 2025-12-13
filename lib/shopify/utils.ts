export function getShopifyProductId(globalId: string) {
  const segments = globalId.split("/")
  return segments.pop() ?? globalId
}

// Extract artist name and birthdate from product tags
export function getArtistFromTags(tags: string[]): { name: string; birthdate?: string; age?: number } | null {
  const artistTag = tags.find((tag) => tag.toLowerCase().startsWith("artist:"))
  const birthdateTag = tags.find((tag) => tag.toLowerCase().startsWith("birthdate:"))

  if (!artistTag) return null

  const name = artistTag.substring(7).trim() // Remove "artist:" prefix
  const birthdate = birthdateTag ? birthdateTag.substring(10).trim() : undefined // Remove "birthdate:" prefix

  let age: number | undefined
  if (birthdate) {
    const birthDate = new Date(birthdate)
    const today = new Date()
    age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
  }

  return { name, birthdate, age }
}

// Format price for display
export function formatPrice(amount: string, currencyCode: string): string {
  const numericAmount = Number.parseFloat(amount)
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode,
  }).format(numericAmount)
}
