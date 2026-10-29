import { Plus, Search, Users } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { dayMonth, inr } from '@stayeasy/lib/format'
import { Empty, Modal, PageHead, Spinner } from '../components/ui'
import { useSession } from '../context/Session'
import { useBookings, useCustomers } from '../lib/hooks'
import { saveCustomer } from '../lib/store'
import type { Customer } from '../lib/types'

export default function Customers() {
  const { agency } = useSession()
  const { data: list } = useCustomers()
  const { data: bookings } = useBookings()
  const [q, setQ] = useState('')
  const [edit, setEdit] = useState<Partial<Customer> | null>(null)
  const [open, setOpen] = useState<Customer | null>(null)
  const [err, setErr] = useState('')
  const stats = useMemo(() => {
    const m = new Map<string, { n: number; spent: number; earned: number; last: string }>()
    for (const b of bookings ?? []) {
      if (!b.customer_id || b.status !== 'confirmed') continue
      const x = m.get(b.customer_id) ?? { n: 0, spent: 0, earned: 0, last: '' }
      m.set(b.customer_id, { n: x.n + 1, spent: x.spent + b.selling_amount, earned: x.earned + b.markup_amount, last: b.check_in > x.last ? b.check_in : x.last })
    }
    return m
  }, [bookings])
  if (!agency || !list) return <Spinner />
  const n = q.trim().toLowerCase()
  const shown = list.filter((c) => !n || [c.name, c.phone, c.email, c.city].some((v) => v.toLowerCase().includes(n)))

  const save = async (e: FormEvent) => {
    e.preventDefault()
    setErr('')
    if (!edit?.name || edit.name.trim().length < 2) return setErr('Enter the customer’s name.')
    if (!/^[6-9]\d{9}$/.test(edit.phone ?? '')) return setErr('Enter a 10-digit mobile number.')
    try {
      await saveCustomer(agency, { id: edit.id, name: edit.name.trim(), phone: edit.phone!, email: edit.email?.trim() ?? '', city: edit.city?.trim() ?? '', notes: edit.notes?.trim() ?? '' })
      setEdit(null)
    } catch (x) {
      setErr(x instanceof Error ? x.message : 'Couldn’t save.')
    }
  }

  return (
    <div className="page flex flex-col gap-6 pt-7">
      <PageHead title="Customers" intro="Everyone you’ve booked for. Pick a saved customer when booking or quoting.">
        <button type="button" className="btn-ink" onClick={() => setEdit({})}>
          <Plus className="h-4 w-4" aria-hidden="true" /> Add customer
        </button>
      </PageHead>
      <label className="flex h-11 w-full items-center gap-2 rounded-lg border border-line-strong bg-white px-3 sm:w-[320px]">
        <Search className="h-4 w-4 text-faint" aria-hidden="true" />
        <span className="sr-only">Search customers</span>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, phone, email or city" className="min-w-0 flex-1 outline-none" />
      </label>
      {shown.length === 0 ? (
        <div className="card">
          <Empty icon={<Users className="h-7 w-7" />} title={n ? 'No customer matches that search' : 'No customers yet'}>
            <p className="max-w-sm text-muted">Customers are saved automatically when you book for them.</p>
          </Empty>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-[15px]">
            <thead>
              <tr className="border-b border-line text-sm text-muted">
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Phone</th>
                <th className="px-4 py-3 font-semibold">Stays</th>
                <th className="px-4 py-3 text-right font-semibold">You earned</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((c) => {
                const s = stats.get(c.id)
                return (
                  <tr key={c.id} className="cursor-pointer border-b border-line last:border-0 hover:bg-paper" onClick={() => setOpen(c)}>
                    <td className="px-4 py-3 font-bold">
                      <button type="button" className="hover:underline" onClick={() => setOpen(c)}>
                        {c.name}
                      </button>
                    </td>
                    <td className="px-4 py-3">+91 {c.phone}</td>
                    <td className="px-4 py-3">{s ? `${s.n}, last ${dayMonth(s.last)}` : 'None yet'}</td>
                    <td className="px-4 py-3 text-right font-bold text-earn">{inr(s?.earned ?? 0)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? 'Edit customer' : 'Add customer'}>
        <form onSubmit={save} noValidate className="flex flex-col gap-3">
          <label className="label">
            Name
            <input className="field" value={edit?.name ?? ''} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
          </label>
          <label className="label">
            Mobile
            <input className="field" inputMode="numeric" value={edit?.phone ?? ''} onChange={(e) => setEdit({ ...edit, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })} />
          </label>
          <label className="label">
            Email
            <input className="field" type="email" value={edit?.email ?? ''} onChange={(e) => setEdit({ ...edit, email: e.target.value })} />
          </label>
          <label className="label">
            City
            <input className="field" value={edit?.city ?? ''} onChange={(e) => setEdit({ ...edit, city: e.target.value })} />
          </label>
          <label className="label">
            Notes
            <textarea className="field" rows={2} value={edit?.notes ?? ''} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} placeholder="Prefers ground floor, vegetarian meals" />
          </label>
          {err && (
            <p role="alert" className="text-sm font-semibold text-alert">
              {err}
            </p>
          )}
          <button type="submit" className="btn-ink self-start">
            Save customer
          </button>
        </form>
      </Modal>
      <Modal open={!!open} onClose={() => setOpen(null)} title={open?.name ?? ''} wide>
        {open && (
          <div className="flex flex-col gap-4">
            <p className="text-[15px] text-ink-700">
              +91 {open.phone}
              {open.email ? `, ${open.email}` : ''}
              {open.city ? `, ${open.city}` : ''}
            </p>
            {open.notes && <p className="rounded-lg bg-paper p-3 text-sm">{open.notes}</p>}
            <ul className="divide-y divide-line">
              {(bookings ?? [])
                .filter((b) => b.customer_id === open.id)
                .map((b) => (
                  <li key={b.id} className="flex flex-wrap justify-between gap-2 py-2.5 text-[15px]">
                    <Link to={`/app/bookings?open=${b.id}`} className="font-bold text-ink-950">
                      {b.hotel_name}
                    </Link>
                    <span className="text-muted">
                      {dayMonth(b.check_in)} to {dayMonth(b.check_out)}, {b.status}
                    </span>
                  </li>
                ))}
            </ul>
            <div className="flex gap-2">
              <Link to={`/app/hotels`} className="btn-gold">
                Book for {open.name.split(' ').slice(-1)[0]}
              </Link>
              <button
                type="button"
                className="btn-line"
                onClick={() => {
                  setEdit(open)
                  setOpen(null)
                }}
              >
                Edit
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
