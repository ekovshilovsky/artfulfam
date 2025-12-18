import {Image, Money} from '@shopify/hydrogen';
import {Link} from 'react-router';
import type {CartApiQueryFragment} from 'storefrontapi.generated';
import {useVariantUrl} from '~/utils';
import {CartQuantityControls} from './cart-quantity-controls';

type CartLine = CartApiQueryFragment['lines']['nodes'][0];

export type OptimisticCartLine = {
  kind: 'optimistic';
  merchandiseId: string;
  quantity: number;
  product: {
    title: string;
    handle: string;
  };
  variantTitle?: string | null;
  image?: {url: string; altText?: string | null} | null;
  selectedOptions?: Array<{name: string; value: string}> | null;
  price?: {amount: string; currencyCode: string} | null;
};

export type DisplayCartLine =
  | {kind: 'cart'; line: CartLine}
  | {kind: 'optimistic'; line: OptimisticCartLine};

function OptimisticLineItem({line}: {line: OptimisticCartLine}) {
  const options =
    line.selectedOptions?.filter(
      (o) => String(o?.name || '').toLowerCase() !== 'title',
    ) || [];

  return (
    <li className="py-4">
      <div className="flex gap-3">
        <div className="h-14 w-14 rounded-md bg-muted overflow-hidden border border-border flex-shrink-0">
          {line.image?.url ? (
            <img
              src={line.image.url}
              alt={line.image.altText || line.product.title}
              className="h-full w-full object-cover"
              loading="eager"
              fetchPriority="high"
            />
          ) : null}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-4">
            <p className="text-sm font-medium leading-5">
              {line.product.title}
            </p>
            {line.price ? (
              <div className="text-sm font-medium whitespace-nowrap">
                <Money withoutTrailingZeros data={line.price as any} />
              </div>
            ) : null}
          </div>

          {line.variantTitle &&
          line.variantTitle !== 'Default Title' &&
          line.variantTitle !== line.product.title ? (
            <p className="text-sm text-muted-foreground">{line.variantTitle}</p>
          ) : null}

          {options.length > 0 ? (
            <ul className="mt-1 space-y-0.5">
              {options.map((o) => (
                <li key={`${o.name}:${o.value}`} className="text-xs text-muted-foreground">
                  {o.name}: {o.value}
                </li>
              ))}
            </ul>
          ) : null}

          <div className="mt-3 opacity-70">
            <div className="flex items-center gap-2">
              <div className="inline-flex items-center rounded-md border border-border overflow-hidden">
                <button
                  type="button"
                  disabled
                  className="h-9 w-9 inline-flex items-center justify-center"
                  aria-label="Decrease quantity"
                >
                  −
                </button>
                <div className="h-9 min-w-10 px-3 inline-flex items-center justify-center text-sm tabular-nums">
                  {line.quantity}
                </div>
                <button
                  type="button"
                  disabled
                  className="h-9 w-9 inline-flex items-center justify-center"
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>
              <button
                type="button"
                disabled
                className="inline-flex items-center justify-center h-9 w-9 rounded-md border border-border"
                aria-label="Remove item"
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Adding…</p>
          </div>
        </div>
      </div>
    </li>
  );
}

function CartLineItem({line, layout}: {line: CartLine; layout: 'page' | 'aside'}) {
  const {id, merchandise} = line;
  const {product, title: variantTitle, image, selectedOptions} = merchandise;
  const lineItemUrl = useVariantUrl(product.handle, selectedOptions);

  const options =
    selectedOptions?.filter(
      (o) => String(o?.name || '').toLowerCase() !== 'title',
    ) || [];

  return (
    <li className="py-4">
      <div className="flex gap-3">
        <div className="h-14 w-14 rounded-md bg-muted overflow-hidden border border-border flex-shrink-0">
          {image ? (
            <Image
              alt={image.altText || product.title}
              data={image}
              width={56}
              height={56}
              loading="eager"
              className="h-full w-full object-cover"
            />
          ) : null}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-4">
            <Link
              prefetch="intent"
              to={lineItemUrl}
              className="text-sm font-medium leading-5 hover:underline underline-offset-2"
              onClick={(event) => {
                if (layout === 'aside') {
                  event.preventDefault();
                  window.location.href = lineItemUrl;
                }
              }}
            >
              {product.title}
            </Link>
            <div className="text-sm font-medium whitespace-nowrap">
              <Money withoutTrailingZeros data={line.cost.totalAmount} />
            </div>
          </div>

          {variantTitle &&
          variantTitle !== 'Default Title' &&
          variantTitle !== product.title ? (
            <p className="text-sm text-muted-foreground">{variantTitle}</p>
          ) : null}

          {options.length > 0 ? (
            <ul className="mt-1 space-y-0.5">
              {options.map((o) => (
                <li
                  key={`${o.name}:${o.value}`}
                  className="text-xs text-muted-foreground"
                >
                  {o.name}: {o.value}
                </li>
              ))}
            </ul>
          ) : null}

          <div className="mt-3">
            <CartQuantityControls lineId={id} quantity={line.quantity} />
          </div>
        </div>
      </div>
    </li>
  );
}

export function CartLineItemRow({
  displayLine,
  layout,
}: {
  displayLine: DisplayCartLine;
  layout: 'page' | 'aside';
}) {
  if (displayLine.kind === 'optimistic') {
    return <OptimisticLineItem line={displayLine.line} />;
  }
  return <CartLineItem line={displayLine.line} layout={layout} />;
}

