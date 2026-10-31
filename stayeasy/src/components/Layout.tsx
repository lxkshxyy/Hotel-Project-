import { AnimatePresence, motion } from 'framer-motion'
import { BedDouble, Briefcase, ClipboardList, Home, Luggage, Menu, Search, ShieldCheck, Ticket, User, X } from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { features } from '../config/launch'
import WelcomeLogin, { openLogin } from './WelcomeLogin'
import { site } from '../config/site'
import { useAccount } from '../context/AccountContext'
import { useAuth } from '../context/AuthContext'
import AccountMenu, { ModeToggle } from './AccountMenu'
import { bookingsLeftUnverified, listBizBookings, listRequests } from '../lib/bizApi'
import { isDemoMode } from '../lib/supabase'
import InstallBanner from './InstallBanner'

export function Logo({ light = false, business = false }: { light?: boolean; business?: boolean }) {
  return (
    <Link to={business ? '/biz' : '/'} className="flex items-center gap-2.5 no-underline" aria-label={`${site.name} home`}>
      <span
        className={`flex h-9 w-9 items-center justify-center rounded-[10px] text-lg font-extrabold ${
          light ? 'bg-white text-navy-800' : business ? 'bg-ember-600 text-white' : 'bg-navy-800 text-white'
        }`}
      >
        S
      </span>
      {/* On phones the business header also carries the Personal | Business switch, so keep the logo compact there. */}
      <span className={`text-[22px] font-extrabold tracking-tight ${light ? 'text-white' : 'text-navy-800'} ${business && !light ? 'hidden min-[420px]:inline' : ''}`}>{site.name}</span>
      {business && (
        <span className={`hidden rounded-md px-2 py-[3px] text-[11px] font-extrabold tracking-[0.06em] sm:inline ${light ? 'bg-white/15 text-white' : 'bg-navy-800 text-white'}`}>BUSINESS</span>
      )}
    </Link>
  )
}

const navLinks = [
  { to: '/hotels', label: 'Hotels' },
  { to: '/offers', label: 'Offers' },
  { to: '/club', label: 'StayEasy Club' },
  { to: '/business', label: 'For Business' },
]

const bizLinks = [
  { to: '/biz', label: 'Hotels', end: true },
  { to: '/biz/trips', label: 'Trips' },
  { to: '/biz/requests', label: 'Requests' },
  { to: '/biz/reports', label: 'Reports' },
]

function HeaderPill({ to, icon, title, sub, badge, tone = 'plain' }: { to: string; icon: ReactNode; title: string; sub?: string; badge?: ReactNode; tone?: 'plain' | 'alert' }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `relative flex min-h-11 items-center gap-2 rounded-xl px-2.5 py-1.5 no-underline shadow-sm ring-1 transition-colors ${
          tone === 'alert' ? 'bg-ember-600 text-white ring-ember-600 hover:bg-ember-700' : `bg-white text-ink-900 ring-line hover:ring-line-strong ${isActive ? 'ring-2 ring-ember-600' : ''}`
        }`
      }
    >
      {icon}
      <span className="flex flex-col leading-tight whitespace-nowrap">
        <strong className="text-[13px]">{title}</strong>
        {sub && <span className={`text-[11px] ${tone === 'alert' ? 'text-white/85' : 'text-ink-500'}`}>{sub}</span>}
      </span>
      {badge}
    </NavLink>
  )
}

