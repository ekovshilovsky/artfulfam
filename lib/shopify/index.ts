import type { ProductCollectionSortKey, ProductSortKey, ShopifyCart, ShopifyCollection, ShopifyProduct } from "./types"
import { parseShopifyDomain } from "./parse-shopify-domain"
import { DEFAULT_PAGE_SIZE, DEFAULT_SORT_KEY } from "./constants"

const rawStoreDomain = process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN
const SHOPIFY_STORE_DOMAIN = rawStoreDomain ? parseShopifyDomain(rawStoreDomain) : "your-store.myshopify.com"
const SHOPIFY_STOREFRONT_API_URL = `https://${SHOPIFY_STORE_DOMAIN}/api/2024-10/graphql.json`
const SHOPIFY_STOREFRONT_ACCESS_TOKEN = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN

async function shopifyFetch<T>({
  query,
  variables = {},
}: {
  query: string
  variables?: Record<string, any>
}): Promise<{ data: T; errors?: any[] }> {
  try {
    console.log("[v0] Shopify request details:", {
      url: SHOPIFY_STOREFRONT_API_URL,
      domain: SHOPIFY_STORE_DOMAIN,
      hasToken: !!SHOPIFY_STOREFRONT_ACCESS_TOKEN,
      tokenLength: SHOPIFY_STOREFRONT_ACCESS_TOKEN?.length || 0,
    })

    if (!SHOPIFY_STOREFRONT_ACCESS_TOKEN) {
      throw new Error("Missing SHOPIFY_STOREFRONT_ACCESS_TOKEN environment variable")
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": SHOPIFY_STOREFRONT_ACCESS_TOKEN,
    }

    const response = await fetch(SHOPIFY_STOREFRONT_API_URL, {
      method: "POST",
      headers,
      body: JSON.stringify({
        query,
        variables,
      }),
      cache: "no-store",
    })

    const responseText = await response.text()

    if (!response.ok) {
      console.error("[v0] Shopify API error:", {
        status: response.status,
        statusText: response.statusText,
        body: responseText,
      })
      throw new Error(`Shopify API HTTP error! Status: ${response.status}, Body: ${responseText}`)
    }

    const json = JSON.parse(responseText)

    if (json.errors) {
      console.error("[v0] Shopify GraphQL errors:", json.errors)
      throw new Error(`Shopify GraphQL errors: ${JSON.stringify(json.errors)}`)
    }

    return json
  } catch (error) {
    console.error("[v0] Shopify fetch error:", error)
    throw error
  }
}

