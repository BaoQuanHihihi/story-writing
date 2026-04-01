import { useEffect, useId } from 'react'
import { cn } from '../../lib/cn'
import { Button } from './Button'

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  variant = 'danger',
}: {
  open: boolean
  title: string
  message: string
  confirmLabel: string
  cancelLabel: string
  onConfirm: () => void
  onCancel: () => void
  variant?: 'danger' | 'neutral'
}) {
  const titleId = useId()
  const descId = useId()

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onCancel])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-6"
      role="presentation"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default bg-transparent backdrop-blur-md"
        aria-label={cancelLabel}
        onClick={onCancel}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className={cn(
          'relative z-10 w-full max-w-[420px] overflow-hidden rounded-3xl border border-[var(--wn-border)]',
          'bg-[var(--wn-surface)] shadow-[0_24px_80px_-20px_rgba(42,36,27,0.45)] dark:shadow-[0_24px_80px_-16px_rgba(0,0,0,0.65)]',
        )}
      >
        <div
          className="h-1.5 w-full bg-gradient-to-r from-amber-600/90 via-amber-500/80 to-orange-400/70 dark:from-amber-500 dark:via-amber-400 dark:to-orange-300/90"
          aria-hidden
        />

        <div className="px-7 pb-7 pt-6 sm:px-8 sm:pt-7">
          <div className="flex flex-col items-center text-center">
            <div
              className={cn(
                'mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--wn-border)]',
                'bg-[var(--wn-accent-soft)] text-2xl shadow-inner',
              )}
              aria-hidden
            >
              {variant === 'danger' ? '🗑️' : '❔'}
            </div>

            <h2 id={titleId} className="font-serif text-xl font-semibold tracking-tight text-[var(--wn-text)] sm:text-2xl">
              {title}
            </h2>

            <p id={descId} className="mt-3 text-sm leading-relaxed text-[var(--wn-muted)]">
              {message}
            </p>
          </div>

          <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-center">
            <Button
              type="button"
              variant="secondary"
              className="w-full sm:flex-1"
              onClick={onCancel}
            >
              {cancelLabel}
            </Button>
            <Button
              type="button"
              variant={variant === 'danger' ? 'danger' : 'primary'}
              className={cn('w-full sm:flex-1 font-medium', variant === 'danger' && 'shadow-md shadow-red-900/15')}
              onClick={onConfirm}
            >
              {confirmLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
