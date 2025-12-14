"use server"

import {
  createCart as shopifyCreateCart,
  addCartLines as shopifyAddCartLines,
  getCart as shopifyGetCart,
} from "./index"
import { cookies } from "next/headers"
import { getCachedPasswordStatus, setCachedPasswordStatus } from "./cache"
import { shopify, getShopDomain } from "./config"
import { loadSession } from "./session-storage"

export async function checkStoreAccessAction() {
  try {
    const domain = process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN

    console.log("[v0] Checking store access...", { hasDomain: !!domain })

    if (!domain) {
      console.error("[v0] NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN not set")
      return { isPasswordProtected: false }
    }

    const cachedStatus = getCachedPasswordStatus()
    if (cachedStatus !== null) {
      return cachedStatus
    }

    // Use OAuth authenticated Admin API to check password_enabled
    try {
      const shop = getShopDomain()
      const session = await loadSession(shop)

      if (!session || !session.accessToken) {
        console.log("[v0] No session, assuming not password protected")
        return { isPasswordProtected: false }
      }

      // Create REST client
      const client = new shopify.clients.Rest({ session })
      const response = await client.get({
        path: 'shop',
      })

      const data = response.body as { shop: { password_enabled?: boolean } }
      const isPasswordProtected = data.shop?.password_enabled || false
      
      console.log("[v0] Shop password_enabled:", isPasswordProtected)
      setCachedPasswordStatus(isPasswordProtected)

      return { isPasswordProtected }
    } catch (apiError) {
      console.error("[v0] Admin API error:", apiError)

      // Fallback: no admin token or API call failed, assume not password protected
      console.log("[v0] Falling back to no password protection")
      const fallbackStatus = { isPasswordProtected: false }
      setCachedPasswordStatus(false)
      return fallbackStatus
    }
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

    if (!domain) {
      console.error("[v0] Missing Shopify domain for customer creation")
      return { success: false, error: "Shopify not configured" }
    }

    const shop = getShopDomain()
    const session = await loadSession(shop)

    if (!session || !session.accessToken) {
      return { success: false, error: "Not authenticated. Please complete OAuth flow." }
    }

    // Create REST client
    const client = new shopify.clients.Rest({ session })

    console.log("[v0] Searching for existing customer with email:", email)

    // Search for existing customer
    const searchResponse = await client.get({
      path: 'customers/search',
      query: { query: `email:${email}` },
    })

    const searchData = searchResponse.body as { customers: any[] }

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

      const updateResponse = await client.put({
        path: `customers/${existingCustomer.id}`,
        data: {
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
        },
      })

      const updateData = updateResponse.body as { customer: any }
      console.log("[v0] Customer updated successfully")
      return { success: true, customer: updateData.customer, updated: true }
    }

    console.log("[v0] Creating new customer with email:", email, "tags:", tags)

    // Create new customer
    const createResponse = await client.post({
      path: 'customers',
      data: {
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
      },
    })

    const createData = createResponse.body as { customer: any }
    console.log("[v0] Customer created successfully:", createData.customer?.id)
    return { success: true, customer: createData.customer }
  } catch (error) {
    console.error("[v0] Error in customer action:", error)
    return { success: false, error: "Something went wrong. Please try again." }
  }
}
