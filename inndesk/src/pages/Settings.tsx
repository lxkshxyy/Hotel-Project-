import { useEffect, useState, type FormEvent } from 'react'
import { Notice, PageHead, Toggle } from '../components/ui'
import { site } from '../config/site'
import { useSession } from '../context/Session'
import { gstinError } from '../lib/gstin'
import { isDemoMode } from '../lib/supabase'
import type { Owner } from '../lib/types'

export default function Settings() {
  const { owner, user, saveOwner } = useSession()
  const [f, setF] = useState<Owner | null>(owner)
  const [msg, setMsg] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)
  useEffect(() => setF(owner), [owner])
  if (!f) return null

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (f.fullName.trim().length < 2) return setMsg({ tone: 'error', text: 'Enter your full name.' })
    if (!/^[6-9]\d{9}$/.test(f.phone)) return setMsg({ tone: 'error', text: 'Enter a 10-digit mobile number.' })
    if (f.gstin && gstinError(f.gstin)) return setMsg({ tone: 'error', text: `GSTIN: ${gstinError(f.gstin)}` })
    try {
      await saveOwner({ ...f, fullName: f.fullName.trim(), businessName: f.businessName.trim() })
      setMsg({ tone: 'ok', text: 'Settings saved.' })
    } catch (err) {
      setMsg({ tone: 'error', text: err instanceof Error ? err.message : 'Couldn’t save.' })
    }
  }

  return (
    <div className="container-page flex max-w-3xl flex-col gap-6 pt-8">
      <PageHead title="Settings" intro="Your account details and how we contact you." />
      <form onSubmit={submit} noValidate className="flex flex-col gap-6">
        <section className="panel flex flex-col gap-4 p-6">
          <h2 className="text-xl font-bold text-pine-950">Account</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="label">
              Full name
              <input className="field" value={f.fullName} onChange={(e) => setF({ ...f, fullName: e.target.value })} />
            </label>
            <label className="label">
              Mobile number
              <input className="field" inputMode="numeric" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })} />
            </label>
            <label className="label">
              Email (sign-in)
              <input className="field bg-paper" value={user?.email ?? ''} readOnly />
            </label>
            <label className="label">
              Role
              <select className="field" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value as Owner['role'] })}>
                <option>Owner</option>
                <option>Manager</option>
              </select>
            </label>
            <label className="label">
              Business name
              <input className="field" value={f.businessName} onChange={(e) => setF({ ...f, businessName: e.target.value })} />
            </label>
            <label className="label">
              GSTIN
              <input className="field uppercase" maxLength={15} value={f.gstin} onChange={(e) => setF({ ...f, gstin: e.target.value.toUpperCase() })} />
            </label>
          </div>
        </section>
        <section className="panel flex flex-col gap-3 p-6">
          <h2 className="text-xl font-bold text-pine-950">New booking alerts</h2>
          <Toggle checked={f.notify.email} onChange={(v) => setF({ ...f, notify: { ...f.notify, email: v } })} label="Email" hint={user?.email} />
          <Toggle checked={f.notify.whatsapp} onChange={(v) => setF({ ...f, notify: { ...f.notify, whatsapp: v } })} label="WhatsApp" hint={`+91 ${f.phone}`} />
          <Toggle checked={f.notify.sms} onChange={(v) => setF({ ...f, notify: { ...f.notify, sms: v } })} label="SMS" hint={`+91 ${f.phone}`} />
          <p className="text-[13px] text-ink-500">Alerts start once email, WhatsApp and SMS sending are connected.</p>
        </section>
        {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
        <button type="submit" className="btn-primary self-start">
          Save settings
        </button>
      </form>
      <section className="panel flex flex-col gap-2 p-6 text-[15px]">
        <h2 className="text-xl font-bold text-pine-950">Connection</h2>
        <span>
          Publishes to <strong>{site.mainSiteUrl}</strong>
        </span>
        <span className="text-ink-500">{isDemoMode ? 'Local demo mode: your properties and photos are stored in this browser and sent to TRPotels on this computer.' : 'Live mode: data is stored in the shared TRPotels database.'}</span>
      </section>
    </div>
  )
}
