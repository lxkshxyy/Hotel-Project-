import { AnimatePresence, motion } from 'framer-motion'
import { BadgeCheck, ChevronDown, LockKeyhole, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useAccount } from '../../context/AccountContext'
import { orgIdTypes, validateOrgId, type OrgIdType } from '../../lib/orgVerify'
import { isDemoMode } from '../../lib/supabase'

/** Made-up IDs that pass the format and check-digit tests. Only offered in demo mode. */
const DEMO_IDS: Record<OrgIdType, string> = { GSTIN: '07ABCDE1234F1Z2', UDYAM: 'UDYAM-DL-07-0012345', NGO: 'DL/2019/0234567' }

/** GSTIN / Udyam / NGO ID input with a VERIFY button. Saves the result on the company. */
export function VerifyForm({ compact = false, onDone }: { compact?: boolean; onDone?: () => void }) {
  const { company, isAdmin, updateCompany } = useAccount()
  const [type, setType] = useState<OrgIdType>('GSTIN')
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const meta = orgIdTypes.find((t) => t.type === type)!

  if (!company) return null
  if (!isAdmin)
    return <p className="rounded-xl bg-[#FFF4EC] p-3 text-sm text-[#7C2D12]">Only a company admin can verify {company.name}. Ask your travel admin to add the company GSTIN.</p>

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const r = validateOrgId(type, value)
    if (!r.ok) return setError(r.error)
    updateCompany((c) => ({ ...c, verified: true, gstin: type === 'GSTIN' ? r.value : c.gstin, verifiedVia: { type, value: r.value, note: r.note, at: new Date().toISOString() } }))
    setOk(r.note)
    setTimeout(() => onDone?.(), 900)
  }

  if (ok)
    return (
      <p className="flex items-center gap-2 rounded-xl bg-leaf-50 p-3 text-sm font-semibold text-leaf-800">
        <BadgeCheck className="h-5 w-5" aria-hidden="true" /> {company.name} is verified · {ok}
      </p>
    )

  return (
    <form onSubmit={submit} className="flex flex-col gap-2" noValidate>
      {!compact && <span className="text-sm font-bold">Enter Company GSTIN No./ Udyam ID/ NGO ID</span>}
      <div className={`flex overflow-hidden rounded-xl border bg-white ${error ? 'border-ember-600' : 'border-line-strong'} focus-within:border-navy-800`}>
        <label className="relative flex items-center bg-[#FFF4EC]">
          <span className="sr-only">ID type</span>
          <select
            value={type}
            onChange={(e) => {
              setType(e.target.value as OrgIdType)
              setError('')
            }}
            className="h-12 appearance-none bg-transparent pr-7 pl-3 text-sm font-black text-ink-900 outline-none"
          >
            {orgIdTypes.map((t) => (
              <option key={t.type} value={t.type}>
                {t.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 h-4 w-4 text-ember-600" aria-hidden="true" />
        </label>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value.toUpperCase())}
          placeholder={meta.placeholder.replace(/[A-Z0-9]/g, 'X')}
          aria-label={meta.label}
          aria-invalid={!!error}
          maxLength={24}
          className="h-12 min-w-0 flex-1 px-3 font-mono text-[15px] tracking-wider uppercase outline-none"
        />
        {compact && (
          <button type="submit" className="px-4 text-sm font-black text-ember-600">
            VERIFY
          </button>
        )}
      </div>
      <span className="text-xs text-ink-500">{meta.hint}</span>
      {isDemoMode && (
        <span className="text-xs text-ink-500">
          Demo mode · test {meta.label.replace(' No.', '')}: <strong className="font-mono text-ink-900">{DEMO_IDS[type]}</strong>{' '}
          <button
            type="button"
            className="font-bold text-ember-600 underline"
            onClick={() => {
              setValue(DEMO_IDS[type])
              setError('')
            }}
          >
            Use it
          </button>
        </span>
      )}
      {error && (
        <p role="alert" className="text-sm font-semibold text-ember-600">
          {error}
        </p>
      )}
      {!compact && (
        <button type="submit" className="btn-primary min-h-12 rounded-xl text-base font-black tracking-wide uppercase">
          Verify now
        </button>
      )}
    </form>
  )
}

/** "Your Organisation is Not Verified" popup shown when an unverified company opens a locked area. */
export function VerifyOrgModal({ open, onClose, reason }: { open: boolean; onClose: () => void; reason?: string }) {
  useEffect(() => {
    if (!open) return
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
  }, [open, onClose])
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="verify-h"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-navy-950/55 p-4"
        >
          <motion.div initial={{ scale: 0.96, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96 }} onClick={(e) => e.stopPropagation()} className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <button type="button" aria-label="Close" onClick={onClose} className="absolute top-3 right-3 flex h-10 w-10 items-center justify-center rounded-full bg-mist hover:bg-line">
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
            <div className="flex items-start justify-between gap-4 pr-10">
              <h2 id="verify-h" className="text-[26px] leading-tight font-black">
                Your Organisation is <span className="text-ember-600">Not Verified</span>
              </h2>
              <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-mist">
                <LockKeyhole className="h-8 w-8 text-ember-600" aria-hidden="true" />
              </span>
            </div>
            <p className="mt-3 text-[15px] text-ink-700">{reason ?? 'You need to verify your organisation to get admin access and take control of your organisation’s travel expenses.'}</p>
            <div className="mt-4">
              <VerifyForm onDone={onClose} />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
