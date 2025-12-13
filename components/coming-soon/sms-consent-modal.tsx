"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { MessageSquare, CheckCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface SmsConsentModalProps {
  open: boolean
  onClose: () => void
  customerId: string
  onSuccess: () => void
}

export function SmsConsentModal({ open, onClose, customerId, onSuccess }: SmsConsentModalProps) {
  const [phone, setPhone] = useState("")
  const [consent, setConsent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [phoneError, setPhoneError] = useState(false)
  const [consentError, setConsentError] = useState(false)

  const isPhoneValid = () => {
    const cleaned = phone.replace(/\D/g, "")
    return cleaned.length >= 6 && cleaned.length <= 15
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    const cleaned = value.replace(/[^\d\s\-+()]/g, "")
    setPhone(cleaned)
    if (phoneError) setPhoneError(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    setPhoneError(false)
    setConsentError(false)

    if (!isPhoneValid()) {
      setPhoneError(true)
      return
    }

    if (!consent) {
      setConsentError(true)
      return
    }

    setLoading(true)

    try {
      const hasPlus = phone.trim().startsWith("+")
      const cleanPhone = phone.replace(/\D/g, "")
      const formattedPhone = hasPlus ? `+${cleanPhone}` : `+${cleanPhone}`

      const response = await fetch("/api/update-customer-sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId, phone: formattedPhone, consent }),
      })

      const data = await response.json()

      if (data.success) {
        onSuccess()
        onClose()
      } else {
        setPhoneError(true)
      }
    } catch (err) {
      setPhoneError(true)
    } finally {
      setLoading(false)
    }
  }

  const handleSkip = () => {
    onSuccess()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-2">
            <MessageSquare className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-2xl">Stay Connected via SMS</DialogTitle>
          <DialogDescription>
            Get exclusive updates, launch notifications, and special offers sent directly to your phone.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="phone" className={cn(phoneError && "text-destructive")}>
              Phone Number
            </Label>
            <div className="relative">
              <Input
                id="phone"
                type="tel"
                placeholder="+1 555 123 4567"
                value={phone}
                onChange={handlePhoneChange}
                className={cn(
                  "pr-10",
                  phoneError && "border-destructive focus-visible:ring-destructive",
                  isPhoneValid() && !phoneError && "border-green-500 focus-visible:ring-green-500",
                )}
              />
              {isPhoneValid() && !phoneError && (
                <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-green-500" />
              )}
            </div>
            <p className={cn("text-xs", phoneError ? "text-destructive" : "text-muted-foreground")}>
              {phoneError
                ? "Please enter a valid phone number with country code"
                : "Include country code (e.g., +1 for US)"}
            </p>
          </div>

          <div
            className={cn(
              "flex items-start space-x-2 p-3 rounded-lg transition-colors",
              consentError && "bg-destructive/10 border border-destructive",
            )}
          >
            <Checkbox
              id="sms-consent"
              checked={consent}
              onCheckedChange={(checked) => {
                setConsent(checked === true)
                if (consentError) setConsentError(false)
              }}
              className={cn(consentError && "border-destructive")}
            />
            <label
              htmlFor="sms-consent"
              className={cn(
                "text-sm leading-relaxed cursor-pointer",
                consentError ? "text-destructive" : "text-muted-foreground",
              )}
            >
              I agree to receive marketing and transactional SMS messages from ArtsyFam. Message frequency varies. Reply
              STOP to opt out. Message and data rates may apply.{" "}
              <a href="/terms-sms" target="_blank" className="text-primary hover:underline" rel="noreferrer">
                View full terms
              </a>
              .
            </label>
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" onClick={handleSkip} className="flex-1 bg-transparent">
              Skip for Now
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "Saving..." : "Subscribe"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
