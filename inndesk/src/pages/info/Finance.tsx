import { AnimatePresence } from 'framer-motion'
import { CircleCheck, Landmark, Lock, ShieldCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CodeBoxes } from '../../components/Auth'
import { site } from '../../config/site'
import { VerificationList } from '../../components/Verification'
import { checkContactCode, CONTACT_CODE_LENGTH, sendContactCode, useVerifications, verifyPartner } from '../../lib/store'
import type { VerifyKind } from '../../lib/types'
import { btnOutline, btnSolid, Card, Dialog, PageTitle, type InfoProps } from './kit'

// Unlocked for the rest of this visit (until the page is reloaded).
const unlocked = new Set<string>()

const mask = (email: string) => email.replace(/^(.{2}).*(@.*)$/, (_, a, b) => `${a}${'*'.repeat(10)}${b}`)
const maskPhone = (p: string) => (p.length >= 4 ? `${p.slice(0, 4)}******` : p)

export default function Finance({ l, base }: InfoProps) {
  // Without the OTP service (live, before contact-otp is set up) the page opens for the signed-in owner.
  const [open, setOpen] = useState(site.contactOtp && !unlocked.has(l.id))
  const [ok, setOk] = useState(!site.contactOtp || unlocked.has(l.id))
  const [code, setCode] = useState('')
  const [err, setErr] = useState('')
  const [sent, setSent] = useState('')
  const [busy, setBusy] = useState(false)
  const g = l.legal
  const checks = useVerifications(l.id).data ?? []
  const bank = checks.find((v) => v.kind === 'bank')
  const [checking, setChecking] = useState<VerifyKind[]>([])
  const [checkErr, setCheckErr] = useState('')
  const recheck = async (k: VerifyKind) => {
    setChecking([k])
    setCheckErr('')
    try {
      await verifyPartner(l, [k])
    } catch (e) {
      setCheckErr(e instanceof Error ? e.message : 'Couldn’t run the check.')
    } finally {
      setChecking([])
    }
  }

  useEffect(() => {
    if (ok) return
    sendContactCode('email', l.basics.email)
      .then(() => setSent(`OTP has been sent to ${mask(l.basics.email)} ${maskPhone(l.basics.phone)}`))
      .catch((e) => setErr(e instanceof Error ? e.message : 'Couldn’t send the OTP.'))
  }, [ok, l.basics.email, l.basics.phone])

  const verify = async () => {
    setBusy(true)
    setErr('')
    try {
      await checkContactCode('email', l.basics.email, code)
      unlocked.add(l.id)
      setOk(true)
      setOpen(false)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'That OTP didn’t work.')
    } finally {
      setBusy(false)
    }
  }

  const Row = ({ k, v }: { k: string; v?: string | null }) => (
    <div className="grid grid-cols-[150px_1fr] gap-3 border-b border-line py-3 text-[14.5px] last:border-b-0 sm:grid-cols-[200px_1fr]">
      <dt className="text-ink-700">{k}</dt>
      <dd className="font-medium text-ink-900">{v?.trim() || <span className="font-normal text-ink-400">Not added</span>}</dd>
    </div>
  )

  return (
    <>
      <PageTitle title="Financial and Bank Details" l={l} />
      {!ok ? (
        <Card className="mt-6 flex flex-col items-center gap-3 px-4 py-16 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-pine-50 text-pine-800">
            <Lock className="h-7 w-7" aria-hidden="true" />
          </span>
          <strong className="text-[17px] font-semibold text-ink-900">Verify it’s you to see these details</strong>
          <p className="max-w-sm text-[14px] text-ink-700">Bank and tax details are protected with a one-time code.</p>
          <button type="button" onClick={() => setOpen(true)} className={btnSolid}>
            Enter OTP
          </button>
        </Card>
      ) : (
        <div className="mt-6 grid items-start gap-6 lg:grid-cols-[1fr_320px]">
          <div className="flex min-w-0 flex-col gap-5">
            <Card className="p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="flex items-center gap-2 text-[18px] font-semibold text-ink-900">
                  <ShieldCheck className="h-5 w-5 text-pine-800" aria-hidden="true" /> Tax details
                </h2>
                <Link to={`${base}/edit?step=legal&lsec=2`} className="text-[14px] font-semibold text-pine-800">
                  Edit
                </Link>
              </div>
              <dl className="mt-2">
                <Row k="Legal name" v={g.legalName} />
                <Row k="PAN" v={g.pan ? `${g.pan.slice(0, 2)}******${g.pan.slice(-2)}` : ''} />
                <Row k="GSTIN" v={g.hasGstin === false ? 'Not registered for GST' : g.gstin} />
                <Row k="MSME (Udyam)" v={g.msme ? g.udyam : g.msme === false ? 'Not an MSME' : ''} />
              </dl>
            </Card>
            <Card className="p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="flex items-center gap-2 text-[18px] font-semibold text-ink-900">
                  <Landmark className="h-5 w-5 text-pine-800" aria-hidden="true" /> Bank account for payouts
                </h2>
                <Link to={`${base}/edit?step=legal&lsec=1`} className="text-[14px] font-semibold text-pine-800">
                  Edit
                </Link>
              </div>
              <dl className="mt-2">
                <Row k="Account holder" v={g.payoutName || g.legalName} />
                <Row k="Bank" v={g.bankName} />
                <Row k="Account number" v={g.accountLast4 ? `•••• •••• ${g.accountLast4}` : ''} />
                <Row k="IFSC" v={g.ifsc} />
              </dl>
              {g.bankConsent && (
                <p className="mt-3 flex items-center gap-2 text-[13.5px] text-live">
                  <CircleCheck className="h-4 w-4" aria-hidden="true" /> ₹1 verification agreed
                </p>
              )}
            </Card>
          </div>
          <div className="flex flex-col gap-5">
            <Card className="p-4">
              <strong className="block text-[15px] font-semibold text-ink-900">Verification</strong>
              <p className="mt-0.5 text-[13px] text-ink-500">Checked automatically with the GST department, Income Tax records and your bank.</p>
              <VerificationList
                listingId={l.id}
                kinds={g.hasGstin === false ? ['pan', 'bank'] : ['gstin', 'pan', 'bank']}
                checking={checking}
                action={(k) =>
                  k === 'bank' ? (
                    <Link to={`${base}/edit?step=legal&lsec=1`} className="text-[13px] font-semibold text-pine-800">
                      Re-enter account
                    </Link>
                  ) : (
                    <button type="button" disabled={!!checking.length || (k === 'gstin' && !g.gstin)} onClick={() => recheck(k)} className="text-[13px] font-semibold text-pine-800 disabled:text-ink-400">
                      Check again
                    </button>
                  )
                }
              />
              {checkErr && <p className="mt-2 text-[13px] text-alert">{checkErr}</p>}
            </Card>
            <Card className="p-4 text-[14px] leading-relaxed text-ink-700">
              <strong className="block text-[15px] font-semibold text-ink-900">Payouts</strong>
              {!site.autoVerify || bank?.status === 'verified' ? `Payouts are sent ${site.payoutCycle}.` : <span className="text-alert">Payouts are on hold until your bank account is verified.</span>} Changing the bank account needs the new account to pass the ₹1 check before the next payout.
            </Card>
          </div>
        </div>
      )}

      <AnimatePresence>
        {open && !ok && (
          <Dialog
            title="Enter OTP"
            onClose={() => setOpen(false)}
            footer={
              <>
                <button type="button" onClick={() => setOpen(false)} className={btnOutline}>
                  Cancel
                </button>
                <button type="button" disabled={busy || code.length !== CONTACT_CODE_LENGTH} onClick={verify} className={btnSolid}>
                  {busy ? 'Checking…' : 'Verify'}
                </button>
              </>
            }
          >
            <p className="text-[14.5px] text-ink-700">Enter the {CONTACT_CODE_LENGTH}-digit code sent to your registered email ID &amp; phone number to verify:</p>
            <div className="mt-4">
              <CodeBoxes value={code} onChange={setCode} length={CONTACT_CODE_LENGTH} />
            </div>
            {err && <p className="mt-3 text-[13.5px] text-alert">{err}</p>}
            {sent && !err && <p className="mt-3 flex items-center gap-2 rounded-md bg-pine-50 px-3 py-2 text-[13px] text-pine-900"><CircleCheck className="h-4 w-4 shrink-0" aria-hidden="true" /> {sent}</p>}
          </Dialog>
        )}
      </AnimatePresence>
    </>
  )
}
