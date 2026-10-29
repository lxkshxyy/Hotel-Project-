import { useEffect, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { site } from '../config/site'

/*
 * DRAFT legal pages. They are written for an Indian online hotel-booking business, but they are
 * not legal advice: the client's lawyer must review and approve them before launch.
 * Company details come from VITE_LEGAL_NAME, VITE_LEGAL_ADDRESS, VITE_SUPPORT_EMAIL and VITE_SUPPORT_PHONE.
 */
const updated = '29 October 2026'

function Shell({ title, children }: { title: string; children: ReactNode }) {
  useEffect(() => {
    document.title = `${title} – ${site.name}`
    return () => {
      document.title = `${site.name} – Hotel Booking`
    }
  }, [title])
  return (
    <div>
      <section className="bg-navy-800 py-12 text-white">
        <div className="container-page">
          <p className="text-[13px] font-bold tracking-[0.08em] text-ember-200 uppercase">Policies</p>
          <h1 className="mt-2 text-[32px] leading-tight font-extrabold tracking-tight sm:text-[40px]">{title}</h1>
          <p className="mt-2 text-[#D3DCEE]">Last updated {updated}</p>
        </div>
      </section>
      <div className="container-page grid gap-10 py-10 lg:grid-cols-[220px_1fr]">
        <nav aria-label="Policies" className="flex flex-wrap gap-2 lg:flex-col">
          {[
            ['/terms', 'Terms & conditions'],
            ['/privacy', 'Privacy policy'],
            ['/cancellation-policy', 'Cancellation & refunds'],
            ['/guest-policy', 'Guest policy'],
          ].map(([to, l]) => (
            <Link key={to} to={to} className="rounded-lg px-3 py-2 text-sm font-bold text-navy-800 no-underline hover:bg-navy-50">
              {l}
            </Link>
          ))}
        </nav>
        <article className="legal flex max-w-3xl flex-col gap-6 text-[15.5px] leading-relaxed text-ink-700">{children}</article>
      </div>
    </div>
  )
}

const H = ({ children }: { children: ReactNode }) => <h2 className="text-xl font-bold text-navy-800">{children}</h2>
const contact = () => [site.supportEmail, site.supportPhone].filter(Boolean).join(' or ') || 'the contact details on our Help page'

export function Terms() {
  return (
    <Shell title="Terms & conditions">
      <p>
        These terms apply when you search for or book a stay on {site.name} (the website and app). {site.name} is run by {site.legalName}, {site.legalAddress} (“we”, “us”). By making a booking you accept these terms and the policies linked from them.
      </p>
      <section>
        <H>1. What we do</H>
        <p>We show hotel rooms, prices and availability and take bookings for them. Some hotels are run under the {site.name} brands; others (“Partner Hotels”) are run by independent owners who list them with us. The hotel provides the stay; we arrange the booking.</p>
      </section>
      <section>
        <H>2. Your account</H>
        <p>You sign in with a one-time code sent to your email. Keep access to that email secure. You must be 18 or older to book, and the details you give (name, phone, email) must be true.</p>
      </section>
      <section>
        <H>3. Prices and taxes</H>
        <p>Prices are per room per night unless shown otherwise. Goods and Services Tax (GST) is added at the rate that applies to the room tariff and is shown before you book. Add-ons such as meals, early check-in or late check-out are shown separately. The total on the checkout page is the amount you pay.</p>
      </section>
      <section>
        <H>4. Payment</H>
        <p>
          “Pay at hotel” bookings are paid at check-in by cash, card or UPI, as the hotel accepts. “Pay now” bookings are paid online through our payment partner; we do not see or store your card or bank details. A booking is confirmed only when you see the confirmation page with a booking ID.
        </p>
      </section>
      <section>
        <H>5. Changes and cancellations</H>
        <p>
          You can cancel free of charge within the window shown on the hotel page and in your booking. See the <Link to="/cancellation-policy">Cancellation &amp; refund policy</Link>. You can change guest details from My bookings; to change dates or the room, cancel (while it’s free) and book again.
        </p>
      </section>
      <section>
        <H>6. At the hotel</H>
        <p>Every adult guest must show a valid government photo ID. The hotel may refuse check-in if this is not met or if its house rules are not followed. See the <Link to="/guest-policy">Guest policy</Link>.</p>
      </section>
      <section>
        <H>7. Coupons and Club points</H>
        <p>Coupons and {site.name} Club points have no cash value, can’t be transferred and may be withdrawn if misused. Points used on a booking that is cancelled are returned; points earned on it are removed.</p>
      </section>
      <section>
        <H>8. Our responsibility</H>
        <p>We take care that hotel information is accurate, but photos and descriptions are provided as a guide. If the room is materially different from what was booked, contact us during your stay so we can fix it or move you. To the extent the law allows, our liability for a booking is limited to the amount paid for it.</p>
      </section>
      <section>
        <H>9. Law and disputes</H>
        <p>These terms are governed by the laws of India. Disputes are subject to the courts at [city to be confirmed by the client]. Contact us first at {contact()} and we will try to resolve it.</p>
      </section>
    </Shell>
  )
}

export function Privacy() {
  return (
    <Shell title="Privacy policy">
      <p>
        This policy explains what personal data {site.legalName} collects through {site.name}, why, and the choices you have. It is written to meet India’s Digital Personal Data Protection Act, 2023.
      </p>
      <section>
        <H>What we collect</H>
        <ul className="list-disc pl-5">
          <li>Account: your email address and, if you add them, your name, phone number and travel preferences.</li>
          <li>Bookings: guest names, phone, email, dates, requests and, if you ask for a GST invoice, the company name, GSTIN and address.</li>
          <li>Payments: a payment reference from our payment partner. We never receive full card or bank details.</li>
          <li>Reviews you post, and basic technical data needed to keep the site working and secure.</li>
        </ul>
      </section>
      <section>
        <H>Why we use it</H>
        <p>To make and manage your bookings, send booking messages, give Club benefits, issue invoices, prevent fraud, and meet legal duties such as tax records. We do not sell your data.</p>
      </section>
      <section>
        <H>Who we share it with</H>
        <p>The hotel you book (so it can host you), our payment partner, and service providers that host our website, database and email. Each receives only what it needs. We may share data when the law requires it.</p>
      </section>
      <section>
        <H>How long we keep it</H>
        <p>Booking and invoice records are kept as long as tax law requires. Account data is kept while your account is active and deleted on request, except what we must keep by law.</p>
      </section>
      <section>
        <H>Your rights</H>
        <p>You can ask to see, correct or delete your personal data, withdraw consent, or raise a complaint. Write to our Grievance Officer, [name to be confirmed], at {contact()}. We reply within the time the law sets.</p>
      </section>
      <section>
        <H>Cookies and storage</H>
        <p>We use your browser’s storage to keep you signed in and remember your searches. We don’t use advertising cookies.</p>
      </section>
    </Shell>
  )
}

export function Cancellation() {
  return (
    <Shell title="Cancellation & refund policy">
      <section>
        <H>Free cancellation</H>
        <p>
          Most rates can be cancelled free of charge until {site.freeCancelHours} hours before check-in ({site.checkInTime} on the arrival day). Partner Hotels set their own window, which can be longer or non-refundable; it is shown on the hotel page, at checkout and in your booking.
        </p>
      </section>
      <section>
        <H>How to cancel</H>
        <p>
          Open <Link to="/bookings">My bookings</Link>, choose the stay and press Cancel booking. You’ll see exactly what is refunded before you confirm.
        </p>
      </section>
      <section>
        <H>Refunds</H>
        <ul className="list-disc pl-5">
          <li>Pay at hotel: nothing is charged, so nothing needs refunding.</li>
          <li>Paid online and cancelled in the free window: the full amount goes back to your original payment method, usually within 5–7 working days.</li>
          <li>After the free window: the booking can’t be cancelled online. Contact us and we’ll check with the hotel.</li>
          <li>Club points used on the booking are returned when it is cancelled.</li>
        </ul>
      </section>
      <section>
        <H>No-shows and early departure</H>
        <p>If you don’t arrive, the hotel may treat the booking as a no-show. Unused nights after you check in are not refunded unless the hotel agrees.</p>
      </section>
      <section>
        <H>If something goes wrong</H>
        <p>If the hotel can’t honour your booking, we will move you to a similar hotel or give you a full refund. Contact {contact()}.</p>
      </section>
    </Shell>
  )
}

export function GuestPolicy() {
  return (
    <Shell title="Guest policy">
      <ul className="flex list-disc flex-col gap-2 pl-5">
        <li>Every adult guest must show a valid government photo ID at check-in: Aadhaar, passport, driving licence or voter ID. PAN cards are not accepted as ID.</li>
        <li>Standard check-in is from {site.checkInTime} and check-out by {site.checkOutTime}. Partner Hotels may set different times, shown on their page.</li>
        <li>Hotels marked “Couple friendly” welcome unmarried couples with valid ID. Some hotels don’t accept guests with an ID from the same city; this is shown in the hotel’s rules.</li>
        <li>Guests from outside India must show a passport and valid visa. The hotel registers them with the authorities as Indian law requires.</li>
        <li>Children and extra beds follow each hotel’s rules, shown on the hotel page.</li>
        <li>Guests are responsible for damage they cause. Smoking, pets and visitors follow each hotel’s house rules.</li>
      </ul>
    </Shell>
  )
}
