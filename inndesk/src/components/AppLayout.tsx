import { AnimatePresence, motion } from 'framer-motion'
import { BedDouble, Building2, ChevronDown, ChevronRight, CircleUserRound, KeyRound } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { site } from '../config/site'
import { useSession } from '../context/Session'
import { isDemoMode } from '../lib/supabase'
import { ChangePassword } from './Auth'
import { Mark, Spinner } from './ui'

const nav = [
  { to: '/app/properties', label: 'My Properties', Icon: Building2 },
  { to: '/app/reservations', label: 'Reservations', Icon: BedDouble },
]

export function RequireOwner({ children }: { children: ReactNode }) {
  const { user, owner, loading } = useSession()
  const loc = useLocation()
  if (loading) return <Spinner />
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(loc.pathname + loc.search)}`} replace />
  if (!owner) return <Spinner label="Setting up your account" />
  return <>{children}</>
}

function ProfileMenu() {
  const { owner, signOut } = useSession()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [pw, setPw] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const out = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false)
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', out)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', out)
      document.removeEventListener('keydown', esc)
    }
  }, [open])
  if (!owner) return null
  const first = owner.fullName.split(' ')[0]
  return (
    <div ref={box} className="relative">
      <button type="button" aria-expanded={open} aria-haspopup="menu" onClick={() => setOpen((o) => !o)} className={`flex min-h-12 items-center gap-3 rounded-lg px-2 transition-colors sm:px-3 ${open ? 'bg-pine-50' : 'hover:bg-paper'}`}>
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-pine-50 text-[17px] font-bold text-pine-900 ring-1 ring-pine-100">{first.charAt(0).toUpperCase()}</span>
        <span className="hidden text-[14px] font-bold text-ink-900 sm:inline">Hi, {first}</span>
        <ChevronDown className={`h-4 w-4 text-ink-700 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div role="menu" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }} className="absolute top-full right-0 z-50 mt-2 w-[290px] overflow-hidden rounded-xl bg-white shadow-lift ring-1 ring-line">
            <Link role="menuitem" to="/app/settings" onClick={() => setOpen(false)} className="flex items-center gap-3 bg-pine-50 px-4 py-4 no-underline hover:bg-pine-100">
              <CircleUserRound className="h-10 w-10 shrink-0 text-pine-800" strokeWidth={1.3} aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <strong className="block truncate text-[16px] text-ink-900">{owner.fullName}</strong>
                <span className="block truncate text-[13px] text-ink-500">{owner.role === 'Manager' ? 'Property manager' : 'Property owner'}</span>
              </span>
              <ChevronRight className="h-4 w-4 text-ink-500" aria-hidden="true" />
            </Link>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false)
                setPw(true)
              }}
              className="flex w-full items-center justify-between px-4 py-4 text-left text-[15px] font-bold text-ink-900 hover:bg-paper"
            >
              <span className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-ink-500" aria-hidden="true" /> Change password
              </span>
              <ChevronRight className="h-4 w-4 text-ink-500" aria-hidden="true" />
            </button>
            <div className="mx-4 border-t border-line" />
            <button
              type="button"
              role="menuitem"
              onClick={async () => {
                await signOut()
                navigate('/', { replace: true })
              }}
              className="w-full px-4 py-4 text-left text-[13px] font-black tracking-wider text-ink-900 hover:bg-paper"
            >
              LOGOUT
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      <ChangePassword open={pw} onClose={() => setPw(false)} />
    </div>
  )
}

export default function AppLayout() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [pathname])
  const wizard = /\/app\/properties\/[^/]+\/edit/.test(pathname)

  return (
    <RequireOwner>
      <div className="flex min-h-dvh flex-col bg-[#f1f3f1]">
        <header className="sticky top-0 z-40 flex h-[68px] items-center justify-between border-b border-line bg-white px-3 sm:px-5">
          <Link to="/app/properties" className="flex items-center gap-2 no-underline" aria-label={`${site.name} home`}>
            <Mark size={32} />
            <span className="text-[19px] font-black text-pine-900">{site.name}</span>
          </Link>
          <div className="flex items-center gap-3">
            {isDemoMode && <span className="hidden rounded-full bg-brass-50 px-3 py-1 text-[12px] font-bold text-brass-700 ring-1 ring-brass-200 md:inline">Demo mode</span>}
            <ProfileMenu />
          </div>
        </header>

        <div className={`flex flex-1 ${wizard ? '' : 'pb-20 md:pb-0'}`}>
          {!wizard && (
            <nav aria-label="Panel" className="sticky top-[68px] hidden h-[calc(100dvh-68px)] w-[92px] shrink-0 flex-col gap-2 border-r border-line bg-white p-2 md:flex">
              {nav.map(({ to, label, Icon }) => (
                <NavLink key={to} to={to} className={({ isActive }) => `flex flex-col items-center gap-1 rounded-lg px-1 py-2.5 text-center text-[12px] leading-tight font-bold no-underline transition-colors ${isActive ? 'bg-pine-50 text-pine-900 ring-1 ring-pine-100' : 'text-ink-700 hover:bg-paper'}`}>
                  <Icon className="h-6 w-6" strokeWidth={1.6} aria-hidden="true" />
                  {label}
                </NavLink>
              ))}
            </nav>
          )}
          <main id="main" className="min-w-0 flex-1">
            <Outlet />
          </main>
        </div>

        {!wizard && (
          <nav aria-label="Panel" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-2 border-t border-line bg-white pt-2 md:hidden" style={{ paddingBottom: 'calc(8px + env(safe-area-inset-bottom))' }}>
            {nav.map(({ to, label, Icon }) => (
              <NavLink key={to} to={to} className={({ isActive }) => `flex flex-col items-center gap-1 py-1 text-[12px] font-bold no-underline ${isActive ? 'text-pine-900' : 'text-ink-500'}`}>
                <Icon className="h-6 w-6" aria-hidden="true" />
                {label}
              </NavLink>
            ))}
          </nav>
        )}
      </div>
    </RequireOwner>
  )
}
