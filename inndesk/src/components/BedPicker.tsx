import { ChevronDown } from 'lucide-react'
import { type ReactNode, useEffect, useRef, useState } from 'react'
import { bathCatalog, bedCatalog } from '../data/options'

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

/** A small drawn bathroom: toilet and sink always, plus a shower and/or bathtub when the type has one. */
export function BathIcon({ type, className = 'h-9 w-12' }: { type: string; className?: string }) {
  const item = bathCatalog.find((x) => x.name === type)
  const has = (w: string) => (item?.size ?? '').toLowerCase().includes(w)
  return (
    <svg viewBox="0 0 48 36" className={className} aria-hidden="true">
      <rect x={2} y={3} width={44} height={30} rx={3} fill="#eef4f0" stroke="#cfe0d6" />
      <line x1={2} y1={27} x2={46} y2={27} stroke="#cfe0d6" />
      {has('shower') && (
        <g stroke="#24614b" strokeWidth={1.2} fill="none">
          <path d="M8 27 V8 h5" />
          <path d="M11 8 h5 l1.5 2.5 h-6z" fill="#ad7d1d" stroke="#8f6614" />
          <path d="M12.5 13 v2 M14.5 13 v3 M16.5 13 v2" stroke="#7fb3d5" />
        </g>
      )}
      {has('bathtub') && (
        <g>
          <path d={`M${has('shower') ? 6 : 5} 20 h17 v3 a3 3 0 0 1 -3 3 h-11 a3 3 0 0 1 -3 -3z`} fill="#ffffff" stroke="#24614b" strokeWidth={1} />
          <rect x={has('shower') ? 5 : 4} y={18.6} width={19} height={1.8} rx={0.9} fill="#ad7d1d" />
        </g>
      )}
      {has('toilet') && (
        <g fill="#ffffff" stroke="#24614b" strokeWidth={1}>
          <rect x={36} y={12} width={6} height={7} rx={1} />
          <path d="M31 19 h11 v1.5 a5 5 0 0 1 -5 5 h-1 a5 5 0 0 1 -5 -5z" />
        </g>
      )}
      {has('sink') && (
        <g>
          <rect x={has('toilet') ? 24 : 30} y={7} width={6} height={4} rx={1} fill="#dceae2" stroke="#24614b" strokeWidth={0.6} />
          <path d={`M${has('toilet') ? 23 : 29} 15 h8 a4 4 0 0 1 -4 4 a4 4 0 0 1 -4 -4z`} fill="#ffffff" stroke="#24614b" strokeWidth={1} />
          <rect x={has('toilet') ? 26.3 : 32.3} y={19} width={1.4} height={8} fill="#8f6614" />
        </g>
      )}
    </svg>
  )
}

type PickItem = { name: string; size: string }

/** Dropdown whose options show a small picture, a name and a short line under it. */
function ImagePicker({ items, Icon, value, onChange, label, placeholder }: { items: readonly PickItem[]; Icon: (p: { type: string }) => ReactNode; value: string; onChange: (v: string) => void; label: string; placeholder: string }) {
  const [open, setOpen] = useState(false)
  const [up, setUp] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  const current = items.find((b) => b.name === value)
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
            <Icon type={current.name} />
            <span className="min-w-0 flex-1 leading-tight">
              <strong className="block text-[15px] text-pine-800">{current.name}</strong>
              <span className="block truncate text-[12.5px] text-ink-500">{current.size}</span>
            </span>
          </>
        ) : (
          <span className="flex-1 px-1 text-[15px] text-ink-400">{placeholder}</span>
        )}
        <ChevronDown className={`h-4 w-4 shrink-0 text-ink-700 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      {open && (
        <ul role="listbox" className={`absolute inset-x-0 z-50 max-h-64 overflow-y-auto rounded-lg bg-white py-1 shadow-lift ring-1 ring-line ${up ? 'bottom-full mb-1' : 'top-full mt-1'}`}>
          {items.map((b) => (
            <li key={b.name} role="option" aria-selected={b.name === value}>
              <button
                type="button"
                onClick={() => {
                  onChange(b.name)
                  setOpen(false)
                }}
                className={`flex w-full items-center gap-2.5 px-2.5 py-2 text-left hover:bg-pine-50 ${b.name === value ? 'bg-pine-50' : ''}`}
              >
                <Icon type={b.name} />
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

export function BedPicker({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  return <ImagePicker items={bedCatalog} Icon={BedIcon} value={value} onChange={onChange} label={label} placeholder="Select bed" />
}

export function BathPicker({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  return <ImagePicker items={bathCatalog} Icon={BathIcon} value={value} onChange={onChange} label={label} placeholder="Select bathroom" />
}
