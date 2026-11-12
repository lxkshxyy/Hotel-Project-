import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useState } from 'react'
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
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} onMouseDown={(e) => e.target === e.currentTarget && onKeep()} className="fixed inset-0 z-[200] flex items-center justify-center bg-black/45 p-4">
          <motion.div role="alertdialog" aria-modal="true" aria-labelledby="discard-title" aria-describedby="discard-text" initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }} transition={{ duration: 0.15 }} className="w-full max-w-[380px] rounded-[3px] bg-white shadow-[0_8px_30px_rgba(0,0,0,0.25)]">
            <h2 id="discard-title" className="border-b border-[#e7e7e7] px-4 py-4 text-[18px] font-medium text-[#262626]">
              Discard Changes?
            </h2>
            <p id="discard-text" className="px-4 pt-4 pb-5 text-[16px] leading-snug text-[#4a4a4a]">
              You are trying to move away from this page which means your changes will be discarded.
            </p>
            <div className="flex items-center justify-end gap-2 px-2.5 pb-2.5">
              <button type="button" onClick={onDiscard} className="h-10 rounded-[3px] px-4 text-[16px] font-semibold text-[#008cff] hover:bg-[#f0f7ff]">
                Discard Changes
              </button>
              {/* Focus starts on the safe choice. */}
              <button type="button" autoFocus onClick={onKeep} className="h-10 rounded-[3px] bg-[#e0571f] px-4 text-[16px] font-semibold text-white shadow-sm hover:bg-[#c94a17]">
                Keep Editing
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/**
 * Asks before leaving the page while there are unsaved changes: in-app links (Back, menu) via the
 * router, and closing or reloading the tab via the browser's own prompt.
 */
export function useLeaveGuard(dirty: boolean, onDiscard?: () => void) {
  const blocker = useBlocker(({ currentLocation, nextLocation }) => dirty && currentLocation.pathname !== nextLocation.pathname)
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
        if (blocker.state === 'blocked') blocker.proceed()
        onDiscard?.()
      }}
    />
  )
}

/** For pop-up forms: closing with unsaved edits asks first. Returns the guarded close and the question. */
export function useCloseGuard(dirty: boolean, onClose: () => void) {
  const [asking, setAsking] = useState(false)
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
