import type * as React from 'react';

type ContainerProps = React.HTMLAttributes<HTMLDivElement> & {
  /**
   * Tailwind's built-in `container` class can be sensitive to ordering and overrides.
   * This component provides a single, consistent page width + horizontal padding.
   */
  maxWidthClassName?: string;
};

export function Container({
  className,
  maxWidthClassName = 'max-w-7xl',
  ...props
}: ContainerProps) {
  const classes = ['mx-auto', 'w-full', maxWidthClassName, 'px-4', 'sm:px-6', 'lg:px-8', className]
    .filter(Boolean)
    .join(' ');

  return <div {...props} className={classes} />;
}

