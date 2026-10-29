import { features } from '../config/launch'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { displayName } from '../lib/names'
import { demoCompany, newCompany, type Company, type Employee } from '../data/business'
import { useAuth } from './AuthContext'

/*
 * Personal / Business account switch and company accounts.
 * Until company accounts live in the database, companies and the email → company link are kept
 * in this browser. "Northwind Logistics" is a sample company anyone can explore.
 */

export type AccountMode = 'personal' | 'business'

interface AccountState {
  /** The company the signed-in user belongs to, if any. */
  company: Company | null
  /** The signed-in user as a company member. */
  me: Employee | null
  isAdmin: boolean
  mode: AccountMode
  /** True when signed in, linked to a company and the Business account is switched on. */
  isBusiness: boolean
  /** True if this email has already been set up for business. */
  hasCompanyFor: (email: string) => boolean
  switchTo: (mode: AccountMode) => void
  /** Links an email to a company (the sample company by default) and switches to Business. */
  linkCompany: (email: string, companyId?: string) => void
  /** Creates a new company with the signed-in user as admin and switches to Business. */
  createCompany: (email: string, companyName: string) => void
  updateCompany: (patch: Partial<Company> | ((c: Company) => Company)) => void
}

const LINKS = 'stayeasy.business.links'
const COMPANIES = 'stayeasy.business.companies'
const MODE = 'stayeasy.account.mode'

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}
function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* storage blocked — changes last for this visit */
  }
}

const memberFor = (email: string): Employee => ({
  id: email.toLowerCase(),
  name: displayName(email),
  email: email.toLowerCase(),
  team: 'Management',
  role: 'admin',
})

const AccountContext = createContext<AccountState | null>(null)

export function AccountProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [links, setLinks] = useState<Record<string, string>>(() => read(LINKS, {}))
  const [companies, setCompanies] = useState<Record<string, Company>>(() => read(COMPANIES, {}))
  const [mode, setMode] = useState<AccountMode>(() => read<AccountMode>(MODE, 'personal'))

  const email = user?.email.toLowerCase() ?? ''
  const companyId = email ? links[email] : undefined
  const company = companyId ? (companies[companyId] ?? (companyId === demoCompany.id ? demoCompany : null)) : null
  const me = company?.employees.find((e) => e.email.toLowerCase() === email) ?? null

  // Older links (made before roles existed): add the user to their company as an admin.
  useEffect(() => {
    if (company && email && !me) {
      const next = { ...company, employees: [memberFor(email), ...company.employees] }
      setCompanies((prev) => {
        const all = { ...prev, [company.id]: next }
        write(COMPANIES, all)
        return all
      })
    }
  }, [company, email, me])

  // Signing out always drops back to the personal site.
  useEffect(() => {
    if (!user && mode !== 'personal') {
      setMode('personal')
      write(MODE, 'personal')
    }
  }, [user, mode])

  const saveCompany = useCallback((c: Company) => {
    setCompanies((prev) => {
      const next = { ...prev, [c.id]: c }
      write(COMPANIES, next)
      return next
    })
  }, [])

  const switchTo = useCallback((m: AccountMode) => {
    setMode(m)
    write(MODE, m)
  }, [])

  const link = useCallback((addr: string, id: string) => {
    setLinks((prev) => {
      const next = { ...prev, [addr]: id }
      write(LINKS, next)
      return next
    })
    setMode('business')
    write(MODE, 'business')
  }, [])

  const linkCompany = useCallback(
    (addr: string, id = demoCompany.id) => {
      const key = addr.trim().toLowerCase()
      const base = companies[id] ?? (id === demoCompany.id ? demoCompany : null)
      if (base && !base.employees.some((e) => e.email.toLowerCase() === key)) saveCompany({ ...base, employees: [memberFor(key), ...base.employees] })
      link(key, id)
    },
    [companies, link, saveCompany],
  )

  const createCompany = useCallback(
    (addr: string, name: string) => {
      const key = addr.trim().toLowerCase()
      const c = newCompany(name, memberFor(key))
      saveCompany(c)
      link(key, c.id)
    },
    [link, saveCompany],
  )

  const updateCompany = useCallback(
    (patch: Partial<Company> | ((c: Company) => Company)) => {
      if (!company) return
      saveCompany(typeof patch === 'function' ? patch(company) : { ...company, ...patch })
    },
    [company, saveCompany],
  )

  const hasCompanyFor = useCallback((addr: string) => !!links[addr.trim().toLowerCase()], [links])

  const value = useMemo<AccountState>(
    () => ({
      company,
      me,
      isAdmin: me?.role === 'admin',
      mode,
      isBusiness: features.business && !!company && mode === 'business',
      hasCompanyFor,
      switchTo,
      linkCompany,
      createCompany,
      updateCompany,
    }),
    [company, me, mode, hasCompanyFor, switchTo, linkCompany, createCompany, updateCompany],
  )

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAccount() {
  const ctx = useContext(AccountContext)
  if (!ctx) throw new Error('useAccount must be used inside <AccountProvider>')
  return ctx
}
