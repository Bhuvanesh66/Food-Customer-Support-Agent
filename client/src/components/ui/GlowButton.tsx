import { clsx } from 'clsx';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: 'primary' | 'ghost';
};

export function GlowButton({
  children,
  variant = 'primary',
  className,
  ...rest
}: Props) {
  return (
    <button
      className={clsx(
        'relative inline-flex items-center justify-center gap-2 rounded-full px-6 py-3',
        'font-body font-medium transition-all duration-300 active:scale-[0.98]',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        variant === 'primary' && [
          'bg-gradient-to-r from-cyan/90 to-blue/90 text-bg',
          'shadow-glow hover:shadow-[0_0_60px_rgba(34,211,238,0.45)]',
        ],
        variant === 'ghost' && [
          'glass text-ink hover:bg-[rgba(255,255,255,0.08)]',
        ],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
