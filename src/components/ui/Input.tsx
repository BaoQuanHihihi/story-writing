import type { InputHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'w-full rounded-xl border border-[var(--wn-border)] bg-[var(--wn-surface)] px-3 py-2 text-sm text-[var(--wn-text)] outline-none placeholder:text-[var(--wn-muted)] focus:ring-2 focus:ring-[var(--wn-accent)]/30',
        className,
      )}
      {...props}
    />
  )
}
