"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createCustomerAction } from "@/lib/shopify/actions"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle } from "lucide-react"

export function Newsletter() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setSuccess(false)

    const result = await createCustomerAction(email, ["newsletter-signup"])

    if (result.success) {
      setSuccess(true)
      setEmail("")
      setTimeout(() => setSuccess(false), 5000)
    } else {
      setError(result.error || "Failed to subscribe")
    }

    setLoading(false)
  }

  return (
    <section className="py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto bg-gradient-to-br from-primary to-accent text-primary-foreground rounded-2xl p-8 md:p-12 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ fontFamily: "var(--font-display)" }}>
            Stay in the Loop!
          </h2>
          <p className="text-lg mb-8 opacity-90 text-pretty leading-relaxed">
            Get updates on new artwork, special offers, and stories from our young artists
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <Input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-background text-foreground border-0 h-12 flex-1"
              disabled={loading}
            />
            <Button type="submit" variant="secondary" size="lg" className="h-12 px-8" disabled={loading}>
              {loading ? "Subscribing..." : "Subscribe"}
            </Button>
          </form>

          {success && (
            <div className="mt-4 inline-flex items-center gap-2 bg-background/20 text-primary-foreground px-4 py-2 rounded-lg">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm">Thanks for subscribing!</span>
            </div>
          )}

          {error && (
            <Alert variant="destructive" className="mt-4 max-w-md mx-auto">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>
      </div>
    </section>
  )
}
