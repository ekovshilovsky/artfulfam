export type Money = {
  amount: string
  currencyCode: string
}

export type SelectedOption = {
  name: string
  value: string
}

export type ProductVariant = {
  id: string
  title: string
  availableForSale: boolean
  selectedOptions: SelectedOption[]
  price: Money
}

export type ProductImage = {
  url: string
  altText: string | null
}

export type ProductOption = {
  id: string
  name: string
  values: string[]
}

export type ShopifyProduct = {
  id: string
  title: string
  description: string
  descriptionHtml: string
  handle: string
  availableForSale: boolean
  productType: string | null
  tags: string[]
  options: ProductOption[]
  images: {
    edges: Array<{ node: ProductImage }>
  }
  priceRange: {
    minVariantPrice: Money
  }
  compareAtPriceRange?: {
    minVariantPrice: Money | null
  } | null
  variants: {
    edges: Array<{ node: ProductVariant }>
  }
}

export type ShopifyCollection = {
  id: string
  title: string
  handle: string
  description: string
  image: {
    url: string
    altText: string | null
  } | null
}

export type ShopifyCartLine = {
  id: string
  quantity: number
  merchandise: ProductVariant & {
    product: {
      title: string
      handle?: string
      images: {
        edges: Array<{ node: ProductImage }>
      }
    }
  }
}

export type ShopifyCart = {
  id: string
  lines: {
    edges: Array<{ node: ShopifyCartLine }>
  }
  cost: {
    totalAmount: Money
    subtotalAmount?: Money
    totalTaxAmount?: Money | null
  }
  checkoutUrl: string
}

export type ProductSortKey = "TITLE" | "CREATED_AT" | "PRICE" | "BEST_SELLING" | "RELEVANCE"

export type ProductCollectionSortKey = "TITLE" | "PRICE" | "BEST_SELLING" | "MANUAL" | "CREATED"
