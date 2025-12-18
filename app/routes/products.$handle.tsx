import {Suspense} from 'react';
import {MetaFunction} from 'react-router';;
import {data, redirect} from 'react-router';
import type {LoaderFunctionArgs} from '@shopify/hydrogen/oxygen';;
import type { FetcherWithComponents } from 'react-router';
import { Await, Link, useLoaderData } from 'react-router';
import {usePrefetchCart} from '~/hooks/use-prefetch-cart';
import type {
  ProductFragment,
  ProductVariantsQuery,
  ProductVariantFragment,
} from 'storefrontapi.generated';

import {
  Image,
  Money,
  VariantSelector,
  type VariantOption,
  getSelectedProductOptions,
  CartForm,
} from '@shopify/hydrogen';
import type {CartLineInput} from '@shopify/hydrogen/storefront-api-types';
import {getVariantUrl} from '~/utils';
import {Container} from '~/components/atoms/container';

export const meta: MetaFunction = ({data}) => {
  return [{title: `${data.product.title} | ArtfulFam`}];
};

export async function loader({params, request, context}: LoaderFunctionArgs) {
  const {handle} = params;
  const {storefront} = context;

  const selectedOptions = getSelectedProductOptions(request).filter(
    (option) =>
      // Filter out Shopify predictive search query params
      !option.name.startsWith('_sid') &&
      !option.name.startsWith('_pos') &&
      !option.name.startsWith('_psq') &&
      !option.name.startsWith('_ss') &&
      !option.name.startsWith('_v'),
  );

  if (!handle) {
    throw new Error('Expected product handle to be defined');
  }

  // await the query for the critical product data
  const {product} = await storefront.query(PRODUCT_QUERY, {
    variables: {handle, selectedOptions},
  });

  // In order to show which variants are available in the UI, we need to query
  // all of them. But there might be a *lot*, so instead separate the variants
  // into it's own separate query that is deferred. So there's a brief moment
  // where variant options might show as available when they're not, but after
  // this deffered query resolves, the UI will update.
  const variants = storefront.query(VARIANTS_QUERY, {
    variables: {handle},
  });

  if (!product?.id) {
    throw new Response(null, {status: 404});
  }

  const firstVariant = product.variants.nodes[0];
  const firstVariantIsDefault = Boolean(
    firstVariant.selectedOptions.find(
      (option) => option.name === 'Title' && option.value === 'Default Title',
    ),
  );

  if (firstVariantIsDefault) {
    product.selectedVariant = firstVariant;
  } else {
    // if no selected variant was returned from the selected options,
    // we redirect to the first variant's url with it's selected options applied
    if (!product.selectedVariant) {
      return redirectToFirstVariant({product, request});
    }
  }
  return {product, variants};
}

function redirectToFirstVariant({
  product,
  request,
}: {
  product: ProductFragment;
  request: Request;
}) {
  const url = new URL(request.url);
  const firstVariant = product.variants.nodes[0];

  throw redirect(
    getVariantUrl({
      pathname: url.pathname,
      handle: product.handle,
      selectedOptions: firstVariant.selectedOptions,
      searchParams: new URLSearchParams(url.search),
    }),
    {
      status: 302,
    },
  );
}

export default function Product() {
  const {product, variants} = useLoaderData<typeof loader>();
  const {selectedVariant} = product;
  return (
    <Container className="py-8 md:py-12">
      <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
        <ProductImages product={product} selectedVariant={selectedVariant} />
        <ProductMain
          selectedVariant={selectedVariant}
          product={product}
          variants={variants}
        />
      </div>
    </Container>
  );
}

function ProductImages({
  product,
  selectedVariant,
}: {
  product: ProductFragment;
  selectedVariant: ProductFragment['selectedVariant'];
}) {
  const image = selectedVariant?.image || product.variants.nodes[0]?.image;
  
  if (!image) {
    return (
      <div className="aspect-square bg-muted rounded-lg flex items-center justify-center">
        <span className="text-muted-foreground">No image available</span>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <div className="aspect-square overflow-hidden rounded-lg border-2 border-border">
        <Image
          alt={image.altText || product.title}
          aspectRatio="1/1"
          data={image}
          key={image.id}
          sizes="(min-width: 768px) 50vw, 100vw"
          className="object-cover w-full h-full"
        />
      </div>
    </div>
  );
}

function ProductMain({
  selectedVariant,
  product,
  variants,
}: {
  product: ProductFragment;
  selectedVariant: ProductFragment['selectedVariant'];
  variants: Promise<ProductVariantsQuery>;
}) {
  const {title, descriptionHtml, vendor} = product;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl md:text-4xl font-bold mb-2 font-display">{title}</h1>
        {vendor && (
          <p className="text-sm text-muted-foreground">by {vendor}</p>
        )}
      </div>
      
      <ProductPrice selectedVariant={selectedVariant} />
      
      <Suspense
        fallback={
          <ProductForm
            product={product}
            selectedVariant={selectedVariant}
            variants={[]}
          />
        }
      >
        <Await
          errorElement="There was a problem loading product variants"
          resolve={variants}
        >
          {(data) => (
            <ProductForm
              product={product}
              selectedVariant={selectedVariant}
              variants={data.product?.variants.nodes || []}
            />
          )}
        </Await>
      </Suspense>
      
      {descriptionHtml && (
        <div className="border-t border-border pt-6">
          <h2 className="text-lg font-bold mb-3">Description</h2>
          <div 
            className="prose prose-sm max-w-none text-muted-foreground"
            dangerouslySetInnerHTML={{__html: descriptionHtml}} 
          />
        </div>
      )}
      
      <div className="border-t border-border pt-6">
        <h2 className="text-lg font-bold mb-3">About This Artwork</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Each design is carefully created by young artists and printed on-demand on quality products. 
          Your purchase supports creativity and helps kids share their art with the world.
        </p>
      </div>
    </div>
  );
}

