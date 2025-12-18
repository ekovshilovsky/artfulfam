import {CartForm} from '@shopify/hydrogen';
import type {CartApiQueryFragment} from 'storefrontapi.generated';
import type {ReactNode} from 'react';
import {Input} from '~/components/atoms/input';

function PlusIcon({className}: {className?: string}) {
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
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

function UpdateDiscountForm({
  discountCodes,
  children,
}: {
  discountCodes?: string[];
  children: ReactNode;
}) {
  return (
    <CartForm
      route="/cart"
      action={CartForm.ACTIONS.DiscountCodesUpdate}
      inputs={{
        discountCodes: discountCodes || [],
      }}
    >
      {children}
    </CartForm>
  );
}

export function CartDiscountSection({
  discountCodes,
}: {
  discountCodes: CartApiQueryFragment['discountCodes'];
}) {
  const codes: string[] =
    discountCodes?.filter((d) => d.applicable)?.map(({code}) => code) || [];

  return (
    <details className="border-t border-border py-4">
      <summary className="list-none cursor-pointer flex items-center justify-between text-sm font-medium">
        <span>Discount</span>
        <PlusIcon className="h-4 w-4" />
      </summary>

      <div className="pt-3 space-y-3">
        {codes.length > 0 ? (
          <UpdateDiscountForm>
            <div className="flex items-center justify-between gap-3">
              <code className="text-xs bg-muted px-2 py-1 rounded-md">
                {codes.join(', ')}
              </code>
              <button
                type="submit"
                className="text-sm underline underline-offset-2"
              >
                Remove
              </button>
            </div>
          </UpdateDiscountForm>
        ) : null}

        <UpdateDiscountForm discountCodes={codes}>
          <div className="flex items-center gap-2">
            <Input
              type="text"
              name="discountCode"
              placeholder="Discount code"
              className="h-10"
            />
            <button
              type="submit"
              className="h-10 px-4 rounded-md border border-border hover:bg-accent transition-colors text-sm font-medium"
            >
              Apply
            </button>
          </div>
        </UpdateDiscountForm>
      </div>
    </details>
  );
}

