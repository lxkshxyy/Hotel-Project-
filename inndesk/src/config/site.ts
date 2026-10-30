/*
 * InnDesk settings. Change the name, contact details and commercial terms here.
 * Values in [BRACKETS] are placeholders the client must confirm before launch.
 */
const mapTilerKey = (import.meta.env.VITE_MAPTILER_KEY as string | undefined)?.trim()

export const site = {
  name: 'InnDesk',
  tagline: 'The property panel for StayEasy partners',
  marketplace: 'StayEasy',
  /** The customer website that listings publish to. */
  mainSiteUrl: ((import.meta.env.VITE_MAIN_SITE_URL as string | undefined) || 'http://localhost:5173').replace(/\/$/, ''),
  supportPhone: '+91 [PARTNER SUPPORT NUMBER]',
  supportEmail: 'partners@[yourdomain].com',
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
