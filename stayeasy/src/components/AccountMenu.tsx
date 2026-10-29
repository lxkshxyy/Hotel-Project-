import { AnimatePresence, motion } from 'framer-motion'
import { Briefcase, Check, ChevronDown, LifeBuoy, LogOut, Plus, ShieldCheck, User, Wallet } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { features } from '../config/launch'
import { useAccount } from '../context/AccountContext'
import { useAuth } from '../context/AuthContext'
import { initials } from '../lib/names'
import { useProfile } from '../lib/profile'

export { displayName, initials } from '../lib/names'

/** PERSONAL | BUSINESS pill switch, like the big travel sites. */
export function ModeToggle({ small = false }: { small?: boolean }) {
  const { user } = useAuth()
  const { company, isBusiness, switchTo } = useAccount()
  const navigate = useNavigate()
  if (!user || !features.business) return null
  const go = (biz: boolean) => {
    if (biz && !company) return navigate('/login?type=business&next=/biz')
    switchTo(biz ? 'business' : 'personal')
    navigate(biz ? '/biz' : '/')
  }
  const btn = (on: boolean) =>
    `rounded-full font-black tracking-wide uppercase transition-colors ${small ? 'px-2.5 py-1 text-[10px]' : 'px-3.5 py-1.5 text-[11px]'} ${on ? 'bg-ember-600 text-white shadow-sm' : 'text-ink-700 hover:text-navy-800'}`
  return (
    <div role="radiogroup" aria-label="Account type" className="flex items-center rounded-full bg-white p-1 ring-1 ring-line-strong">
      <button type="button" role="radio" aria-checked={!isBusiness} className={btn(!isBusiness)} onClick={() => go(false)}>
        Personal
      </button>
      <button type="button" role="radio" aria-checked={isBusiness} className={btn(isBusiness)} onClick={() => go(true)}>
        Business
      </button>
    </div>
  )
}

function Item({ to, icon, title, desc, onClick }: { to: string; icon: ReactNode; title: string; desc?: string; onClick: () => void }) {
  return (
    <Link role="menuitem" to={to} onClick={onClick} className="flex items-start gap-3 rounded-xl px-3 py-2.5 text-ink-900 no-underline hover:bg-mist">
      <span className="mt-0.5 text-ink-500">{icon}</span>
      <span className="flex flex-col">
        <strong className="text-[15px]">{title}</strong>
        {desc && <span className="text-[12.5px] leading-snug text-ink-500">{desc}</span>}
      </span>
    </Link>
  )
}

