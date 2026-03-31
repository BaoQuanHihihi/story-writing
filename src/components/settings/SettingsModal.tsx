import { useEffect, useState } from 'react'
import type { AppSettings } from '../../types'
import { useSettings } from '../../context/SettingsContext'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { getDailyWordsRecord } from '../../settings/storage'
import { db } from '../../db/database'

export function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { settings, update } = useSettings()
  const [local, setLocal] = useState<AppSettings>(settings)
  const [totals, setTotals] = useState<{ stories: number; words: number } | null>(null)

  useEffect(() => {
    if (open) setLocal(settings)
  }, [open, settings])

  useEffect(() => {
    if (!open) return
    void (async () => {
      const stories = await db.stories.count()
      const chapters = await db.chapters.filter((c) => !c.deletedAt).toArray()
      const words = chapters.reduce((a, c) => a + countWordsSafe(c.content), 0)
      setTotals({ stories, words })
    })()
  }, [open])

  const todayKey = new Date().toISOString().slice(0, 10)
  const dailyRec = getDailyWordsRecord()
  const todayWords = dailyRec[todayKey] ?? 0

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Settings"
      ariaDescription="Theme, editor, autosave, and writing preferences. Stored locally on this device."
      className="max-w-xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              update(local)
              onClose()
            }}
          >
            Save
          </Button>
        </>
      }
    >
      <div className="space-y-5 text-sm">
        <Field label="Theme">
          <select
            className="wn-select"
            value={local.theme}
            onChange={(e) => setLocal({ ...local, theme: e.target.value as AppSettings['theme'] })}
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="system">System</option>
          </select>
        </Field>

        <Field label="Editor font size">
          <input
            type="range"
            min={16}
            max={26}
            value={local.fontSize}
            onChange={(e) => setLocal({ ...local, fontSize: Number(e.target.value) })}
            aria-valuemin={16}
            aria-valuemax={26}
            aria-valuenow={local.fontSize}
          />
          <span className="text-[var(--wn-muted)] tabular-nums">{local.fontSize}px</span>
        </Field>

        <Field label="Editor width">
          <select
            className="wn-select"
            value={local.editorMaxWidth}
            onChange={(e) =>
              setLocal({ ...local, editorMaxWidth: e.target.value as AppSettings['editorMaxWidth'] })
            }
          >
            <option value="narrow">Narrow</option>
            <option value="comfortable">Comfortable</option>
            <option value="wide">Wide</option>
          </select>
        </Field>

        <Field label="Autosave delay after typing stops">
          <select
            className="wn-select"
            value={local.autosaveDebounceMs}
            onChange={(e) => setLocal({ ...local, autosaveDebounceMs: Number(e.target.value) })}
          >
            <option value={500}>500 ms (snappy)</option>
            <option value={900}>900 ms (balanced)</option>
            <option value={1500}>1.5 s (relaxed)</option>
          </select>
        </Field>

        <Field label="Periodic checkpoints while writing">
          <select
            className="wn-select"
            value={local.periodicSnapshotMs}
            onChange={(e) => setLocal({ ...local, periodicSnapshotMs: Number(e.target.value) })}
          >
            <option value={120000}>Every 2 minutes</option>
            <option value={300000}>Every 5 minutes</option>
            <option value={600000}>Every 10 minutes</option>
          </select>
        </Field>

        <Field label="Daily word goal">
          <input
            type="number"
            min={0}
            step={50}
            className="wn-select max-w-[160px]"
            value={local.dailyWordGoal}
            onChange={(e) => setLocal({ ...local, dailyWordGoal: Number(e.target.value) })}
          />
        </Field>

        <div className="rounded-xl border border-[var(--wn-border)] bg-[var(--wn-surface-2)] p-3">
          <p className="font-medium text-[var(--wn-text)]">Library snapshot</p>
          <p className="mt-1 text-[var(--wn-muted)]">
            {totals ? (
              <>
                <span className="text-[var(--wn-text)] font-medium tabular-nums">{totals.stories}</span>{' '}
                stories ·{' '}
                <span className="text-[var(--wn-text)] font-medium tabular-nums">
                  {totals.words.toLocaleString()}
                </span>{' '}
                words in active chapters
              </>
            ) : (
              'Calculating…'
            )}
          </p>
          <p className="mt-3 text-xs text-[var(--wn-muted)]">
            Today’s writing progress:{' '}
            <span className="tabular-nums font-medium text-[var(--wn-text)]">{todayWords}</span> words toward a
            daily goal of{' '}
            <span className="tabular-nums font-medium text-[var(--wn-text)]">{local.dailyWordGoal}</span>.
          </p>
        </div>
      </div>

      <style>{`
        .wn-select {
          width: 100%;
          border-radius: 12px;
          border: 1px solid var(--wn-border);
          background: var(--wn-surface);
          color: var(--wn-text);
          padding: 8px 10px;
          outline: none;
        }
        .wn-select:focus {
          box-shadow: 0 0 0 2px color-mix(in oklab, var(--wn-accent) 35%, transparent);
        }
      `}</style>
    </Modal>
  )
}

function countWordsSafe(text: string) {
  const t = text.trim()
  if (!t) return 0
  return t.split(/\s+/).length
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-[var(--wn-muted)]">{label}</p>
      <div className="mt-2 flex items-center gap-3">{children}</div>
    </div>
  )
}
