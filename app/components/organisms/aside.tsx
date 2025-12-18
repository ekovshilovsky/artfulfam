/**
 * Drawer/aside component that works without JavaScript via `:target`.
 *
 * Open it by linking to `#<id>` (example: `href="#cart-aside"`).
 */
import type {ReactNode} from 'react';

export function Aside({
  children,
  heading,
  id = 'aside',
}: {
  children?: ReactNode;
  heading: ReactNode;
  id?: string;
}) {
  return (
    <div aria-modal className="drawer-overlay" id={id} role="dialog">
      {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
      <a
        className="drawer-backdrop"
        href="#"
        aria-label="Close dialog"
        onClick={(event) => {
          event.preventDefault();
          history.go(-1);
          window.location.hash = '';
        }}
      />

      <section className="drawer-panel" aria-label="Drawer">
        <header className="drawer-header">
          <div className="min-w-0">{heading}</div>
          <CloseAside />
        </header>
        <div className="drawer-body">{children}</div>
      </section>
    </div>
  );
}

function CloseAside() {
  return (
    /* eslint-disable-next-line jsx-a11y/anchor-is-valid */
    <a
      className="inline-flex items-center justify-center h-10 w-10 rounded-md hover:bg-accent transition-colors text-2xl leading-none"
      href="#"
      aria-label="Close"
      onClick={(event) => {
        event.preventDefault();
        history.go(-1);
        window.location.hash = '';
      }}
    >
      <span aria-hidden="true">&times;</span>
    </a>
  );
}

