import { AnimatePresence } from 'framer-motion'
import { CreditCard, Plug } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useSession } from '../../context/Session'
import { site } from '../../config/site'
import { btnOutline, btnSolid, Card, Dialog, Field, inputCls, PageTitle, Tabs, type InfoProps } from './kit'

const managers = ['Aiosell', 'STAAH', 'eZee Centrix', 'AxisRooms', 'SiteMinder', 'RateGain', 'Djubo', 'Other']
// [LIVE] the access token must be issued by the server, not the browser.
const token = () => Array.from(crypto.getRandomValues(new Uint8Array(5)), (b) => b.toString(16).padStart(2, '0')).join('')

export default function Settings(props: InfoProps) {
  const [tab, setTab] = useState<'cm' | 'vcc'>('cm')
  return (
    <>
      <PageTitle title="Settings" l={props.l} />
      <Tabs
        id="settings"
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'cm', label: 'Channel Manager' },
          { id: 'vcc', label: 'VCC' },
        ]}
      />
      <div className="mt-6">{tab === 'cm' ? <ChannelManager {...props} /> : <Vcc {...props} />}</div>
    </>
  )
}

function ChannelManager({ l, commit }: InfoProps) {
  const { owner } = useSession()
  const [name, setName] = useState(managers[0])
  const [confirm, setConfirm] = useState(false)
  const b = l.basics
  const ch = l.channel
  const connected = !!(b.channelManager && b.channelManagerName && ch)
  const connect = () =>
    commit((x) => ({ ...x, basics: { ...x.basics, channelManager: true, channelManagerName: name }, channel: { token: token(), status: 'active', createdBy: owner?.email ?? x.basics.email, createdAt: new Date().toISOString() } }))
  const Row = ({ k, v }: { k: string; v: string }) => (
    <div className="grid grid-cols-[140px_1fr] gap-3 py-1.5 text-[14.5px] sm:grid-cols-[190px_1fr]">
      <dt className="font-medium text-ink-900">{k} :</dt>
      <dd className="break-all text-ink-900">{v}</dd>
    </div>
  )
  return (
    <>
      {connected ? (
        <Card className="p-4 sm:p-5">
          <h2 className="border-b border-line pb-3 text-[18px] font-semibold text-ink-900">Partners</h2>
          <dl className="mt-3">
            <Row k="Hotel code" v={l.id} />
            <Row k="Channel Manager" v={b.channelManagerName!} />
            <Row k="Access Token" v={ch!.token} />
            <Row k="Status" v={ch!.status === 'active' ? 'Active' : 'Inactive'} />
            <Row k="Created By User" v={ch!.createdBy} />
          </dl>
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" onClick={() => commit((x) => ({ ...x, channel: x.channel && { ...x.channel, status: x.channel.status === 'active' ? 'inactive' : 'active' } }))} className={btnOutline}>
              {ch!.status === 'active' ? 'Deactivate' : 'Activate'}
            </button>
            <button type="button" onClick={() => setConfirm(true)} className="inline-flex h-10 items-center rounded-lg bg-alert px-5 text-[14.5px] font-semibold text-white hover:opacity-90">
              Delete
            </button>
          </div>
          <p className="mt-4 text-[13px] text-ink-500">Give the hotel code and access token to {b.channelManagerName} to connect. While it is active, update rates and rooms in {b.channelManagerName}, not here.</p>
        </Card>
      ) : (
        <Card className="p-4 sm:p-5">
          <h2 className="flex items-center gap-2 text-[18px] font-semibold text-ink-900">
            <Plug className="h-5 w-5 text-pine-800" aria-hidden="true" /> Connect a channel manager
          </h2>
          <p className="mt-1 text-[14px] text-ink-700">A channel manager keeps your rates and rooms in step across {site.marketplace} and other sites.</p>
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <div className="w-full max-w-[300px]">
              <Field label="Channel manager" htmlFor="cm-name">
                <select id="cm-name" value={name} onChange={(e) => setName(e.target.value)} className={inputCls}>
                  {managers.map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
              </Field>
            </div>
            <button type="button" onClick={connect} className={btnSolid}>
              Connect
            </button>
          </div>
        </Card>
      )}
      <AnimatePresence>
        {confirm && (
          <Dialog
            title="Remove the channel manager?"
            onClose={() => setConfirm(false)}
            footer={
              <>
                <button type="button" onClick={() => setConfirm(false)} className={btnOutline}>
                  Keep it
                </button>
                <button
                  type="button"
                  onClick={() => {
                    commit((x) => ({ ...x, basics: { ...x.basics, channelManager: false, channelManagerName: '' }, channel: undefined }))
                    setConfirm(false)
                  }}
                  className="inline-flex h-10 items-center rounded-lg bg-alert px-5 text-[14.5px] font-semibold text-white"
                >
                  Remove
                </button>
              </>
            }
          >
            <p className="text-[14.5px] text-ink-700">{b.channelManagerName} will stop updating your rates and rooms on {site.marketplace}. You will need to manage them here.</p>
          </Dialog>
        )}
      </AnimatePresence>
    </>
  )
}

function Vcc({ base }: InfoProps) {
  return (
    <Card className="flex items-start gap-4 p-4 sm:p-5">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-pine-50 text-pine-800">
        <CreditCard className="h-5 w-5" aria-hidden="true" />
      </span>
      <div>
        <h2 className="text-[18px] font-semibold text-ink-900">Virtual credit card (VCC)</h2>
        <p className="mt-1 text-[14.5px] leading-relaxed text-ink-700">
          {site.marketplace} doesn’t pay with virtual cards. Money for prepaid bookings goes straight to your bank account {site.payoutCycle}.
        </p>
        <Link to={`${base}/info/finance`} className="mt-2 inline-block text-[14px] font-semibold text-pine-800">
          See bank details
        </Link>
      </div>
    </Card>
  )
}
