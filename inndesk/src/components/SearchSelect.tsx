import { ChevronDown, Search } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

/**
 * Single-choice dropdown with a search box at the top of the open list.
 * The closed box can show a prompt, but the prompt is never one of the options.
 */
export default function SearchSelect({ id, value, options, onChange, placeholder = 'Select', searchPlaceholder = 'Search', invalid }: { id?: string; value: string; options: string[]; onChange: (v: string) => void; placeholder?: string; searchPlaceholder?: string; invalid?: boolean }) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [up, setUp] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  const search = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (!open) return
    search.current?.focus()
    const out = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false)
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', out)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', out)
      document.removeEventListener('keydown', esc)
    }
  }, [open])
  const shown = options.filter((o) => o.toLowerCase().includes(q.trim().toLowerCase()))
  return (
    <div ref={box} className="relative">
      <button
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-invalid={invalid}
        onClick={() => {
          const r = box.current?.getBoundingClientRect()
          if (r) setUp(window.innerHeight - r.bottom < 300 && r.top > 300)
          setQ('')
          setOpen((x) => !x)
        }}
        className={`field flex items-center justify-between gap-2 text-left ${open ? 'border-pine-700 shadow-[0_0_0_3px_var(--color-pine-100)]' : ''}`}
      >
        <span className={`truncate ${value ? 'text-ink-900' : 'text-ink-400'}`}>{value || placeholder}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-ink-700 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      {open && (
        <div className={`absolute inset-x-0 z-50 rounded-lg bg-white p-2 shadow-lift ring-1 ring-line ${up ? 'bottom-full mb-1' : 'top-full mt-1'}`}>
          <label className="relative block">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-ink-400" aria-hidden="true" />
            <input ref={search} className="field pl-9" placeholder={searchPlaceholder} aria-label={searchPlaceholder} value={q} onChange={(e) => setQ(e.target.value)} />
          </label>
          <ul role="listbox" className="mt-1 max-h-56 overflow-y-auto">
            {shown.map((o) => (
              <li key={o} role="option" aria-selected={o === value}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(o)
                    setOpen(false)
                  }}
                  className={`w-full rounded-md px-2.5 py-2.5 text-left text-[15px] font-semibold text-ink-700 hover:bg-pine-50 ${o === value ? 'bg-pine-50 text-pine-800' : ''}`}
                >
                  {o}
                </button>
              </li>
            ))}
            {!shown.length && <li className="px-2.5 py-2.5 text-[14px] text-ink-500">Nothing matches “{q}”.</li>}
          </ul>
        </div>
      )}
    </div>
  )
}
