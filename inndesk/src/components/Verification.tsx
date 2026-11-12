import { ChevronDown, CircleAlert, CircleCheck, CircleDashed, CircleX, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { useVerifications } from '../lib/store'
import type { Verification, VerifyKind } from '../lib/types'

export const verifyLabel: Record<VerifyKind, string> = { gstin: 'GSTIN', pan: 'PAN', bank: 'Bank account' }

const look = {
  verified: { text: 'Verified', cls: 'bg-[#e8f6ee] text-live', icon: CircleCheck },
  review: { text: 'Needs review', cls: 'bg-[#fff4e5] text-[#a15c07]', icon: CircleAlert },
  failed: { text: 'Failed', cls: 'bg-alert-50 text-alert', icon: CircleX },
  none: { text: 'Not checked yet', cls: 'bg-paper text-ink-500', icon: CircleDashed },
} as const

export function VerifyBadge({ v, checking }: { v?: Verification; checking?: boolean }) {
  if (checking)
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-pine-50 px-2.5 py-1 text-[12.5px] font-semibold text-pine-800">
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> Checking…
      </span>
    )
  const s = look[v?.status ?? 'none']
  const Icon = s.icon
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12.5px] font-semibold ${s.cls}`}>
      <Icon className="h-3.5 w-3.5" aria-hidden="true" /> {s.text}
    </span>
  )
}

function Row({ kind, v, checking, action }: { kind: VerifyKind; v?: Verification; checking: boolean; action?: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const details = Object.entries(v?.details ?? {}).filter(([, x]) => x)
  return (
    <li className="py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-2.5">
          <strong className="text-[14.5px] font-semibold text-ink-900">{verifyLabel[kind]}</strong>
          <VerifyBadge v={v} checking={checking} />
        </span>
        {action}
      </div>
      {v && !checking && (
        <>
          <p className="mt-1 text-[13.5px] text-ink-700">{v.message}</p>
          {v.notes.length > 0 && (
            <ul className="mt-1.5 list-disc space-y-1 pl-5 text-[13.5px] text-ink-700 marker:text-ink-400">
              {v.notes.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          )}
          {details.length > 0 && (
            <>
              <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="mt-1.5 flex items-center gap-1 text-[13px] font-semibold text-pine-800">
                What we found <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
              </button>
              {open && (
                <dl className="mt-1.5 grid grid-cols-[150px_1fr] gap-x-3 gap-y-1 rounded-lg bg-paper p-3 text-[13px]">
                  {details.map(([k, x]) => (
                    <div key={k} className="contents">
                      <dt className="text-ink-500">{k}</dt>
                      <dd className="break-words text-ink-900">{x}</dd>
                    </div>
                  ))}
                  <dt className="text-ink-500">Checked</dt>
                  <dd className="text-ink-900">{new Date(v.checked_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</dd>
                </dl>
              )}
            </>
          )}
        </>
      )}
    </li>
  )
}

/** The latest automatic checks for some of a listing's details, with an optional action per row. */
export function VerificationList({ listingId, kinds, checking = [], action }: { listingId: string; kinds: VerifyKind[]; checking?: VerifyKind[]; action?: (k: VerifyKind, v?: Verification) => React.ReactNode }) {
  const { data } = useVerifications(listingId)
  return (
    <ul className="divide-y divide-line">
      {kinds.map((k) => {
        const v = data?.find((x) => x.kind === k)
        return <Row key={k} kind={k} v={v} checking={checking.includes(k)} action={action?.(k, v)} />
      })}
    </ul>
  )
}
