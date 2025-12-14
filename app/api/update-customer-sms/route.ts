import { NextResponse } from "next/server"
import { shopify, getShopDomain } from "@/lib/shopify/config"
import { loadSession } from "@/lib/shopify/session-storage"

export async function POST(request: Request) {
  try {
    const { customerId, phone, consent } = await request.json()

    if (!customerId || !phone || !consent) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })
    }

    const shop = getShopDomain()
    const session = await loadSession(shop)

    if (!session || !session.accessToken) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })
    }

    // Create GraphQL client
    const client = new shopify.clients.Graphql({ session })

    // Update customer with phone number and SMS consent
    const mutation = `
      mutation customerUpdate($input: CustomerInput!) {
        customerUpdate(input: $input) {
          customer {
            id
            phone
            smsMarketingConsent {
              marketingState
              marketingOptInLevel
            }
          }
          userErrors {
            field
            message
          }
        }
      }
    `

    const response = await client.request(mutation, {
      variables: {
        input: {
          id: customerId,
          phone: phone,
          smsMarketingConsent: {
            marketingState: "SUBSCRIBED",
            marketingOptInLevel: "SINGLE_OPT_IN",
            consentUpdatedAt: new Date().toISOString(),
          },
        },
      },
    })

    if (response.errors || response.data?.customerUpdate?.userErrors?.length > 0) {
      console.error("[v0] Customer SMS update failed:", response)
      return NextResponse.json({ success: false, error: "Failed to update customer" }, { status: 400 })
    }

    console.log("[v0] Customer SMS consent updated:", customerId)
    return NextResponse.json({ success: true, customer: response.data.customerUpdate.customer })
  } catch (error) {
    console.error("[v0] Error updating customer SMS:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
