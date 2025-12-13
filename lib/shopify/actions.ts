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
    const domain = process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN
    const adminToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN

    console.log("[v0] Checking store access...", { hasDomain: !!domain, hasAdminToken: !!adminToken })

    if (!domain) {
      console.error("[v0] NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN not set")
      return { isPasswordProtected: false }
    }

    const cachedStatus = getCachedPasswordStatus()
    if (cachedStatus !== null) {
      return cachedStatus
    }

    // If Admin API token is available, check password_enabled directly
    if (adminToken) {
      const shopDomain = domain.replace(".myshopify.com", "")
      const url = `https://${shopDomain}.myshopify.com/admin/api/2024-10/shop.json`

      console.log("[v0] Calling Shopify Admin API:", { url, tokenLength: adminToken.length })

      const response = await fetch(url, {
        headers: {
          "X-Shopify-Access-Token": adminToken,
          "Content-Type": "application/json",
        },
      })

      console.log("[v0] Admin API response status:", response.status)

      if (response.ok) {
        const data = await response.json()
        const isPasswordProtected = data.shop?.password_enabled || false
        console.log("[v0] Shop password_enabled:", isPasswordProtected)

        setCachedPasswordStatus(isPasswordProtected)

        return { isPasswordProtected }
      } else {
        const errorText = await response.text()
        console.error("[v0] Admin API error:", { status: response.status, error: errorText })

        // If we get an error, check if it's a scope issue
        if (response.status === 403 || response.status === 401) {
          console.error("[v0] Admin API access denied. Required scope: read_shop_data")
        }
      }
    }

    // Fallback: no admin token or API call failed, assume not password protected
    console.log("[v0] Falling back to no password protection")
    const fallbackStatus = { isPasswordProtected: false }
    setCachedPasswordStatus(false)
    return fallbackStatus
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

export async function buyNowAction(merchandiseId: string, quantity = 1) {
  try {
    // Create a fresh cart for instant checkout
    const { createCart, addCartLines } = await import("./index")
    const cart = await createCart()
    const updatedCart = await addCartLines(cart.id, [{ merchandiseId, quantity }])
    return { success: true, checkoutUrl: updatedCart.checkoutUrl }
  } catch (error) {
    console.error("Error creating buy now checkout:", error)
    return { success: false, error: "Failed to create checkout" }
  }
}

export async function getShopLoginUrl() {
  try {
    const domain = process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN
    if (!domain) {
      return { success: false, error: "Store domain not configured" }
    }
    
    // Construct the customer account URL for Shopify
    const shopDomain = domain.replace(".myshopify.com", "")
    const accountUrl = `https://${shopDomain}.myshopify.com/account`
    
    return { success: true, loginUrl: accountUrl }
  } catch (error) {
    console.error("Error getting shop login URL:", error)
    return { success: false, error: "Failed to get login URL" }
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
