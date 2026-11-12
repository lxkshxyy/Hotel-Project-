import { Copy, ExternalLink, Lightbulb, List, ListOrdered, Mail, MapPin, Phone } from 'lucide-react'
import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { groups } from '../../components/PropertyTypePicker'
import { site } from '../../config/site'
import { areaCls, Card, Field, inputCls, PageTitle, Radio, Tabs, type InfoProps } from './kit'

const years = Array.from({ length: new Date().getFullYear() - 1899 }, (_, i) => new Date().getFullYear() - i)
const chains = ['Independent property (no chain)', 'IHCL (Taj, Vivanta, Ginger)', 'ITC Hotels', 'Lemon Tree Hotels', 'Sarovar Hotels', 'Radisson Hotel Group', 'Marriott International', 'Hyatt', 'Accor', 'Wyndham', 'Royal Orchid Hotels', 'The Park Hotels', 'Treebo', 'FabHotels', 'OYO', 'Other chain']
const vehicleTypes: [string, string][] = [
  ['Hatchback / Sedan', 'Standard car with low ground clearance'],
  ['SUV', 'High ground clearance, recommended for rough roads, 6–7 seater'],
  ['Tempo Traveller', 'Group vehicle, 9–12 seater'],
  ['Mini Bus', 'Large group vehicle, 15+ seater'],
]
const sample = `1. From Gwalior Railway Station, take the Station Road towards Phool Bagh (about 2 km).
2. At Phool Bagh crossing, turn right towards Lashkar; you will pass the Jai Vilas Palace on your left.
3. After 600 m, take the second left after the State Bank of India branch.
4. The hotel is the cream building on the right, opposite Hari Om Medical Store. Parking is at the back gate.`

type Tab = 'details' | 'contact' | 'reach'

export default function Basics(props: InfoProps) {
  const [tab, setTab] = useState<Tab>('details')
  return (
    <>
      <PageTitle title="Basic Information" l={props.l} />
      <Tabs
        id="basics"
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'details', label: 'Property Details' },
          { id: 'contact', label: 'Property Contact Details' },
          { id: 'reach', label: 'How to Reach', isNew: true },
        ]}
      />
      <div className="mt-6">{tab === 'details' ? <Details {...props} /> : tab === 'contact' ? <Contact {...props} /> : <Reach {...props} />}</div>
    </>
  )
}