// Get all products
export async function getProducts({
  first = DEFAULT_PAGE_SIZE,
  sortKey = DEFAULT_SORT_KEY,
  reverse = false,
  query: searchQuery,
}: {
  first?: number
  sortKey?: ProductSortKey
  reverse?: boolean
  query?: string
} = {}): Promise<ShopifyProduct[]> {
  const query = /* GraphQL */ `
    query getProducts($first: Int!, $sortKey: ProductSortKeys!, $reverse: Boolean, $query: String) {
      products(first: $first, sortKey: $sortKey, reverse: $reverse, query: $query) {
        edges {
          node {
            id
            title
            description
            descriptionHtml
            handle
            availableForSale
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
            priceRange {
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
                  price {
                    amount
                    currencyCode
                  }
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
    const { data } = await shopifyFetch<{
      products: {
        edges: Array<{ node: ShopifyProduct }>
      }
    }>({
      query,
      variables: { first, sortKey, reverse, query: searchQuery },
    })

    return data.products.edges.map((edge) => edge.node)
  } catch (error) {
    console.error("[v0] Error fetching products:", error)
    return []
  }
}

// Get single product by handle
export async function getProduct(handle: string): Promise<ShopifyProduct | null> {
  const query = /* GraphQL */ `
    query getProduct($handle: String!) {
      product(handle: $handle) {
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
        priceRange {
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
              price {
                amount
                currencyCode
              }
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
    const { data } = await shopifyFetch<{
      product: ShopifyProduct | null
    }>({
      query,
      variables: { handle },
    })

    return data.product
  } catch (error) {
    console.error("[v0] Error fetching product:", error)
    return null
  }
}

// Get collections
export async function getCollections(first = 10): Promise<ShopifyCollection[]> {
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
    const { data } = await shopifyFetch<{
      collections: {
        edges: Array<{ node: ShopifyCollection }>
      }
    }>({
      query,
      variables: { first },
    })

    return data.collections.edges.map((edge) => edge.node)
  } catch (error) {
    console.error("[v0] Error fetching collections:", error)
    return []
  }
}

// Get products from a specific collection
export async function getCollectionProducts({
  collection,
  limit = DEFAULT_PAGE_SIZE,
  sortKey = "BEST_SELLING" as ProductCollectionSortKey,
  reverse = false,
}: {
  collection: string
  limit?: number
  sortKey?: ProductCollectionSortKey
  reverse?: boolean
}): Promise<ShopifyProduct[]> {
  const query = /* GraphQL */ `
    query getCollectionProducts($handle: String!, $first: Int!, $sortKey: ProductCollectionSortKeys!, $reverse: Boolean) {
      collection(handle: $handle) {
        products(first: $first, sortKey: $sortKey, reverse: $reverse) {
          edges {
            node {
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
              images(first: 5) {
                edges {
                  node {
                    url
                    altText
                  }
                }
              }
              priceRange {
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
                    price {
                      amount
                      currencyCode
                    }
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
    }
  `

  try {
    const { data } = await shopifyFetch<{
      collection: {
        products: {
          edges: Array<{ node: ShopifyProduct }>
        }
      } | null
    }>({
      query,
      variables: { handle: collection, first: limit, sortKey, reverse },
    })

    if (!data.collection) {
      return []
    }

    return data.collection.products.edges.map((edge) => edge.node)
  } catch (error) {
    console.error("[v0] Error fetching collection products:", error)
    return []
  }
}

// Create cart
export async function createCart(): Promise<ShopifyCart> {
  const query = /* GraphQL */ `
    mutation cartCreate {
      cartCreate {
        cart {
          id
          lines(first: 100) {
            edges {
              node {
                id
                quantity
                merchandise {
                  ... on ProductVariant {
                    id
                    title
                    price {
                      amount
                      currencyCode
                    }
                    product {
                      title
                      images(first: 1) {
                        edges {
                          node {
                            url
                            altText
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
          cost {
            totalAmount {
              amount
              currencyCode
            }
          }
          checkoutUrl
        }
        userErrors {
          field
          message
        }
      }
    }
  `

  const { data } = await shopifyFetch<{
    cartCreate: {
      cart: ShopifyCart
      userErrors: Array<{ field: string; message: string }>
    }
  }>({ query })

  if (data.cartCreate.userErrors.length > 0) {
    throw new Error(data.cartCreate.userErrors[0].message)
  }

  return data.cartCreate.cart
}

// Add items to cart
export async function addCartLines(
  cartId: string,
  lines: Array<{ merchandiseId: string; quantity: number }>,
): Promise<ShopifyCart> {
  const query = /* GraphQL */ `
    mutation cartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
      cartLinesAdd(cartId: $cartId, lines: $lines) {
        cart {
          id
          lines(first: 100) {
            edges {
              node {
                id
                quantity
                merchandise {
                  ... on ProductVariant {
                    id
                    title
                    price {
                      amount
                      currencyCode
                    }
                    selectedOptions {
                      name
                      value
                    }
                    product {
                      title
                      handle
                      images(first: 10) {
                        edges {
                          node {
                            url
                            altText
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
          cost {
            totalAmount {
              amount
              currencyCode
            }
          }
          checkoutUrl
        }
        userErrors {
          field
          message
        }
      }
    }
  `

  const { data } = await shopifyFetch<{
    cartLinesAdd: {
      cart: ShopifyCart
      userErrors: Array<{ field: string; message: string }>
    }
  }>({
    query,
    variables: { cartId, lines },
  })

  if (data.cartLinesAdd.userErrors.length > 0) {
    throw new Error(data.cartLinesAdd.userErrors[0].message)
  }

  return data.cartLinesAdd.cart
}

// Get cart
export async function getCart(cartId: string): Promise<ShopifyCart | null> {
  const query = /* GraphQL */ `
    query getCart($cartId: ID!) {
      cart(id: $cartId) {
        id
        lines(first: 100) {
          edges {
            node {
              id
              quantity
              merchandise {
                ... on ProductVariant {
                  id
                  title
                  price {
                    amount
                    currencyCode
                  }
                  selectedOptions {
                    name
                    value
                  }
                  product {
                    title
                    handle
                    images(first: 10) {
                      edges {
                        node {
                          url
                          altText
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
        cost {
          totalAmount {
            amount
            currencyCode
          }
          subtotalAmount {
            amount
            currencyCode
          }
          totalTaxAmount {
            amount
            currencyCode
          }
        }
        checkoutUrl
      }
    }
  `

  try {
    const { data } = await shopifyFetch<{
      cart: ShopifyCart | null
    }>({
      query,
      variables: { cartId },
    })

    return data.cart
  } catch (error) {
    console.error("[v0] Error fetching cart:", error)
    return null
  }
}
