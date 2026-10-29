import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { parseISODate } from '../lib/format'
import DateRangeCalendar from './DateRangeCalendar'

/** Check-in / check-out boxes that open the two-month calendar. */
export default function DatePopoverField({
  checkIn,
  checkOut,
  onChange,
  align = 'right',
  single = false,
  className = '',
}: {
  checkIn: string
  checkOut: string
  onChange: (checkIn: string, checkOut: string) => void
  align?: 'left' | 'right'
  single?: boolean
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<'in' | 'out'>('in')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false)
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', esc)
    }
  }, [open])

  const cell = (k: 'in' | 'out', iso: string) => {
    const d = parseISODate(iso)
    return (
      <button
        type="button"
        aria-expanded={open && editing === k}
        onClick={() => {
          setEditing(k)
          setOpen(true)
        }}
        className={`flex flex-col items-start px-3 py-2.5 text-left ${k === 'in' ? 'border-r border-line-strong' : ''} ${open && editing === k ? 'bg-accent-50' : 'hover:bg-mist'}`}
      >
        <span className="flex items-center gap-1 text-xs font-bold text-ink-500">
          {k === 'in' ? 'Check-in' : 'Check-out'} <ChevronDown className="h-3.5 w-3.5 text-navy-800" aria-hidden="true" />
        </span>
        <span className="text-ink-900">
          <span className="text-xl font-black">{d.getDate()}</span>{' '}
          <span className="font-bold">
            {d.toLocaleDateString('en-GB', { month: 'short' })}’{String(d.getFullYear()).slice(2)}
          </span>
        </span>
        <span className="text-xs text-ink-500">{d.toLocaleDateString('en-IN', { weekday: 'long' })}</span>
      </button>
    )
  }

  return (
    <div ref={ref} className={`relative ${className}`}>
      <div className="grid grid-cols-2">
        {cell('in', checkIn)}
        {cell('out', checkOut)}
      </div>
      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-label="Choose dates"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className={`absolute top-[calc(100%+6px)] z-50 ${single ? 'w-[min(380px,calc(100vw-48px))]' : 'w-[min(760px,calc(100vw-32px))]'} rounded-xl border border-line bg-white shadow-float ${align === 'right' ? 'right-0' : 'left-0'}`}
          >
            <DateRangeCalendar checkIn={checkIn} checkOut={checkOut} editing={editing} onEditing={setEditing} onChange={onChange} onDone={() => setOpen(false)} single={single} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
