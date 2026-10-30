/*
 * InnDesk settings. Change the name, contact details and commercial terms here.
 * Values in [BRACKETS] are placeholders the client must confirm before launch.
 */
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
  minPhotos: 5,
  /**
   * Live map and address search on the Location step. Free OpenStreetMap-based services, fine
   * for testing and light use; for heavy traffic switch to a paid provider (Google Maps, Ola Maps).
   */
  map: {
    tiles: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    geocoder: 'https://photon.komoot.io',
    /** Where the map starts before a pin is placed (centre of India). */
    start: { lat: 22.5, lng: 79 },
  },
  minPrice: 300,
}
