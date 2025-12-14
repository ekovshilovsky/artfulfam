/**
 * Shopify Storefront API via Admin API OAuth
 * 
 * Modern approach: Use Admin API OAuth token to access Storefront API
 * No need for separate SHOPIFY_STOREFRONT_ACCESS_TOKEN
 * 
 * This uses the Admin API's GraphQL endpoint with storefront queries
 */

import { getAccessToken } from "./oauth"
import { parseShopifyDomain } from "./parse-shopify-domain"

const rawStoreDomain = process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN
const SHOPIFY_STORE_DOMAIN = rawStoreDomain ? parseShopifyDomain(rawStoreDomain) : "your-store.myshopify.com"

/**
 * Fetch from Shopify using Admin API token (works for both Admin and Storefront queries)
 */
async function shopifyAdminGraphQLFetch<T>({
  query,
  variables = {},
}: {
  query: string
  variables?: Record<string, any>
}): Promise<{ data: T; errors?: any[] }> {
  try {
    const accessToken = await getAccessToken()

    if (!accessToken) {
      throw new Error("No Admin API access token available. Please complete OAuth flow.")
    }

    const url = `https://${SHOPIFY_STORE_DOMAIN}/admin/api/2024-10/graphql.json`

    console.log("[Shopify] Admin GraphQL request:", {
      url,
      hasToken: !!accessToken,
      queryPreview: query.substring(0, 100),
    })

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken,
      },
      body: JSON.stringify({
        query,
        variables,
      }),
      cache: "no-store",
    })

    const responseText = await response.text()

    if (!response.ok) {
      console.error("[Shopify] API error:", {
        status: response.status,
        statusText: response.statusText,
        body: responseText,
      })
      throw new Error(`Shopify API HTTP error! Status: ${response.status}`)
    }

    const json = JSON.parse(responseText)

    if (json.errors) {
      console.error("[Shopify] GraphQL errors:", json.errors)
      throw new Error(`Shopify GraphQL errors: ${JSON.stringify(json.errors)}`)
    }

    return json
  } catch (error) {
    console.error("[Shopify] Fetch error:", error)
    throw error
  }
}

/**
 * Get products using Admin API (includes all product data)
 */
export async function getProductsViaAdmin({
  first = 12,
  query: searchQuery,
}: {
  first?: number
  query?: string
} = {}) {
  const query = /* GraphQL */ `
    query getProducts($first: Int!, $query: String) {
      products(first: $first, query: $query) {
        edges {
          node {
            id
            title
            description
            descriptionHtml
            handle
            status
            availableForSale: availableForSale
            productType
            tags
            options {
              id
              name
              values
            }
            images(first: 5) {
              edges {
                node {
                  url
                  altText
                }
              }
            }
            priceRangeV2 {
              minVariantPrice {
                amount
                currencyCode
              }
            }
            compareAtPriceRange {
              minVariantPrice {
                amount
                currencyCode
              }
            }
            variants(first: 10) {
              edges {
                node {
                  id
                  title
                  price
                  availableForSale
                  selectedOptions {
                    name
                    value
                  }
                }
              }
            }
          }
        }
      }
    }
  `

  try {
    const { data } = await shopifyAdminGraphQLFetch<{
      products: {
        edges: Array<{ node: any }>
      }
    }>({
      query,
      variables: { first, query: searchQuery },
    })

    return data.products.edges.map((edge) => edge.node)
  } catch (error) {
    console.error("[Shopify] Error fetching products:", error)
    return []
  }
}

/**
 * Get single product by handle using Admin API
 */
export async function getProductByHandleViaAdmin(handle: string) {
  const query = /* GraphQL */ `
    query getProductByHandle($handle: String!) {
      productByHandle(handle: $handle) {
        id
        title
        description
        descriptionHtml
        handle
        productType
        tags
        availableForSale
        options {
          id
          name
          values
        }
        images(first: 10) {
          edges {
            node {
              url
              altText
            }
          }
        }
        priceRangeV2 {
          minVariantPrice {
            amount
            currencyCode
          }
        }
        compareAtPriceRange {
          minVariantPrice {
            amount
            currencyCode
          }
        }
        variants(first: 10) {
          edges {
            node {
              id
              title
              price
              availableForSale
              selectedOptions {
                name
                value
              }
            }
          }
        }
      }
    }
  `

  try {
    const { data } = await shopifyAdminGraphQLFetch<{
      productByHandle: any | null
    }>({
      query,
      variables: { handle },
    })

    return data.productByHandle
  } catch (error) {
    console.error("[Shopify] Error fetching product:", error)
    return null
  }
}

/**
 * Get collections using Admin API
 */
export async function getCollectionsViaAdmin(first = 10) {
  const query = /* GraphQL */ `
    query getCollections($first: Int!) {
      collections(first: $first) {
        edges {
          node {
            id
            title
            handle
            description
            image {
              url
              altText
            }
          }
        }
      }
    }
  `

  try {
    const { data } = await shopifyAdminGraphQLFetch<{
      collections: {
        edges: Array<{ node: any }>
      }
    }>({
      query,
      variables: { first },
    })

    return data.collections.edges.map((edge) => edge.node)
  } catch (error) {
    console.error("[Shopify] Error fetching collections:", error)
    return []
  }
}

/**
 * Create cart using Storefront API endpoint (requires different approach)
 * Note: Cart operations still need Storefront API or you can use draft orders via Admin API
 */
export async function createCartViaAdmin() {
  // For cart operations, you have two options:
  // 1. Use Storefront API (requires public token)
  // 2. Use Draft Orders via Admin API (more complex but doesn't need Storefront token)

  const query = /* GraphQL */ `
    mutation draftOrderCreate($input: DraftOrderInput!) {
      draftOrderCreate(input: $input) {
        draftOrder {
          id
          invoiceUrl
        }
        userErrors {
          field
          message
        }
      }
    }
  `

  try {
    const { data } = await shopifyAdminGraphQLFetch<{
      draftOrderCreate: {
        draftOrder: any
        userErrors: Array<{ field: string; message: string }>
      }
    }>({
      query,
      variables: {
        input: {
          lineItems: [],
        },
      },
    })

    if (data.draftOrderCreate.userErrors.length > 0) {
      throw new Error(data.draftOrderCreate.userErrors[0].message)
    }

    return data.draftOrderCreate.draftOrder
  } catch (error) {
    console.error("[Shopify] Error creating draft order:", error)
    throw error
  }
}
