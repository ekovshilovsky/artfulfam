"use server"

import {
  createCart as shopifyCreateCart,
  addCartLines as shopifyAddCartLines,
  getCart as shopifyGetCart,
} from "./index"
import { cookies } from "next/headers"
import { getCachedPasswordStatus, setCachedPasswordStatus } from "./cache"

export async function checkStoreAccessAction() {
  try {
    // Check cache first
    const cachedStatus = getCachedPasswordStatus()
    if (cachedStatus !== null) {
      return cachedStatus
    }

    // Use environment variable to determine if store is password protected
    // This replaces the legacy Shopify Admin API check
    const isPasswordProtected = process.env.STORE_PASSWORD_ENABLED === "true"
    const hasStorePassword = !!process.env.SHOPIFY_STORE_PASSWORD

    console.log("[v0] Checking store access...", {
      isPasswordProtected,
      hasStorePassword,
    })

    // If password protection is enabled but no password is configured, log warning
    if (isPasswordProtected && !hasStorePassword) {
      console.warn(
        "[v0] STORE_PASSWORD_ENABLED is true but SHOPIFY_STORE_PASSWORD is not set. Password protection will be disabled.",
      )
    }

    // Only enable password protection if both the flag is set AND a password is configured
    const effectivePasswordProtection = isPasswordProtected && hasStorePassword

    // Cache the result
    setCachedPasswordStatus(effectivePasswordProtection)

    return { isPasswordProtected: effectivePasswordProtection }
  } catch (error) {
    console.error("[v0] Error checking store access:", error)
    return { isPasswordProtected: false }
  }
}

export async function validateStorePasswordAction(password: string) {
  const cookieStore = await cookies()
  const storePassword = process.env.SHOPIFY_STORE_PASSWORD

  if (!storePassword) {
    return { success: false, error: "Store password not configured" }
  }

  if (password === storePassword) {
    // Set access cookie for 24 hours
    cookieStore.set("store_access", "granted", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24, // 24 hours
      path: "/",
    })
    return { success: true }
  }

  return { success: false, error: "Invalid password" }
}

export async function createCartAction() {
  try {
    const cart = await shopifyCreateCart()
    return { success: true, cart }
  } catch (error) {
    console.error("Error creating cart:", error)
    return { success: false, error: "Failed to create cart" }
  }
}

export async function addToCartAction(cartId: string, merchandiseId: string, quantity = 1) {
  try {
    const cart = await shopifyAddCartLines(cartId, [{ merchandiseId, quantity }])
    return { success: true, cart }
  } catch (error) {
    console.error("Error adding to cart:", error)
    return { success: false, error: "Failed to add item to cart" }
  }
}

export async function getCartAction(cartId: string) {
  try {
    const cart = await shopifyGetCart(cartId)
    return { success: true, cart }
  } catch (error) {
    console.error("Error fetching cart:", error)
    return { success: false, error: "Failed to fetch cart" }
  }
}

export async function createCustomerAction(email: string, tags: string[] = []) {
  try {
    const domain = process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN
    const adminToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN

    if (!domain || !adminToken) {
      console.error("[v0] Missing Shopify credentials for customer creation")
      return { success: false, error: "Shopify not configured" }
    }

    const shopDomain = domain.replace(".myshopify.com", "")

    const searchUrl = `https://${shopDomain}.myshopify.com/admin/api/2024-10/customers/search.json?query=email:${encodeURIComponent(email)}`

    console.log("[v0] Searching for existing customer with email:", email)

    const searchResponse = await fetch(searchUrl, {
      headers: {
        "X-Shopify-Access-Token": adminToken,
        "Content-Type": "application/json",
      },
    })

    if (searchResponse.ok) {
      const searchData = await searchResponse.json()

      if (searchData.customers && searchData.customers.length > 0) {
        const existingCustomer = searchData.customers[0]
        const existingTags = existingCustomer.tags ? existingCustomer.tags.split(", ") : []

        // Check if all new tags already exist
        const hasNewTags = tags.some((tag) => !existingTags.includes(tag))
        const isSubscribed = existingCustomer.email_marketing_consent?.state === "subscribed"

        // If customer already has all the tags and is subscribed, no need to update
        if (!hasNewTags && isSubscribed) {
          console.log("[v0] Customer already exists with same info, skipping update")
          return { success: true, customer: existingCustomer, skipped: true }
        }

        // Only update if there's new information
        console.log("[v0] Updating customer with new information")
        const mergedTags = [...new Set([...existingTags, ...tags])]

        const updateUrl = `https://${shopDomain}.myshopify.com/admin/api/2024-10/customers/${existingCustomer.id}.json`

        const updateResponse = await fetch(updateUrl, {
          method: "PUT",
          headers: {
            "X-Shopify-Access-Token": adminToken,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            customer: {
              id: existingCustomer.id,
              accepts_marketing: true,
              email_marketing_consent: {
                state: "subscribed",
                opt_in_level: "single_opt_in",
                consent_updated_at: new Date().toISOString(),
              },
              tags: mergedTags.join(", "),
            },
          }),
        })

        const updateData = await updateResponse.json()

        if (updateResponse.ok) {
          console.log("[v0] Customer updated successfully")
          return { success: true, customer: updateData.customer, updated: true }
        } else {
          console.error("[v0] Customer update failed:", updateData)
          return { success: false, error: "Failed to update subscription" }
        }
      }
    }

    console.log("[v0] Creating new customer with email:", email, "tags:", tags)

    const createUrl = `https://${shopDomain}.myshopify.com/admin/api/2024-10/customers.json`

    const createResponse = await fetch(createUrl, {
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": adminToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        customer: {
          email,
          accepts_marketing: true,
          email_marketing_consent: {
            state: "subscribed",
            opt_in_level: "single_opt_in",
            consent_updated_at: new Date().toISOString(),
          },
          tags: tags.join(", "),
        },
      }),
    })

    const createData = await createResponse.json()

    if (createResponse.ok) {
      console.log("[v0] Customer created successfully:", createData.customer?.id)
      return { success: true, customer: createData.customer }
    } else {
      console.error("[v0] Customer creation failed:", createData)
      return { success: false, error: "Failed to subscribe. Please try again." }
    }
  } catch (error) {
    console.error("[v0] Error in customer action:", error)
    return { success: false, error: "Something went wrong. Please try again." }
  }
}
