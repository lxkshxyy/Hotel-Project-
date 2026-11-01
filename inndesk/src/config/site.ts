/*
 * InnDesk settings. Change the name, contact details and commercial terms here.
 * Values in [BRACKETS] are placeholders the client must confirm before launch.
 */
const mapTilerKey = (import.meta.env.VITE_MAPTILER_KEY as string | undefined)?.trim()
const env = (k: string) => ((import.meta.env[k] as string | undefined) ?? '').trim()

/** True when InnDesk runs on this computer or the local network (where StayEasy's local publish channel lives). */
export const onLocalMachine = typeof window === 'undefined' || /^(localhost|127\.|192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(window.location.hostname)

/**
 * The StayEasy address when VITE_MAIN_SITE_URL isn't set: on this computer the local StayEasy (port 5173);
 * on a real domain the same domain without "partner." (partner.yourdomain.com -> yourdomain.com).
 */
function guessMainSite() {
  if (onLocalMachine) return 'http://localhost:5173'
  return `${window.location.protocol}//${window.location.hostname.replace(/^(partners?|inndesk|hotels?)\./, '')}`
}

export const site = {
  name: 'InnDesk',
  tagline: 'The property panel for TRPotels partners',
  marketplace: 'TRPotels',
  /** The customer website that listings publish to. */
  mainSiteUrl: (env('VITE_MAIN_SITE_URL') || guessMainSite()).replace(/\/$/, ''),
  /** Partner support contacts (VITE_SUPPORT_PHONE / VITE_SUPPORT_EMAIL). Empty = hidden. */
  supportPhone: env('VITE_SUPPORT_PHONE'),
  supportEmail: env('VITE_SUPPORT_EMAIL'),
  /** [CONFIRM] Commission StayEasy keeps on each completed stay, before GST. */
  commissionRate: 0.15,
  /** GST charged on the commission (services by StayEasy to the hotel). */
  gstOnCommission: 0.18,
  /** [CONFIRM] Payout cycle shown to owners. */
  payoutCycle: 'every Tuesday, for stays that checked out the week before',
  minPhotos: 10,
  /** Largest photo file an owner can upload, in MB. */
  maxPhotoMb: 30,
  /**
   * Live map on the Location step.
   * No key: free OpenStreetMap tiles (fine for demos and light use).
   * With a MapTiler key in .env (VITE_MAPTILER_KEY=...): MapTiler's street map. Free plan is for
   * testing and non-commercial use; the client needs a paid plan for the live site.
   */
  map: {
    ...(mapTilerKey
      ? {
          tiles: `https://api.maptiler.com/maps/streets-v2/256/{z}/{x}/{y}.png?key=${mapTilerKey}`,
          attribution: '&copy; <a href="https://www.maptiler.com/copyright/">MapTiler</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        }
      : {
          tiles: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }),
    geocoder: 'https://photon.komoot.io',
    /** Where the map starts before a pin is placed (centre of India). */
    start: { lat: 22.5, lng: 79 },
  },
  minPrice: 300,
}
