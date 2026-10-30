/*
 * TripDesk settings. Values in [BRACKETS] are placeholders the client must confirm before launch.
 */
const env = (k: string) => ((import.meta.env[k] as string | undefined) ?? '').trim()

/** True when TripDesk runs on this computer or the local network (where StayEasy's local channel lives). */
export const onLocalMachine = typeof window === 'undefined' || /^(localhost|127\.|192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(window.location.hostname)

/** StayEasy's address when VITE_MAIN_SITE_URL isn't set: agent.yourdomain.com -> yourdomain.com. */
function guessMainSite() {
  if (onLocalMachine) return 'http://localhost:5173'
  return `${window.location.protocol}//${window.location.hostname.replace(/^(agents?|tripdesk|partners?)\./, '')}`
}

export const site = {
  name: 'TripDesk',
  tagline: 'The StayEasy portal for travel agents',
  marketplace: 'StayEasy',
  /** Where hotel photos and (on your computer) partner hotels come from. */
  mainSiteUrl: (env('VITE_MAIN_SITE_URL') || guessMainSite()).replace(/\/$/, ''),
  supportPhone: env('VITE_SUPPORT_PHONE'),
  supportEmail: env('VITE_SUPPORT_EMAIL'),
  razorpayKeyId: env('VITE_RAZORPAY_KEY_ID'),
  /** [CONFIRM] Smallest wallet top-up. */
  minTopup: 1000,
  /** [CONFIRM] Bank details agents transfer to when online top-up is off. */
  bankTransfer: '[Bank name, account number and IFSC for agent wallet top-ups]',
}
