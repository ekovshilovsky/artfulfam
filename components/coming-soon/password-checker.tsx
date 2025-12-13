"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export function PasswordChecker() {
  const router = useRouter()

  useEffect(() => {
    // Check if we have access stored in localStorage
    const hasAccess = localStorage.getItem("store_access") === "granted"

    if (hasAccess) {
      // Set cookie for middleware to read
      document.cookie = "store_access=granted; path=/; max-age=86400" // 24 hours
    }
  }, [router])

  return null
}
