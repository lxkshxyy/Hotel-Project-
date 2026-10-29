import { AnimatePresence, motion } from 'framer-motion'
import { BedDouble, CalendarRange, CircleHelp, Home, LogOut, Menu, Settings, Wallet, X, Building2 } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { site } from '../config/site'
import { useSession } from '../context/Session'
import { channelOnline } from '../lib/store'
import { isDemoMode } from '../lib/supabase'
import { Logo, Spinner } from './ui'

const nav = [
  { to: '/app', label: 'Home', Icon: Home, end: true },
  { to: '/app/properties', label: 'Properties', Icon: Building2 },
  { to: '/app/calendar', label: 'Rates and availability', short: 'Rates', Icon: CalendarRange },
  { to: '/app/reservations', label: 'Reservations', Icon: BedDouble },
  { to: '/app/payouts', label: 'Payouts', Icon: Wallet },
  { to: '/app/settings', label: 'Settings', Icon: Settings },
  { to: '/app/help', label: 'Help', Icon: CircleHelp },
]

function useChannel() {
  const [online, setOnline] = useState<boolean | null>(null)
  useEffect(() => {
    let live = true
    const check = () => channelOnline().then((v) => live && setOnline(v))
    check()
    const t = setInterval(check, 20000)
    return () => {
      live = false
      clearInterval(t)
    }
  }, [])
  return online
}

function SideLink({ to, label, Icon, end, onClick }: { to: string; label: string; Icon: typeof Home; end?: boolean; onClick?: () => void }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      className={({ isActive }) =>
        `relative flex min-h-11 items-center gap-3 rounded-lg px-3 text-[15px] font-semibold no-underline transition-colors ${
          isActive ? 'bg-white/10 text-white before:absolute before:top-2 before:bottom-2 before:-left-3 before:w-1 before:rounded-r before:bg-brass-500' : 'text-pine-100/80 hover:bg-white/5 hover:text-white'
        }`
      }
    >
      <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
      {label}
    </NavLink>
  )
}

function SideContent({ onNavigate }: { onNavigate?: () => void }) {
  const { owner, signOut } = useSession()
  const online = useChannel()
  const navigate = useNavigate()
  return (
    <div className="flex h-full flex-col gap-6 px-3 py-5">
      <div className="px-3">
        <Logo to="/app" light />
      </div>
      <nav aria-label="Panel" className="flex flex-col gap-1 pl-3">
        {nav.map((n) => (
          <SideLink key={n.to} {...n} onClick={onNavigate} />
        ))}
      </nav>
      <div className="mt-auto flex flex-col gap-3 px-3">
        <span className="flex items-center gap-2 text-[13px] text-pine-100/80">
          <span className={`h-2 w-2 rounded-full ${online ? 'bg-[#4ade80]' : online === false ? 'bg-[#f87171]' : 'bg-pine-100/40'}`} aria-hidden="true" />
          {online == null ? `Checking ${site.marketplace}…` : online ? `Connected to ${site.marketplace}` : `${site.marketplace} is offline`}
        </span>
        {isDemoMode && <span className="text-xs text-pine-100/60">Local demo mode. Data stays on this computer.</span>}
        <div className="border-t border-white/10 pt-3">
          <span className="block truncate font-semibold text-white">{owner?.fullName}</span>
          <span className="block truncate text-[13px] text-pine-100/70">{owner?.businessName}</span>
          <button
            type="button"
            onClick={async () => {
              await signOut()
              navigate('/')
            }}
            className="mt-2 flex min-h-10 items-center gap-2 text-sm font-semibold text-pine-100/80 hover:text-white"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" /> Sign out
          </button>
        </div>
      </div>
    </div>
  )
}

export function RequireOwner({ children }: { children: ReactNode }) {
  const { user, owner, loading } = useSession()
  const loc = useLocation()
  if (loading) return <Spinner />
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(loc.pathname + loc.search)}`} replace />
  if (!owner) return <Navigate to="/welcome" replace />
  return <>{children}</>
}

export default function AppLayout() {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  useEffect(() => {
    setOpen(false)
    window.scrollTo({ top: 0 })
  }, [pathname])
  const wizard = /\/app\/properties\/[^/]+\/edit/.test(pathname)

  return (
    <RequireOwner>
      <div className="min-h-dvh lg:grid lg:grid-cols-[256px_1fr]">
        <aside className="sticky top-0 hidden h-dvh bg-pine-900 lg:block">
          <SideContent />
        </aside>

        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-line bg-white/95 px-4 backdrop-blur lg:hidden">
          <Logo to="/app" />
          <button type="button" aria-label="Open menu" aria-expanded={open} onClick={() => setOpen(true)} className="flex h-11 w-11 items-center justify-center rounded-xl text-pine-900 hover:bg-paper">
            <Menu aria-hidden="true" />
          </button>
        </header>
        <AnimatePresence>
          {open && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-pine-950/50 lg:hidden" onClick={() => setOpen(false)}>
              <motion.aside
                initial={{ x: -300 }}
                animate={{ x: 0 }}
                exit={{ x: -300 }}
                transition={{ type: 'tween', duration: 0.2 }}
                onClick={(e) => e.stopPropagation()}
                className="relative h-full w-[280px] max-w-[85vw] bg-pine-900"
                aria-label="Menu"
              >
                <button type="button" aria-label="Close menu" onClick={() => setOpen(false)} className="absolute top-4 right-3 flex h-10 w-10 items-center justify-center rounded-full text-white hover:bg-white/10">
                  <X aria-hidden="true" />
                </button>
                <SideContent onNavigate={() => setOpen(false)} />
              </motion.aside>
            </motion.div>
          )}
        </AnimatePresence>

        <main id="main" className={`min-w-0 ${wizard ? '' : 'pb-24 lg:pb-10'}`}>
          <Outlet />
        </main>

        {!wizard && (
          <nav aria-label="Quick" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-line bg-white/95 pt-2 backdrop-blur lg:hidden" style={{ paddingBottom: 'calc(8px + env(safe-area-inset-bottom))' }}>
            {nav.slice(0, 4).map(({ to, label, short, Icon, end }) => (
              <NavLink key={to} to={to} end={end} className={({ isActive }) => `flex flex-col items-center gap-1 py-1 text-[11px] font-bold no-underline ${isActive ? 'text-pine-900' : 'text-ink-500'}`}>
                <Icon className="h-6 w-6" aria-hidden="true" />
                {short ?? label}
              </NavLink>
            ))}
          </nav>
        )}
      </div>
    </RequireOwner>
  )
}
