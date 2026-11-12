import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore } from 'react'
import { useBlocker } from 'react-router-dom'

/** "Discard Changes?" pop-up shown before unsaved edits are thrown away. */
export function DiscardDialog({ open, onDiscard, onKeep }: { open: boolean; onDiscard: () => void; onKeep: () => void }) {
  useEffect(() => {
    if (!open) return
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopImmediatePropagation()
        onKeep()
      }
    }
    document.addEventListener('keydown', k, true)
    return () => document.removeEventListener('keydown', k, true)
  }, [open, onKeep])
  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} onMouseDown={(e) => e.target === e.currentTarget && onKeep()} className="fixed inset-0 z-[200] flex items-center justify-center bg-ink-900/45 p-4">
          <motion.div role="alertdialog" aria-modal="true" aria-labelledby="discard-title" aria-describedby="discard-text" initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 12, opacity: 0 }} transition={{ duration: 0.18 }} className="w-full max-w-[440px] overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
              <h2 id="discard-title" className="text-[19px] font-semibold text-ink-900">
                Discard Changes?
              </h2>
              <button type="button" onClick={onKeep} aria-label="Close, keep editing" className="flex h-9 w-9 items-center justify-center rounded-full text-ink-900 hover:bg-paper">
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <p id="discard-text" className="px-5 py-5 text-[15.5px] leading-relaxed text-ink-700">
              You are trying to move away from this page which means your changes will be discarded.
            </p>
            <div className="flex items-center justify-end gap-3 border-t border-line px-5 py-4">
              <button type="button" onClick={onDiscard} className="inline-flex h-11 items-center rounded-lg border border-pine-800 px-5 text-[14.5px] font-semibold text-pine-800 hover:bg-pine-50">
                Discard Changes
              </button>
              {/* Focus starts on the safe choice. */}
              <button type="button" autoFocus onClick={onKeep} className="inline-flex h-11 items-center rounded-lg bg-pine-800 px-6 text-[14.5px] font-semibold text-white hover:bg-pine-900">
                Keep Editing
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/* ---------------- one place that knows about unsaved edits ---------------- */

// Every open form or page with unsaved edits registers here; one guard in the layout watches them all,
// so leaving by any route (menu, Back arrow, the browser's back button) asks first.
const sources = new Map<string, { discard: () => void }>()
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((f) => f())
const subscribe = (f: () => void) => (listeners.add(f), () => void listeners.delete(f))
const hasUnsaved = () => sources.size > 0

/** Marks this page/form as having unsaved edits while `dirty` is true. `discard` runs if the user discards them. */
export function useUnsaved(dirty: boolean, discard?: () => void) {
  const id = useId()
  const ref = useRef(discard)
  ref.current = discard
  useEffect(() => {
    if (!dirty) return
    sources.set(id, { discard: () => ref.current?.() })
    emit()
    return () => {
      sources.delete(id)
      emit()
    }
  }, [dirty, id])
}

/** Put once in the app layout: asks before route changes and tab closes while anything is unsaved. */
export function UnsavedGuard() {
  const dirty = useSyncExternalStore(subscribe, hasUnsaved)
  const blocker = useBlocker(({ currentLocation, nextLocation }) => hasUnsaved() && currentLocation.pathname !== nextLocation.pathname)
  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])
  return (
    <DiscardDialog
      open={blocker.state === 'blocked'}
      onKeep={() => blocker.state === 'blocked' && blocker.reset()}
      onDiscard={() => {
        ;[...sources.values()].forEach((s) => s.discard())
        if (blocker.state === 'blocked') blocker.proceed()
      }}
    />
  )
}

/** A page with unsaved edits: leaving asks first (the question itself is shown by UnsavedGuard). */
export function useLeaveGuard(dirty: boolean, onDiscard?: () => void) {
  useUnsaved(dirty, onDiscard)
  return null
}

/** For pop-up forms: closing with unsaved edits asks first. Returns the guarded close and the question. */
export function useCloseGuard(dirty: boolean, onClose: () => void) {
  const [asking, setAsking] = useState(false)
  useUnsaved(dirty, onClose)
  const close = useCallback(() => (dirty ? setAsking(true) : onClose()), [dirty, onClose])
  const dialog = (
    <DiscardDialog
      open={asking}
      onKeep={() => setAsking(false)}
      onDiscard={() => {
        setAsking(false)
        onClose()
      }}
    />
  )
  return [close, dialog] as const
}