function ProductPrice({
  selectedVariant,
}: {
  selectedVariant: ProductFragment['selectedVariant'];
}) {
  return (
    <div className="flex items-center gap-3">
      {selectedVariant?.compareAtPrice ? (
        <>
          <span className="text-3xl font-bold text-primary">
            {selectedVariant && <Money data={selectedVariant.price} />}
          </span>
          <span className="text-xl text-muted-foreground line-through">
            <Money data={selectedVariant.compareAtPrice} />
          </span>
          <span className="inline-flex items-center rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/10">
            Sale
          </span>
        </>
      ) : (
        selectedVariant?.price && (
          <>
            <span className="text-3xl font-bold text-primary">
              <Money data={selectedVariant.price} />
            </span>
            {selectedVariant.availableForSale ? (
              <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                In Stock
              </span>
            ) : (
              <span className="inline-flex items-center rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/10">
                Out of Stock
              </span>
            )}
          </>
        )
      )}
    </div>
  );
}

function ProductForm({
  product,
  selectedVariant,
  variants,
}: {
  product: ProductFragment;
  selectedVariant: ProductFragment['selectedVariant'];
  variants: Array<ProductVariantFragment>;
}) {
  return (
    <div className="space-y-6">
      <VariantSelector
        handle={product.handle}
        options={product.options}
        variants={variants}
      >
        {({option}) => (
          <ProductOptions
            key={option.name}
            option={option}
            productOptions={product.options}
            variants={variants}
          />
        )}
      </VariantSelector>
      
      <AddToCartButton
        disabled={!selectedVariant || !selectedVariant.availableForSale}
        onClick={() => {
          window.location.hash = 'cart-aside';
        }}
        optimisticLine={
          selectedVariant
            ? {
                merchandiseId: selectedVariant.id,
                quantity: 1,
                product: {
                  title: product.title,
                  handle: product.handle,
                },
                variantTitle: selectedVariant.title,
                image: selectedVariant.image
                  ? {
                      url: selectedVariant.image.url,
                      altText: selectedVariant.image.altText,
                    }
                  : null,
                selectedOptions: selectedVariant.selectedOptions,
                price: selectedVariant.price,
              }
            : null
        }
        lines={
          selectedVariant
            ? [
                {
                  merchandiseId: selectedVariant.id,
                  quantity: 1,
                },
              ]
            : []
        }
      >
        {selectedVariant?.availableForSale ? 'Add to cart' : 'Sold out'}
      </AddToCartButton>
    </div>
  );
}

