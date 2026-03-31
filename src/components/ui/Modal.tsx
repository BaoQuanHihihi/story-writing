import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { cn } from '../../lib/cn'

export function Modal({
  open,
  title,
  children,
  footer,
  onClose,
  className,
  ariaDescription,
}: {
  open: boolean
  title: string
  children: ReactNode
  footer?: ReactNode
  onClose: () => void
  className?: string
  ariaDescription?: string
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-black/35 backdrop-blur-[2px]"
        aria-label="Đóng hộp thoại"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="wn-modal-title"
        aria-describedby={ariaDescription ? 'wn-modal-desc' : undefined}
        className={cn(
          'relative z-10 w-full max-w-lg rounded-2xl border border-[var(--wn-border)] bg-[var(--wn-surface)] p-5 shadow-[var(--wn-shadow)]',
          className,
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id="wn-modal-title" className="text-lg font-semibold tracking-tight text-[var(--wn-text)]">
            {title}
          </h2>
          <button
            type="button"
            className="rounded-lg p-1.5 text-[var(--wn-muted)] hover:bg-[var(--wn-surface-2)]"
            onClick={onClose}
            aria-label="Đóng"
          >
            ✕
          </button>
        </div>
        {ariaDescription ? (
          <p id="wn-modal-desc" className="mt-1 text-sm text-[var(--wn-muted)]">
            {ariaDescription}
          </p>
        ) : null}
        <div className="mt-4">{children}</div>
        {footer ? <div className="mt-5 flex flex-wrap justify-end gap-2">{footer}</div> : null}
      </div>
    </div>
  )
}
