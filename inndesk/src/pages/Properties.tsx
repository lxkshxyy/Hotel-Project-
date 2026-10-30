import { CircleAlert, MapPin, Plus } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { PropertyTypePicker, type Category } from '../components/PropertyTypePicker'
import { KeyTag, Notice, Spinner } from '../components/ui'
import { useSession } from '../context/Session'
import { useListings } from '../lib/hooks'
import { blankListing, stepDone, steps } from '../lib/listing'
import { saveListing } from '../lib/store'
import type { Listing } from '../lib/types'

type Tab = 'active' | 'progress'
const tabSteps = steps.filter((s) => s.id !== 'review')

function Row({ l }: { l: Listing }) {
  const draft = l.status === 'draft'
  const done = tabSteps.filter((s) => stepDone(l, s.id)).length
  const place = [l.location.area, l.location.city].filter(Boolean).join(', ')
  const href = draft ? `/app/properties/${l.id}/edit` : `/app/properties/${l.id}`
  return (
    <li className="flex flex-col gap-4 rounded-lg border border-line p-4 sm:flex-row sm:items-center">
      <div className="h-[72px] w-full shrink-0 overflow-hidden rounded-md bg-pine-50 sm:w-[112px]">{l.photos[0] && <img src={l.photos[0].url} alt="" className="h-full w-full object-cover" />}</div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <strong className="truncate text-[17px] text-ink-900">{l.basics.name.trim() || 'Untitled property'}</strong>
          <KeyTag status={l.status} label={draft ? 'In progress' : undefined} />
        </div>
        <span className="mt-0.5 flex items-center gap-1 text-[14px] text-ink-500">
          {l.basics.propertyType}
          {place && (
            <>
              <span aria-hidden="true">·</span>
              <MapPin className="h-3.5 w-3.5" aria-hidden="true" /> {place}
            </>
          )}
        </span>
        {draft && (
          <div className="mt-2 flex items-center gap-3">
            <div className="h-1.5 w-40 overflow-hidden rounded-full bg-line">
              <div className="h-full rounded-full bg-brass-500" style={{ width: `${(done / tabSteps.length) * 100}%` }} />
            </div>
            <span className="text-[13px] font-semibold text-ink-500">
              {done} of {tabSteps.length} sections done
            </span>
          </div>
        )}
      </div>
      <Link to={href} className={draft ? 'btn-brass' : 'btn-ghost'}>
        {draft ? 'Continue listing' : 'Manage'}
      </Link>
    </li>
  )
}

export default function Properties() {
  const { owner } = useSession()
  const { data, error } = useListings()
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab | null>(null)
  const [busy, setBusy] = useState(false)
  const [startError, setStartError] = useState('')
  const picking = params.get('new') === '1'
  const setPicking = (v: boolean) => setParams(v ? { new: '1' } : {}, { replace: !v })

  if (!data) return error ? <div className="p-6"><Notice tone="error">{error}</Notice></div> : <Spinner />
  const active = data.filter((l) => l.status !== 'draft')
  const progress = data.filter((l) => l.status === 'draft')
  const shown = tab ?? (active.length ? 'active' : 'progress')
  const list = shown === 'active' ? active : progress

  const start = async (category: Category, type: string) => {
    if (!owner) return
    setBusy(true)
    setStartError('')
    try {
      const blank = blankListing(owner.id, { phone: owner.phone, email: owner.email, businessName: owner.businessName, gstin: owner.gstin })
      const l = await saveListing({ ...blank, basics: { ...blank.basics, propertyType: type, category } })
      navigate(`/app/properties/${l.id}/edit?step=basics`)
    } catch (e) {
      setStartError(e instanceof Error ? e.message : 'Couldn’t start the listing.')
      setPicking(false)
    } finally {
      setBusy(false)
    }
  }

  const newBtn = (
    <button type="button" className="btn-brass" onClick={() => setPicking(true)}>
      <Plus className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" /> List New Property
    </button>
  )

  return (
    <div className="mx-auto max-w-[1240px] sm:px-6 sm:py-0">
      <div className="min-h-[calc(100dvh-68px)] bg-white px-4 py-6 sm:min-h-0 sm:px-6 sm:pb-12">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-[28px] font-black text-ink-900 sm:text-[32px]">My Properties</h1>
          {newBtn}
        </div>
        {startError && (
          <div className="mt-4">
            <Notice tone="error">{startError}</Notice>
          </div>
        )}

        <div role="tablist" aria-label="Properties" className="mt-6 flex gap-2 overflow-x-auto border-b border-line-strong">
          {(
            [
              ['active', `Active Properties (${active.length})`],
              ['progress', `In-Progress Properties (${progress.length})`],
            ] as [Tab, string][]
          ).map(([id, label]) => (
            <button key={id} type="button" role="tab" aria-selected={shown === id} onClick={() => setTab(id)} className={`-mb-px shrink-0 border-b-[3px] px-1 pt-1 pb-3 text-[16px] whitespace-nowrap transition-colors sm:px-2 ${shown === id ? 'border-pine-800 font-bold text-pine-900' : 'border-transparent text-ink-700 hover:text-ink-900'}`}>
              {label}
            </button>
          ))}
        </div>

        {list.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-4 py-20 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brass-500 text-white ring-4 ring-brass-50">
              <CircleAlert className="h-7 w-7" aria-hidden="true" />
            </span>
            <h2 className="mt-3 text-[20px] font-bold text-ink-900">{shown === 'active' ? 'No Active Properties' : 'No In-Progress Properties'}</h2>
            <p className="max-w-md text-[15px] text-ink-700">
              {shown === 'active' ? 'Properties appear here once they are live. Finish a listing to start getting bookings.' : 'You don’t have any properties in the listing process. Create a listing and activate your new property now.'}
            </p>
            <div className="mt-3">{newBtn}</div>
          </div>
        ) : (
          <ul className="mt-6 flex flex-col gap-3">
            {list.map((l) => (
              <Row key={l.id} l={l} />
            ))}
          </ul>
        )}
      </div>

      <PropertyTypePicker open={picking} busy={busy} onClose={() => setPicking(false)} onPick={start} />
    </div>
  )
}
