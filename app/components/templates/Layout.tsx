import {Await} from 'react-router';
import {Suspense} from 'react';
import type {ReactNode} from 'react';
import type {
  CartApiQueryFragment,
  FooterQuery,
  HeaderQuery,
} from 'storefrontapi.generated';
import {Aside} from '~/components/organisms/aside';
import {Footer} from '~/components/organisms/footer';
import {Header, HeaderMenu} from '~/components/organisms/header';
import {CartMain} from '~/components/organisms/cart/cart';
import {
  PredictiveSearchForm,
  PredictiveSearchResults,
} from '~/components/organisms/search';

export type LayoutProps = {
  cart: Promise<CartApiQueryFragment | null>;
  children?: ReactNode;
  footer: Promise<FooterQuery>;
  header: HeaderQuery;
  isLoggedIn: boolean;
};

function CartAsideHeading({cart}: {cart: LayoutProps['cart']}) {
  return (
    <Suspense fallback={<span className="text-3xl font-bold">Cart</span>}>
      <Await resolve={cart}>
        {(resolvedCart) => {
          const count = resolvedCart?.totalQuantity || 0;
          return (
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-3xl font-bold tracking-tight">Cart</span>
              {count > 0 ? (
                <span className="inline-flex items-center justify-center h-6 min-w-6 px-2 rounded-full bg-muted text-xs font-semibold tabular-nums">
                  {count > 99 ? '99+' : count}
                </span>
              ) : null}
            </div>
          );
        }}
      </Await>
    </Suspense>
  );
}

export function Layout({
  cart,
  children = null,
  footer,
  header,
  isLoggedIn,
}: LayoutProps) {
  return (
    <>
      <CartAside cart={cart} />
      <SearchAside />
      {header?.menu ? <MobileMenuAside menu={header.menu} /> : null}
      <Header header={header} cart={cart} isLoggedIn={isLoggedIn} />
      <main className="flex-1">{children}</main>
      <Suspense>
        <Await resolve={footer}>
          {(footer) => <Footer menu={footer.menu} />}
        </Await>
      </Suspense>
    </>
  );
}

function CartAside({cart}: {cart: LayoutProps['cart']}) {
  return (
    <Aside id="cart-aside" heading={<CartAsideHeading cart={cart} />}>
      <Suspense
        fallback={
          <div className="h-full">
            <CartMain cart={null} layout="aside" />
          </div>
        }
      >
        <Await resolve={cart}>
          {(cart) => {
            return <CartMain cart={cart} layout="aside" />;
          }}
        </Await>
      </Suspense>
    </Aside>
  );
}

function SearchAside() {
  return (
    <Aside
      id="search-aside"
      heading={<span className="text-xl font-semibold tracking-tight">Search</span>}
    >
      <div className="predictive-search p-6">
        <PredictiveSearchForm>
          {({fetchResults, inputRef}) => (
            <div className="flex items-center gap-2">
              <input
                name="q"
                onChange={fetchResults}
                onFocus={fetchResults}
                placeholder="Search"
                ref={inputRef}
                type="search"
                className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <button
                type="submit"
                className="h-10 px-4 rounded-md border border-border hover:bg-accent transition-colors text-sm font-medium"
              >
                Search
              </button>
            </div>
          )}
        </PredictiveSearchForm>
        <div className="mt-6">
          <PredictiveSearchResults />
        </div>
      </div>
    </Aside>
  );
}

function MobileMenuAside({menu}: {menu: HeaderQuery['menu']}) {
  return (
    <Aside
      id="mobile-menu-aside"
      heading={<span className="text-xl font-semibold tracking-tight">Menu</span>}
    >
      <div className="p-6">
        <HeaderMenu menu={menu} viewport="mobile" />
      </div>
    </Aside>
  );
}

