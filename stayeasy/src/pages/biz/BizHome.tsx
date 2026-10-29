import { motion } from 'framer-motion'
import { ArrowRight, BadgeCheck, BarChart3, Building2, ChevronLeft, ChevronRight, ClipboardCheck, FileText, Gift, Headphones, Hotel, Percent, ShieldCheck, Users, Wallet } from 'lucide-react'
import { useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import BizSearchForm from '../../components/biz/BizSearchForm'
import { VerifyForm } from '../../components/biz/VerifyOrg'
import HotelArt from '../../components/HotelArt'
import { RatingBadge, Reveal } from '../../components/ui'
import { site } from '../../config/site'
import { useAccount } from '../../context/AccountContext'
import { bizCategories, bizCheapest, bizRules, categoryHotels, cityLimit, hotelRoomsFree, metroCities, walletMilestones } from '../../data/business'
import { cities, hotels } from '../../data/hotels'
import { bookingsLeftUnverified, getLastSearch, listBizBookings, walletStatement } from '../../lib/bizApi'
import { addDays, dayMonth, inr, plural, shortDate, todayISO } from '../../lib/format'
import { useProfile } from '../../lib/profile'
import { bizQuery, LimitChip, Pill, type BizSearch } from './shared'

const products = [
  { id: '', label: 'Hotels', Icon: Hotel },
  { id: 'team', label: 'Team stays', Icon: Users },
  { id: 'long', label: 'Long stays', Icon: Building2 },
  { id: 'meetings', label: 'Meetings', Icon: ClipboardCheck },
]

export default function BizHome() {
  const { company, isAdmin } = useAccount()
  const { name } = useProfile()
  const c = company!
  const last = getLastSearch()
  const checkIn = last && last.checkIn >= todayISO() ? last.checkIn : addDays(todayISO(), 1)
  const s: BizSearch = { city: last?.city ?? 'New Delhi', checkIn, checkOut: last && last.checkIn >= todayISO() ? last.checkOut : addDays(checkIn, 1), rooms: 1, bookingFor: 'Myself', cat: '' }
  const trips = useMemo(() => listBizBookings(c), [c])
  const left = bookingsLeftUnverified(c, trips)
  const wallet = walletStatement(c, trips)
  const upcoming = trips.filter((b) => b.status === 'confirmed' && b.checkOut >= todayISO()).sort((a, b) => a.checkIn.localeCompare(b.checkIn))
  const deals = hotels.filter((h) => c.negotiated[h.slug])
  const forCity = hotels.filter((h) => h.city === s.city).sort((a, b) => b.rating - a.rating)
  const rail = useRef<HTMLDivElement>(null)
  const glimpse = useRef<HTMLDivElement>(null)
  const scroll = (r: React.RefObject<HTMLDivElement | null>, d: number) => r.current?.scrollBy({ left: d * r.current.clientWidth * 0.8, behavior: 'smooth' })
  const maxWallet = walletMilestones.reduce((t, m) => t + m.credit, 0)
  const nextMs = wallet.next
  const prevNights = walletMilestones.filter((m) => m.nights <= wallet.nights).at(-1)?.nights ?? 0

  return (
    <div>
      <section className="pt-6 pb-14 sm:pt-8">
        <div className="container-page">
          <div className="relative z-10 mx-auto -mb-6 flex w-fit gap-1 rounded-2xl bg-white px-3 py-2 shadow-card">
            {products.map(({ id, label, Icon }) => (
              <Link
                key={label}
                to={id ? `/biz/hotels?${bizQuery({ ...s, cat: id })}` : '/biz'}
                className={`flex w-[76px] flex-col items-center gap-1 border-b-[3px] px-1 pt-1 pb-1.5 text-xs no-underline sm:w-[88px] ${id === '' ? 'border-ember-600 font-bold text-ember-600' : 'border-transparent text-ink-700 hover:text-navy-800'}`}
              >
                <Icon className="h-7 w-7" strokeWidth={1.6} aria-hidden="true" />
                {label}
              </Link>
            ))}
          </div>
          <div className="rounded-3xl bg-white px-4 pt-10 pb-2 shadow-float sm:px-6">
            <p className="mb-3 text-center text-[15px] font-bold text-ink-900">
              Book {site.name} Assured Hotels with corporate rates, a nightly spending limit and GST invoice assurance.
            </p>
            <BizSearchForm />
          </div>
        </div>
      </section>

      <div className="container-page flex flex-col gap-8 pb-16">
        {!c.verified ? (
          <Reveal>
            <section aria-labelledby="gst-h" className="card relative overflow-hidden">
              <span className="absolute top-0 left-0 rounded-br-xl bg-gradient-to-r from-ember-600 to-navy-800 px-4 py-1 text-[11px] font-black tracking-wide text-white uppercase">
                {left === 0 ? 'Booking limit reached' : `${plural(left ?? 0, 'booking')} available`}
              </span>
              <div className="flex flex-col gap-5 p-5 pt-10 md:flex-row md:items-center md:justify-between md:p-7 md:pt-10">
                <div>
                  <h2 id="gst-h" className="text-[24px] leading-tight font-black sm:text-[28px]">
                    Confirm GSTIN &amp; Claim GST Input Credit
                  </h2>
                  <p className="mt-1 text-[15px]">
                    <strong className="text-leaf-700">Unlock company credit, wallet rewards and admin controls</strong> by confirming your organisation’s GSTIN.
                  </p>
                  {left === 0 && <p className="mt-2 rounded-lg bg-[#FFF4EC] px-3 py-2 text-sm font-semibold text-[#7C2D12]">You’ve used the {c.unverifiedBookingLimit} bookings allowed before verification. Verify to keep booking.</p>}
                </div>
                <div className="w-full md:w-[380px]">
                  <span className="text-sm text-ink-500">
                    Business Name: <strong className="text-ink-900">{c.name}</strong>
                  </span>
                  <div className="mt-1.5">
                    <VerifyForm compact />
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-2 bg-mist px-5 py-3 text-sm font-bold md:px-7">
                {[
                  [Percent, 'Exclusive corporate rates'],
                  [Hotel, `${site.name} Assured Hotels`],
                  [BarChart3, 'Detailed travel & expense reports'],
                  [FileText, 'Assured GST invoices'],
                ].map(([I, t]) => {
                  const Icon = I as typeof Percent
                  return (
                    <span key={t as string} className="flex items-center gap-1.5">
                      <Icon className="h-4 w-4 text-ember-600" aria-hidden="true" /> {t as string}
                    </span>
                  )
                })}
              </div>
            </section>
          </Reveal>
        ) : (
          <section className="flex flex-wrap items-center gap-3 rounded-2xl bg-leaf-50 px-5 py-3.5 ring-1 ring-[#BFE3C9]">
            <BadgeCheck className="h-6 w-6 text-leaf-700" aria-hidden="true" />
            <span className="text-[15px]">
              <strong>{c.name} is verified</strong> · {c.verifiedVia?.type ?? 'GSTIN'} {c.verifiedVia?.value ?? c.gstin} · {c.verifiedVia?.note}
            </span>
            <Link to="/biz/admin" className="ml-auto text-sm font-black text-leaf-800">
              Admin settings →
            </Link>
          </section>
        )}

        <Reveal>
          <section aria-labelledby="ms-h" className="card flex flex-col gap-5 p-5 sm:p-7 md:flex-row md:items-center">
            <div className="flex-1">
              <h2 id="ms-h" className="text-[22px] font-black">
                Company Wallet: earn credit with every milestone
              </h2>
              <p className="mt-1 text-sm text-ink-700">
                {walletMilestones.map((m) => `${inr(m.credit)} at ${m.label.toLowerCase()}`).join(' · ')}
              </p>
              <div className="mt-4">
                <div className="flex justify-between text-xs font-bold text-ink-500">
                  <span>Milestone progress · {plural(wallet.nights, 'room-night')} booked</span>
                  <span>{nextMs ? `Next: ${inr(nextMs.credit)} at ${nextMs.nights} nights` : 'All milestones reached'}</span>
                </div>
                <div className="mt-2 grid grid-cols-5 gap-1.5">
                  {walletMilestones.map((m) => {
                    const done = wallet.nights >= m.nights
                    const part = !done && nextMs?.nights === m.nights ? (wallet.nights - prevNights) / (m.nights - prevNights) : 0
                    return (
                      <div key={m.nights} className="h-2.5 overflow-hidden rounded-full bg-line">
                        <div className="h-full rounded-full bg-leaf-700" style={{ width: done ? '100%' : `${Math.round(part * 100)}%` }} />
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4 rounded-2xl bg-gradient-to-br from-[#FFF7E6] to-[#FDECC8] px-5 py-4 md:w-[260px]">
              <Wallet className="h-10 w-10 text-[#B45309]" aria-hidden="true" />
              <div>
                <span className="text-xs font-bold text-[#92400E] uppercase">Wallet balance</span>
                <strong className="block text-2xl font-black">{inr(wallet.balance)}</strong>
                <Link to="/biz/admin?tab=wallet" className="text-xs font-black text-ember-600">
                  View statement →
                </Link>
              </div>
            </div>
          </section>
        </Reveal>

        {forCity.length > 0 && (
          <section aria-labelledby="stay-h" className="card p-5 sm:p-7">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 id="stay-h" className="text-[26px] leading-tight font-black">
                  For your stay in {s.city}
                </h2>
                <p className="text-sm text-ink-700">
                  {shortDate(s.checkIn)} – {shortDate(s.checkOut)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Link to={`/biz/hotels?${bizQuery(s)}`} className="flex items-center gap-1 text-[15px] font-black tracking-wide text-ember-600 uppercase no-underline">
                  View all <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <span className="hidden overflow-hidden rounded-full border border-line-strong sm:flex">
                  <button type="button" aria-label="Previous hotels" onClick={() => scroll(rail, -1)} className="flex h-9 w-9 items-center justify-center text-ember-600">
                    <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                  </button>
                  <button type="button" aria-label="More hotels" onClick={() => scroll(rail, 1)} className="flex h-9 w-9 items-center justify-center border-l border-line-strong text-ember-600">
                    <ChevronRight className="h-5 w-5" aria-hidden="true" />
                  </button>
                </span>
              </div>
            </div>
            <div ref={rail} className="no-scrollbar mt-5 flex snap-x gap-4 overflow-x-auto pb-1">
              {forCity.map((h) => {
                const { rate } = bizCheapest(c, h, 1)
                return (
                  <Link key={h.slug} to={`/biz/hotel/${h.slug}?${bizQuery(s)}`} className="group flex w-[250px] shrink-0 snap-start flex-col overflow-hidden rounded-xl border border-line-strong bg-white text-ink-900 no-underline hover:shadow-card">
                    <div className="relative h-[136px] overflow-hidden">
                      <HotelArt hue={h.hue} photo={h.photos?.[0]} label={h.name} className="transition-transform duration-500 group-hover:scale-105" />
                      <span className="absolute right-2 bottom-2 rounded bg-navy-800 px-1.5 py-0.5 text-xs font-black text-white">{h.rating.toFixed(1)}/5</span>
                    </div>
                    <div className="flex items-start justify-between gap-2 p-3">
                      <span className="min-w-0">
                        <strong className="block leading-snug">{h.name}</strong>
                        <span className="text-[13px] text-ink-500">{h.area}</span>
                      </span>
                      <span className="shrink-0 text-right">
                        <strong className="block">{inr(rate)}</strong>
                        <span className="text-[11px] text-ink-500">per night</span>
                      </span>
                    </div>
                  </Link>
                )
              })}
            </div>
          </section>
        )}

        <Link to="/business" className="card flex flex-wrap items-center gap-3 px-5 py-4 text-ink-900 no-underline hover:shadow-card sm:px-7">
          <Gift className="h-7 w-7 text-[#B45309]" aria-hidden="true" />
          <span className="flex-1 text-lg">
            <strong>Earn up to {inr(maxWallet)} wallet credit + {Math.round(bizRules.corporateOff * 100)}% off on every booking!</strong>{' '}
            <span className="text-ink-700">Book now for exclusive business savings.</span>
          </span>
          <span className="font-black tracking-wide text-navy-800 uppercase">Why {site.name} Business?</span>
        </Link>

        <section className="flex flex-wrap items-center gap-4 rounded-2xl bg-gradient-to-r from-[#FCE7E4] via-[#F4ECF7] to-navy-50 px-5 py-4 sm:px-7">
          <div className="flex-[1_1_320px]">
            <span className="rounded-md bg-ember-600 px-2 py-0.5 text-[10px] font-black text-white uppercase">Only for you</span>
            <h2 className="mt-1 text-[22px] font-black text-[#3B1F36]">{site.name} Business Exclusive Benefits</h2>
            <p className="text-sm text-ink-700">Hi {name}! As a valued business customer, enjoy these benefits on every company booking.</p>
          </div>
          <span className="flex items-center gap-2 text-sm">
            <Headphones className="h-6 w-6 text-ember-600" aria-hidden="true" /> <strong className="text-leaf-800">24/7 support</strong> {site.supportPhone ? `on ${site.supportPhone}` : 'for every booking'}
          </span>
          <span className="flex items-center gap-2 text-sm">
            <ShieldCheck className="h-6 w-6 text-ember-600" aria-hidden="true" /> <strong className="text-leaf-800">Free cancellation</strong> till 6 pm a day before
          </span>
          <Link to="/business" className="text-sm font-black tracking-wide text-navy-800 uppercase">
            Learn more →
          </Link>
        </section>

        <section aria-labelledby="glimpse-h" className="card p-5 sm:p-7">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 id="glimpse-h" className="text-[30px] leading-tight font-black">
                Hi {name}!
              </h2>
              <p className="text-xs tracking-wide text-ink-700 uppercase">Quick glimpse of what {site.name} for Business offers to companies</p>
            </div>
            <span className="hidden overflow-hidden rounded-full border border-line-strong sm:flex">
              <button type="button" aria-label="Previous" onClick={() => scroll(glimpse, -1)} className="flex h-9 w-9 items-center justify-center text-ember-600">
                <ChevronLeft className="h-5 w-5" aria-hidden="true" />
              </button>
              <button type="button" aria-label="Next" onClick={() => scroll(glimpse, 1)} className="flex h-9 w-9 items-center justify-center border-l border-line-strong text-ember-600">
                <ChevronRight className="h-5 w-5" aria-hidden="true" />
              </button>
            </span>
          </div>
          <div ref={glimpse} className="no-scrollbar mt-5 flex snap-x gap-4 overflow-x-auto pb-1">
            {[
              { t: 'Manage Your Organisation', d: isAdmin ? 'Add colleagues, set the nightly limit and verify your company.' : 'See your company’s policy and colleagues.', to: '/biz/admin', I: ShieldCheck },
              { t: 'Exclusive Corporate Rates', d: `${Math.round(bizRules.corporateOff * 100)}% off public prices, plus an extra ${Math.round(bizRules.teamOff * 100)}% from ${bizRules.teamFrom} rooms.`, to: `/biz/hotels?${bizQuery(s)}`, I: Percent },
              { t: `${site.name} Assured Hotels`, d: 'Work desks, fast Wi-Fi and GST invoices at every stay.', to: `/biz/hotels?${bizQuery({ ...s, city: '' })}`, I: Hotel },
              { t: 'Travel Requests', d: 'Colleagues raise requests, admins approve, you book in one click.', to: '/biz/requests', I: ClipboardCheck },
              { t: 'Travel & Expense Reports', d: 'Spend by cost centre, city and traveller. Download as CSV.', to: '/biz/reports', I: BarChart3 },
            ].map(({ t, d, to, I }) => (
              <Link key={t} to={to} className="flex w-[300px] shrink-0 snap-start flex-col gap-2 rounded-xl border border-line-strong p-5 text-ink-900 no-underline hover:shadow-card">
                <strong className="text-lg">{t}</strong>
                <span className="text-sm text-ink-700">{d}</span>
                <span className="mt-auto flex items-center justify-between pt-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-mist">
                    <I className="h-5 w-5 text-[#B45309]" aria-hidden="true" />
                  </span>
                  <span className="text-[15px] font-black tracking-wide text-accent uppercase">Learn more</span>
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section aria-labelledby="cat-h" className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 id="cat-h" className="section-title">
                Hotels for work trips
              </h2>
              <p className="text-ink-500">The business catalog replaces leisure categories like beaches and couple stays.</p>
            </div>
            <Link to={`/biz/hotels?${bizQuery({ ...s, city: '' })}`} className="font-bold no-underline">
              See all hotels →
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {bizCategories.map((cat, i) => {
              const list = categoryHotels(cat.id)
              const from = Math.min(...list.map((h) => bizCheapest(c, h, 1).rate))
              return (
                <Reveal key={cat.id} delay={i * 0.04}>
                  <Link to={`/biz/hotels?${bizQuery({ ...s, city: '', cat: cat.id })}`} className="card group flex h-full flex-col overflow-hidden text-ink-900 no-underline">
                    <div className="relative h-[140px] overflow-hidden">
                      <img src={cat.photo} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                      <span className="absolute bottom-2.5 left-3 rounded-full bg-white px-2.5 py-1 text-xs font-bold text-navy-800">
                        {cat.id === 'team' ? 'Bulk rooms' : cat.id === 'meetings' ? 'Meeting room' : plural(list.length, 'hotel')}
                      </span>
                    </div>
                    <div className="flex flex-1 flex-col gap-1 px-4 pt-3.5 pb-4">
                      <strong className="text-[17px]">{cat.title}</strong>
                      <span className="text-[13.5px] text-ink-500">{cat.description}</span>
                      <span className="mt-auto pt-1.5 text-sm font-bold text-navy-800">
                        {cat.id === 'team' ? `Extra ${bizRules.teamOff * 100}% off from ${bizRules.teamFrom} rooms` : cat.id === 'meetings' ? `From ${inr(from)} corporate · hall on request` : `From ${inr(from)} corporate`}
                      </span>
                    </div>
                  </Link>
                </Reveal>
              )
            })}
          </div>
        </section>

        <section aria-labelledby="city-h" className="flex flex-col gap-4">
          <h2 id="city-h" className="section-title">
            Work cities
          </h2>
          <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 sm:mx-0 sm:grid sm:grid-cols-3 sm:px-0 lg:grid-cols-6">
            {cities
              .filter((x) => metroCities.includes(x.name))
              .map((x) => (
                <Link key={x.name} to={`/biz/hotels?${bizQuery({ ...s, city: x.name, cat: '' })}`} className="group relative block h-36 w-40 shrink-0 overflow-hidden rounded-2xl no-underline sm:w-auto">
                  <img src={x.image} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  <span className="absolute inset-0 bg-gradient-to-t from-navy-950/85 via-navy-950/20 to-transparent" />
                  <span className="absolute bottom-2.5 left-3 flex flex-col text-white">
                    <strong>{x.name}</strong>
                    <span className="text-xs text-[#D3DCEE]">Limit {inr(cityLimit(c, x.name))} / night</span>
                  </span>
                </Link>
              ))}
          </div>
        </section>

        {deals.length > 0 && (
        <section aria-labelledby="deal-h" className="flex flex-col gap-4">
          <div>
            <h2 id="deal-h" className="section-title">
              Negotiated for {c.name.split(' ')[0]}
            </h2>
            <p className="text-ink-500">Hotels with a company-specific rate on top of the standard corporate discount.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {deals.map((h) => {
              const { plans, rate } = bizCheapest(c, h, 1)
              return (
                <motion.div key={h.slug} whileHover={{ y: -4 }} transition={{ duration: 0.2 }}>
                  <Link to={`/biz/hotel/${h.slug}?${bizQuery({ ...s, city: h.city })}`} className="card group flex h-full flex-col overflow-hidden text-ink-900 no-underline">
                    <div className="relative h-40">
                      <HotelArt hue={h.hue} photo={h.photos?.[0]} label={`${h.name} exterior`} />
                      <span className="absolute top-3 left-3">
                        <Pill tone="solid">{c.name.split(' ')[0]} rate</Pill>
                      </span>
                    </div>
                    <div className="flex flex-1 flex-col gap-2 px-4 pt-3.5 pb-4">
                      <div className="flex items-start justify-between gap-2">
                        <strong className="leading-snug">{h.name}</strong>
                        <RatingBadge rating={h.rating} />
                      </div>
                      <span className="text-[13.5px] text-ink-500">
                        {h.area}, {h.city}
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        <LimitChip over={rate > cityLimit(c, h.city)} />
                        <Pill>GST invoice</Pill>
                        <Pill>{hotelRoomsFree(h)} rooms free</Pill>
                      </div>
                      <div className="mt-auto flex items-baseline gap-2 border-t border-line pt-2">
                        <strong className="text-xl">{inr(rate)}</strong>
                        <span className="text-[13px] text-ink-500 line-through">{inr(plans.pub)}</span>
                        <span className="text-xs text-ink-500">/ night + GST</span>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              )
            })}
          </div>
        </section>
        )}

        <section aria-labelledby="team-h" className="card flex flex-wrap items-center gap-6 p-6">
          <div className="flex flex-[1_1_340px] flex-col gap-2">
            <h2 id="team-h" className="text-[22px] font-extrabold text-navy-800">
              Booking for a team? The more rooms, the lower the rate.
            </h2>
            <p className="text-ink-500">Same hotel, same dates, one booking. Assign each room to a colleague at checkout.</p>
            <Link to={`/biz/hotels?${bizQuery({ ...s, rooms: 6, bookingFor: 'My team', cat: 'team' })}`} className="btn-primary mt-1.5 self-start">
              Plan a team stay <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
          <div className="grid flex-[1_1_420px] gap-3 sm:grid-cols-3">
            <div className="flex flex-col gap-1 rounded-[14px] border border-line p-3.5">
              <span className="text-[13px] font-bold text-ink-500">1–{bizRules.teamFrom - 1} ROOMS</span>
              <strong className="text-lg leading-tight">Corporate rate</strong>
              <span className="text-[13px] text-ink-500">{bizRules.corporateOff * 100}% off public</span>
            </div>
            <div className="flex flex-col gap-1 rounded-[14px] border-2 border-navy-800 bg-navy-50 p-[13px]">
              <span className="text-[13px] font-bold text-navy-800">
                {bizRules.teamFrom}–{bizRules.quoteFrom - 1} ROOMS
              </span>
              <strong className="text-lg leading-tight">Extra {bizRules.teamOff * 100}% off</strong>
              <span className="text-[13px] text-ink-700">on the corporate rate</span>
            </div>
            <div className="flex flex-col gap-1 rounded-[14px] border border-line p-3.5">
              <span className="text-[13px] font-bold text-ink-500">{bizRules.quoteFrom}+ ROOMS</span>
              <strong className="text-lg leading-tight">Group quote</strong>
              <span className="text-[13px] text-ink-500">hotel sends a price</span>
            </div>
          </div>
        </section>

        <section aria-labelledby="trips-h" className="flex flex-col gap-3">
          <div className="flex items-end justify-between gap-2">
            <h2 id="trips-h" className="section-title">
              Upcoming trips
            </h2>
            <Link to="/biz/trips" className="font-bold no-underline">
              All trips →
            </Link>
          </div>
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr className="bg-mist text-left text-[12.5px] text-ink-500">
                  <th className="px-4 py-2.5">Hotel</th>
                  <th className="px-4 py-2.5">Dates</th>
                  <th className="px-4 py-2.5">Rooms</th>
                  <th className="px-4 py-2.5">Total</th>
                  <th className="px-4 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody>
                {upcoming.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-ink-500">
                      No upcoming trips yet.
                    </td>
                  </tr>
                )}
                {upcoming.slice(0, 5).map((b) => (
                  <tr key={b.id} className="border-t border-line">
                    <td className="px-4 py-3 font-semibold">
                      <Link to={`/biz/trips#${b.id}`} className="text-ink-900 no-underline hover:text-navy-800">
                        {b.hotelName}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      {dayMonth(b.checkIn)} – {dayMonth(b.checkOut)}
                    </td>
                    <td className="px-4 py-3">
                      {plural(b.lines.length, 'room')} · {b.lines.length === 1 ? b.lines[0].traveller : b.costCentre.split(' · ')[1] + ' team'}
                    </td>
                    <td className="px-4 py-3 font-semibold">{inr(b.total)}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-leaf-50 px-2.5 py-[3px] text-xs font-bold text-leaf-700">Confirmed</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  )
}
