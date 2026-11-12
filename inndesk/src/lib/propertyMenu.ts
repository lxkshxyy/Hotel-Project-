/** The left menu shown inside one property (modelled on the hotel extranet layout). */
export type MenuLink = { label: string; to: string; sub?: string; isNew?: boolean; dot?: boolean; end?: boolean }
export type MenuItem = { key: string; label: string; icon: string; to?: string; end?: boolean; isNew?: boolean; links?: MenuLink[]; divider?: boolean }

/** Sections that don't have a page yet: slug → title. */
export const sections: Record<string, string> = {
  promotions: 'Promotions & Coupons',
  loyalty: 'TRPOTELS Club Loyalty Programme',
}

export function propertyMenu(id: string, opts: { openDisputes?: number } = {}): MenuItem[] {
  const base = `/app/properties/${id}`
  const sec = (slug: string) => `${base}/section/${slug}`
  const info = (page: string) => `${base}/info/${page}`
  const pay = (page: string) => `${base}/payments/${page}`
  return [
    { key: 'home', label: 'Home', icon: 'home', to: base, end: true },
    { key: 'bookings', label: 'Bookings', icon: 'bookings', to: `${base}/reservations` },
    {
      key: 'rates',
      label: 'Rates & Inventory',
      icon: 'rates',
      links: [
        { label: 'Manage Rates & Inventory', to: `${base}/rates`, end: true },
        { label: 'Hourly Stays', to: `${base}/rates/hourly` },
      ],
    },
    {
      key: 'grow',
      label: 'Grow your Business',
      icon: 'grow',
      links: [
        { label: 'Promotions & Coupons', to: sec('promotions') },
        { label: 'TRPOTELS Club', sub: 'Loyalty Programme', to: sec('loyalty') },
      ],
    },
    {
      key: 'payments',
      label: 'Payments',
      icon: 'payments',
      isNew: true,
      links: [
        { label: 'Payouts', to: pay('payouts') },
        { label: 'Transactions', to: pay('transactions') },
        { label: 'Past payouts', to: pay('past-payouts') },
        { label: 'Payout and tax settings', to: pay('settings') },
        { label: 'Advance transactions', to: pay('advance') },
        { label: 'Contracted compensation', to: pay('compensation') },
        { label: 'Commission invoices', to: pay('invoices') },
        { label: 'Chargeback disputes', to: pay('disputes'), dot: !!opts.openDisputes },
      ],
    },
    {
      key: 'property',
      label: 'Property Information',
      icon: 'property',
      links: [
        { label: 'Basic Information', to: info('basics') },
        { label: 'Rooms & Rateplans', to: info('rooms') },
        { label: 'Amenities & Restaurant', to: info('amenities') },
        { label: 'Inclusions', to: info('inclusions') },
        { label: 'Photos & Videos', to: info('photos') },
        { label: 'Rules & Policies', to: info('policies') },
        { label: 'Content Score', to: info('content-score') },
        { label: 'Financial & Bank Details', to: info('finance') },
        { label: 'Settings', to: info('settings') },
      ],
    },
    { key: 'ratings', label: 'Ratings & Reviews', icon: 'ratings', to: `${base}/reviews` },
    { key: 'analytics', label: 'Analytics', icon: 'analytics', to: `${base}/analytics` },
    { key: 'help', label: 'Help Centre', icon: 'help', to: `${base}/help`, divider: true },
  ]
}
