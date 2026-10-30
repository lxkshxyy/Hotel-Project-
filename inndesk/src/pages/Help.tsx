import { Mail, Phone } from 'lucide-react'
import { PageHead } from '../components/ui'
import { site } from '../config/site'

const topics = [
  { q: 'Why isn’t my property on StayEasy?', a: 'Open the property and check the key tag. Drafts and paused listings are hidden from guests. If the tag says Live but a warning shows, the last change didn’t reach StayEasy: press Retry.' },
  { q: 'How do I change the price for a festival or weekend?', a: 'Go to Rates and availability, tap the date (or press Change a date range), pick the days of the week and set the price.' },
  { q: 'A guest didn’t arrive. What do I do?', a: 'Open the reservation and press Mark no-show. Charges follow the cancellation policy shown on the booking.' },
  { q: 'Can I list more than one property?', a: 'Yes. Each property is a separate listing with its own rooms, photos, prices and payouts.' },
  { q: 'Who can see my guests’ phone numbers?', a: 'Only you, for bookings at your own properties. Use them for the stay only.' },
]

export default function Help() {
  return (
    <div className="container-page flex max-w-3xl flex-col gap-6 pt-8">
      <PageHead title="Help" intro="Answers to common questions, and how to reach the partner team." />
      <div className="panel divide-y divide-line px-6">
        {topics.map((t) => (
          <details key={t.q} className="group py-4">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 text-[17px] font-semibold">
              {t.q}
              <span aria-hidden="true" className="text-2xl text-pine-700 transition-transform group-open:rotate-45">+</span>
            </summary>
            <p className="mt-2 text-ink-700">{t.a}</p>
          </details>
        ))}
      </div>
      {(site.supportPhone || site.supportEmail) && (
        <section className="rounded-2xl bg-pine-900 p-6 text-white">
          <h2 className="text-xl font-bold">Partner support</h2>
          <p className="mt-1 text-pine-100">Monday to Saturday, 9 AM to 8 PM.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {site.supportPhone && (
              <a href={`tel:${site.supportPhone.replace(/[^\d+]/g, '')}`} className="btn-brass">
                <Phone className="h-4 w-4" aria-hidden="true" /> {site.supportPhone}
              </a>
            )}
            {site.supportEmail && (
              <a href={`mailto:${site.supportEmail}`} className="btn bg-white/10 text-white hover:bg-white/20">
                <Mail className="h-4 w-4" aria-hidden="true" /> {site.supportEmail}
              </a>
            )}
          </div>
        </section>
      )}
    </div>
  )
}
