import { BedDouble, BookOpenText, CircleHelp, Hotel, LayoutDashboard, LogOut, Menu, Settings, TrendingUp, Users, Wallet, X } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { Link, Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { inr } from '@stayeasy/lib/format'
import { useSession } from '../context/Session'
import { useWallet } from '../lib/hooks'
import { isDemoMode } from '../lib/supabase'
import { Logo, Spinner } from './ui'

const nav = [
  { to: '/app', label: 'Home', Icon: LayoutDashboard, end: true },
  { to: '/app/hotels', label: 'Hotels', Icon: Hotel },
  { to: '/app/quotes', label: 'Quotes', Icon: BookOpenText },
  { to: '/app/bookings', label: 'Bookings', Icon: BedDouble },
  { to: '/app/customers', label: 'Customers', Icon: Users },
  { to: '/app/wallet', label: 'Wallet', Icon: Wallet },
  { to: '/app/earnings', label: 'Earnings', Icon: TrendingUp },
  { to: '/app/settings', label: 'Settings', Icon: Settings },
  { to: '/app/help', label: 'Help', Icon: CircleHelp },
]

function Side({ onNav }: { onNav?: () => void }) {
  const { agency, role, user, signOut } = useSession()
  const navigate = useNavigate()
  return (
    <div className="flex h-full flex-col gap-6 px-3 py-5">
      <div className="px-3">
        <Logo to="/app" light />
      </div>
      <nav aria-label="Portal" className="flex flex-col gap-0.5">
        {nav.map(({ to, label, Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onNav}
            className={({ isActive }) =>
              `flex min-h-11 items-center gap-3 rounded-lg px-3 text-[15px] font-semibold no-underline ${isActive ? 'bg-gold-500 text-ink-950' : 'text-ink-100/80 hover:bg-white/5 hover:text-white'}`
            }
          >
            <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto flex flex-col gap-2 border-t border-white/10 px-3 pt-4">
        <span className="truncate font-bold text-white">{agency?.name}</span>
        <span className="truncate text-[13px] text-ink-100/70">
          {user?.email}, {role}
        </span>
        {isDemoMode && <span className="text-xs text-ink-100/60">Demo mode: data stays in this browser.</span>}
        <button
          type="button"
          onClick={async () => {
            await signOut()
            navigate('/')
          }}
          className="mt-1 flex min-h-10 items-center gap-2 text-sm font-semibold text-ink-100/80 hover:text-white"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" /> Sign out
        </button>
      </div>
    </div>
  )
}

function WalletChip() {
  const { balance, data } = useWallet()
  return (
    <Link to="/app/wallet" className="flex items-center gap-2 rounded-lg bg-ink-50 px-3 py-2 text-sm font-bold text-ink-900 no-underline hover:bg-ink-100">
      <Wallet className="h-4 w-4" aria-hidden="true" />
      {data ? inr(balance) : '…'}
    </Link>
  )
}

export function RequireAgency({ children }: { children: ReactNode }) {
  const { user, agency, loading } = useSession()
  const loc = useLocation()
  if (loading) return <Spinner />
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(loc.pathname + loc.search)}`} replace />
  if (!agency) return <Navigate to="/register" replace />
  return <>{children}</>
}

export default function AppLayout() {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  useEffect(() => {
    setOpen(false)
    window.scrollTo({ top: 0 })
  }, [pathname])
  return (
    <RequireAgency>
      <Shell open={open} setOpen={setOpen} />
    </RequireAgency>
  )
}

function Shell({ open, setOpen }: { open: boolean; setOpen: (v: boolean) => void }) {
  const { agency } = useSession()
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="sticky top-0 hidden h-dvh bg-ink-900 lg:block">
        <Side />
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between gap-3 border-b border-line bg-white/95 px-4 backdrop-blur sm:px-7">
          <div className="flex items-center gap-2 lg:hidden">
            <button type="button" aria-label="Open menu" aria-expanded={open} onClick={() => setOpen(true)} className="flex h-11 w-11 items-center justify-center rounded-lg hover:bg-paper">
              <Menu aria-hidden="true" />
            </button>
            <Logo to="/app" />
          </div>
          <span className="hidden truncate text-[15px] font-semibold text-muted lg:block">{agency?.name}</span>
          <div className="flex items-center gap-2">
            <Link to="/app/hotels" className="btn-gold hidden min-h-10 sm:inline-flex">
              Book a hotel
            </Link>
            <WalletChip />
          </div>
        </header>
        {agency?.status === 'pending' && (
          <div className="border-b border-gold-100 bg-gold-50 px-4 py-2.5 text-[14px] text-[#6b4700] sm:px-7">
            <strong>Your agency is being checked.</strong> You can search hotels and send quotes now; bookings open once the TRPotels team approves your documents (usually within one working day).
          </div>
        )}
        {agency?.status === 'rejected' && (
          <div className="border-b border-[#f5c2bd] bg-alert-50 px-4 py-2.5 text-[14px] text-alert sm:px-7">
            <strong>Your agency wasn’t approved.</strong> Check your documents in Settings or contact your account manager.
          </div>
        )}
        <main id="main" className="pb-24 lg:pb-12">
          <Outlet />
        </main>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 bg-ink-950/50 lg:hidden" onClick={() => setOpen(false)}>
          <aside onClick={(e) => e.stopPropagation()} className="relative h-full w-[270px] max-w-[85vw] bg-ink-900" aria-label="Menu">
            <button type="button" aria-label="Close menu" onClick={() => setOpen(false)} className="absolute top-4 right-3 flex h-10 w-10 items-center justify-center rounded-full text-white hover:bg-white/10">
              <X aria-hidden="true" />
            </button>
            <Side onNav={() => setOpen(false)} />
          </aside>
        </div>
      )}

      <nav aria-label="Quick" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-line bg-white/95 pt-2 backdrop-blur lg:hidden" style={{ paddingBottom: 'calc(8px + env(safe-area-inset-bottom))' }}>
        {nav.slice(0, 4).map(({ to, label, Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => `flex flex-col items-center gap-1 py-1 text-[11px] font-bold no-underline ${isActive ? 'text-ink-900' : 'text-muted'}`}>
            <Icon className="h-6 w-6" aria-hidden="true" />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
