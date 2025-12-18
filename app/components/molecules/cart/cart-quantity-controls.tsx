import {CartForm} from '@shopify/hydrogen';
import type {CartLineUpdateInput} from '@shopify/hydrogen/storefront-api-types';
import type {ReactNode} from 'react';
import {useState, useEffect, useRef} from 'react';
import {useFetcher} from 'react-router';

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

/**
 * Quantity controls with optimistic updates and debounced server sync.
 * Shows changes instantly while batching updates to Shopify.
 */
export function CartQuantityControls({
  lineId,
  quantity: serverQuantity,
  disabled = false,
}: {
  lineId: string;
  quantity: number;
  disabled?: boolean;
}) {
  const fetcher = useFetcher();
  const [optimisticQuantity, setOptimisticQuantity] = useState(serverQuantity);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync optimistic with server when server updates
  useEffect(() => {
    setOptimisticQuantity(serverQuantity);
  }, [serverQuantity]);

  const updateQuantity = (newQuantity: number) => {
    if (newQuantity < 1) return;

    // Update UI immediately (optimistic)
    setOptimisticQuantity(newQuantity);

    // Clear pending debounce
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Debounce server update (500ms)
    timeoutRef.current = setTimeout(() => {
      const formData = new FormData();
      formData.append('cartAction', CartForm.ACTIONS.LinesUpdate);
      formData.append('lines', JSON.stringify([{id: lineId, quantity: newQuantity}]));
      fetcher.submit(formData, {method: 'POST', action: '/cart'});
    }, 500);
  };

  return (
    <div className="flex items-center gap-2">
      <div className="inline-flex items-center rounded-md border border-border overflow-hidden">
        <button
          type="button"
          onClick={() => updateQuantity(optimisticQuantity - 1)}
          aria-label="Decrease quantity"
          disabled={disabled || optimisticQuantity <= 1}
          className="h-9 w-9 inline-flex items-center justify-center hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <span aria-hidden="true">−</span>
        </button>

        <div className="h-9 min-w-10 px-3 inline-flex items-center justify-center text-sm tabular-nums">
          {optimisticQuantity}
        </div>

        <button
          type="button"
          onClick={() => updateQuantity(optimisticQuantity + 1)}
          aria-label="Increase quantity"
          disabled={disabled}
          className="h-9 w-9 inline-flex items-center justify-center hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <span aria-hidden="true">+</span>
        </button>
      </div>

      <CartLineRemoveButton lineIds={[lineId]} />
    </div>
  );
}

