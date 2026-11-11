import { AnimatePresence, motion } from 'framer-motion'
import { BedDouble, Building2, ChevronDown, ChevronRight, CircleUserRound, KeyRound } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { site } from '../config/site'
import { useSession } from '../context/Session'
import { useListings } from '../lib/hooks'
import { propertyMenu, type MenuItem } from '../lib/propertyMenu'
import { isDemoMode } from '../lib/supabase'
import { ChangePassword } from './Auth'
import { NavIcon } from './navIcons'
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

/** Property menu item (desktop): picture + label; items with a list open a flyout to the right. */
function PropertySidebar({ items }: { items: MenuItem[] }) {
  const { pathname, search } = useLocation()
  const [fly, setFly] = useState<{ key: string; top: number } | null>(null)
  const timer = useRef<number | undefined>(undefined)
  const here = pathname + search
  useEffect(() => setFly(null), [here])
  useEffect(() => {
    if (!fly) return
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setFly(null)
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
  }, [fly])
  const isOn = (to: string, end?: boolean) => (end ? pathname === to.split('?')[0] : here === to || pathname.startsWith(to.split('?')[0] + '/') || pathname === to.split('?')[0])
  const open = (key: string, el: HTMLElement) => {
    window.clearTimeout(timer.current)
    const n = items.find((i) => i.key === key)?.links?.length ?? 0
    setFly({ key, top: Math.max(76, Math.min(el.getBoundingClientRect().top, window.innerHeight - (n * 46 + 24))) })
  }
  const later = () => {
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setFly(null), 180)
  }
  const tile = (on: boolean) => `relative flex w-full flex-col items-center gap-1 rounded-xl px-1 py-2 text-center text-[11.5px] leading-[1.2] no-underline transition-colors ${on ? 'bg-pine-50 font-bold text-pine-900 ring-1 ring-pine-100' : 'text-ink-700 hover:bg-paper'}`
  const badge = <span className="absolute top-0.5 right-2.5 rounded-full bg-gradient-to-r from-brass-500 to-[#e0794a] px-1.5 text-[9.5px] leading-4 font-bold text-white">new</span>
  const current = items.find((i) => i.key === fly?.key)
  return (
    <nav aria-label="Property menu" className="sticky top-[68px] hidden h-[calc(100dvh-68px)] w-[96px] shrink-0 flex-col gap-1 overflow-y-auto border-r border-line bg-white px-1.5 py-2 [scrollbar-width:none] md:flex print:hidden">
      <Link to="/app/properties" className="mb-1 flex items-center justify-center gap-1 rounded-lg py-1.5 text-[11.5px] font-semibold text-ink-500 no-underline hover:bg-paper hover:text-ink-900">
        <NavIcon name="back" className="h-4 w-4" /> All properties
      </Link>
      {items.map((i) => {
        const on = i.to ? isOn(i.to, i.end) : !!i.links?.some((x) => isOn(x.to))
        const inner = (
          <>
            {i.isNew && badge}
            <NavIcon name={i.icon} className="h-10 w-10" />
            <span>{i.label}</span>
            {i.links && <ChevronRight className="absolute top-3 right-1 h-3.5 w-3.5 text-ink-500" aria-hidden="true" />}
          </>
        )
        return (
          <div key={i.key} className={i.divider ? 'mt-1 border-t border-line pt-2' : ''}>
            {i.to ? (
              <Link to={i.to} className={tile(on)} aria-current={on ? 'page' : undefined}>
                {inner}
              </Link>
            ) : (
              <button type="button" aria-haspopup="menu" aria-expanded={fly?.key === i.key} onClick={(e) => (fly?.key === i.key ? setFly(null) : open(i.key, e.currentTarget))} onMouseEnter={(e) => open(i.key, e.currentTarget)} onMouseLeave={later} className={`${tile(on || fly?.key === i.key)}`}>
                {inner}
              </button>
            )}
          </div>
        )
      })}
      <AnimatePresence>
        {current?.links && fly && (
          <motion.div role="menu" initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -6 }} transition={{ duration: 0.13 }} onMouseEnter={() => window.clearTimeout(timer.current)} onMouseLeave={later} style={{ top: fly.top }} className="fixed left-[100px] z-50 w-[250px] rounded-xl bg-white py-2 shadow-[0_14px_36px_-10px_rgba(18,55,42,0.3)] ring-1 ring-line">
            {current.links.map((x) => (
              <Link key={x.label} role="menuitem" to={x.to} className={`flex items-start gap-2 px-4 py-2.5 text-[14.5px] no-underline hover:bg-pine-50 ${isOn(x.to) ? 'font-semibold text-pine-900' : 'text-ink-900'}`}>
                <span className="min-w-0 flex-1">
                  {x.label}
                  {x.sub && <span className="block text-[13px] text-ink-500">{x.sub}</span>}
                </span>
                {x.isNew && <span className="mt-0.5 rounded-full bg-gradient-to-r from-brass-500 to-[#e0794a] px-1.5 text-[9.5px] leading-4 font-bold text-white">new</span>}
              </Link>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  )
}

/** Phone: Home, Bookings, Analytics and a Menu sheet with everything else. */
function PropertyBottomBar({ items }: { items: MenuItem[] }) {
  const { pathname, search } = useLocation()
  const [sheet, setSheet] = useState(false)
  useEffect(() => setSheet(false), [pathname, search])
  const main = items.filter((i) => ['home', 'bookings', 'analytics'].includes(i.key))
  return (
    <>
      <nav aria-label="Property menu" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-line bg-white pt-1.5 md:hidden print:hidden" style={{ paddingBottom: 'calc(6px + env(safe-area-inset-bottom))' }}>
        {main.map((i) => {
          const on = i.end ? pathname === i.to : pathname.startsWith(i.to!)
          return (
            <Link key={i.key} to={i.to!} className={`flex flex-col items-center gap-0.5 text-[11.5px] font-semibold no-underline ${on ? 'text-pine-900' : 'text-ink-500'}`}>
              <NavIcon name={i.icon} className="h-7 w-7" />
              {i.label}
            </Link>
          )
        })}
        <button type="button" onClick={() => setSheet(true)} className="flex flex-col items-center gap-0.5 text-[11.5px] font-semibold text-ink-500">
          <NavIcon name="more" className="h-7 w-7" />
          Menu
        </button>
      </nav>
      <AnimatePresence>
        {sheet && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-ink-900/40 md:hidden" onClick={() => setSheet(false)} />
            <motion.div role="dialog" aria-label="Property menu" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 300 }} className="fixed inset-x-0 bottom-0 z-50 max-h-[85dvh] overflow-y-auto rounded-t-2xl bg-white px-4 pt-3 pb-8 md:hidden">
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line-strong" />
              <Link to="/app/properties" className="mb-2 flex items-center gap-2 text-[14px] font-semibold text-ink-500 no-underline">
                <NavIcon name="back" className="h-4 w-4" /> All properties
              </Link>
              {items.map((i) => (
                <div key={i.key} className="border-t border-line py-2">
                  {i.to ? (
                    <Link to={i.to} className="flex items-center gap-3 py-1.5 text-[15.5px] font-semibold text-ink-900 no-underline">
                      <NavIcon name={i.icon} className="h-8 w-8" /> {i.label}
                      {i.isNew && <span className="rounded-full bg-gradient-to-r from-brass-500 to-[#e0794a] px-1.5 text-[10px] leading-4 font-bold text-white">new</span>}
                    </Link>
                  ) : (
                    <>
                      <span className="flex items-center gap-3 py-1.5 text-[15.5px] font-semibold text-ink-900">
                        <NavIcon name={i.icon} className="h-8 w-8" /> {i.label}
                      </span>
                      <div className="ml-11 flex flex-col">
                        {i.links!.map((x) => (
                          <Link key={x.label} to={x.to} className="flex items-center gap-2 py-1.5 text-[14.5px] text-ink-700 no-underline">
                            {x.label}
                            {x.sub && <span className="text-ink-500">· {x.sub}</span>}
                            {x.isNew && <span className="rounded-full bg-gradient-to-r from-brass-500 to-[#e0794a] px-1.5 text-[10px] leading-4 font-bold text-white">new</span>}
                          </Link>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

export default function AppLayout() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [pathname])
  const wizard = /\/app\/properties\/[^/]+\/edit/.test(pathname)
  // Inside one property: the full property menu (Home, Bookings, … Help Centre).
  const prop = pathname.match(/^\/app\/properties\/([^/]+)(?:\/(?:analytics|reservations|section\/[^/]+))?\/?$/)?.[1]
  const pmenu = prop ? propertyMenu(prop) : null
  const { data } = useListings()
  const pl = prop ? data?.find((x) => x.id === prop) : undefined

  return (
    <RequireOwner>
      <div className="flex min-h-dvh flex-col bg-[#f1f3f1]">
        <header className="sticky top-0 z-40 flex h-[68px] items-center justify-between gap-3 border-b border-line bg-white px-3 sm:px-5 print:hidden">
          <div className="flex min-w-0 items-center gap-4">
            <Link to="/app/properties" className="flex shrink-0 items-center gap-2 no-underline" aria-label={`${site.name} home`}>
              <Mark size={32} />
              <span className={`text-[19px] font-black text-pine-900 ${pl ? 'hidden sm:inline' : ''}`}>{site.name}</span>
            </Link>
            {pl && (
              <div className="min-w-0 border-l border-line pl-4">
                <strong className="block truncate text-[15.5px] font-bold text-ink-900">{pl.basics.name.trim() || 'Unnamed property'}</strong>
                <span className="block truncate text-[13px] text-ink-500">
                  {[pl.basics.stars ? `${pl.basics.stars}-star ${pl.basics.propertyType.toLowerCase()}` : pl.basics.propertyType, [pl.location.area, pl.location.city].filter(Boolean).join(', ')].filter(Boolean).join(' | ')}
                </span>
              </div>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-3">
            {isDemoMode && <span className="hidden rounded-full bg-brass-50 px-3 py-1 text-[12px] font-bold text-brass-700 ring-1 ring-brass-200 md:inline">Demo mode</span>}
            <ProfileMenu />
          </div>
        </header>

        <div className={`flex flex-1 ${wizard ? '' : 'pb-20 md:pb-0'}`}>
          {!wizard && pmenu && <PropertySidebar items={pmenu} />}
          {!wizard && !pmenu && (
            <nav aria-label="Panel" className="sticky top-[68px] hidden h-[calc(100dvh-68px)] w-[92px] shrink-0 flex-col gap-2 border-r border-line bg-white p-2 md:flex print:hidden">
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

        {!wizard && pmenu && <PropertyBottomBar items={pmenu} />}
        {!wizard && !pmenu && (
          <nav aria-label="Panel" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-2 border-t border-line bg-white pt-2 md:hidden print:hidden" style={{ paddingBottom: 'calc(8px + env(safe-area-inset-bottom))' }}>
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
