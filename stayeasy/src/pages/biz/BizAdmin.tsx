import { BadgeCheck, Building2, Download, FileText, Gift, LockKeyhole, Plus, ShieldCheck, Trash2, Users, Wallet } from 'lucide-react'
import { useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { VerifyForm, VerifyOrgModal } from '../../components/biz/VerifyOrg'
import { useAccount } from '../../context/AccountContext'
import { walletMilestones, type Employee, type Role } from '../../data/business'
import { bookingsLeftUnverified, creditUsed, isSample, listBizBookings, walletStatement } from '../../lib/bizApi'
import { inr, plural, shortDate, todayISO } from '../../lib/format'
import { downloadCsv } from './shared'

type Tab = 'company' | 'policy' | 'people' | 'wallet' | 'invoices'
const tabs: { id: Tab; label: string; Icon: typeof Building2; locked: boolean }[] = [
  { id: 'company', label: 'Company details', Icon: Building2, locked: false },
  { id: 'policy', label: 'Travel policy', Icon: ShieldCheck, locked: true },
  { id: 'people', label: 'People', Icon: Users, locked: true },
  { id: 'wallet', label: 'Company wallet', Icon: Wallet, locked: true },
  { id: 'invoices', label: 'Invoices & reports', Icon: FileText, locked: false },
]

const field = 'h-11 w-full rounded-lg border border-line-strong bg-white px-3 text-[15px] outline-none focus:border-navy-800 disabled:bg-mist disabled:text-ink-700'

function Panel({ title, intro, children, action }: { title: string; intro?: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="rounded-xl bg-white shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4">
        <div>
          <h2 className="text-xl font-black">{title}</h2>
          {intro && <p className="text-sm text-ink-500">{intro}</p>}
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </section>
  )
}

/** Locked preview for unverified organisations: content is shown faded behind a verify prompt. */
function Locked({ onVerify, children }: { onVerify: () => void; children: ReactNode }) {
  return (
    <div className="relative">
      <div aria-hidden="true" className="pointer-events-none opacity-40 blur-[2px] select-none">
        {children}
      </div>
      <div className="absolute inset-0 flex items-start justify-center pt-10">
        <div className="flex max-w-sm flex-col items-center gap-2 rounded-2xl border border-[#F5CBAE] bg-white p-6 text-center shadow-float">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#FFF4EC]">
            <LockKeyhole className="h-7 w-7 text-ember-600" aria-hidden="true" />
          </span>
          <strong className="text-lg">Your organisation is not verified</strong>
          <span className="text-sm text-ink-700">Verify with your company GSTIN, Udyam or NGO ID to unlock admin controls.</span>
          <button type="button" onClick={onVerify} className="btn mt-2 rounded-full bg-gradient-to-r from-[#FF5A5F] to-ember-600 px-8 font-black text-white uppercase">
            Verify now
          </button>
        </div>
      </div>
    </div>
  )
}

export default function BizAdmin() {
  const { company, isAdmin, me, updateCompany } = useAccount()
  const c = company!
  const [params, setParams] = useSearchParams()
  const tab = (tabs.some((t) => t.id === params.get('tab')) ? params.get('tab') : 'company') as Tab
  const setTab = (t: Tab) => setParams({ tab: t }, { replace: true })
  const list = useMemo(() => listBizBookings(c), [c])
  const wallet = walletStatement(c, list)
  const left = bookingsLeftUnverified(c, list)
  // Opening Admin Settings as an unverified admin shows the verification popup straight away.
  const [verifyOpen, setVerifyOpen] = useState(() => isAdmin && !c.verified)
  const [saved, setSaved] = useState('')
  const readOnly = !isAdmin

  const flash = (m: string) => {
    setSaved(m)
    setTimeout(() => setSaved(''), 2500)
  }

  /* ---- company form ---- */
  const [co, setCo] = useState({ name: c.name, legalName: c.legalName, billingAddress: c.billingAddress })
  const [cc, setCc] = useState('')
  const saveCo = (e: FormEvent) => {
    e.preventDefault()
    if (!co.name.trim()) return
    updateCompany({ name: co.name.trim(), legalName: co.legalName.trim() || co.name.trim(), billingAddress: co.billingAddress.trim() })
    flash('Company details saved.')
  }

  /* ---- policy ---- */
  const [pol, setPol] = useState({ limitMetro: c.limitMetro, limitOther: c.limitOther, requestApproval: c.requestApproval })
  const savePolicy = (e: FormEvent) => {
    e.preventDefault()
    updateCompany({ limitMetro: Math.max(500, pol.limitMetro), limitOther: Math.max(500, pol.limitOther), requestApproval: pol.requestApproval })
    flash('Travel policy saved.')
  }

  /* ---- people ---- */
  const [np, setNp] = useState({ name: '', email: '', team: '', role: 'employee' as Role })
  const [pErr, setPErr] = useState('')
  const addPerson = (e: FormEvent) => {
    e.preventDefault()
    const email = np.email.trim().toLowerCase()
    if (!np.name.trim()) return setPErr('Enter a name.')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setPErr('Enter a valid work email.')
    if (c.employees.some((x) => x.email.toLowerCase() === email)) return setPErr('This person is already in the company.')
    const emp: Employee = { id: email, name: np.name.trim(), email, team: np.team.trim() || 'General', role: np.role }
    updateCompany((x) => ({ ...x, employees: [...x.employees, emp] }))
    setNp({ name: '', email: '', team: '', role: 'employee' })
    setPErr('')
    flash(`${emp.name} added. They can sign in with ${email} to book.`)
  }
  const admins = c.employees.filter((e) => e.role === 'admin').length

  const nav = (
    <nav aria-label="Admin settings" className="no-scrollbar flex gap-1 overflow-x-auto rounded-xl bg-white p-2 shadow-card lg:flex-col lg:overflow-visible">
      {tabs.map(({ id, label, Icon, locked }) => (
        <button
          key={id}
          type="button"
          aria-current={tab === id ? 'page' : undefined}
          onClick={() => setTab(id)}
          className={`flex shrink-0 items-center gap-3 rounded-lg px-3 py-3 text-left text-[15px] font-bold ${tab === id ? 'bg-accent-50 text-accent' : 'text-ink-700 hover:bg-mist'}`}
        >
          <Icon className="h-5 w-5" aria-hidden="true" />
          <span className="flex-1">{label}</span>
          {locked && !c.verified && <LockKeyhole className="h-4 w-4 text-ember-600" aria-label="Locked" />}
        </button>
      ))}
    </nav>
  )

  const lockedTab = tabs.find((t) => t.id === tab)!.locked && !c.verified

  const policyBody = (
    <form onSubmit={savePolicy} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm font-bold">
          Nightly limit · metro cities (₹)
          <input type="number" min={500} step={100} disabled={readOnly || lockedTab} className={field} value={pol.limitMetro} onChange={(e) => setPol({ ...pol, limitMetro: Number(e.target.value) || 0 })} />
        </label>
        <label className="flex flex-col gap-1 text-sm font-bold">
          Nightly limit · other cities (₹)
          <input type="number" min={500} step={100} disabled={readOnly || lockedTab} className={field} value={pol.limitOther} onChange={(e) => setPol({ ...pol, limitOther: Number(e.target.value) || 0 })} />
        </label>
      </div>
      <p className="text-sm text-ink-500">Rooms above the limit can still be booked. They are flagged on the booking and in reports.</p>
      <label className="flex items-start gap-3 rounded-xl border border-line p-4">
        <input type="checkbox" disabled={readOnly || lockedTab} checked={pol.requestApproval} onChange={(e) => setPol({ ...pol, requestApproval: e.target.checked })} className="mt-1 h-5 w-5 accent-accent" />
        <span>
          <strong className="block">Travel requests need admin approval</strong>
          <span className="text-sm text-ink-500">Employees raise a request (city, dates, budget). An admin approves it, then the employee books in one tap. Bookings themselves never wait for approval.</span>
        </span>
      </label>
      {!readOnly && (
        <button type="submit" disabled={lockedTab} className="btn-primary self-start">
          Save policy
        </button>
      )}
    </form>
  )

  const peopleBody = (
    <div className="flex flex-col gap-5">
      <ul className="flex flex-col divide-y divide-[#EEF1F6] rounded-xl border border-line">
        {c.employees.map((e) => {
          const self = e.id === me?.id
          return (
            <li key={e.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
              <span className="flex min-w-0 items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-navy-100 text-xs font-extrabold text-navy-800">
                  {e.name
                    .split(' ')
                    .map((p) => p[0])
                    .join('')
                    .slice(0, 2)}
                </span>
                <span className="flex min-w-0 flex-col">
                  <strong>
                    {e.name} {self && <span className="font-normal text-ink-500">(you)</span>}
                  </strong>
                  <span className="truncate text-ink-500">
                    {e.email} · {e.team}
                  </span>
                </span>
              </span>
              <span className="flex items-center gap-2">
                <label className="sr-only" htmlFor={`role-${e.id}`}>
                  Role for {e.name}
                </label>
                <select
                  id={`role-${e.id}`}
                  disabled={readOnly || lockedTab || (self && admins === 1)}
                  value={e.role ?? 'employee'}
                  onChange={(ev) => updateCompany((x) => ({ ...x, employees: x.employees.map((y) => (y.id === e.id ? { ...y, role: ev.target.value as Role } : y)) }))}
                  className="h-9 rounded-lg border border-line-strong bg-white px-2 text-sm disabled:bg-mist"
                >
                  <option value="admin">Admin</option>
                  <option value="employee">Employee</option>
                </select>
                {!readOnly && !self && (
                  <button
                    type="button"
                    disabled={lockedTab}
                    aria-label={`Remove ${e.name}`}
                    onClick={() => window.confirm(`Remove ${e.name} from ${c.name}? Their past bookings stay in reports.`) && updateCompany((x) => ({ ...x, employees: x.employees.filter((y) => y.id !== e.id) }))}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-500 hover:bg-[#FDECEC] hover:text-[#B42318]"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                )}
              </span>
            </li>
          )
        })}
      </ul>
      {!readOnly && (
        <form onSubmit={addPerson} noValidate className="grid gap-3 rounded-xl bg-canvas p-4 sm:grid-cols-[1fr_1.3fr_1fr_auto_auto] sm:items-end">
          <label className="flex flex-col gap-1 text-sm font-bold">
            Name
            <input className={field} disabled={lockedTab} value={np.name} onChange={(e) => setNp({ ...np, name: e.target.value })} />
          </label>
          <label className="flex flex-col gap-1 text-sm font-bold">
            Work email
            <input type="email" className={field} disabled={lockedTab} value={np.email} onChange={(e) => setNp({ ...np, email: e.target.value })} />
          </label>
          <label className="flex flex-col gap-1 text-sm font-bold">
            Team
            <input className={field} disabled={lockedTab} value={np.team} onChange={(e) => setNp({ ...np, team: e.target.value })} placeholder="Sales" />
          </label>
          <label className="flex flex-col gap-1 text-sm font-bold">
            Role
            <select className={field} disabled={lockedTab} value={np.role} onChange={(e) => setNp({ ...np, role: e.target.value as Role })}>
              <option value="employee">Employee</option>
              <option value="admin">Admin</option>
            </select>
          </label>
          <button type="submit" disabled={lockedTab} className="btn-navy min-h-11">
            <Plus className="h-4 w-4" aria-hidden="true" /> Add
          </button>
          {pErr && (
            <p role="alert" className="text-sm font-semibold text-ember-600 sm:col-span-5">
              {pErr}
            </p>
          )}
        </form>
      )}
    </div>
  )

  const pct = wallet.next ? Math.min(100, Math.round((wallet.nights / wallet.next.nights) * 100)) : 100
  const walletBody = (
    <div className="flex flex-col gap-5">
      <div className="grid gap-4 md:grid-cols-[1fr_1.4fr]">
        <div className="flex flex-col gap-1 rounded-2xl bg-gradient-to-br from-navy-800 to-navy-950 p-5 text-white">
          <span className="text-[13px] font-bold tracking-wide text-ember-200 uppercase">Wallet balance</span>
          <strong className="text-[32px] leading-tight">{inr(wallet.balance)}</strong>
          <span className="text-sm text-[#D3DCEE]">Use it to pay for any business booking. {plural(wallet.nights, 'room-night')} booked so far.</span>
        </div>
        <div className="flex flex-col gap-3 rounded-2xl border border-line p-5">
          <span className="flex items-center gap-2 font-bold">
            <Gift className="h-5 w-5 text-ember-600" aria-hidden="true" /> Milestone rewards
          </span>
          <div className="flex gap-1">
            {walletMilestones.map((m) => (
              <span key={m.nights} className={`h-2 flex-1 rounded-full ${wallet.nights >= m.nights ? 'bg-leaf-700' : 'bg-mist'}`} />
            ))}
          </div>
          <span className="text-sm text-ink-700">
            {wallet.next ? (
              <>
                {wallet.next.nights - wallet.nights} more room-night{wallet.next.nights - wallet.nights === 1 ? '' : 's'} to earn <strong>{inr(wallet.next.credit)}</strong> ({pct}% there).
              </>
            ) : (
              'All milestone rewards earned.'
            )}
          </span>
          <ul className="grid grid-cols-2 gap-1.5 text-[13px] sm:grid-cols-3">
            {walletMilestones.map((m) => (
              <li key={m.nights} className={`rounded-lg px-2 py-1.5 ${wallet.nights >= m.nights ? 'bg-leaf-50 text-leaf-800' : 'bg-canvas text-ink-700'}`}>
                {m.label} · <strong>{inr(m.credit)}</strong>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div>
        <h3 className="mb-2 font-bold">Statement</h3>
        {wallet.lines.length === 0 ? (
          <p className="rounded-xl bg-canvas p-4 text-sm text-ink-500">No wallet activity yet. Your first booking earns {inr(walletMilestones[0].credit)}.</p>
        ) : (
          <ul className="divide-y divide-[#EEF1F6] rounded-xl border border-line text-sm">
            {wallet.lines.map((l, i) => (
              <li key={i} className="flex justify-between gap-3 px-4 py-2.5">
                <span>
                  {l.label}
                  {l.date && <span className="block text-xs text-ink-500">{shortDate(l.date.slice(0, 10))}</span>}
                </span>
                <strong className={l.amount >= 0 ? 'text-leaf-700' : ''}>
                  {l.amount >= 0 ? '+' : '−'}
                  {inr(Math.abs(l.amount))}
                </strong>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )

  const real = list.filter((b) => !isSample(b))
  const invoicesBody = (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-canvas p-4">
          <span className="text-sm text-ink-500">Credit used this month</span>
          <strong className="block text-xl">{inr(creditUsed(c, list))}</strong>
          <span className="text-xs text-ink-500">of {inr(c.creditLimit)}</span>
        </div>
        <div className="rounded-xl bg-canvas p-4">
          <span className="text-sm text-ink-500">Bookings</span>
          <strong className="block text-xl">{real.length}</strong>
          <span className="text-xs text-ink-500">{list.length - real.length} sample trips not counted</span>
        </div>
        <div className="rounded-xl bg-canvas p-4">
          <span className="text-sm text-ink-500">GST input credit</span>
          <strong className={`block text-xl ${c.gstin ? 'text-leaf-700' : 'text-ember-600'}`}>{c.gstin ? 'Claimable' : 'Not claimable'}</strong>
          <span className="text-xs text-ink-500">{c.gstin ? `GSTIN ${c.gstin}` : 'Add your GSTIN to claim up to 18%'}</span>
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl border border-line">
        <table className="w-full min-w-[620px] text-sm">
          <thead>
            <tr className="bg-mist text-left text-[12.5px] text-ink-500">
              <th className="px-3 py-2.5">Booking</th>
              <th className="px-3 py-2.5">Hotel</th>
              <th className="px-3 py-2.5">Stay</th>
              <th className="px-3 py-2.5">GST</th>
              <th className="px-3 py-2.5 text-right">Total</th>
              <th className="px-3 py-2.5">Invoice</th>
            </tr>
          </thead>
          <tbody>
            {list.map((b) => (
              <tr key={b.id} className="border-t border-[#EEF1F6]">
                <td className="px-3 py-2.5 font-mono">{b.id}</td>
                <td className="px-3 py-2.5">{b.hotelName}</td>
                <td className="px-3 py-2.5">{shortDate(b.checkIn)}</td>
                <td className="px-3 py-2.5">{inr(b.gst)}</td>
                <td className="px-3 py-2.5 text-right font-semibold">{inr(b.total)}</td>
                <td className="px-3 py-2.5">
                  {b.status === 'cancelled' ? <span className="text-ink-500">Cancelled</span> : c.gstin ? <span className="font-semibold text-leaf-700">GST invoice</span> : <span className="text-ember-600">Needs GSTIN</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="btn-outline"
          onClick={() =>
            downloadCsv(`${c.id}-gst-${todayISO()}.csv`, [
              ['Booking ID', 'Hotel', 'City', 'Check-in', 'Check-out', 'Taxable value', 'GST', 'Total', 'Company GSTIN', 'Status'],
              ...list.map((b) => [b.id, b.hotelName, b.hotelCity, b.checkIn, b.checkOut, b.subtotal - b.teamDiscount, b.gst, b.total, c.gstin || 'Not added', b.status]),
            ])
          }
        >
          <Download className="h-4 w-4" aria-hidden="true" /> GST statement (CSV)
        </button>
        <Link to="/biz/reports" className="btn-outline">
          Spending reports
        </Link>
      </div>
    </div>
  )

  return (
    <div className="container-page max-w-[1200px] pt-6 pb-16">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <nav aria-label="Breadcrumb" className="text-sm font-bold text-ink-700">
            <Link to="/biz" className="text-ink-700 no-underline hover:underline">
              Home
            </Link>{' '}
            › Admin Settings
          </nav>
          <h1 className="mt-1 text-[28px] font-black tracking-tight">{c.name}</h1>
        </div>
        {c.verified ? (
          <span className="flex items-center gap-1.5 rounded-full bg-leaf-50 px-3 py-1.5 text-sm font-bold text-leaf-700">
            <BadgeCheck className="h-4 w-4" aria-hidden="true" /> Verified organisation
          </span>
        ) : (
          <button type="button" onClick={() => setVerifyOpen(true)} className="flex items-center gap-1.5 rounded-full bg-[#FDECEC] px-3 py-1.5 text-sm font-bold text-[#B42318]">
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#B42318] text-[11px] text-white">!</span> Not verified · {left} of {c.unverifiedBookingLimit} bookings left
          </button>
        )}
      </div>
      {readOnly && <p className="mt-3 rounded-xl bg-navy-50 p-3 text-sm text-navy-800">You can view these settings. Only company admins can change them.</p>}
      {saved && (
        <p role="status" className="mt-3 rounded-xl bg-leaf-50 p-3 text-sm font-semibold text-leaf-800">
          {saved}
        </p>
      )}

      <div className="mt-5 grid items-start gap-5 lg:grid-cols-[260px_1fr]">
        {nav}
        <div className="min-w-0">
          {tab === 'company' && (
            <div className="flex flex-col gap-5">
              <Panel title="Organisation verification" intro="Verified companies get unlimited bookings, company credit, the wallet and GST input credit.">
                {c.verified && c.verifiedVia ? (
                  <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                    <dt className="text-ink-500">Verified with</dt>
                    <dd className="font-semibold">{c.verifiedVia.type === 'GSTIN' ? 'GSTIN' : c.verifiedVia.type === 'UDYAM' ? 'Udyam registration' : 'NGO Darpan ID'}</dd>
                    <dt className="text-ink-500">Number</dt>
                    <dd className="font-mono font-semibold">{c.verifiedVia.value}</dd>
                    <dt className="text-ink-500">Details</dt>
                    <dd className="font-semibold">{c.verifiedVia.note}</dd>
                    <dt className="text-ink-500">Verified on</dt>
                    <dd className="font-semibold">{shortDate(c.verifiedVia.at.slice(0, 10))}</dd>
                  </dl>
                ) : c.verified ? (
                  <p className="text-sm font-semibold text-leaf-700">Verified{c.gstin ? ` · GSTIN ${c.gstin}` : ''}.</p>
                ) : (
                  <div className="max-w-xl">
                    <VerifyForm />
                  </div>
                )}
              </Panel>
              <Panel title="Company details">
                <form onSubmit={saveCo} className="flex flex-col gap-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="flex flex-col gap-1 text-sm font-bold">
                      Company name
                      <input className={field} disabled={readOnly} value={co.name} onChange={(e) => setCo({ ...co, name: e.target.value })} />
                    </label>
                    <label className="flex flex-col gap-1 text-sm font-bold">
                      Legal name (on invoices)
                      <input className={field} disabled={readOnly} value={co.legalName} onChange={(e) => setCo({ ...co, legalName: e.target.value })} />
                    </label>
                  </div>
                  <label className="flex flex-col gap-1 text-sm font-bold">
                    Billing address
                    <textarea className={`${field} h-20 py-2`} disabled={readOnly} value={co.billingAddress} onChange={(e) => setCo({ ...co, billingAddress: e.target.value })} placeholder="Registered address as on your GST certificate" />
                  </label>
                  {!readOnly && (
                    <button type="submit" className="btn-primary self-start">
                      Save details
                    </button>
                  )}
                </form>
                <h3 className="mt-6 mb-2 font-bold">Cost centres</h3>
                <div className="flex flex-wrap gap-1.5">
                  {c.costCentres.map((x) => (
                    <span key={x} className="tag flex items-center gap-1">
                      {x}
                      {!readOnly && c.costCentres.length > 1 && (
                        <button type="button" aria-label={`Remove ${x}`} onClick={() => updateCompany((y) => ({ ...y, costCentres: y.costCentres.filter((z) => z !== x) }))} className="ml-1 text-ink-500 hover:text-[#B42318]">
                          ×
                        </button>
                      )}
                    </span>
                  ))}
                </div>
                {!readOnly && (
                  <form
                    className="mt-3 flex max-w-md gap-2"
                    onSubmit={(e) => {
                      e.preventDefault()
                      const v = cc.trim()
                      if (v && !c.costCentres.includes(v)) updateCompany((y) => ({ ...y, costCentres: [...y.costCentres, v] }))
                      setCc('')
                    }}
                  >
                    <input className={field} value={cc} onChange={(e) => setCc(e.target.value)} placeholder="e.g. MKT-MUM · Marketing" aria-label="New cost centre" />
                    <button type="submit" className="btn-outline">
                      Add
                    </button>
                  </form>
                )}
              </Panel>
            </div>
          )}
          {tab === 'policy' && (
            <Panel title="Travel policy" intro="Nightly limits and whether travel requests need approval.">
              {lockedTab ? <Locked onVerify={() => setVerifyOpen(true)}>{policyBody}</Locked> : policyBody}
            </Panel>
          )}
          {tab === 'people' && (
            <Panel title="People" intro={`${plural(c.employees.length, 'member')} · ${plural(admins, 'admin')}. Admins can verify the company, change policy and approve requests.`}>
              {lockedTab ? <Locked onVerify={() => setVerifyOpen(true)}>{peopleBody}</Locked> : peopleBody}
            </Panel>
          )}
          {tab === 'wallet' && (
            <Panel title="Company wallet" intro="Earn wallet credit as your team books. Amounts below are launch placeholders.">
              {lockedTab ? <Locked onVerify={() => setVerifyOpen(true)}>{walletBody}</Locked> : walletBody}
            </Panel>
          )}
          {tab === 'invoices' && (
            <Panel title="Invoices & reports" intro="One GST invoice per booking, plus a monthly statement.">
              {invoicesBody}
            </Panel>
          )}
        </div>
      </div>
      <VerifyOrgModal open={verifyOpen} onClose={() => setVerifyOpen(false)} />
    </div>
  )
}
