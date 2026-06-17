import { clsx } from 'clsx';
import type { HTMLAttributes, ReactNode } from 'react';

type Props = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  glow?: boolean;
};

export function GlassPanel({ children, glow, className, ...rest }: Props) {
  return (
    <div
      className={clsx(
        'glass rounded-[18px]',
        glow && 'shadow-glow',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
