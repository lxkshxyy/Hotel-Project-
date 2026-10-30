import { Mail, Phone, Trash2 } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { AGENT_DISCOUNT, type Markup } from '@stayeasy/lib/agentRates'
import { Notice, PageHead, Pill, Spinner } from '../components/ui'
import { site } from '../config/site'
import { useSession } from '../context/Session'
import { useHotels } from '../lib/hooks'
import { addStaff, listStaff, removeStaff, useData } from '../lib/store'
import type { Agency, Staff } from '../lib/types'
import { MarkupControl } from './HotelPage'

export default function Settings() {
  const { agency, role, updateAgency } = useSession()
  const { data: hotels } = useHotels()
  const [a, setA] = useState<Agency | null>(agency)
  const [msg, setMsg] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)
  const staff = useData(() => (agency ? listStaff(agency) : Promise.resolve([] as Staff[])), [agency?.id])
  const [inv, setInv] = useState({ email: '', name: '', role: 'Agent' as Staff['role'] })
  const [invErr, setInvErr] = useState('')
  const [newCity, setNewCity] = useState('')
  useEffect(() => setA(agency), [agency])
  if (!a || !agency) return <Spinner />
  const admin = role === 'Admin'
  const cities = [...new Set((hotels ?? []).map((h) => h.city))].sort()

  const save = async (e: FormEvent) => {
    e.preventDefault()
    setMsg(null)
    if (a.name.trim().length < 2) return setMsg({ tone: 'error', text: 'Enter the agency name.' })
    if (!/^[6-9]\d{9}$/.test(a.phone)) return setMsg({ tone: 'error', text: 'Enter a 10-digit mobile number.' })
    try {
      await updateAgency({ ...a, name: a.name.trim() })
      setMsg({ tone: 'ok', text: 'Settings saved.' })
    } catch (x) {
      setMsg({ tone: 'error', text: x instanceof Error ? x.message : 'Couldn’t save.' })
    }
  }
  const invite = async (e: FormEvent) => {
    e.preventDefault()
    setInvErr('')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inv.email.trim())) return setInvErr('Enter a valid email.')
    if (inv.name.trim().length < 2) return setInvErr('Enter their name.')
    try {
      await addStaff(agency, { email: inv.email.trim().toLowerCase(), name: inv.name.trim(), role: inv.role })
      setInv({ email: '', name: '', role: 'Agent' })
    } catch (x) {
      setInvErr(x instanceof Error ? x.message : 'Couldn’t add.')
    }
  }
  const setCity = (city: string, m: Markup | null) => {
    const next = { ...a.cityMarkup }
    if (m) next[city] = m
    else delete next[city]
    setA({ ...a, cityMarkup: next })
  }

  return (
    <div className="page flex max-w-4xl flex-col gap-6 pt-7">
      <PageHead title="Settings" intro="Your agency details, markup and team." />
      {!admin && <Notice>Only the agency admin can change these settings.</Notice>}
      <form onSubmit={save} noValidate className="flex flex-col gap-6">
        <fieldset disabled={!admin} className="card flex flex-col gap-4 p-6">
          <legend className="sr-only">Agency</legend>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-extrabold">Agency</h2>
            <Pill tone={agency.status === 'approved' ? 'ok' : agency.status === 'pending' ? 'warn' : 'bad'}>{agency.status === 'approved' ? 'Approved' : agency.status === 'pending' ? 'Waiting for approval' : 'Not approved'}</Pill>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="label">
              Agency name (shown on quotes and vouchers)
              <input className="field" value={a.name} onChange={(e) => setA({ ...a, name: e.target.value })} />
            </label>
            <label className="label">
              Owner
              <input className="field" value={a.ownerName} onChange={(e) => setA({ ...a, ownerName: e.target.value })} />
            </label>
            <label className="label">
              Mobile
              <input className="field" inputMode="numeric" value={a.phone} onChange={(e) => setA({ ...a, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })} />
            </label>
            <label className="label">
              Email
              <input className="field bg-paper" value={a.email} readOnly />
            </label>
            <label className="label sm:col-span-2">
              Office address
              <input className="field" value={a.address} onChange={(e) => setA({ ...a, address: e.target.value })} />
            </label>
            <label className="label">
              PAN
              <input className="field bg-paper" value={a.pan} readOnly />
            </label>
            <label className="label">
              GSTIN
              <input className="field bg-paper" value={a.gstin || 'Not registered'} readOnly />
            </label>
          </div>
          <p className="text-[13px] text-muted">PAN and GSTIN changes go through your account manager, because they’re on your invoices. Documents on file: {a.docs.join(', ') || 'none'}.</p>
        </fieldset>

        <fieldset disabled={!admin} className="card flex flex-col gap-4 p-6">
          <legend className="sr-only">Markup</legend>
          <h2 className="text-lg font-extrabold">Markup</h2>
          <p className="text-[15px] text-ink-700">Your net rate is {Math.round(AGENT_DISCOUNT * 100)}% below the public price. Your markup is added on top and is what you earn.</p>
          <MarkupControl value={a.markup} onChange={(m) => setA({ ...a, markup: m })} />
          <div className="flex flex-col gap-3 border-t border-line pt-4">
            <strong>Different markup for some cities</strong>
            {Object.entries(a.cityMarkup).map(([city, m]) => (
              <div key={city} className="flex flex-wrap items-end gap-3">
                <span className="min-w-[120px] pb-3 font-semibold">{city}</span>
                <MarkupControl value={m} onChange={(x) => setCity(city, x)} />
                <button type="button" aria-label={`Remove ${city} markup`} onClick={() => setCity(city, null)} className="mb-1 flex h-10 w-10 items-center justify-center rounded-lg text-muted hover:bg-alert-50 hover:text-alert">
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            ))}
            <div className="flex flex-wrap items-end gap-2">
              <label className="label">
                Add a city
                <select className="field w-48" value={newCity} onChange={(e) => setNewCity(e.target.value)}>
                  <option value="" disabled hidden>Choose</option>
                  {cities
                    .filter((c) => !a.cityMarkup[c])
                    .map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                </select>
              </label>
              <button
                type="button"
                className="btn-line"
                disabled={!newCity}
                onClick={() => {
                  setCity(newCity, { ...a.markup })
                  setNewCity('')
                }}
              >
                Add
              </button>
            </div>
          </div>
          <label className="flex items-center gap-3 border-t border-line pt-4 text-[15px] font-semibold">
            <input type="checkbox" checked={a.showPriceOnVoucher} onChange={(e) => setA({ ...a, showPriceOnVoucher: e.target.checked })} className="h-5 w-5 accent-ink-900" />
            Show the customer price on vouchers
          </label>
        </fieldset>
        {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
        {admin && (
          <button type="submit" className="btn-ink self-start">
            Save settings
          </button>
        )}
      </form>

      <section className="card flex flex-col gap-4 p-6">
        <h2 className="text-lg font-extrabold">Team</h2>
        <p className="text-[15px] text-ink-700">Staff sign in with their own email and book from the same wallet. Agents can search, quote and book; only admins change settings.</p>
        <ul className="divide-y divide-line">
          <li className="flex items-center justify-between gap-3 py-2.5">
            <span>
              <strong>{agency.ownerName}</strong> <span className="text-muted">{agency.email}</span>
            </span>
            <Pill tone="ink">Admin</Pill>
          </li>
          {(staff.data ?? [])
            .filter((s) => s.email !== agency.email)
            .map((s) => (
            <li key={s.email} className="flex items-center justify-between gap-3 py-2.5">
              <span>
                <strong>{s.name}</strong> <span className="text-muted">{s.email}</span>
              </span>
              <span className="flex items-center gap-2">
                <Pill tone={s.role === 'Admin' ? 'ink' : 'muted'}>{s.role}</Pill>
                {admin && (
                  <button type="button" aria-label={`Remove ${s.name}`} onClick={() => removeStaff(agency, s.email)} className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-alert-50 hover:text-alert">
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                )}
              </span>
            </li>
          ))}
        </ul>
        {admin && (
          <form onSubmit={invite} noValidate className="grid gap-3 border-t border-line pt-4 sm:grid-cols-[1fr_1fr_130px_auto] sm:items-end">
            <label className="label">
              Email
              <input className="field" type="email" value={inv.email} onChange={(e) => setInv({ ...inv, email: e.target.value })} />
            </label>
            <label className="label">
              Name
              <input className="field" value={inv.name} onChange={(e) => setInv({ ...inv, name: e.target.value })} />
            </label>
            <label className="label">
              Role
              <select className="field" value={inv.role} onChange={(e) => setInv({ ...inv, role: e.target.value as Staff['role'] })}>
                <option>Agent</option>
                <option>Admin</option>
              </select>
            </label>
            <button type="submit" className="btn-ink">
              Add to team
            </button>
            {invErr && (
              <p role="alert" className="text-sm font-semibold text-alert sm:col-span-4">
                {invErr}
              </p>
            )}
          </form>
        )}
      </section>
    </div>
  )
}

export function Help() {
  const topics = [
    ['Why can’t I book yet?', 'New agencies are checked by the StayEasy team first. You can search and send quotes meanwhile. Approval usually takes one working day.'],
    ['How is the net rate worked out?', `It is the public room price less ${Math.round(AGENT_DISCOUNT * 100)}%, plus GST at the hotel’s rate. Your markup is added on top.`],
    ['Can I change the price for one customer?', 'Yes. Change the markup on the booking page; it affects only that booking.'],
    ['My customer wants to cancel.', 'Open the booking and press Cancel booking. Inside the free-cancellation window, the net amount goes back to your wallet at once.'],
    ['Does the hotel see my markup?', 'No. The hotel sees the guest and the stay only.'],
  ]
  return (
    <div className="page flex max-w-3xl flex-col gap-6 pt-7">
      <PageHead title="Help" intro="Answers to common questions, and how to reach your account manager." />
      <div className="card divide-y divide-line px-6">
        {topics.map(([q, a]) => (
          <details key={q} className="group py-4">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 text-[17px] font-semibold">
              {q}
              <span aria-hidden="true" className="text-2xl text-gold-600 transition-transform group-open:rotate-45">
                +
              </span>
            </summary>
            <p className="mt-2 text-ink-700">{a}</p>
          </details>
        ))}
      </div>
      <section className="flex flex-col gap-3 rounded-xl bg-ink-900 p-6 text-white">
        <h2 className="text-xl font-extrabold">Agent support</h2>
        {site.supportPhone || site.supportEmail ? (
          <div className="flex flex-wrap gap-2">
            {site.supportPhone && (
              <a href={`tel:${site.supportPhone.replace(/[^\d+]/g, '')}`} className="btn-gold">
                <Phone className="h-4 w-4" aria-hidden="true" /> {site.supportPhone}
              </a>
            )}
            {site.supportEmail && (
              <a href={`mailto:${site.supportEmail}`} className="btn bg-white/10 text-white hover:bg-white/20">
                <Mail className="h-4 w-4" aria-hidden="true" /> {site.supportEmail}
              </a>
            )}
          </div>
        ) : (
          <p className="text-ink-100">Support contact details are being set up.</p>
        )}
      </section>
    </div>
  )
}