function ProductOptions({
  option,
  productOptions,
  variants,
}: {
  option: VariantOption;
  productOptions: Array<{name: string; values: string[]}>;
  variants: Array<ProductVariantFragment>;
}) {
  const values =
    option.name.trim().toLowerCase() === 'size'
      ? orderValuesLikeShopify(option, productOptions, variants)
      : option.values;

  return (
    <div className="space-y-2" key={option.name}>
      <h3 className="text-sm font-medium">{option.name}</h3>
      <div className="flex flex-wrap gap-2">
        {values.map(({value, isAvailable, isActive, to}) => {
          return (
            <Link
              key={option.name + value}
              prefetch="intent"
              preventScrollReset
              replace
              to={to}
              className={`
                px-4 py-2 rounded-md border-2 text-sm font-medium transition-colors
                ${
                  isActive
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border hover:border-primary'
                }
                ${
                  !isAvailable
                    ? 'opacity-30 cursor-not-allowed'
                    : 'cursor-pointer'
                }
              `}
            >
              {value}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function orderValuesLikeShopify(
  option: VariantOption,
  productOptions: Array<{name: string; values: string[]}>,
  variants: Array<ProductVariantFragment>,
) {
  const nameKey = option.name.trim().toLowerCase();

  // Source of truth for ordering: variant "position" order.
  // Storefront API generally returns `variants.nodes` in the same order as Shopify Admin.
  const variantOrder = deriveOptionOrderFromVariants(nameKey, variants);

  // Fall back to Shopify's option values array if we don't have variants yet.
  const shopifyValues =
    variantOrder.length > 0
      ? variantOrder
      : productOptions.find((o) => o.name.trim().toLowerCase() === nameKey)?.values || [];
  const order = new Map<string, number>();
  shopifyValues.forEach((v, i) => order.set(v, i));

  // If Shopify's order is not size-sensible for a purely size-like set,
  // sort by our size comparator instead.
  const kind = detectSizeKind(shopifyValues);
  if (kind) {
    const shopifySortedByComparator = [...shopifyValues].sort(compareSizeValue);
    const alreadySensible =
      shopifyValues.length === shopifySortedByComparator.length &&
      shopifyValues.every((v, i) => v === shopifySortedByComparator[i]);
    if (!alreadySensible) {
      return [...option.values].sort((a, b) => compareSizeValue(a.value, b.value));
    }
  }

  // Primary: Shopify-defined option value order (Admin order).
  // Secondary: our size comparator (keeps reasonable ordering for any values not found).
  return [...option.values].sort((a, b) => {
    const ai = order.get(a.value);
    const bi = order.get(b.value);
    if (ai != null && bi != null) return ai - bi;
    if (ai != null) return -1;
    if (bi != null) return 1;
    return compareSizeValue(a.value, b.value);
  });
}

function deriveOptionOrderFromVariants(
  optionNameLower: string,
  variants: Array<ProductVariantFragment>,
): string[] {
  if (!variants?.length) return [];
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const v of variants) {
    const match = v.selectedOptions?.find(
      (o) => String(o.name || '').trim().toLowerCase() === optionNameLower,
    );
    const value = String(match?.value || '').trim();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    ordered.push(value);
  }
  return ordered;
}

function maybeSortSizeValues<T extends {value: string}>(values: T[]): T[] {
  // Shopify typically preserves the option value order defined in Admin.
  // Only apply sorting when we can confidently detect a purely "size-like" set
  // that is out of order (numeric, dimensions, or standard apparel sizes).
  const raw = values.map((v) => v.value);
  const kind = detectSizeKind(raw);
  if (!kind) return values;

  const sorted = [...values].sort((a, b) => compareSizeValue(a.value, b.value));
  // If it's already in correct order, keep Shopify's order exactly.
  return isSameOrder(values, sorted) ? values : sorted;
}

function compareSizeValue(aRaw: string, bRaw: string): number {
  const a = String(aRaw || '').trim();
  const b = String(bRaw || '').trim();
  if (a === b) return 0;

  // Common apparel size ordering
  const apparelOrder: Record<string, number> = {
    xxs: 1,
    xs: 2,
    s: 3,
    m: 4,
    l: 5,
    xl: 6,
    xxl: 7,
    '2xl': 7,
    xxxl: 8,
    '3xl': 8,
    '4xl': 9,
    '5xl': 10,
  };
  const aKey = a.toLowerCase().replace(/\s+/g, '');
  const bKey = b.toLowerCase().replace(/\s+/g, '');
  const aApparel = apparelOrder[aKey];
  const bApparel = apparelOrder[bKey];
  if (aApparel != null && bApparel != null) return aApparel - bApparel;
  if (aApparel != null) return -1;
  if (bApparel != null) return 1;

  // Pure numbers: "8", "10", "12"
  const aNum = parsePureNumber(a);
  const bNum = parsePureNumber(b);
  if (aNum != null && bNum != null) return aNum - bNum;
  if (aNum != null) return -1;
  if (bNum != null) return 1;

  // Dimensions: 6"x6", 10"×10", 8 x 10
  const aDim = parseDimensions(a);
  const bDim = parseDimensions(b);
  if (aDim && bDim) {
    if (aDim.w !== bDim.w) return aDim.w - bDim.w;
    if (aDim.h !== bDim.h) return aDim.h - bDim.h;
    return 0;
  }
  if (aDim) return -1;
  if (bDim) return 1;

  // Natural-ish fallback (handles embedded numbers / leading zeros)
  return a.localeCompare(b, undefined, {numeric: true, sensitivity: 'base'});
}

function isSameOrder<T>(a: T[], b: T[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function parsePureNumber(value: string): number | null {
  // supports leading zeros and decimals
  if (!/^\d+(?:\.\d+)?$/.test(value)) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function parseDimensions(value: string): {w: number; h: number} | null {
  // Handles: 6"x6", 6"×6", 6 x 6, 6×6, 8"×10"
  const m = value
    .replace(/\s+/g, '')
    .match(/^(\d+(?:\.\d+)?)(?:\"|in)?(?:x|×)(\d+(?:\.\d+)?)(?:\"|in)?$/i);
  if (!m) return null;
  const w = Number(m[1]);
  const h = Number(m[2]);
  if (!Number.isFinite(w) || !Number.isFinite(h)) return null;
  return {w, h};
}

function detectSizeKind(values: string[]): 'apparel' | 'number' | 'dimension' | null {
  const cleaned = values.map((v) => String(v || '').trim()).filter(Boolean);
  if (cleaned.length < 2) return null;

  const allNumbers = cleaned.every((v) => parsePureNumber(v) != null);
  if (allNumbers) return 'number';

  const allDims = cleaned.every((v) => parseDimensions(v) != null);
  if (allDims) return 'dimension';

  const apparelOrder: Record<string, number> = {
    xxs: 1,
    xs: 2,
    s: 3,
    m: 4,
    l: 5,
    xl: 6,
    xxl: 7,
    '2xl': 7,
    xxxl: 8,
    '3xl': 8,
    '4xl': 9,
    '5xl': 10,
  };
  const allApparel = cleaned.every((v) => apparelOrder[v.toLowerCase().replace(/\s+/g, '')] != null);
  if (allApparel) return 'apparel';

  // Mixed/custom labels: keep Shopify order.
  return null;
}

function AddToCartButton({
  analytics,
  children,
  disabled,
  lines,
  onClick,
  optimisticLine,
}: {
  analytics?: unknown;
  children: React.ReactNode;
  disabled?: boolean;
  lines: CartLineInput[];
  onClick?: () => void;
  optimisticLine?: unknown;
}) {
  const {prefetchCart, cancelPrefetch} = usePrefetchCart();

  return (
    <CartForm route="/cart" inputs={{lines}} action={CartForm.ACTIONS.LinesAdd}>
      {(fetcher: FetcherWithComponents<any>) => (
        <>
          <input
            name="analytics"
            type="hidden"
            value={JSON.stringify(analytics)}
          />
          {optimisticLine ? (
            <input
              name="optimisticLine"
              type="hidden"
              value={JSON.stringify(optimisticLine)}
            />
          ) : null}
          <button
            type="submit"
            onClick={onClick}
            onMouseEnter={prefetchCart}
            onFocus={prefetchCart}
            onMouseLeave={cancelPrefetch}
            onBlur={cancelPrefetch}
            disabled={Boolean(disabled) || fetcher.state !== 'idle'}
            className="w-full inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring bg-primary text-primary-foreground hover:bg-primary/90 h-12 px-8 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {children}
          </button>
        </>
      )}
    </CartForm>
  );
}

const PRODUCT_VARIANT_FRAGMENT = `#graphql
  fragment ProductVariant on ProductVariant {
    availableForSale
    compareAtPrice {
      amount
      currencyCode
    }
    id
    image {
      __typename
      id
      url
      altText
      width
      height
    }
    price {
      amount
      currencyCode
    }
    product {
      title
      handle
    }
    quantityAvailable
    selectedOptions {
      name
      value
    }
    sku
    title
    unitPrice {
      amount
      currencyCode
    }
  }
` as const;

const PRODUCT_FRAGMENT = `#graphql
  fragment Product on Product {
    id
    title
    vendor
    handle
    descriptionHtml
    description
    options {
      name
      values
    }
    selectedVariant: variantBySelectedOptions(selectedOptions: $selectedOptions) {
      ...ProductVariant
    }
    variants(first: 1) {
      nodes {
        ...ProductVariant
      }
    }
    seo {
      description
      title
    }
  }
  ${PRODUCT_VARIANT_FRAGMENT}
` as const;

const PRODUCT_QUERY = `#graphql
  query Product(
    $country: CountryCode
    $handle: String!
    $language: LanguageCode
    $selectedOptions: [SelectedOptionInput!]!
  ) @inContext(country: $country, language: $language) {
    product(handle: $handle) {
      ...Product
    }
  }
  ${PRODUCT_FRAGMENT}
` as const;

const PRODUCT_VARIANTS_FRAGMENT = `#graphql
  fragment ProductVariants on Product {
    variants(first: 250) {
      nodes {
        ...ProductVariant
      }
    }
  }
  ${PRODUCT_VARIANT_FRAGMENT}
` as const;

const VARIANTS_QUERY = `#graphql
  ${PRODUCT_VARIANTS_FRAGMENT}
  query ProductVariants(
    $country: CountryCode
    $language: LanguageCode
    $handle: String!
  ) @inContext(country: $country, language: $language) {
    product(handle: $handle) {
      ...ProductVariants
    }
  }
` as const;
