"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Sparkles, Mail, Lock, CheckCircle } from "lucide-react"
import { validateStorePasswordAction, createCustomerAction } from "@/lib/shopify/actions"
import { SmsConsentModal } from "./sms-consent-modal"

export function ComingSoonContent() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [mode, setMode] = useState<"signup" | "unlock">("signup")
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [unlocking, setUnlocking] = useState(false)
  const [showSmsModal, setShowSmsModal] = useState(false)
  const [customerId, setCustomerId] = useState<string>("")
  const [isInputFocused, setIsInputFocused] = useState(false)
  const router = useRouter()

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const result = await createCustomerAction(email, ["coming-soon-signup"])

      if (result.success) {
        if (result.customer.id && !result.skipped && !result.updated) {
          setCustomerId(result.customer.id)
          setShowSmsModal(true)
          setEmail("")
        } else {
          // Existing customer - just show success message
          setSubmitted(true)
          setEmail("")
        }
      } else {
        setError(result.error || "Failed to sign up")
      }
    } catch (err) {
      setError("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordUnlock = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const result = await validateStorePasswordAction(password)

      if (result.success) {
        setUnlocking(true)
        await new Promise((resolve) => setTimeout(resolve, 800))
        router.refresh()
      } else {
        setError(result.error || "Incorrect password. Please try again.")
      }
    } catch (err) {
      setError("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
      setPassword("")
    }
  }

  const handleSmsComplete = () => {
    setSubmitted(true)
  }

  if (unlocking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-secondary via-background to-muted flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <CheckCircle className="h-8 w-8 text-primary animate-pulse" />
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-bold">Unlocking Store...</h3>
            <p className="text-muted-foreground">Welcome to ArtsyFam!</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-secondary via-background to-muted flex items-center justify-center p-4">
        <div className="absolute top-20 left-10 w-20 h-20 bg-accent/20 rounded-full blur-2xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-32 h-32 bg-primary/20 rounded-full blur-3xl animate-pulse" />

        <div className="max-w-2xl w-full mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 bg-accent/10 text-accent px-4 py-2 rounded-full mb-6">
            <Sparkles className="h-4 w-4" />
            <span className="text-sm font-medium">Coming Soon</span>
          </div>

          <h1
            className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 text-balance"
            style={{ fontFamily: "var(--font-display)" }}
          >
            ArtsyFam Store
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground mb-12 text-pretty max-w-xl mx-auto leading-relaxed">
            Our online art gallery is getting ready to showcase amazing artwork from talented young artists. Stay tuned!
          </p>

          <div className="flex justify-center gap-2 mb-8">
            <Button
              variant={mode === "signup" ? "default" : "ghost"}
              onClick={() => {
                setMode("signup")
                setError("")
                setSubmitted(false)
              }}
              className="gap-2"
            >
              <Mail className="h-4 w-4" />
              Get Notified
            </Button>
            <Button
              variant={mode === "unlock" ? "default" : "ghost"}
              onClick={() => {
                setMode("unlock")
                setError("")
                setSubmitted(false)
              }}
              className="gap-2"
            >
              <Lock className="h-4 w-4" />
              Enter Password
            </Button>
          </div>

          {mode === "signup" && (
            <div className="bg-card rounded-2xl p-8 md:p-12 shadow-lg border">
              {submitted ? (
                <div className="text-center">
                  <CheckCircle className="h-16 w-16 text-primary mx-auto mb-4" />
                  <h3 className="text-2xl font-bold mb-2">Thanks for signing up!</h3>
                  <p className="text-muted-foreground">We'll notify you as soon as the store launches.</p>
                </div>
              ) : (
                <>
                  <h2 className="text-2xl md:text-3xl font-bold mb-4" style={{ fontFamily: "var(--font-display)" }}>
                    Be the First to Know
                  </h2>
                  <p className="text-muted-foreground mb-6">
                    Sign up to get notified when we launch and receive exclusive early access offers.
                  </p>

                  <form
                    onSubmit={handleEmailSignup}
                    className={`space-y-4 transition-all duration-300 ${isInputFocused ? "mb-32" : "mb-0"}`}
                  >
                    <div className="text-left">
                      <Label htmlFor="email" className="mb-2 block">
                        Email Address
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="your@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onFocus={() => setIsInputFocused(true)}
                        onBlur={() => setIsInputFocused(false)}
                        required
                        className="h-12"
                      />
                    </div>

                    {error && (
                      <Alert variant="destructive">
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}

                    <Button type="submit" size="lg" className="w-full h-12" disabled={loading}>
                      {loading ? "Signing Up..." : "Notify Me"}
                    </Button>
                  </form>
                </>
              )}
            </div>
          )}

          {mode === "unlock" && (
            <div className="bg-card rounded-2xl p-8 md:p-12 shadow-lg border">
              <h2 className="text-2xl md:text-3xl font-bold mb-4" style={{ fontFamily: "var(--font-display)" }}>
                Enter Store Password
              </h2>
              <p className="text-muted-foreground mb-6">Have a password? Enter it below to access the store.</p>

              <form
                onSubmit={handlePasswordUnlock}
                className={`space-y-4 transition-all duration-300 ${isInputFocused ? "mb-32" : "mb-0"}`}
              >
                <div className="text-left">
                  <Label htmlFor="password" className="mb-2 block">
                    Password
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setIsInputFocused(true)}
                    onBlur={() => setIsInputFocused(false)}
                    required
                    className="h-12"
                  />
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <Button type="submit" size="lg" className="w-full h-12" disabled={loading}>
                  {loading ? "Unlocking..." : "Unlock Store"}
                </Button>
              </form>
            </div>
          )}

          <p className="text-sm text-muted-foreground mt-8">
            Questions? Contact us at{" "}
            <a href="mailto:hello@artsyfam.com" className="text-primary hover:underline">
              hello@artsyfam.com
            </a>
          </p>
        </div>
      </div>

      <SmsConsentModal
        open={showSmsModal}
        onClose={() => setShowSmsModal(false)}
        customerId={customerId}
        onSuccess={handleSmsComplete}
      />
    </>
  )
}
