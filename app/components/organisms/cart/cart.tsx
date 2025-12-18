import {CartForm, Money} from '@shopify/hydrogen';
import {useFetchers} from 'react-router';
import type {CartApiQueryFragment} from 'storefrontapi.generated';
import type {
  DisplayCartLine,
  OptimisticCartLine,
} from '~/components/molecules/cart/cart-line-item';
import {CartLineItemRow} from '~/components/molecules/cart/cart-line-item';

type CartLine = CartApiQueryFragment['lines']['nodes'][0];

export type CartMainProps = {
  cart: CartApiQueryFragment | null;
  layout: 'page' | 'aside';
};

function parseOptimisticLine(value: FormDataEntryValue | null): OptimisticCartLine | null {
  if (typeof value !== 'string') return null;
  try {
    const parsed = JSON.parse(value) as Omit<OptimisticCartLine, 'kind'> & {
      kind?: OptimisticCartLine['kind'];
    };
    if (!parsed || typeof parsed !== 'object') return null;
    if (!parsed.merchandiseId || !parsed.product?.title || !parsed.product?.handle) {
      return null;
    }
    return {
      kind: 'optimistic',
      merchandiseId: String(parsed.merchandiseId),
      quantity: Number(parsed.quantity || 1),
      product: {
        title: String(parsed.product.title),
        handle: String(parsed.product.handle),
      },
      variantTitle: parsed.variantTitle ?? null,
      image: parsed.image ?? null,
      selectedOptions: parsed.selectedOptions ?? null,
      price: parsed.price ?? null,
    };
  } catch {
    return null;
  }
}

function useOptimisticLines(): OptimisticCartLine[] {
  const fetchers = useFetchers();
  const optimistic: OptimisticCartLine[] = [];

  for (const f of fetchers) {
    if (!f.formData) continue;
    if (f.state === 'idle') continue;
    const {action} = CartForm.getFormInput(f.formData);
    if (action !== CartForm.ACTIONS.LinesAdd) continue;

    const optimisticLine = parseOptimisticLine(f.formData.get('optimisticLine'));
    if (optimisticLine) optimistic.push(optimisticLine);
  }

  return optimistic;
}

function buildDisplayLines(
  cartLines: CartLine[],
  optimisticLines: OptimisticCartLine[],
): DisplayCartLine[] {
  const display: DisplayCartLine[] = [];
  const cartMerchIds = new Set(cartLines.map((l) => l.merchandise.id));

  for (const ol of optimisticLines) {
    if (!cartMerchIds.has(ol.merchandiseId)) {
      display.push({kind: 'optimistic', line: ol});
    }
  }

  for (const cl of cartLines) {
    display.push({kind: 'cart', line: cl});
  }

  return display;
}

function CartEmpty({layout}: {layout: CartMainProps['layout']}) {
  return (
    <div className="p-6 text-center">
      <p className="text-base text-muted-foreground mb-6 font-display">
        Your cart is empty
      </p>
      <a
        href="/collections"
        onClick={(event) => {
          if (layout === 'aside') {
            event.preventDefault();
            window.location.href = '/collections';
          }
        }}
        className="w-full inline-flex items-center justify-center h-12 px-6 rounded-full bg-black text-white text-sm font-bold font-display hover:bg-black/90 transition-colors"
      >
        Start shopping
      </a>
    </div>
  );
}

function CartCheckoutActions({checkoutUrl}: {checkoutUrl?: string | null}) {
  if (!checkoutUrl) return null;
  return (
    <a
      href={checkoutUrl}
      target="_self"
      className="mt-4 w-full inline-flex items-center justify-center h-12 px-6 rounded-full bg-black text-white text-sm font-bold font-display hover:bg-black/90 transition-colors"
    >
      Check out
    </a>
  );
}

function CartEstimatedTotal({cost}: {cost: CartApiQueryFragment['cost']}) {
  return (
    <div className="flex items-baseline justify-between mb-1">
      <div className="text-base font-semibold font-display">Estimated total</div>
      <div className="text-2xl font-bold tabular-nums font-display">
        {cost?.totalAmount ? (
          <Money withoutTrailingZeros data={cost.totalAmount} />
        ) : (
          '-'
        )}
      </div>
    </div>
  );
}

function CartDrawer({
  cart,
  layout,
}: {
  cart: CartApiQueryFragment | null;
  layout: CartMainProps['layout'];
}) {
  const optimisticLines = useOptimisticLines();
  const cartLines = cart?.lines?.nodes ?? [];
  const displayLines = buildDisplayLines(cartLines, optimisticLines);
  const hasItems = (cart?.totalQuantity || 0) > 0 || displayLines.length > 0;

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto">
        {!hasItems ? (
          <CartEmpty layout={layout} />
        ) : (
          <ul className="divide-y divide-border px-6">
            {displayLines.map((dl) => {
              const key =
                dl.kind === 'cart'
                  ? dl.line.id
                  : `optimistic:${dl.line.merchandiseId}`;
              return <CartLineItemRow key={key} displayLine={dl} layout={layout} />;
            })}
          </ul>
        )}
      </div>

      <div className="border-t-2 border-border px-6 py-6 bg-background">
        {cart ? (
          <>
            <CartEstimatedTotal cost={cart.cost} />
            <p className="mt-2 text-xs text-muted-foreground">
              Taxes and shipping calculated at checkout.
            </p>
            <CartCheckoutActions checkoutUrl={cart.checkoutUrl} />
          </>
        ) : (
          <>
            <div className="h-6 w-40 bg-muted rounded-md animate-pulse" />
            <div className="mt-4 h-12 w-full bg-muted rounded-full animate-pulse" />
          </>
        )}
      </div>
    </div>
  );
}

function CartPage({
  cart,
}: {
  cart: CartApiQueryFragment | null;
}) {
  const optimisticLines = useOptimisticLines();
  const cartLines = cart?.lines?.nodes ?? [];
  const displayLines = buildDisplayLines(cartLines, optimisticLines);
  const hasItems = (cart?.totalQuantity || 0) > 0 || displayLines.length > 0;

  return (
    <div className="max-w-3xl">
      {!hasItems ? (
        <CartEmpty layout="page" />
      ) : (
        <>
          <ul className="divide-y divide-border">
            {displayLines.map((dl) => {
              const key =
                dl.kind === 'cart'
                  ? dl.line.id
                  : `optimistic:${dl.line.merchandiseId}`;
              return <CartLineItemRow key={key} displayLine={dl} layout="page" />;
            })}
          </ul>

          {cart ? (
            <div className="mt-8 border-2 border-border rounded-2xl p-6 bg-background">
              <CartEstimatedTotal cost={cart.cost} />
              <p className="mt-2 text-xs text-muted-foreground">
                Taxes and shipping calculated at checkout.
              </p>
              <CartCheckoutActions checkoutUrl={cart.checkoutUrl} />
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

export function CartMain({layout, cart}: CartMainProps) {
  if (layout === 'aside') return <CartDrawer cart={cart} layout={layout} />;
  return <CartPage cart={cart} />;
}

