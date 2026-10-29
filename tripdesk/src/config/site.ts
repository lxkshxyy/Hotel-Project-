/*
 * TripDesk settings. Values in [BRACKETS] are placeholders the client must confirm before launch.
 */
const env = (k: string) => ((import.meta.env[k] as string | undefined) ?? '').trim()

export const site = {
  name: 'TripDesk',
  tagline: 'The StayEasy portal for travel agents',
  marketplace: 'StayEasy',
  /** Where hotel photos and (on your computer) partner hotels come from. */
  mainSiteUrl: (env('VITE_MAIN_SITE_URL') || 'http://localhost:5173').replace(/\/$/, ''),
  supportPhone: env('VITE_SUPPORT_PHONE'),
  supportEmail: env('VITE_SUPPORT_EMAIL'),
  razorpayKeyId: env('VITE_RAZORPAY_KEY_ID'),
  /** [CONFIRM] Smallest wallet top-up. */
  minTopup: 1000,
  /** [CONFIRM] Bank details agents transfer to when online top-up is off. */
  bankTransfer: '[Bank name, account number and IFSC for agent wallet top-ups]',
}
