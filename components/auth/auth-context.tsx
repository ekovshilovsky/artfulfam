"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import type { CustomerData } from "@/lib/shopify/auth"

interface AuthContextType {
  customer: CustomerData | null
  isLoggedIn: boolean
  isLoading: boolean
  login: () => void
  logout: () => Promise<void>
  refreshCustomer: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [customer, setCustomer] = useState<CustomerData | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const fetchCustomer = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/customer")
      const data = await response.json()
      
      setCustomer(data.customer)
      setIsLoggedIn(data.isLoggedIn)
    } catch (error) {
      console.error("Error fetching customer:", error)
      setCustomer(null)
      setIsLoggedIn(false)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Check auth status on mount and handle auth callbacks
  useEffect(() => {
    // Check for auth success/error in URL params
    const params = new URLSearchParams(window.location.search)
    const authSuccess = params.get("auth_success")
    const authError = params.get("auth_error")

    if (authSuccess || authError) {
      // Clean up URL params
      const newUrl = window.location.pathname
      window.history.replaceState({}, "", newUrl)
    }

    if (authError) {
      console.error("Auth error:", authError)
    }

    fetchCustomer()
  }, [fetchCustomer])

  const login = () => {
    // Redirect to login API route
    window.location.href = "/api/auth/login"
  }

  const logout = async () => {
    setIsLoading(true)
    try {
      // Call logout API route
      window.location.href = "/api/auth/logout"
    } catch (error) {
      console.error("Logout error:", error)
      setIsLoading(false)
    }
  }

  const refreshCustomer = async () => {
    setIsLoading(true)
    await fetchCustomer()
  }

  return (
    <AuthContext.Provider
      value={{
        customer,
        isLoggedIn,
        isLoading,
        login,
        logout,
        refreshCustomer,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
