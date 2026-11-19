import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronDown, Search } from 'lucide-react'
import { Children, Fragment, isValidElement, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

/*
 * A drop-down in the InnDesk style, used in place of the browser's plain list. It takes the same
 * <option> children and gives back the same `e.target.value`, so it swaps in for <select> as is.
 * The list opens in a layer above everything (never clipped by a card or pop-up), flips up when
 * there's no room below, has a search box for long lists, and works with the keyboard.
 */

type Opt = { value: string; label: string; disabled: boolean; hidden: boolean }

const textOf = (n: ReactNode): string => {
  if (n == null || typeof n === 'boolean') return ''
  if (typeof n === 'string' || typeof n === 'number') return String(n)
  if (Array.isArray(n)) return n.map(textOf).join('')
  if (isValidElement<{ children?: ReactNode }>(n)) return textOf(n.props.children)
  return ''
}

function readOptions(children: ReactNode, out: Opt[] = []) {
  Children.forEach(children, (c) => {
    if (!isValidElement<{ children?: ReactNode; value?: string | number; disabled?: boolean; hidden?: boolean }>(c)) return
    if (c.type === Fragment) return void readOptions(c.props.children, out)
    if (c.type === 'option') {
      const label = textOf(c.props.children)
      out.push({ value: c.props.value != null ? String(c.props.value) : label, label, disabled: !!c.props.disabled, hidden: !!c.props.hidden })
    }
  })
  return out
}

export interface SelectProps {
  value?: string | number
  onChange?: (e: { target: { value: string } }) => void
  children?: ReactNode
  id?: string
  className?: string
  disabled?: boolean
  'aria-label'?: string
  'aria-invalid'?: boolean | 'true' | 'false'
  'aria-describedby'?: string
  title?: string
}

export function Select({ value, onChange, children, id, className = 'field', disabled, title, ...aria }: SelectProps) {
  const all = useMemo(() => readOptions(children), [children])
  const shown = all.filter((o) => !o.hidden)
  const current = all.find((o) => o.value === String(value ?? ''))
  const placeholder = all.find((o) => o.hidden || (o.disabled && o.value === ''))?.label ?? 'Select'
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [hi, setHi] = useState(0)
  const [pos, setPos] = useState<{ left: number; top?: number; bottom?: number; width: number; maxH: number } | null>(null)
  const btn = useRef<HTMLButtonElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const listId = useId()
  const searchable = shown.length > 10
  const list = q ? shown.filter((o) => o.label.toLowerCase().includes(q.trim().toLowerCase())) : shown

  const place = () => {
    const r = btn.current?.getBoundingClientRect()
    if (!r) return
    const vh = window.innerHeight
    const vw = window.innerWidth
    const width = Math.min(Math.max(r.width, 220), vw - 16)
    const left = Math.max(8, Math.min(r.left, vw - width - 8))
    const below = vh - r.bottom - 12
    const above = r.top - 12
    const want = Math.min(320, shown.length * 42 + (searchable ? 56 : 0) + 12)
    if (below >= want || below >= above) setPos({ left, top: r.bottom + 6, width, maxH: Math.max(160, Math.min(320, below)) })
    else setPos({ left, bottom: vh - r.top + 6, width, maxH: Math.max(160, Math.min(320, above)) })
  }

  useLayoutEffect(() => {
    if (!open) return
    place()
    const on = () => place()
    window.addEventListener('resize', on)
    window.addEventListener('scroll', on, true)
    return () => {
      window.removeEventListener('resize', on)
      window.removeEventListener('scroll', on, true)
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return
    const out = (e: MouseEvent) => {
      const t = e.target as Node
      if (!panel.current?.contains(t) && !btn.current?.contains(t)) setOpen(false)
    }
    document.addEventListener('mousedown', out)
    return () => document.removeEventListener('mousedown', out)
  }, [open])

  // Start on the chosen option, scrolled into view.
  useEffect(() => {
    if (!open) return
    setQ('')
    const i = Math.max(0, shown.findIndex((o) => o.value === String(value ?? '')))
    setHi(i)
    requestAnimationFrame(() => panel.current?.querySelector(`[data-i="${i}"]`)?.scrollIntoView({ block: 'center' }))
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const choose = (o: Opt) => {
    if (o.disabled) return
    setOpen(false)
    btn.current?.focus()
    if (o.value !== String(value ?? '')) onChange?.({ target: { value: o.value } })
  }
  const move = (d: number) => {
    if (!list.length) return
    let i = hi
    for (let n = 0; n < list.length; n++) {
      i = (i + d + list.length) % list.length
      if (!list[i].disabled) break
    }
    setHi(i)
    panel.current?.querySelector(`[data-i="${i}"]`)?.scrollIntoView({ block: 'nearest' })
  }
  const keys = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation()
      e.preventDefault()
      setOpen(false)
      btn.current?.focus()
    } else if (e.key === 'ArrowDown') (e.preventDefault(), move(1))
    else if (e.key === 'ArrowUp') (e.preventDefault(), move(-1))
    else if (e.key === 'Home') (e.preventDefault(), setHi(0))
    else if (e.key === 'End') (e.preventDefault(), setHi(list.length - 1))
    else if (e.key === 'Enter') {
      e.preventDefault()
      if (list[hi]) choose(list[hi])
    } else if (e.key === 'Tab') setOpen(false)
    else if (!searchable && e.key.length === 1) {
      // Type a letter to jump to the first option starting with it.
      const i = list.findIndex((o) => o.label.toLowerCase().startsWith(e.key.toLowerCase()))
      if (i >= 0) {
        setHi(i)
        panel.current?.querySelector(`[data-i="${i}"]`)?.scrollIntoView({ block: 'nearest' })
      }
    }
  }

  return (
    <>
      <button
        ref={btn}
        id={id}
        type="button"
        title={title}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        {...aria}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault()
            setOpen(true)
          } else if (open) keys(e)
        }}
        className={`${className} relative flex items-center !pr-10 text-left disabled:cursor-not-allowed disabled:opacity-70 ${open ? '!border-pine-700 ring-1 ring-pine-700' : ''}`}
      >
        <span className={`block min-w-0 flex-1 truncate ${current && !current.hidden ? '' : 'text-ink-400'}`}>{current && !current.hidden ? current.label : placeholder}</span>
        <ChevronDown className={`pointer-events-none absolute right-3.5 h-4 w-4 text-ink-700 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      {createPortal(
        <AnimatePresence>
          {open && pos && (
            <motion.div
              ref={panel}
              initial={{ opacity: 0, y: pos.top != null ? -4 : 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              onKeyDown={keys}
              style={{ position: 'fixed', left: pos.left, top: pos.top, bottom: pos.bottom, width: pos.width, maxHeight: pos.maxH }}
              className="z-[400] flex flex-col overflow-hidden rounded-xl border border-line bg-white shadow-[0_16px_40px_rgba(26,44,91,0.18)]"
            >
              {searchable && (
                <label className="flex items-center gap-2 border-b border-line px-3">
                  <Search className="h-4 w-4 shrink-0 text-ink-400" aria-hidden="true" />
                  <input
                    autoFocus
                    value={q}
                    onChange={(e) => (setQ(e.target.value), setHi(0))}
                    placeholder="Search"
                    aria-label="Search options"
                    className="h-11 min-w-0 flex-1 bg-transparent text-[14.5px] text-ink-900 outline-none placeholder:text-ink-400"
                  />
                </label>
              )}
              <ul id={listId} role="listbox" aria-label={aria['aria-label']} tabIndex={-1} ref={(el) => void (!searchable && el?.focus())} className="min-h-0 flex-1 overflow-y-auto p-1.5 outline-none">
                {list.length === 0 && <li className="px-3 py-3 text-[14px] text-ink-500">No match</li>}
                {list.map((o, i) => {
                  const sel = o.value === String(value ?? '')
                  return (
                    <li
                      key={`${o.value}-${i}`}
                      data-i={i}
                      role="option"
                      aria-selected={sel}
                      aria-disabled={o.disabled || undefined}
                      onMouseEnter={() => setHi(i)}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => choose(o)}
                      className={`flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2.5 text-[14.5px] leading-snug ${o.disabled ? 'cursor-not-allowed text-ink-400' : sel ? 'font-semibold text-pine-800' : 'text-ink-900'} ${i === hi && !o.disabled ? 'bg-pine-50' : ''}`}
                    >
                      <span className="min-w-0 flex-1">{o.label}</span>
                      {sel && <Check className="h-4 w-4 shrink-0 text-pine-800" aria-hidden="true" />}
                    </li>
                  )
                })}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  )
}
