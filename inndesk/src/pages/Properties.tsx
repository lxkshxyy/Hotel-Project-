import { Building2, Plus } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Empty, KeyTag, Notice, PageHead, Spinner } from '../components/ui'
import { site } from '../config/site'
import { inr, plural } from '../lib/format'
import { useListings } from '../lib/hooks'
import { blockers, fromPrice, quality, totalRooms } from '../lib/listing'
import type { ListingStatus } from '../lib/types'

const filters: { id: 'all' | ListingStatus; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'live', label: 'Live' },
  { id: 'paused', label: 'Paused' },
  { id: 'draft', label: 'Drafts' },
]

export default function Properties() {
  const { data, error } = useListings()
  const [f, setF] = useState<'all' | ListingStatus>('all')
  if (!data) return error ? <div className="container-page py-10"><Notice tone="error">{error}</Notice></div> : <Spinner />
  const shown = data.filter((l) => f === 'all' || l.status === f)

  return (
    <div className="container-page flex flex-col gap-6 pt-8">
      <PageHead title="Properties" intro={`Each property is a separate listing on ${site.marketplace}.`}>
        <Link to="/app/properties/new/edit" className="btn-primary">
          <Plus className="h-4 w-4" aria-hidden="true" /> Add property
        </Link>
      </PageHead>
      {data.length > 0 && (
        <div role="tablist" aria-label="Filter" className="flex gap-1 self-start rounded-xl bg-white p-1 ring-1 ring-line">
          {filters.map((x) => (
            <button key={x.id} type="button" role="tab" aria-selected={f === x.id} onClick={() => setF(x.id)} className={`min-h-10 rounded-lg px-4 text-sm font-bold ${f === x.id ? 'bg-pine-900 text-white' : 'text-ink-700 hover:bg-paper'}`}>
              {x.label} <span className="opacity-70">{x.id === 'all' ? data.length : data.filter((l) => l.status === x.id).length}</span>
            </button>
          ))}
        </div>
      )}
      {data.length === 0 ? (
        <div className="panel">
          <Empty icon={<Building2 className="h-7 w-7" />} title="No properties yet">
            <p className="max-w-sm text-ink-500">Add your first property. It saves as a draft until you publish.</p>
            <Link to="/app/properties/new/edit" className="btn-brass">
              Add property
            </Link>
          </Empty>
        </div>
      ) : shown.length === 0 ? (
        <p className="text-ink-500">No {f} properties.</p>
      ) : (
        <ul className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {shown.map((l) => {
            const todo = blockers(l)
            return (
              <li key={l.id} className="panel flex flex-col overflow-hidden">
                <Link to={l.status === 'draft' ? `/app/properties/${l.id}/edit` : `/app/properties/${l.id}`} className="relative block aspect-[16/9] bg-pine-50" tabIndex={-1} aria-hidden="true">
                  {l.photos[0] ? <img src={l.photos[0].url} alt="" className="h-full w-full object-cover" /> : <Building2 className="absolute inset-0 m-auto h-10 w-10 text-pine-700" />}
                  <span className="absolute top-3 left-3">
                    <KeyTag status={l.status} />
                  </span>
                </Link>
                <div className="flex flex-1 flex-col gap-2 p-5">
                  <Link to={l.status === 'draft' ? `/app/properties/${l.id}/edit` : `/app/properties/${l.id}`} className="font-display text-xl font-bold text-ink-900 no-underline hover:text-pine-800">
                    {l.basics.name.trim() || 'Untitled property'}
                  </Link>
                  <span className="text-sm text-ink-500">
                    {[l.basics.propertyType, [l.location.area, l.location.city].filter(Boolean).join(', ')].filter(Boolean).join(' in ')}
                  </span>
                  <span className="text-sm text-ink-700">
                    {plural(l.rooms.length, 'room type')}, {plural(totalRooms(l), 'room')}
                    {fromPrice(l) ? `, from ${inr(fromPrice(l))}` : ''}
                  </span>
                  <div className="mt-auto pt-3">
                    {l.status === 'draft' ? (
                      <span className={`text-sm font-semibold ${todo.length ? 'text-brass-700' : 'text-live'}`}>{todo.length ? `${plural(todo.length, 'item')} left before publishing` : 'Ready to publish'}</span>
                    ) : (
                      <>
                        <span className="text-sm text-ink-700">Listing quality {quality(l)}%</span>
                        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-line">
                          <div className="h-full rounded-full bg-brass-500" style={{ width: `${quality(l)}%` }} />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
