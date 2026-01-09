import { Await, NavLink, useMatches } from 'react-router';
import {Suspense} from 'react';
import type {LayoutProps} from './Layout';
import {Container} from './atoms/container';

type HeaderProps = Pick<LayoutProps, 'header' | 'cart' | 'isLoggedIn'>;

type Viewport = 'desktop' | 'mobile';

export function Header({header, isLoggedIn, cart}: HeaderProps) {
  const {shop, menu} = header;
  return (
    <header className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur-md border-b border-border">
      <Container className="h-16 flex items-center justify-between">
        <NavLink prefetch="intent" to="/" end className="flex items-center gap-2">
          <img src="/logos/svg/Artboard 1.svg" alt="ArtfulFam" className="h-10 w-auto" />
          <div className="text-xl sm:text-2xl font-bold text-primary font-display">
            ArtfulFam
          </div>
        </NavLink>
        <HeaderMenu menu={menu} viewport="desktop" />
        <HeaderCtas isLoggedIn={isLoggedIn} cart={cart} />
      </Container>
    </header>
  );
}

export function HeaderMenu({
  menu,
  viewport,
}: {
  menu: HeaderProps['header']['menu'];
  viewport: Viewport;
}) {
  const [root] = useMatches();
  const publicStoreDomain = root?.data?.publicStoreDomain;
  const className = `header-menu-${viewport}`;

  function closeAside(event: React.MouseEvent<HTMLAnchorElement>) {
    if (viewport === 'mobile') {
      event.preventDefault();
      window.location.href = event.currentTarget.href;
    }
  }

  return (
    <nav className={className} role="navigation">
      {viewport === 'mobile' && (
        <NavLink
          end
          onClick={closeAside}
          prefetch="intent"
          to="/"
          className="text-sm font-medium hover:text-primary transition-colors"
        >
          Home
        </NavLink>
      )}
      {(menu || FALLBACK_HEADER_MENU).items.map((item) => {
        if (!item.url) return null;

        // if the url is internal, we strip the domain
        const isInternal =
          item.url.includes('myshopify.com') ||
          (publicStoreDomain && item.url.includes(publicStoreDomain));
        const url = isInternal ? new URL(item.url).pathname : item.url;
        return (
          <NavLink
            className="text-sm font-medium hover:text-primary transition-colors"
            end
            key={item.id}
            onClick={closeAside}
            prefetch="intent"
            to={url}
          >
            {item.title}
          </NavLink>
        );
      })}
    </nav>
  );
}

function HeaderCtas({
  isLoggedIn,
  cart,
}: Pick<HeaderProps, 'isLoggedIn' | 'cart'>) {
  return (
    <div className="flex items-center gap-1">
      <HeaderMenuMobileToggle />
      <NavLink 
        prefetch="intent" 
        to="/account"
        className="text-sm font-medium hover:text-primary transition-colors hidden md:block"
      >
        {isLoggedIn ? 'Account' : 'Sign in'}
      </NavLink>
      <SearchToggle />
      <CartToggle cart={cart} />
    </div>
  );
}

function HeaderMenuMobileToggle() {
  return (
    <a className="header-menu-mobile-toggle" href="#mobile-menu-aside">
      <h3>☰</h3>
    </a>
  );
}

function SearchToggle() {
  return (
    <IconLink href="#search-aside" label="Search" className="ml-1">
      <SearchIcon className="h-5 w-5" />
    </IconLink>
  );
}

function CartButton({count}: {count: number}) {
  return (
    <IconLink href="#cart-aside" label="Cart" className="relative ml-1">
      <CartIcon className="h-5 w-5" />
      {count > 0 ? (
        <span
          className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] leading-4 text-center"
          aria-label={`${count} items in cart`}
        >
          {count > 99 ? '99+' : count}
        </span>
      ) : null}
    </IconLink>
  );
}

function CartToggle({cart}: Pick<HeaderProps, 'cart'>) {
  return (
    <Suspense fallback={<CartButton count={0} />}>
      <Await resolve={cart}>
        {(cart) => {
          if (!cart) return <CartButton count={0} />;
          return <CartButton count={cart.totalQuantity || 0} />;
        }}
      </Await>
    </Suspense>
  );
}

function IconLink({
  href,
  label,
  className,
  children,
}: {
  href: string;
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      aria-label={label}
      className={`inline-flex items-center justify-center h-10 w-10 rounded-md hover:bg-accent transition-colors ${className || ''}`}
    >
      <span className="sr-only">{label}</span>
      {children}
    </a>
  );
}

function SearchIcon({className}: {className?: string}) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </svg>
  );
}

function CartIcon({className}: {className?: string}) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 7h15l-1.5 9h-11z" />
      <path d="M6 7l-1-3H2" />
      <circle cx="9" cy="20" r="1" />
      <circle cx="18" cy="20" r="1" />
    </svg>
  );
}

const FALLBACK_HEADER_MENU = {
  id: 'gid://shopify/Menu/199655587896',
  items: [
    {
      id: 'gid://shopify/MenuItem/461609500728',
      resourceId: null,
      tags: [],
      title: 'Collections',
      type: 'HTTP',
      url: '/collections',
      items: [],
    },
    {
      id: 'gid://shopify/MenuItem/461609500729',
      resourceId: null,
      tags: [],
      title: 'Artists',
      type: 'HTTP',
      url: '/artists',
      items: [],
    },
    {
      id: 'gid://shopify/MenuItem/461609599032',
      resourceId: 'gid://shopify/Page/92591030328',
      tags: [],
      title: 'About',
      type: 'PAGE',
      url: '/pages/about',
      items: [],
    },
  ],
};