function Details({ l, set }: InfoProps) {
  const b = l.basics
  const put = (patch: Partial<typeof b>) => set((x) => ({ ...x, basics: { ...x.basics, ...patch } }))
  const words = b.description.trim() ? b.description.trim().split(/\s+/).length : 0
  const rooms = l.rooms.reduce((n, r) => n + (r.count || 0), 0)
  const types = groups.find((g) => g.id === b.category)?.common.concat(groups.find((g) => g.id === b.category)?.others ?? []) ?? groups.flatMap((g) => [...g.common, ...g.others])
  const num = (v: string) => (v === '' ? undefined : Math.max(0, Math.min(999, Math.floor(Number(v)) || 0)))
  return (
    <Card className="p-4 sm:p-6">
      <div className="grid gap-x-10 gap-y-5 md:grid-cols-2">
        <Field label="Property Name" required hint="As on your registration documents. Contact support to change it." htmlFor="b-name">
          <input id="b-name" value={b.name} disabled className={inputCls} />
        </Field>
        <Field label="Display Name" required hint="The name guests see on the site." htmlFor="b-display">
          <input id="b-display" value={b.displayName ?? b.name} maxLength={80} onChange={(e) => put({ displayName: e.target.value })} className={inputCls} />
        </Field>
        <Field label="Property Description (In 100–500 words)" error={words > 0 && (words < 100 || words > 500) ? `${words} words. Write between 100 and 500.` : undefined} hint={`${words} words`} htmlFor="b-desc">
          <textarea id="b-desc" rows={4} value={b.description} onChange={(e) => put({ description: e.target.value })} className={`${areaCls} resize-y`} />
        </Field>
        <Field label="Property Type" htmlFor="b-type">
          <select id="b-type" value={b.propertyType} onChange={(e) => put({ propertyType: e.target.value })} className={inputCls}>
            {!types.some((t) => t.name === b.propertyType) && <option value={b.propertyType}>{b.propertyType}</option>}
            {types.map((t) => (
              <option key={t.name} value={t.name}>
                {t.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Star Rating" required hint="Changing the star rating needs a document check. Contact support." htmlFor="b-stars">
          <input id="b-stars" value={b.stars ? `${b.stars}` : 'Not rated'} disabled className={inputCls} />
        </Field>
        <Field label="Name of the hotel chain that your property belongs to" htmlFor="b-chain">
          <select id="b-chain" value={b.chain ?? ''} onChange={(e) => put({ chain: e.target.value || undefined })} className={inputCls}>
            <option value="">Select</option>
            {chains.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field label="Year of Construction" required htmlFor="b-built">
          <select id="b-built" value={b.yearBuilt ?? ''} onChange={(e) => put({ yearBuilt: Number(e.target.value) || undefined })} className={inputCls}>
            <option value="">Select</option>
            {years.map((y) => (
              <option key={y}>{y}</option>
            ))}
          </select>
        </Field>
        <Field label="Accepting bookings since" required error={b.yearBuilt && b.bookingSince && b.bookingSince < b.yearBuilt ? 'This can’t be before the year the property was built.' : undefined} htmlFor="b-since">
          <select id="b-since" value={b.bookingSince ?? ''} onChange={(e) => put({ bookingSince: Number(e.target.value) || undefined })} className={inputCls}>
            <option value="">Select</option>
            {years.map((y) => (
              <option key={y}>{y}</option>
            ))}
          </select>
        </Field>
        <Field label="No. of Restaurants" hint={l.restaurants?.length ? `${l.restaurants.length} added under Amenities & Restaurant` : undefined} htmlFor="b-rest">
          <input id="b-rest" type="number" inputMode="numeric" min={0} value={b.restaurantsCount ?? l.restaurants?.length ?? 0} onChange={(e) => put({ restaurantsCount: num(e.target.value) })} className={inputCls} />
        </Field>
        <Field label="No of rooms" required hint="Total of all room types under Rooms & Rateplans." htmlFor="b-rooms">
          <input id="b-rooms" value={rooms} disabled className={inputCls} />
        </Field>
        <Field label="No of floors" htmlFor="b-floors">
          <input id="b-floors" type="number" inputMode="numeric" min={0} value={b.floors ?? 0} onChange={(e) => put({ floors: num(e.target.value) })} className={inputCls} />
        </Field>
        <Field label="Currency" htmlFor="b-cur">
          <input id="b-cur" value="Indian rupee (₹)" disabled className={inputCls} />
        </Field>
        <Field label="Timezone" htmlFor="b-tz">
          <input id="b-tz" value="Asia/Kolkata GMT+05:30" disabled className={inputCls} />
        </Field>
      </div>
    </Card>
  )
}

const listOk = (v: string, re: RegExp) => !v.trim() || v.split(',').every((x) => re.test(x.trim()))
const PHONE = /^(\+91[\s-]?)?[0-9][0-9\s-]{8,13}$/
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const URL_RE = /^(https?:\/\/)?[\w-]+(\.[\w-]+)+(\/\S*)?$/i

function Contact({ l, set, base }: InfoProps) {
  const b = l.basics
  const put = (patch: Partial<typeof b>) => set((x) => ({ ...x, basics: { ...x.basics, ...patch } }))
  return (
    <div className="flex flex-col gap-5">
      <Card className="p-4 sm:p-6">
        <div className="grid gap-x-10 gap-y-5 md:grid-cols-2">
          <div className="flex flex-col gap-5">
            <Field label="Hotel Phone" hint="Landline with STD code, if you have one." htmlFor="c-landline" error={b.landline && !/^0?\d{10,11}$/.test(b.landline.replace(/[\s-]/g, '')) ? 'Enter the landline with STD code, e.g. 0751 234 5678.' : undefined}>
              <input id="c-landline" inputMode="tel" value={b.landline ?? ''} onChange={(e) => put({ landline: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Hotel Mobile" required hint="Verified with an OTP. Bookings and messages come here (SMS/WhatsApp)." htmlFor="c-mobile">
              <input id="c-mobile" value={b.phone} disabled className={inputCls} />
            </Field>
            <Field label="Hotel Email" required hint="Verified with an OTP." htmlFor="c-email">
              <input id="c-email" value={b.email} disabled className={inputCls} />
            </Field>
            <p className="text-[13px] text-ink-700">
              To change the verified mobile or email,{' '}
              <Link to={`${base}/edit?step=basics`} className="font-semibold text-pine-800">
                verify a new one here
              </Link>
              .
            </p>
          </div>
          <div className="flex flex-col gap-5">
            <Field label="Phone List" hint="Separate two phone numbers with a comma “,”" error={listOk(b.phoneList ?? '', PHONE) ? undefined : 'One of these phone numbers doesn’t look right.'} htmlFor="c-phones">
              <textarea id="c-phones" rows={3} value={b.phoneList ?? b.phone} onChange={(e) => put({ phoneList: e.target.value })} className={areaCls} />
            </Field>
            <Field label="Website List" hint="Separate two URLs with a comma “,”" error={listOk(b.websiteList ?? '', URL_RE) ? undefined : 'One of these website addresses doesn’t look right.'} htmlFor="c-web">
              <textarea id="c-web" rows={3} placeholder="Type here…" value={b.websiteList ?? ''} onChange={(e) => put({ websiteList: e.target.value })} className={areaCls} />
            </Field>
            <Field label="Email List" hint="Separate two emails with a comma “,”" error={listOk(b.emailList ?? '', EMAIL) ? undefined : 'One of these emails doesn’t look right.'} htmlFor="c-emails">
              <textarea id="c-emails" rows={3} value={b.emailList ?? b.email} onChange={(e) => put({ emailList: e.target.value })} className={areaCls} />
            </Field>
          </div>
        </div>
      </Card>
      <Card className="p-4 sm:p-6">
        <p className="rounded-lg bg-alert px-4 py-3 text-[13.5px] leading-relaxed text-white">In compliance with the Consumer Protection (E-commerce) Rules, 2020, all hotel partners are required to provide their customer care number(s) to be displayed on {site.marketplace}. Please provide your customer care number.</p>
        <div className="mt-5 max-w-[560px]">
          <Field label="Customer Care Number" required error={b.customerCare && !listOk(b.customerCare, PHONE) ? 'Enter a valid phone number. Separate two with a comma.' : !b.customerCare?.trim() ? 'Required.' : undefined} htmlFor="c-care">
            <textarea id="c-care" rows={3} placeholder="Type here…" value={b.customerCare ?? ''} onChange={(e) => put({ customerCare: e.target.value })} className={areaCls} />
          </Field>
        </div>
      </Card>
    </div>
  )
}

/** OpenStreetMap tile around a point, for the small location preview. */
function tileUrl(lat: number, lng: number, z = 15) {
  const n = 2 ** z
  const x = Math.floor(((lng + 180) / 360) * n)
  const r = (lat * Math.PI) / 180
  const y = Math.floor(((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * n)
  return `https://tile.openstreetmap.org/${z}/${x}/${y}.png`
}

function CopyBtn({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false)
  return (
    <button
      type="button"
      aria-label={`Copy ${label}`}
      onClick={() => {
        navigator.clipboard?.writeText(text).then(() => {
          setDone(true)
          setTimeout(() => setDone(false), 1400)
        })
      }}
      className="inline-flex items-center gap-1 text-pine-800 hover:text-pine-900"
    >
      <Copy className="h-3.5 w-3.5" aria-hidden="true" />
      {done && <span className="text-[11.5px] font-semibold">Copied</span>}
    </button>
  )
}

function Reach({ l, set, base }: InfoProps) {
  const a = l.location.access ?? {}
  const putA = (patch: Partial<typeof a>) => set((x) => ({ ...x, location: { ...x.location, access: { ...x.location.access, ...patch } } }))
  const dir = l.location.directions ?? ''
  const area = useRef<HTMLTextAreaElement>(null)
  const [showSample, setShowSample] = useState(false)
  const addr = [l.location.address, l.location.area, l.location.city, [l.location.state, l.location.pincode].filter(Boolean).join(' ')].filter((x) => x?.trim()).join(', ')
  const has = l.location.lat != null && l.location.lng != null
  const mapHref = has ? `https://www.openstreetmap.org/?mlat=${l.location.lat}&mlon=${l.location.lng}#map=17/${l.location.lat}/${l.location.lng}` : ''

  // Bullet / numbered list buttons: prefix the selected lines.
  const listify = (kind: 'bullet' | 'number') => {
    const el = area.current
    if (!el) return
    const { selectionStart: s0, selectionEnd: s1 } = el
    const start = dir.lastIndexOf('\n', s0 - 1) + 1
    const endIdx = dir.indexOf('\n', s1)
    const end = endIdx === -1 ? dir.length : endIdx
    const lines = (dir.slice(start, end) || '').split('\n')
    const out = lines.map((t, i) => `${kind === 'bullet' ? '• ' : `${i + 1}. `}${t.replace(/^(•\s|\d+\.\s)/, '')}`).join('\n')
    set((x) => ({ ...x, location: { ...x.location, directions: (dir.slice(0, start) + out + dir.slice(end)).slice(0, 1200) } }))
    requestAnimationFrame(() => el.focus())
  }
  const len = dir.trim().length

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[1fr_300px]">
      <div className="min-w-0">
        <h2 className="text-[26px] font-bold text-ink-900 sm:text-[30px]">How to Reach</h2>
        <p className="mt-1 text-[14.5px] text-ink-700">Help guests reach your property safely and hassle-free with clear guidance on vehicle access, routes, landmarks and directions.</p>
        <Card className="mt-4 overflow-hidden">
          <div className="p-4 sm:p-6">
            <h3 className="text-[22px] font-bold text-ink-900">Vehicle Access</h3>
            <div className="mt-4 grid gap-4 border-b border-line pb-5 md:grid-cols-[1fr_1.3fr] md:gap-8">
              <div>
                <strong className="block text-[15px] font-semibold text-ink-900">Can a vehicle reach till the entrance of your property?</strong>
                <p className="mt-1 text-[13.5px] text-ink-500">Specify if guests can reach directly by vehicle, or if they need to get down at a drop-off point before reaching the property entrance.</p>
              </div>
              <div className="flex flex-col gap-3">
                <Radio name="toEntrance" checked={a.toEntrance === 'yes'} onChange={() => putA({ toEntrance: 'yes', dropOffMetres: undefined })}>
                  Yes, vehicles can reach all the way to the property entrance
                </Radio>
                <Radio name="toEntrance" checked={a.toEntrance === 'no'} onChange={() => putA({ toEntrance: 'no' })}>
                  No, guests need to get down at a drop-off point some distance away from the property
                </Radio>
                {a.toEntrance === 'no' && (
                  <div className="ml-7 max-w-[240px]">
                    <Field label="Walk from the drop-off point" htmlFor="r-walk">
                      <div className="relative">
                        <input id="r-walk" type="number" inputMode="numeric" min={1} value={a.dropOffMetres ?? ''} onChange={(e) => putA({ dropOffMetres: Number(e.target.value) || undefined })} className={`${inputCls} pr-20`} />
                        <span className="absolute top-1/2 right-3 -translate-y-1/2 text-[14px] text-ink-500">metres</span>
                      </div>
                    </Field>
                  </div>
                )}
              </div>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-[1fr_1.3fr] md:gap-8">
              <div>
                <strong className="block text-[15px] font-semibold text-ink-900">Which vehicle types (Hatchback, SUV etc.) can reach your property or drop-off point?</strong>
                <p className="mt-1 text-[13.5px] text-ink-500">Select vehicle types that can reach your property or the drop-off point without restrictions.</p>
              </div>
              <div className="flex flex-col gap-3">
                <Radio name="vehicles" checked={a.vehicles === 'all'} onChange={() => putA({ vehicles: 'all', types: [] })}>
                  All vehicle types can reach the property or the nearest drop-off point.
                </Radio>
                <Radio name="vehicles" checked={a.vehicles === 'selected'} onChange={() => putA({ vehicles: 'selected' })} hint="Note: Do not select vehicles that frequently get stuck or cannot manage the terrain.">
                  Only selected vehicle types can reach the property or the nearest drop-off point
                </Radio>
                <div className={`ml-7 flex flex-col gap-3 rounded-lg bg-[#F4F8FC] p-4 transition-opacity ${a.vehicles === 'selected' ? '' : 'pointer-events-none opacity-50'}`}>
                  {vehicleTypes.map(([name, text]) => (
                    <label key={name} className="flex cursor-pointer items-start gap-3">
                      <input type="checkbox" disabled={a.vehicles !== 'selected'} checked={a.types?.includes(name) ?? false} onChange={() => putA({ types: a.types?.includes(name) ? a.types.filter((t) => t !== name) : [...(a.types ?? []), name] })} className="mt-1 h-4 w-4 accent-pine-800" />
                      <span className="text-[15px] text-ink-900">
                        {name}
                        <span className="block text-[13.5px] text-ink-700">{text}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="border-t-8 border-[#F4F8FC] p-4 sm:p-6">
            <h3 className="text-[22px] font-bold text-ink-900">Directions and Landmarks</h3>
            <p className="mt-3 flex items-start gap-2.5 rounded-lg bg-pine-50 px-3 py-2.5 text-[13.5px] font-medium text-pine-900">
              <Lightbulb className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              Guests see these directions on their booking after they book your property.
            </p>
            <div className="mt-4 grid gap-4 md:grid-cols-[1fr_1.3fr] md:gap-8">
              <div>
                <strong className="block text-[15px] font-semibold text-ink-900">Provide step-by-step directions and landmarks to help guests reach your property</strong>
                <p className="mt-1 text-[13.5px] text-ink-500">Add clear, step-by-step directions from a well-known landmark or a location that guests can easily find on maps. Include details that help guests navigate the last stretch confidently.</p>
                <button type="button" onClick={() => setShowSample((s) => !s)} className="mt-3 text-[14px] font-semibold text-pine-800 hover:underline">
                  {showSample ? 'Hide the sample' : 'See a Sample Direction Description'}
                </button>
                {showSample && <pre className="mt-2 rounded-lg bg-[#F4F8FC] p-3 font-sans text-[13px] leading-relaxed whitespace-pre-wrap text-ink-700">{sample}</pre>}
              </div>
              <div>
                <div className="overflow-hidden rounded-lg border border-ink-400 focus-within:border-pine-700 focus-within:ring-1 focus-within:ring-pine-700">
                  <div className="flex gap-1 border-b border-line px-2 py-1.5">
                    <button type="button" aria-label="Bulleted list" onClick={() => listify('bullet')} className="flex h-8 w-8 items-center justify-center rounded text-ink-900 hover:bg-paper">
                      <List className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <button type="button" aria-label="Numbered list" onClick={() => listify('number')} className="flex h-8 w-8 items-center justify-center rounded text-ink-900 hover:bg-paper">
                      <ListOrdered className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                  <textarea ref={area} rows={6} maxLength={1200} value={dir} onChange={(e) => set((x) => ({ ...x, location: { ...x.location, directions: e.target.value } }))} placeholder="For example: Please provide clear, step-by-step directions to help guests find your property…" aria-label="Directions and landmarks" className="block w-full resize-y px-3 py-2.5 text-[15px] leading-relaxed text-ink-900 outline-none" />
                </div>
                <div className="mt-1 flex justify-between text-[13px]">
                  <span className="text-ink-700">Character limit: 100 – 1200</span>
                  <span className={len > 0 && len < 100 ? 'text-alert' : 'text-ink-700'}>{len} / 1200</span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Card className="lg:sticky lg:top-[88px]">
        <h3 className="border-b border-line px-4 py-3.5 text-[17px] font-semibold text-ink-900">Property Location as on {site.marketplace}</h3>
        <div className="p-4">
          {has ? (
            <a href={mapHref} target="_blank" rel="noreferrer" className="relative block h-[160px] overflow-hidden rounded-lg bg-[#E6EEF7] no-underline">
              <img src={tileUrl(l.location.lat!, l.location.lng!)} alt="" className="h-full w-full object-cover" />
              <span className="absolute inset-0 flex items-center justify-center">
                <span className="flex items-center gap-1.5 rounded-lg border border-pine-800 bg-white px-3 py-2 text-[14px] font-semibold text-pine-800 shadow">
                  Click to view map <MapPin className="h-4 w-4" aria-hidden="true" />
                </span>
              </span>
            </a>
          ) : (
            <p className="rounded-lg bg-[#F4F8FC] p-3 text-[13.5px] text-ink-700">The map pin isn’t set yet.</p>
          )}
          <span className="mt-3 flex items-center gap-1.5 text-[12.5px] text-ink-500">
            Address <CopyBtn text={addr} label="address" />
          </span>
          <p className="text-[14px] text-ink-900">{addr || '—'}</p>
          {has && (
            <div className="mt-2 grid grid-cols-2 gap-2 text-[14px] text-ink-900">
              <div>
                <span className="block text-[12.5px] text-ink-500">Latitude</span>
                {l.location.lat!.toFixed(7)}° N
              </div>
              <div>
                <span className="block text-[12.5px] text-ink-500">Longitude</span>
                {l.location.lng!.toFixed(7)}° E
              </div>
            </div>
          )}
          <p className="mt-3 border-t border-dashed border-line-strong pt-3 text-[13.5px] text-ink-700">
            If your property location doesn’t match the location shown above,{' '}
            <Link to={`${base}/edit?step=location`} className="font-semibold text-pine-800">
              update it in Location
            </Link>{' '}
            or contact partner support.
          </p>
          {(site.supportPhone || site.supportEmail) && (
            <div className="mt-2 flex flex-col gap-1 text-[13px] text-ink-900">
              {site.supportPhone && (
                <span className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5" aria-hidden="true" /> {site.supportPhone} <CopyBtn text={site.supportPhone} label="phone" />
                </span>
              )}
              {site.supportEmail && (
                <span className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" aria-hidden="true" /> {site.supportEmail} <CopyBtn text={site.supportEmail} label="email" />
                </span>
              )}
            </div>
          )}
          {l.status === 'live' && (
            <a href={`${site.mainSiteUrl}/hotel/${l.slug || l.id}`} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-[13.5px] font-semibold text-pine-800">
              How guests see this <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          )}
        </div>
      </Card>
    </div>
  )
}