/** Profile button: account switch plus the menu for the current account. */
export default function AccountMenu({ compact = false }: { compact?: boolean }) {
  const { user, signOut } = useAuth()
  const { company, isBusiness, isAdmin, switchTo } = useAccount()
  const { profile, name } = useProfile()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (!user) return null
  const close = () => setOpen(false)
  const pick = (m: 'personal' | 'business') => {
    close()
    switchTo(m)
    navigate(m === 'business' ? '/biz' : '/')
  }
  const row = (on: boolean) =>
    `flex min-h-11 w-full items-center gap-3 rounded-[10px] border p-2.5 text-left ${on ? 'border-line-strong bg-navy-50' : 'border-transparent bg-white hover:bg-mist'}`
  const avatar = profile.photo ? (
    <img src={profile.photo} alt="" className="h-8 w-8 rounded-full object-cover" />
  ) : (
    <span className={`flex h-8 w-8 items-center justify-center rounded-full text-[13px] font-extrabold ${isBusiness ? 'bg-ember-600 text-white' : 'bg-navy-100 text-navy-800'}`}>{initials(name)}</span>
  )

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-11 items-center gap-2.5 rounded-xl border border-line-strong bg-white py-1.5 pr-3 pl-1.5 text-ink-900"
      >
        {avatar}
        {!compact && (
          <span className="flex flex-col items-start leading-tight">
            <strong className="text-sm whitespace-nowrap">Hi {name.split(' ')[0]}</strong>
            <span className="max-w-[130px] truncate text-xs text-ink-500">{isBusiness && company ? company.name : 'Personal account'}</span>
          </span>
        )}
        <ChevronDown className="h-4 w-4 text-ink-700" aria-hidden="true" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 z-50 mt-2 flex max-h-[80dvh] w-[340px] max-w-[calc(100vw-32px)] flex-col gap-0.5 overflow-y-auto rounded-2xl border border-line-strong bg-white p-2 shadow-float"
          >
            <p className="px-3 pt-2 pb-1 text-[12.5px] text-ember-600">
              You are viewing your {isBusiness ? 'Business' : 'Personal'} profile {user.email}
              {!isBusiness && (
                <Link to="/account" onClick={close} className="ml-1 font-bold text-navy-800">
                  · Edit profile
                </Link>
              )}
            </p>
            {/* Business: only account-level items. Trips, requests and reports are already in the header.
                Personal: everything is in the header, so the menu only switches account and signs out. */}
            {isBusiness && (
              <>
                <Item to="/biz/admin" onClick={close} icon={<ShieldCheck className="h-5 w-5" />} title="Admin Settings" desc={isAdmin ? 'Verify the company, travel policy, people and invoices.' : 'Company settings (view only).'} />
                <Item to="/biz/admin?tab=wallet" onClick={close} icon={<Wallet className="h-5 w-5" />} title="Company Wallet" desc="Balance, milestone rewards and statement." />
                <Item to="/biz/profile" onClick={close} icon={<User className="h-5 w-5" />} title="My Profile" desc="Your details, preferences and co-travellers." />
                <Item to="/help" onClick={close} icon={<LifeBuoy className="h-5 w-5" />} title="Support" desc="Business support, 24/7." />
              </>
            )}
            {features.business && (<>
            <span className={`px-3 pt-2.5 pb-1 text-xs font-bold tracking-[0.06em] text-ink-500 ${isBusiness ? 'mt-1 border-t border-line' : ''}`}>SWITCH ACCOUNT</span>
            <button type="button" role="menuitemradio" aria-checked={!isBusiness} className={row(!isBusiness)} onClick={() => pick('personal')}>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-navy-100 text-navy-800">
                <User className="h-[18px] w-[18px]" aria-hidden="true" />
              </span>
              <span className="flex flex-1 flex-col">
                <strong className="text-sm">Personal</strong>
                <span className="text-[12.5px] text-ink-500">Member prices · Club points</span>
              </span>
              {!isBusiness && <Check className="h-[18px] w-[18px] text-leaf-700" strokeWidth={2.5} aria-hidden="true" />}
            </button>
            {company ? (
              <button type="button" role="menuitemradio" aria-checked={isBusiness} className={row(isBusiness)} onClick={() => pick('business')}>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-navy-800 text-white">
                  <Briefcase className="h-[18px] w-[18px]" aria-hidden="true" />
                </span>
                <span className="flex flex-1 flex-col">
                  <strong className="text-sm">{company.name}</strong>
                  <span className="text-[12.5px] text-ink-500">Business account{company.verified ? ' · Verified' : ' · Not verified'}</span>
                </span>
                {isBusiness && <Check className="h-[18px] w-[18px] text-leaf-700" strokeWidth={2.5} aria-hidden="true" />}
              </button>
            ) : (
              <Link role="menuitem" to="/login?type=business&next=/biz" className={`${row(false)} text-ink-900 no-underline`} onClick={close}>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-dashed border-line-strong text-navy-800">
                  <Plus className="h-[18px] w-[18px]" aria-hidden="true" />
                </span>
                <span className="flex flex-1 flex-col">
                  <strong className="text-sm">Add a business account</strong>
                  <span className="text-[12.5px] text-ink-500">Sign in with your work email</span>
                </span>
              </Link>
            )}
            </>)}
            <button
              type="button"
              role="menuitem"
              className="mt-1 flex items-center gap-2 rounded-lg border-t border-line px-3 py-2.5 text-left text-sm text-ink-700 hover:bg-mist"
              onClick={async () => {
                close()
                await signOut()
                navigate('/')
              }}
            >
              <LogOut className="h-4 w-4" aria-hidden="true" /> Sign out
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
