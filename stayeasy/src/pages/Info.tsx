import { BadgePercent, Mail, Phone } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { Reveal } from '../components/ui'
import { features } from '../config/launch'
import { site } from '../config/site'
import { useAccount } from '../context/AccountContext'
import { offers } from '../data/hotels'
import { isDemoMode, supabase } from '../lib/supabase'

function Page({ eyebrow, title, intro, children }: { eyebrow?: string; title: string; intro?: string; children: ReactNode }) {
  return (
    <div>
      <section className="bg-navy-800 py-12 text-white sm:py-16">
        <div className="container-page">
          {eyebrow && <p className="text-[13px] font-bold tracking-[0.08em] text-ember-200 uppercase">{eyebrow}</p>}
          <h1 className="mt-2 max-w-3xl text-[32px] leading-tight font-extrabold tracking-tight sm:text-[44px]">{title}</h1>
          {intro && <p className="mt-3 max-w-2xl text-lg text-[#D3DCEE]">{intro}</p>}
        </div>
      </section>
      <div className="container-page py-10">{children}</div>
    </div>
  )
}

export function Offers() {
  return (
    <Page eyebrow="Offers" title="Deals for every kind of trip" intro="Apply these codes at checkout. Members always get an extra 5% off.">
      <div className="grid gap-4 md:grid-cols-3">
        {offers.map((o, i) => (
          <Reveal key={o.code} delay={i * 0.05}>
            <div className="card flex h-full flex-col gap-2 p-6">
              <span className="flex items-center gap-2 text-xs font-bold tracking-wider text-ember-600 uppercase">
                <BadgePercent className="h-4 w-4" aria-hidden="true" />
                {o.tag}
              </span>
              <strong className="text-xl leading-snug">{o.title}</strong>
              <span className="text-ink-500">{o.description}</span>
              <span className="mt-auto self-start rounded-lg border border-dashed border-line-strong px-3 py-1.5 font-mono font-bold tracking-wider text-ember-600">
                {o.code}
              </span>
            </div>
          </Reveal>
        ))}
      </div>
      <Link to="/hotels" className="btn-primary mt-8">
        Find a stay
      </Link>
    </Page>
  )
}

function EnquiryForm({ kind }: { kind: 'business' }) {
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [f, setF] = useState({ name: '', company: '', email: '', phone: '', city: '', message: '' })

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!f.name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) {
      setError('Please add your name and a valid email.')
      return
    }
    setBusy(true)
    try {
      if (!isDemoMode && supabase) {
        const { error: err } = await supabase.from('enquiries').insert({ kind, ...f })
        if (err) throw new Error(err.message)
      }
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  if (sent)
    return (
      <div className="card p-6">
        <strong className="text-lg text-leaf-700">Thanks — we’ve got your details.</strong>
        <p className="mt-1 text-ink-700">Our team will get back to you within one working day.</p>
      </div>
    )

  return (
    <form onSubmit={submit} className="card grid gap-4 p-6 sm:grid-cols-2" noValidate>
      <label className="label">
        Your name
        <input className="field" autoComplete="name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
      </label>
      <label className="label">
        Company
        <input className="field" autoComplete="organization" value={f.company} onChange={(e) => setF({ ...f, company: e.target.value })} />
      </label>
      <label className="label">
        Work email
        <input className="field" type="email" autoComplete="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
      </label>
      <label className="label">
        Phone
        <input className="field" type="tel" autoComplete="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
      </label>
      <label className="label sm:col-span-2">
        City
        <input className="field" value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} />
      </label>
      <label className="label sm:col-span-2">
        How many stays a month does your team need?
        <textarea className="field" rows={3} value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} />
      </label>
      {error && (
        <p role="alert" className="text-sm font-semibold text-ember-600 sm:col-span-2">
          {error}
        </p>
      )}
      <button type="submit" className="btn-primary sm:col-span-2 sm:justify-self-start" disabled={busy}>
        {busy ? 'Sending…' : 'Request a callback'}
      </button>
    </form>
  )
}

