import {CartForm} from '@shopify/hydrogen';
import type {CartLineUpdateInput} from '@shopify/hydrogen/storefront-api-types';
import type {ReactNode} from 'react';

function TrashIcon({className}: {className?: string}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M6 6l1 16h10l1-16" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

function CartLineUpdateButton({
  children,
  lines,
}: {
  children: ReactNode;
  lines: CartLineUpdateInput[];
}) {
  return (
    <CartForm
      route="/cart"
      action={CartForm.ACTIONS.LinesUpdate}
      inputs={{lines}}
    >
      {children}
    </CartForm>
  );
}

function CartLineRemoveButton({lineIds}: {lineIds: string[]}) {
  return (
    <CartForm
      route="/cart"
      action={CartForm.ACTIONS.LinesRemove}
      inputs={{lineIds}}
    >
      <button
        type="submit"
        className="inline-flex items-center justify-center h-9 w-9 rounded-md border border-border hover:bg-accent transition-colors"
        aria-label="Remove item"
      >
        <TrashIcon className="h-4 w-4" />
      </button>
    </CartForm>
  );
}

export function CartQuantityControls({
  lineId,
  quantity,
  disabled = false,
}: {
  lineId: string;
  quantity: number;
  disabled?: boolean;
}) {
  const prevQuantity = Math.max(0, quantity - 1);
  const nextQuantity = quantity + 1;

  return (
    <div className="flex items-center gap-2">
      <div className="inline-flex items-center rounded-md border border-border overflow-hidden">
        <CartLineUpdateButton lines={[{id: lineId, quantity: prevQuantity}]}>
          <button
            type="submit"
            aria-label="Decrease quantity"
            disabled={disabled || quantity <= 1}
            className="h-9 w-9 inline-flex items-center justify-center hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span aria-hidden="true">−</span>
          </button>
        </CartLineUpdateButton>
        <div className="h-9 min-w-10 px-3 inline-flex items-center justify-center text-sm tabular-nums">
          {quantity}
        </div>
        <CartLineUpdateButton lines={[{id: lineId, quantity: nextQuantity}]}>
          <button
            type="submit"
            aria-label="Increase quantity"
            disabled={disabled}
            className="h-9 w-9 inline-flex items-center justify-center hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span aria-hidden="true">+</span>
          </button>
        </CartLineUpdateButton>
      </div>

      <CartLineRemoveButton lineIds={[lineId]} />
    </div>
  );
}

