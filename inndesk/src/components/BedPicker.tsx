import { ChevronDown } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { bedCatalog } from '../data/options'

/** A small drawn bed; wider beds are drawn wider, bunk beds have two decks. */
export function BedIcon({ type, className = 'h-9 w-12' }: { type: string; className?: string }) {
  const b = bedCatalog.find((x) => x.name === type)
  const w = 30 * (b?.width ?? 1)
  const x0 = 24 - w / 2
  const bunk = type === 'Bunk Bed'
  const sofa = type === 'Sofa Bed'
  const floor = type === 'Futon' || type === 'Floor Mattress'
  const deck = (y: number) => (
    <g>
      {!floor && <rect x={x0 - 1.5} y={y - 9} width={3} height={14} rx={1} fill="#8f6614" />}
      <rect x={x0} y={y} width={w} height={7} rx={1.5} fill="#ad7d1d" />
      <rect x={x0 + 1} y={y - 3} width={w - 2} height={5} rx={2} fill="#dceae2" stroke="#24614b" strokeWidth={0.8} />
      <rect x={x0 + 2.5} y={y - 6} width={Math.min(9, w / 2.6)} height={4} rx={1.6} fill="#ffffff" stroke="#24614b" strokeWidth={0.6} />
      {w > 26 && <rect x={x0 + w - 2.5 - Math.min(9, w / 2.6)} y={y - 6} width={Math.min(9, w / 2.6)} height={4} rx={1.6} fill="#ffffff" stroke="#24614b" strokeWidth={0.6} />}
    </g>
  )
  return (
    <svg viewBox="0 0 48 36" className={className} aria-hidden="true">
      {sofa ? (
        <g>
          <rect x={x0} y={14} width={w} height={8} rx={2} fill="#dceae2" stroke="#24614b" strokeWidth={0.8} />
          <rect x={x0} y={22} width={w} height={6} rx={1.5} fill="#ad7d1d" />
          <rect x={x0 - 2} y={16} width={4} height={12} rx={1.5} fill="#8f6614" />
          <rect x={x0 + w - 2} y={16} width={4} height={12} rx={1.5} fill="#8f6614" />
        </g>
      ) : bunk ? (
        <g>
          {deck(14)}
          {deck(28)}
        </g>
      ) : (
        deck(floor ? 26 : 22)
      )}
    </svg>
  )
}

export function BedPicker({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  const [open, setOpen] = useState(false)
  const [up, setUp] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  const current = bedCatalog.find((b) => b.name === value)
  useEffect(() => {
    if (!open) return
    const out = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false)
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', out)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', out)
      document.removeEventListener('keydown', esc)
    }
  }, [open])
  return (
    <div ref={box} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
        onClick={() => {
          const r = box.current?.getBoundingClientRect()
          if (r) setUp(window.innerHeight - r.bottom < 340 && r.top > 340)
          setOpen((x) => !x)
        }}
        className={`flex min-h-[52px] w-full items-center gap-2 rounded-[10px] border bg-white px-2.5 text-left ${open ? 'border-pine-700 shadow-[0_0_0_3px_var(--color-pine-100)]' : 'border-line-strong'}`}
      >
        {current ? (
          <>
            <BedIcon type={current.name} />
            <span className="min-w-0 flex-1 leading-tight">
              <strong className="block text-[15px] text-pine-800">{current.name}</strong>
              <span className="block truncate text-[12.5px] text-ink-500">{current.size}</span>
            </span>
          </>
        ) : (
          <span className="flex-1 px-1 text-[15px] text-ink-400">Select bed</span>
        )}
        <ChevronDown className={`h-4 w-4 shrink-0 text-ink-700 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      {open && (
        <ul role="listbox" className={`absolute inset-x-0 z-50 max-h-64 overflow-y-auto rounded-lg bg-white py-1 shadow-lift ring-1 ring-line ${up ? 'bottom-full mb-1' : 'top-full mt-1'}`}>
          {bedCatalog.map((b) => (
            <li key={b.name} role="option" aria-selected={b.name === value}>
              <button
                type="button"
                onClick={() => {
                  onChange(b.name)
                  setOpen(false)
                }}
                className={`flex w-full items-center gap-2.5 px-2.5 py-2 text-left hover:bg-pine-50 ${b.name === value ? 'bg-pine-50' : ''}`}
              >
                <BedIcon type={b.name} />
                <span className="leading-tight">
                  <strong className="block text-[15px] text-ink-900">{b.name}</strong>
                  <span className="text-[12.5px] text-ink-500">{b.size}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