export function Business() {
  const { company } = useAccount()
  return (
    <Page eyebrow="For Business" title={`${site.name} for Business`} intro="Corporate rates, GST invoices for every stay and one monthly bill for your whole team.">
      <div className="grid gap-8 lg:grid-cols-[1fr_1.3fr]">
        <div className="flex flex-col gap-6">
          <ul className="flex flex-col gap-4 text-ink-700">
            {['12% corporate discount on every hotel, plus company-negotiated rates', 'Extra 5% team slab when you book 5 or more rooms', 'GST-compliant invoices to your company GSTIN', 'Monthly credit, company wallet and spending reports', 'Nightly spending limit flagged on every room'].map((p) => (
              <li key={p} className="flex gap-3">
                <span className="font-bold text-leaf-700">✓</span>
                {p}
              </li>
            ))}
          </ul>
          {features.business && (
          <div className="card flex flex-col gap-3 p-5">
            <strong className="text-navy-800">Already have a company account?</strong>
            <span className="text-sm text-ink-500">Sign in with the work email your company invited to see corporate rates.</span>
            <Link to={company ? '/biz' : '/login?type=business&next=/biz'} className="btn-navy self-start">
              {company ? `Go to ${company.name}` : 'Business login'}
            </Link>
          </div>
          )}
          <p className="text-sm text-ink-500">New company? Send the form and our team sets up your account, limits and billing.</p>
        </div>
        <EnquiryForm kind="business" />
      </div>
    </Page>
  )
}

/**
 * Hotel listing lives only on the separate hotel-owner panel (InnDesk), never on this site.
 * Old /partner links forward there; with no panel address they go to the home page.
 */
export function Partner() {
  useEffect(() => {
    if (site.partnerPanelUrl) window.location.replace(site.partnerPanelUrl)
  }, [])
  if (!site.partnerPanelUrl) return <Navigate to="/" replace />
  return (
    <Page eyebrow="Hotel owners" title="Opening the partner panel">
      <p className="max-w-2xl text-ink-700">Taking you to the partner panel…</p>
    </Page>
  )
}

export function About() {
  return (
    <Page eyebrow="About us" title={`Why ${site.name} exists`} intro="Booking a budget hotel in India shouldn’t be a gamble. We set one standard and hold every room to it.">
      <p className="max-w-2xl text-ink-700">
        [Company story goes here — when it started, who runs it, how many hotels and cities, and what makes it different. Replace this
        paragraph with the client’s own copy.]
      </p>
    </Page>
  )
}

const faqs = [
  ['Can I pay at the hotel?', 'Yes. Most stays let you reserve with no payment now and pay by cash, card or UPI at check-in.'],
  ['How do I cancel?', `Open My bookings, pick the stay and tap Cancel booking. It’s free until ${site.freeCancelHours} hours before check-in.`],
  ['Are unmarried couples allowed?', 'Hotels marked “Couple friendly” welcome unmarried couples with valid government ID.'],
  ['What ID do I need?', 'A government photo ID (Aadhaar, passport, driving licence or voter ID) for every adult guest.'],
  ['How do Club points work?', 'You earn 1 point for every ₹100 spent after checkout. Each point is worth ₹1 on a future booking.'],
]

export function Help() {
  return (
    <Page eyebrow="Help centre" title="How can we help?">
      <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr]">
        <div className="flex flex-col gap-3">
          {faqs.map(([q, a]) => (
            <details key={q} className="card group p-5">
              <summary className="cursor-pointer list-none font-bold marker:hidden">
                <span className="flex items-center justify-between gap-3">
                  {q}
                  <span className="text-xl text-navy-800 transition-transform group-open:rotate-45">+</span>
                </span>
              </summary>
              <p className="mt-2 text-ink-700">{a}</p>
            </details>
          ))}
        </div>
        <div id="contact" className="card flex h-fit scroll-mt-24 flex-col gap-3 p-6">
          <strong className="text-lg text-navy-800">Talk to us, 24/7</strong>
          {site.supportPhone && (
            <a href={`tel:${site.supportPhone.replace(/\s/g, '')}`} className="flex items-center gap-2 no-underline">
              <Phone className="h-4 w-4" aria-hidden="true" /> {site.supportPhone}
            </a>
          )}
          {site.supportEmail && (
            <a href={`mailto:${site.supportEmail}`} className="flex items-center gap-2 no-underline">
              <Mail className="h-4 w-4" aria-hidden="true" /> {site.supportEmail}
            </a>
          )}
          {site.whatsapp && (
            <a href={`https://wa.me/${site.whatsapp.replace(/\D/g, '')}`} className="flex items-center gap-2 no-underline">
              WhatsApp {site.whatsapp}
            </a>
          )}
          {!site.supportPhone && !site.supportEmail && <span className="text-sm text-ink-500">Contact details are being set up.</span>}
          <Link to="/bookings" className="btn-navy mt-2">
            Manage a booking
          </Link>
        </div>
      </div>
    </Page>
  )
}

export function NotFound() {
  return (
    <div className="container-page flex flex-col items-center gap-4 py-24 text-center">
      <p className="text-6xl font-extrabold text-navy-100">404</p>
      <h1 className="text-2xl font-extrabold text-navy-800">This page checked out early</h1>
      <Link to="/" className="btn-navy">
        Back to home
      </Link>
    </div>
  )
}
