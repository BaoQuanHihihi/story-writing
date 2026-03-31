import type { TextareaHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        'w-full rounded-xl border border-[var(--wn-border)] bg-[var(--wn-surface)] px-3 py-2 text-sm text-[var(--wn-text)] outline-none placeholder:text-[var(--wn-muted)] focus:ring-2 focus:ring-[var(--wn-accent)]/30 min-h-[120px] resize-y',
        className,
      )}
      {...props}
    />
  )
}
