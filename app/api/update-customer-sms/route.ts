import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { customerId, phone, consent } = await request.json()

    if (!customerId || !phone || !consent) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })
    }

    const domain = process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN
    const adminToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN

    if (!domain || !adminToken) {
      return NextResponse.json({ success: false, error: "Shopify not configured" }, { status: 500 })
    }

    const shopDomain = domain.replace(".myshopify.com", "")
    const graphqlUrl = `https://${shopDomain}.myshopify.com/admin/api/2024-10/graphql.json`

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

    const response = await fetch(graphqlUrl, {
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": adminToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: mutation,
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
      }),
    })

    const data = await response.json()

    if (data.errors || data.data?.customerUpdate?.userErrors?.length > 0) {
      console.error("[v0] Customer SMS update failed:", data)
      return NextResponse.json({ success: false, error: "Failed to update customer" }, { status: 400 })
    }

    console.log("[v0] Customer SMS consent updated:", customerId)
    return NextResponse.json({ success: true, customer: data.data.customerUpdate.customer })
  } catch (error) {
    console.error("[v0] Error updating customer SMS:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
