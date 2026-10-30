import { BookOpenText, Download, MessageCircle, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { inr, plural, shortDate } from '@stayeasy/lib/format'
import { Empty, Notice, PageHead, Spinner } from '../components/ui'
import { useSession } from '../context/Session'
import { useDraft, writeDraft } from '../lib/draft'
import { useCustomers, useQuotes } from '../lib/hooks'
import { quoteMessage, quotePdf, whatsappLink } from '../lib/pdf'
import { toQuery } from '../lib/search'
import { deleteQuote, saveQuote } from '../lib/store'
import type { Quote, QuoteItem } from '../lib/types'

const itemLink = (it: QuoteItem) => `/app/hotel/${it.hotelSlug}?${toQuery({ city: it.city, checkIn: it.checkIn, checkOut: it.checkOut, rooms: it.rooms, adults: it.adults, children: it.children })}`

function Items({ items, onRemove }: { items: QuoteItem[]; onRemove?: (i: number) => void }) {
  return (
    <ul className="divide-y divide-line">
      {items.map((it, i) => (
        <li key={i} className="grid gap-3 py-3 sm:grid-cols-[96px_1fr_auto] sm:items-center">
          <div className="hidden aspect-[4/3] overflow-hidden rounded-lg bg-ink-50 sm:block">{it.photo && <img src={it.photo} alt="" className="h-full w-full object-cover" />}</div>
          <div className="flex flex-col">
            <Link to={itemLink(it)} className="font-bold text-ink-950 no-underline hover:underline">
              Option {i + 1}: {it.hotelName}
            </Link>
            <span className="text-sm text-muted">
              {it.roomName}, {plural(it.rooms, 'room')}, {shortDate(it.checkIn)} to {shortDate(it.checkOut)}
            </span>
            <span className="text-sm text-muted">{it.freeCancel}</span>
          </div>
          <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end">
            <span className="text-right">
              <strong className="block text-lg">{inr(it.sellingTotal)}</strong>
              <span className="text-[13px] font-semibold text-earn">you earn {inr(it.sellingTotal - it.netTotal)}</span>
            </span>
            {onRemove && (
              <button type="button" aria-label={`Remove option ${i + 1}`} onClick={() => onRemove(i)} className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-alert-50 hover:text-alert">
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>
        </li>
      ))}
    </ul>
  )
}

function Share({ q }: { q: Quote }) {
  const { agency } = useSession()
  const [busy, setBusy] = useState(false)
  if (!agency) return null
  return (
    <div className="flex flex-wrap gap-2">
      <a className="btn-gold" href={whatsappLink(q.customerPhone, quoteMessage(agency, q))} target="_blank" rel="noreferrer">
        <MessageCircle className="h-4 w-4" aria-hidden="true" /> Send on WhatsApp
      </a>
      <button
        type="button"
        className="btn-line"
        disabled={busy}
        onClick={async () => {
          setBusy(true)
          try {
            await quotePdf(agency, q)
          } finally {
            setBusy(false)
          }
        }}
      >
        <Download className="h-4 w-4" aria-hidden="true" /> {busy ? 'Preparing…' : 'Quote PDF'}
      </button>
    </div>
  )
}

export default function Quotes() {
  const { agency } = useSession()
  const draft = useDraft()
  const { data: quotes } = useQuotes()
  const { data: customers } = useCustomers()
  const [f, setF] = useState({ name: '', phone: '', note: '' })
  const [error, setError] = useState('')
  const [saved, setSaved] = useState<Quote | null>(null)
  if (!agency || !quotes) return <Spinner />

  const save = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (f.name.trim().length < 2) return setError('Enter the customer’s name.')
    if (!/^[6-9]\d{9}$/.test(f.phone)) return setError('Enter the customer’s 10-digit mobile number.')
    const q: Quote = { id: Math.random().toString(36).slice(2, 8), customerName: f.name.trim(), customerPhone: f.phone, note: f.note.trim(), items: draft, createdAt: new Date().toISOString() }
    try {
      await saveQuote(agency, q)
      writeDraft([])
      setSaved(q)
      setF({ name: '', phone: '', note: '' })
    } catch (x) {
      setError(x instanceof Error ? x.message : 'Couldn’t save the quote.')
    }
  }

  return (
    <div className="page flex flex-col gap-8 pt-7">
      <PageHead title="Quotes" intro="Put several hotel options together and send them to your customer. Quotes show only your selling price." />

      {saved && (
        <section className="card flex flex-col gap-3 border-earn p-5">
          <strong className="text-lg text-earn">Quote saved for {saved.customerName}</strong>
          <Share q={saved} />
        </section>
      )}

      <section aria-labelledby="draft-h" className="card p-5">
        <h2 id="draft-h" className="text-lg font-extrabold text-ink-950">
          New quote
        </h2>
        {draft.length === 0 ? (
          <Empty icon={<BookOpenText className="h-7 w-7" />} title="No options added yet">
            <p className="max-w-sm text-muted">Search hotels and press “Add to quote” on any room. Options from different hotels and dates can go in one quote.</p>
            <Link to="/app/hotels" className="btn-gold">
              Search hotels
            </Link>
          </Empty>
        ) : (
          <form onSubmit={save} noValidate className="mt-2 flex flex-col gap-4">
            <Items items={draft} onRemove={(i) => writeDraft(draft.filter((_, j) => j !== i))} />
            <div className="grid gap-3 border-t border-line pt-4 sm:grid-cols-2">
              {customers && customers.length > 0 && (
                <label className="label sm:col-span-2">
                  Saved customer
                  <select
                    className="field"
                    value=""
                    onChange={(e) => {
                      const c = customers.find((x) => x.id === e.target.value)
                      if (c) setF({ ...f, name: c.name, phone: c.phone })
                    }}
                  >
                    <option value="" disabled hidden>Choose to fill in</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}, {c.phone}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label className="label">
                Customer name
                <input className="field" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
              </label>
              <label className="label">
                Customer mobile
                <input className="field" inputMode="numeric" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })} />
              </label>
              <label className="label sm:col-span-2">
                Message (optional)
                <textarea className="field" rows={2} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder="Prices held until tomorrow evening." />
              </label>
            </div>
            {error && (
              <p role="alert" className="text-sm font-semibold text-alert">
                {error}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <button type="submit" className="btn-ink">
                Save quote
              </button>
              <button type="button" className="btn-line" onClick={() => writeDraft([])}>
                Clear options
              </button>
            </div>
          </form>
        )}
      </section>

      <section aria-labelledby="saved-h" className="flex flex-col gap-3">
        <h2 id="saved-h" className="text-xl font-extrabold text-ink-950">
          Sent quotes
        </h2>
        {quotes.length === 0 ? (
          <p className="text-muted">Saved quotes appear here, so you can resend them or book an option.</p>
        ) : (
          quotes.map((q) => (
            <details key={q.id} className="card group p-5">
              <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3">
                <span>
                  <strong className="text-ink-950">{q.customerName}</strong>
                  <span className="ml-2 text-sm text-muted">
                    {plural(q.items.length, 'option')}, {new Date(q.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </span>
                </span>
                <span className="text-sm font-bold text-ink-700 group-open:hidden">Open</span>
              </summary>
              <div className="mt-3 flex flex-col gap-3">
                <Items items={q.items} />
                {q.items.some((it) => it.checkIn < new Date().toISOString().slice(0, 10)) && <Notice tone="warn">Some dates in this quote have passed.</Notice>}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Share q={q} />
                  <button type="button" className="text-sm font-bold text-alert" onClick={() => deleteQuote(agency, q.id)}>
                    Delete quote
                  </button>
                </div>
              </div>
            </details>
          ))
        )}
      </section>
    </div>
  )
}
