/** The left menu shown inside one property (modelled on the hotel extranet layout). */
export type MenuLink = { label: string; to: string; sub?: string; isNew?: boolean }
export type MenuItem = { key: string; label: string; icon: string; to?: string; end?: boolean; isNew?: boolean; links?: MenuLink[]; divider?: boolean }

/** Sections that don't have a page yet: slug → title. */
export const sections: Record<string, string> = {
  'manage-rates': 'Manage Rates & Inventory',
  'early-checkin': 'Paid Early Check-in / Late Checkout',
  'default-rates': 'Default Rates & Inventory',
  'hourly-stays': 'Hourly Stays',
  promotions: 'Promotions & Coupons',
  loyalty: 'TRPOTELS Club Loyalty Programme',
  packages: 'Packages',
  'plb-vdi': 'PLB & VDI',
  'daily-deals': 'Daily Steal Deals',
  payments: 'Payments',
  inclusions: 'Inclusion & Packages',
  'content-score': 'Content Score',
  settings: 'Settings',
  'ratings-reviews': 'Ratings & Reviews',
  'margin-offers': 'Margin Offers',
  reports: 'Reports',
  'action-center': 'Action Center',
}

export function propertyMenu(id: string): MenuItem[] {
  const base = `/app/properties/${id}`
  const sec = (slug: string) => `${base}/section/${slug}`
  const edit = (step: string) => `${base}/edit?step=${step}`
  return [
    { key: 'home', label: 'Home', icon: 'home', to: base, end: true },
    { key: 'bookings', label: 'Bookings', icon: 'bookings', to: `${base}/reservations` },
    {
      key: 'rates',
      label: 'Rates & Inventory',
      icon: 'rates',
      links: [
        { label: 'Manage Rates & Inventory', to: sec('manage-rates') },
        { label: 'Paid Early Check-in/ Late Checkout', to: sec('early-checkin'), isNew: true },
        { label: 'Default Rates & Inventory', to: sec('default-rates') },
        { label: 'Hourly Stays', to: sec('hourly-stays') },
      ],
    },
    {
      key: 'grow',
      label: 'Grow your Business',
      icon: 'grow',
      links: [
        { label: 'Promotions & Coupons', to: sec('promotions') },
        { label: 'TRPOTELS Club', sub: 'Loyalty Programme', to: sec('loyalty') },
        { label: 'Packages', to: sec('packages') },
        { label: 'PLB & VDI', to: sec('plb-vdi') },
        { label: 'Daily Steal Deals', to: sec('daily-deals'), isNew: true },
      ],
    },
    { key: 'payments', label: 'Payments', icon: 'payments', to: sec('payments'), isNew: true },
    {
      key: 'property',
      label: 'Property Information',
      icon: 'property',
      links: [
        { label: 'Basic Information', to: edit('basics') },
        { label: 'Rooms & Rateplans', to: edit('rooms') },
        { label: 'Amenities & Restaurant', to: edit('amenities') },
        { label: 'Inclusion & Packages', to: sec('inclusions') },
        { label: 'Photos & Videos', to: edit('photos') },
        { label: 'Rules & Policies', to: edit('policies') },
        { label: 'Content Score', to: sec('content-score') },
        { label: 'Financial & Bank Details', to: edit('legal') },
        { label: 'Settings', to: sec('settings') },
      ],
    },
    { key: 'ratings', label: 'Ratings & Reviews', icon: 'ratings', to: sec('ratings-reviews') },
    { key: 'analytics', label: 'Analytics', icon: 'analytics', to: `${base}/analytics` },
    {
      key: 'more',
      label: 'More',
      icon: 'more',
      links: [
        { label: 'Margin Offers', to: sec('margin-offers') },
        { label: 'Reports', to: sec('reports') },
        { label: 'Action Center', to: sec('action-center') },
      ],
    },
    { key: 'help', label: 'Help Centre', icon: 'help', to: `${base}/help`, divider: true },
  ]
}
