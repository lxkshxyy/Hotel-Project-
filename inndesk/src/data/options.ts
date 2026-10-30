/** Cities StayEasy currently sells. A listing must be in one of these to go live. */
export const cities = [
  { name: 'New Delhi', lat: 28.6139, lng: 77.209 },
  { name: 'Mumbai', lat: 19.076, lng: 72.8777 },
  { name: 'Bengaluru', lat: 12.9716, lng: 77.5946 },
  { name: 'Goa', lat: 15.4909, lng: 73.8278 },
  { name: 'Jaipur', lat: 26.9124, lng: 75.7873 },
  { name: 'Hyderabad', lat: 17.385, lng: 78.4867 },
  { name: 'Pune', lat: 18.5204, lng: 73.8567 },
  { name: 'Kolkata', lat: 22.5726, lng: 88.3639 },
]


/**
 * Amenities. `key` matches StayEasy's own amenity list, so those show with icons on the hotel page.
 * Items without a key are listed in the hotel description instead.
 */
export const amenityGroups: { group: string; items: { id: string; label: string; key?: string }[] }[] = [
  {
    group: 'Essentials',
    items: [
      { id: 'wifi', label: 'Free Wi-Fi', key: 'wifi' },
      { id: 'ac', label: 'Air conditioning', key: 'ac' },
      { id: 'tv', label: 'TV in rooms', key: 'tv' },
      { id: 'hotWater', label: '24-hour hot water', key: 'hotWater' },
      { id: 'powerBackup', label: 'Power backup', key: 'powerBackup' },
      { id: 'lift', label: 'Lift', key: 'lift' },
    ],
  },
  {
    group: 'Food',
    items: [
      { id: 'breakfast', label: 'Breakfast available', key: 'breakfast' },
      { id: 'restaurant', label: 'Restaurant', key: 'restaurant' },
      { id: 'roomService', label: 'Room service', key: 'roomService' },
      { id: 'kitchen', label: 'Guest kitchen' },
      { id: 'bar', label: 'Bar' },
    ],
  },
  {
    group: 'Safety and access',
    items: [
      { id: 'security', label: '24-hour security', key: 'security' },
      { id: 'cctv', label: 'CCTV in common areas' },
      { id: 'fireSafety', label: 'Fire extinguishers' },
      { id: 'wheelchair', label: 'Wheelchair accessible' },
      { id: 'frontDesk', label: '24-hour front desk' },
    ],
  },
  {
    group: 'Facilities',
    items: [
      { id: 'parking', label: 'Parking', key: 'parking' },
      { id: 'pool', label: 'Swimming pool', key: 'pool' },
      { id: 'gym', label: 'Gym', key: 'gym' },
      { id: 'laundry', label: 'Laundry service' },
      { id: 'banquet', label: 'Banquet or meeting hall' },
      { id: 'shuttle', label: 'Airport or station pickup' },
      { id: 'spa', label: 'Spa' },
    ],
  },
]
export const allAmenities = amenityGroups.flatMap((g) => g.items)

export const bedTypes = ['Double bed', 'Queen bed', 'King bed', 'Two single beds', 'King + single', 'Bunk beds']
export const roomAmenities = ['AC', 'TV', 'Wi-Fi', 'Work desk', 'Mini fridge', 'Kettle', 'Balcony', 'City view', 'Bathtub', 'Sofa', 'Wardrobe', 'Geyser']

export const photoTags = ['Exterior', 'Lobby', 'Room', 'Bathroom', 'Dining', 'Other'] as const
export type PhotoTag = (typeof photoTags)[number]

export const cancellationOptions = [
  { id: 'free24', label: 'Free cancellation until 24 hours before check-in', short: 'Free till 24 hours before' },
  { id: 'free48', label: 'Free cancellation until 48 hours before check-in', short: 'Free till 48 hours before' },
  { id: 'free7d', label: 'Free cancellation until 7 days before check-in', short: 'Free till 7 days before' },
  { id: 'nonref', label: 'Non-refundable', short: 'Non-refundable' },
] as const
export type CancellationId = (typeof cancellationOptions)[number]['id']

export const checkTimes = ['10:00 AM', '11:00 AM', '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM']
