/**
 * Business details shown across the site.
 * Replace the bracketed values with the client's real details before launch.
 */
const env = (k: string) => ((import.meta as { env?: Record<string, string | undefined> }).env?.[k] ?? '').trim()

export const site = {
  name: 'StayEasy',
  tagline: "India's branded budget stays",
  /** Set VITE_SUPPORT_PHONE / VITE_SUPPORT_EMAIL / VITE_WHATSAPP on the live site. Empty = hidden. */
  supportPhone: env('VITE_SUPPORT_PHONE'),
  supportEmail: env('VITE_SUPPORT_EMAIL'),
  whatsapp: env('VITE_WHATSAPP'),
  /** Registered company details for invoices and the legal pages. */
  legalName: env('VITE_LEGAL_NAME') || '[Registered company name]',
  legalAddress: env('VITE_LEGAL_ADDRESS') || '[Registered office address]',
  gstin: env('VITE_COMPANY_GSTIN'),
  /** The hotel-owner panel (InnDesk) and travel-agent panel (TripDesk) addresses. */
  partnerPanelUrl: env('VITE_PARTNER_PANEL_URL'),
  agentPanelUrl: env('VITE_AGENT_PANEL_URL'),
  /** Flat discount for FIRSTSTAY, in rupees. */
  firstStayDiscount: 200,
  /** Extra discount for members, as a fraction. */
  memberDiscount: 0.05,
  /** Extra discount when paying online now, as a fraction. */
  payNowDiscount: 0.05,
  /** Free cancellation window before check-in, in hours. */
  freeCancelHours: 24,
  checkInTime: '12:00 PM',
  checkOutTime: '11:00 AM',
  /** Meal add-ons at checkout, per guest per night, incl. taxes. Price at the hotel is shown higher. */
  addons: { breakfast: 249, allMeals: 649, atHotelMarkup: 1.25 },
  /** Early check-in / late check-out options: share of one night's room price, per room. */
  earlyCheckIn: [
    { time: '6:00 AM', share: 0.6 },
    { time: '8:00 AM', share: 0.45 },
    { time: '10:00 AM', share: 0.25 },
  ],
  lateCheckOut: [
    { time: '2:00 PM', share: 0.25 },
    { time: '5:00 PM', share: 0.45 },
    { time: '8:00 PM', share: 0.6 },
  ],
  /**
   * Optional "Stay Protect" cover sold at checkout, per guest per night incl. 18% GST.
   * PLACEHOLDER: confirm the insurer, price and benefits with the client before launch.
   */
  stayProtect: {
    price: 49,
    insurer: '[Insurance partner]',
    benefits: [
      ['Refund if you cancel after the free window', 'Up to ₹10,000'],
      ['Medical assistance during the stay', '24×7 support'],
      ['Lost baggage and documents help', 'Included'],
      ['Personal accident cover', 'Up to ₹5,00,000'],
    ] as [string, string][],
  },
} as const

/**
 * GST on hotel accommodation in India (after the Sept 2025 rate change):
 * 5% when the room tariff is up to ₹7,500 per night, 18% above that.
 * Confirm with the client's accountant before going live.
 */
export function gstRate(perNightTariff: number) {
  return perNightTariff <= 7500 ? 0.05 : 0.18
}