/** Header shown when the Business account is switched on. No hotel-listing links here. */
function BizHeader() {
  const { company, isAdmin } = useAccount()
  const { user } = useAuth()
  const { pathname } = useLocation()
  // Re-read on every page change so counts stay fresh.
  const info = useMemo(() => {
    if (!company) return { pending: 0, left: null as number | null }
    const reqs = listRequests(company)
    const pending = reqs.filter((r) => r.status === 'pending' && (isAdmin || r.raisedByEmail === user?.email.toLowerCase())).length
    return { pending, left: bookingsLeftUnverified(company, listBizBookings(company)) }
  }, [company, isAdmin, user, pathname]) // eslint-disable-line react-hooks/exhaustive-deps
  const unverified = company && !company.verified

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-[#FFF7F2]/95 backdrop-blur supports-[backdrop-filter]:bg-[#FFF7F2]/85 print:hidden">
      <div className={`hidden text-[13px] md:block ${unverified ? 'bg-[#FDE3D3] text-[#7C2D12]' : 'bg-navy-900 text-white'}`}>
        <div className="container-page flex h-9 items-center justify-between gap-4">
          {unverified ? (
            <span>
              <strong>{company?.name} isn’t verified yet.</strong> {info.left ?? 0} of {company?.unverifiedBookingLimit} bookings left before verification ·{' '}
              <Link to="/biz/admin" className="font-black text-ember-600">
                Verify GSTIN →
              </Link>
            </span>
          ) : (
            <span>
              Booking as <strong>{company?.name}</strong> · corporate rates on · GST invoices to {company?.gstin || company?.verifiedVia?.value}
            </span>
          )}
          {site.supportPhone && (
            <a href={`tel:${site.supportPhone.replace(/\s/g, '')}`} className={`no-underline hover:underline ${unverified ? 'text-[#7C2D12]' : 'text-white'}`}>
              Business support 24/7 · {site.supportPhone}
            </a>
          )}
        </div>
      </div>
      <div className="container-page flex h-16 items-center gap-3 md:h-[76px] md:gap-5">
        <Logo business />
        <nav aria-label="Business" className="hidden items-center gap-0.5 2xl:flex">
          {bizLinks.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                `rounded-lg px-3 py-2 text-[15px] font-bold no-underline transition-colors hover:bg-navy-50 ${isActive ? 'text-ember-600' : 'text-ink-900'}`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="ml-auto hidden items-center gap-2 md:flex">
          <ModeToggle />
          <HeaderPill
            to="/biz/requests"
            icon={<ClipboardList className="h-6 w-6 text-[#B45309]" aria-hidden="true" />}
            title="Pending"
            sub="Requests"
            badge={info.pending > 0 && <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-ember-600 px-1 text-[11px] font-black text-white">{info.pending}</span>}
          />
          <HeaderPill to="/biz/trips" icon={<Luggage className="h-6 w-6 text-navy-800" aria-hidden="true" />} title="My Trips" sub="Manage bookings" />
          <HeaderPill
            to="/biz/admin"
            tone={unverified ? 'alert' : 'plain'}
            icon={<ShieldCheck className={`h-6 w-6 ${unverified ? 'text-white' : 'text-leaf-700'}`} aria-hidden="true" />}
            title="Admin"
            sub={unverified ? 'Verify now' : 'Settings'}
            badge={unverified && <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-white text-xs font-black text-ember-600 ring-2 ring-ember-600">!</span>}
          />
          <AccountMenu />
        </div>
        <div className="ml-auto flex items-center gap-2 md:hidden">
          <ModeToggle small />
          <AccountMenu compact />
        </div>
      </div>
    </header>
  )
}

function Header() {
  const { user } = useAuth()
  const { company } = useAccount()
  const [open, setOpen] = useState(false)
  const location = useLocation()
  useEffect(() => setOpen(false), [location.pathname])

  return (
    <header className="sticky top-0 z-40 print:hidden border-b border-line bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85">
      <div className="hidden bg-navy-800 text-[13px] text-white md:block">
        <div className="container-page flex h-9 items-center justify-between">
          <span>Book direct for the lowest price · Pay at hotel available</span>
          <span className="flex gap-5">
            {site.supportPhone && (
              <a href={`tel:${site.supportPhone.replace(/\s/g, '')}`} className="text-white no-underline hover:underline">
                {site.supportPhone}
              </a>
            )}
            {features.business && (
              <Link to={company ? '/biz' : '/login?type=business&next=/biz'} className="text-white no-underline hover:underline">
                {company ? `Switch to ${company.name}` : 'Business login'}
              </Link>
            )}
            {site.agentPanelUrl && (
              <a href={site.agentPanelUrl} className="text-white no-underline hover:underline">
                Travel agents
              </a>
            )}
          </span>
        </div>
      </div>
      <div className="container-page flex h-16 items-center gap-6 md:h-[72px]">
        <Logo />
        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {navLinks.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `rounded-lg px-3 py-2 font-semibold no-underline transition-colors hover:bg-navy-50 ${isActive ? 'text-ember-600' : 'text-ink-900'}`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="ml-auto hidden items-center gap-3 md:flex">
          <Link to="/bookings" className="btn-outline">
            My bookings
          </Link>
          {user ? (
            <>
              <ModeToggle />
              <AccountMenu />
            </>
          ) : (
            <Link
              to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`}
              className="btn-navy"
              onClick={(e) => {
                e.preventDefault()
                openLogin()
              }}
            >
              Sign in
            </Link>
          )}
        </div>
        <button
          type="button"
          className="ml-auto flex h-11 w-11 items-center justify-center rounded-xl text-navy-800 md:hidden"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
        </button>
      </div>
      <AnimatePresence>
        {open && (
          <motion.nav
            aria-label="Mobile"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-line bg-white md:hidden"
          >
            <div className="container-page flex flex-col py-2">
              {navLinks.map((l) => (
                <Link key={l.to} to={l.to} className="rounded-lg px-2 py-3 font-semibold text-ink-900 no-underline">
                  {l.label}
                </Link>
              ))}
              {user ? (
                <div className="px-2 py-2">
                  <AccountMenu />
                </div>
              ) : (
                <Link
                  to="/login"
                  className="rounded-lg px-2 py-3 font-semibold text-ink-900 no-underline"
                  onClick={(e) => {
                    e.preventDefault()
                    setOpen(false)
                    openLogin()
                  }}
                >
                  Sign in
                </Link>
              )}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  )
}

function TabLink({ to, label, icon, end, biz = false }: { to: string; label: string; icon: ReactNode; end?: boolean; biz?: boolean }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex flex-col items-center gap-1 py-1 text-[11px] font-bold no-underline ${isActive ? (biz ? 'text-ember-600' : 'text-navy-800') : 'text-ink-500'}`
      }
    >
      {icon}
      {label}
    </NavLink>
  )
}

function MobileTabBar() {
  const { user } = useAuth()
  const { isBusiness } = useAccount()
  if (isBusiness)
    return (
      <nav
        aria-label="Business tabs"
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 print:hidden border-t border-line bg-[#FFF7F2]/95 pt-2 backdrop-blur md:hidden"
        style={{ paddingBottom: 'calc(8px + env(safe-area-inset-bottom))' }}
      >
        <TabLink biz to="/biz" end label="Book" icon={<Briefcase className="h-6 w-6" aria-hidden="true" />} />
        <TabLink biz to="/biz/trips" label="Trips" icon={<BedDouble className="h-6 w-6" aria-hidden="true" />} />
        <TabLink biz to="/biz/requests" label="Requests" icon={<ClipboardList className="h-6 w-6" aria-hidden="true" />} />
        <TabLink biz to="/biz/admin" label="Admin" icon={<ShieldCheck className="h-6 w-6" aria-hidden="true" />} />
      </nav>
    )
  return (
    <nav
      aria-label="App tabs"
      className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 print:hidden border-t border-line bg-white/95 pt-2 backdrop-blur md:hidden"
      style={{ paddingBottom: 'calc(8px + env(safe-area-inset-bottom))' }}
    >
      <TabLink to="/" end label="Home" icon={<Home className="h-6 w-6" aria-hidden="true" />} />
      <TabLink to="/hotels" label="Search" icon={<Search className="h-6 w-6" aria-hidden="true" />} />
      <TabLink to="/bookings" label="Bookings" icon={<BedDouble className="h-6 w-6" aria-hidden="true" />} />
      <TabLink
        to={user ? '/account' : '/login'}
        label={user ? 'Account' : 'Sign in'}
        icon={user ? <User className="h-6 w-6" aria-hidden="true" /> : <Ticket className="h-6 w-6" aria-hidden="true" />}
      />
    </nav>
  )
}

const footerCols = [
  { h: 'Company', links: [['About us', '/about'], ['Offers', '/offers'], ['For Business', '/business']] },
  { h: 'Support', links: [['Help centre', '/help'], ['Manage booking', '/bookings'], ['Contact us', '/help#contact'], ['FAQs', '/help']] },
  { h: 'Policies', links: [['Terms & conditions', '/terms'], ['Privacy policy', '/privacy'], ['Cancellation & refunds', '/cancellation-policy'], ['Guest policy', '/guest-policy']] },
]

/* Business footer: only links that make sense inside the corporate panel. */
const bizFooterCols = [
  { h: 'Business', links: [['Book hotels', '/biz'], ['My trips', '/biz/trips'], ['Travel requests', '/biz/requests'], ['Reports', '/biz/reports']] },
  { h: 'Company account', links: [['Admin settings', '/biz/admin'], ['Company wallet', '/biz/admin?tab=wallet'], ['Invoices & GST', '/biz/admin?tab=invoices'], ['My profile', '/biz/profile']] },
  { h: 'Help & policies', links: [['Business support', '/help'], ['Cancellation policy', '/cancellation-policy'], ['Terms & conditions', '/terms'], ['Privacy policy', '/privacy']] },
]

const seoCities = ['New Delhi', 'Mumbai', 'Bengaluru', 'Goa', 'Jaipur', 'Hyderabad', 'Pune', 'Kolkata']

function Footer({ business = false }: { business?: boolean }) {
  const cols = business ? bizFooterCols : footerCols
  const soft = business ? 'text-[#F1D9CC]' : 'text-[#D3DCEE]'
  return (
    <footer className={`mt-16 bg-navy-950 print:hidden ${soft}`}>
      <div className="container-page grid gap-10 py-12 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="flex flex-col gap-4">
          <Logo light business={business} />
          <p className="max-w-xs text-sm">
            {business ? 'Corporate rates, spending limits and GST invoices for every work trip, in one company account.' : 'Clean, comfortable rooms at honest prices. The same standard in every city.'}
          </p>
          {(site.supportPhone || site.supportEmail) && (
            <p className="text-sm">
              {site.supportPhone}
              {site.supportPhone && <br />}
              {site.supportEmail}
            </p>
          )}
        </div>
        {cols.map((c) => (
          <div key={c.h}>
            <h2 className="mb-3 text-sm font-bold tracking-wider text-white uppercase">{c.h}</h2>
            <ul className="flex flex-col gap-2 text-sm">
              {c.links.map(([label, to]) => (
                <li key={label}>
                  <Link to={to} className={`${soft} no-underline hover:text-white hover:underline`}>
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-white/10">
        <div className="container-page py-6 text-sm">
          <h2 className="mb-2 font-bold text-white">{business ? 'Business hotels by city' : 'Hotels by city'}</h2>
          <p className="flex flex-wrap gap-x-4 gap-y-1">
            {seoCities.map((c) => (
              <Link key={c} to={business ? `/biz/hotels?city=${encodeURIComponent(c)}` : `/hotels?city=${encodeURIComponent(c)}`} className={`${soft} no-underline hover:text-white`}>
                Hotels in {c}
              </Link>
            ))}
          </p>
          <p className={`mt-6 text-xs ${business ? 'text-[#D2AE9C]' : 'text-[#9FB0CF]'}`}>
            © {new Date().getFullYear()} {site.name}. All rights reserved.
            {isDemoMode && ' · Demo mode: sample hotels, bookings stay in this browser.'}
          </p>
        </div>
      </div>
    </footer>
  )
}

export default function Layout() {
  const { pathname } = useLocation()
  const { isBusiness } = useAccount()
  const checkout = pathname.startsWith('/checkout')
  const hideTabs = checkout || pathname.startsWith('/hotel/') || pathname.startsWith('/biz/hotel/') || pathname.startsWith('/biz/checkout')
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  }, [pathname])

  return (
    <div className={`flex min-h-dvh flex-col ${isBusiness ? 'theme-biz bg-canvas' : ''}`}>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2">
        Skip to content
      </a>
      {!checkout && (isBusiness ? <BizHeader /> : <Header />)}
      <main
        id="main"
        className={`flex-1 ${checkout ? '' : 'pb-tabbar'} ${isBusiness ? 'bg-[linear-gradient(180deg,#FBE4DA_0px,#F9ECE6_320px,#FBF5F1_760px)]' : ''}`}
      >
        <motion.div key={pathname} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
          <Outlet />
        </motion.div>
      </main>
      {!checkout && <Footer business={isBusiness} />}
      {!hideTabs && <MobileTabBar />}
      <WelcomeLogin />
      <div className="print:hidden">
        <InstallBanner />
      </div>
    </div>
  )
}
