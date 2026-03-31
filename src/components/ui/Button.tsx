import type { ButtonHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

const variants = {
  primary:
    'bg-[var(--wn-accent)] text-white hover:opacity-95 shadow-sm focus-visible:ring-2 focus-visible:ring-amber-400/80',
  secondary:
    'bg-[var(--wn-surface-2)] text-[var(--wn-text)] border border-[var(--wn-border)] hover:bg-[var(--wn-surface)]',
  ghost: 'text-[var(--wn-muted)] hover:bg-[var(--wn-surface-2)] hover:text-[var(--wn-text)]',
  danger: 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-2 focus-visible:ring-red-400',
} as const

type Variant = keyof typeof variants

export function Button({
  className,
  variant = 'primary',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition disabled:opacity-50 disabled:pointer-events-none',
        variants[variant],
        className,
      )}
      {...props}
    />
  )
}
