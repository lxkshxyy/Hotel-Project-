/*
 * What opens under an amenity once the owner ticks it, taken from the reference extranet screens.
 *
 * - `amenityDetails`: small dropdowns shown in a grey box under the tile.
 *     select = pick one, multi = searchable list with tick boxes (pick several).
 * - `amenityForms`: amenities that need a full form ("+ Add Parking" opens a pop-up). An owner
 *   can add more than one (two pools, two parking areas).
 *
 * Lists marked [CONFIRM] were only partly visible in the reference screenshots (the dropdown
 * scrolled or had a "View All"); the visible options are all included, extras are sensible
 * additions the client can trim.
 */

export type DetailField = { id: string; label: string; type: 'select' | 'multi'; options: string[] }

const FREE_PAID = ['Free', 'Paid']
const cost = (): DetailField[] => [{ id: 'cost', label: 'Select', type: 'select', options: FREE_PAID }]

const freePaidIds = [
  // Outdoor sports & activities
  'golfCourseMiniGolf', 'skiing', 'cycling', 'rockClimbing', 'ziplining', 'archery', 'tennis', 'basketballCourt', 'cricket', 'badminton', 'volleyBall', 'highRopeCourse', 'paintball', 'paragliding', 'camping', 'hotAirBalloonRide', 'airRifleShooting', 'footballSoccer', 'pickleBall', 'atvOrBuggyRide', 'zorbing', 'wallClimbing', 'bungeeJumping', 'beachVolleyFootball', 'golfSimulator', 'rappelling',
  // Food, transfers, family
  'barbeque', 'pickupDrop', 'shuttleService', 'railwayStationTransfers', 'busStationTransfers', 'babysitting', 'crib', 'wheelchair',
  // Spa & wellness
  'massage', 'salon', 'steamAndSauna', 'jacuzzi', 'yoga', 'meditationRoom', 'solarium', 'hotSpringBathWithinPremise', 'hammam', 'ayurvedicTreatmentWithinPremise',
  // Water sports
  'kayaking', 'snorkelling', 'canoeing', 'waterParkWithinPremise', 'scubaDiving', 'jetSkiing', 'paddleBoarding', 'pedalBoats', 'bananaBoatRide', 'fishing', 'windsurfing', 'beachVolleyball', 'laserBoat', 'glassBottomBoat', 'parasailing', 'beachFootball', 'surfing', 'riverRafting', 'dolphinBoatRide', 'waterSkiing', 'diving', 'motorBoatRide', 'boatRide', 'beachSports',
  // Indoor sports
  'library', 'indoorGamesRoom', 'tableTennis', 'billiardsPoolTable', 'boardGames', 'foosballTable', 'airHockeyTable', 'gameZoneArcade', 'virtualGamingVrZone', 'dartBoard', 'bowling', 'squash',
  // Live shows
  'liveMusic', 'culturalProgramme', 'movieScreenings', 'karaoke', 'magicShows', 'puppetShows', 'liveArtPerformance', 'standUpComedy', 'lightSoundShow', 'rainDance', 'djParty', 'fireworkShow', 'dancePerformance', 'discoClub', 'aartiCeremony', 'droneShow',
  // Wildlife
  'jungleSafari', 'wildlifePhotography', 'wildlifeDocumentary', 'nightSafari', 'forestCamping', 'dolphinWatching', 'tigerSafari', 'leopardSafari', 'lionSafari', 'elephantSafari', 'whaleWatching', 'turtleWatching', 'seaLifeExploration',
  // Rides, safari, excursions & tours
  'bicycleRide', 'jeepSafari', 'camelRide', 'horseRide', 'tractorRide', 'carriageOrCartRide', 'cableCarRide', 'shikaraRide', 'gondolaRide', 'desertSafari', 'walkingTours', 'boatRideOrTour', 'pubCrawls', 'plantationTour', 'horticultureTour', 'cyclingTrail', 'vintageCarRide', 'hillTrek',
  // Nature activities
  'forestHiking', 'riversideTrek', 'natureWalkHike', 'birdWatching', 'guidedNightWalk', 'teaFactoryVisit', 'teaPlantationWalk', 'villageWalk', 'starGazing', 'trekking',
  // Workshops
  'cookingClass', 'potteryMaking', 'drawingPaintingActivities', 'craftActivities', 'bangleMaking', 'blockPainting', 'photographyClass', 'heenaArt', 'cocktailMakingWorkshop', 'environmentActivities', 'astrologerSession', 'caricatureDrawings',
]

export const amenityDetails: Record<string, DetailField[]> = {
  ...Object.fromEntries(freePaidIds.map((id) => [id, cost()])),

  // Most popular
  ac: [
    // [CONFIRM] only "Room controlled" and "All-Weather (Hot & Cold)" were visible.
    { id: 'control', label: 'Select type', type: 'select', options: ['Room controlled', 'Centralized'] },
    { id: 'climate', label: 'Select mode', type: 'select', options: ['All-Weather (Hot & Cold)', 'Cooling only'] },
  ],
  roomService: [{ id: 'hours', label: 'Select', type: 'select', options: ['24 hours', 'Limited duration'] }],
  wifi: [
    { id: 'cost', label: 'Select', type: 'select', options: FREE_PAID },
    { id: 'quality', label: 'Select', type: 'select', options: ['Speed Suitable for working', 'Speed Suitable for Surfing', 'Unreliable', 'Available in lobby'] },
  ],
  frontDesk: [
    { id: 'hours', label: 'Select', type: 'select', options: ['24 hours', 'Limited duration'] },
    { id: 'language', label: 'Select', type: 'select', options: ['Hindi spoken at front desk', 'English Spoken at front desk'] },
  ],
  bar: [{ id: 'type', label: 'Select', type: 'multi', options: ['Rooftop'] }],
  // [CONFIRM] list scrolled after "Jain food available".
  restaurant: [{ id: 'food', label: 'Select', type: 'multi', options: ['Halal', 'Kosher', 'Veg food available', 'Jain food available', 'Non-veg food available', 'Multi-cuisine', 'Rooftop'] }],
  gym: [{ id: 'features', label: 'Select', type: 'multi', options: ['24-hour', 'Personal Trainer'] }],
  shuttle: [
    { id: 'cost', label: 'Select', type: 'select', options: FREE_PAID },
    { id: 'vehicle', label: 'Select', type: 'multi', options: ['Private taxi', 'Luxury Car', 'Shared shuttle'] },
  ],
  // [CONFIRM] options weren't visible in the screenshots.
  kidsPlayArea: [{ id: 'type', label: 'Select', type: 'select', options: ['Indoor', 'Outdoor'] }],

  // General services
  laundry: [
    { id: 'cost', label: 'Select', type: 'select', options: FREE_PAID },
    { id: 'extra', label: 'Select', type: 'multi', options: ['Limited Pieces of Laundry Free'] },
  ],
  newspaper: [{ id: 'language', label: 'Select', type: 'multi', options: ['Local Language', 'English'] }],
  lobbyLounge: [{ id: 'type', label: 'Select', type: 'multi', options: ['Cigar lounge', 'Private', 'Shared'] }],
  // [CONFIRM] list scrolled after "Gujarati".
  multilingualStaff: [{ id: 'languages', label: 'Select', type: 'multi', options: ['English', 'Urdu', 'Arabic', 'Gujarati', 'Hindi', 'Bengali', 'Marathi', 'Punjabi', 'Tamil', 'Telugu', 'Kannada', 'Malayalam', 'French', 'German', 'Spanish', 'Russian', 'Chinese'] }],
  // [CONFIRM] list scrolled after "Tactile signs".
  speciallyAbledAssistance: [{ id: 'help', label: 'Select', type: 'multi', options: ['Auditory Guidance', 'Wheelchair', 'Braille', 'Tactile signs'] }],
  butlerServices: [{ id: 'type', label: 'Select', type: 'multi', options: ['Personal', 'For each floor'] }],

  // Security, basic facilities
  smokeDetector: [{ id: 'where', label: 'Select', type: 'multi', options: ['In Room', 'Lobby'] }],
  evChargingStationWithinPremise: [{ id: 'speed', label: 'Select', type: 'select', options: ['Slow Charging', 'Fast Charging', 'Rapid Charging'] }],

  // Outdoor
  beach: [{ id: 'type', label: 'Select', type: 'multi', options: ['Private', 'Beachfront'] }],
  // [CONFIRM] list scrolled after "Tennis".
  outdoorSports: [{ id: 'sports', label: 'Select', type: 'multi', options: ['Cricket', 'Volleyball', 'Basketball', 'Tennis', 'Football', 'Badminton'] }],

  // Food and drink
  breakfast: [{ id: 'type', label: 'Select', type: 'multi', options: ['Indian veg food', 'Jain food'] }],
  foodOptionsAvailable: [{ id: 'type', label: 'Select', type: 'multi', options: ['Veg', 'Jain', 'Satvik'] }],

  // Entertainment, media
  // [CONFIRM] list scrolled after "Live Music".
  events: [{ id: 'type', label: 'Select', type: 'multi', options: ['Live Band', 'Live Singer', 'Live Ghazal', 'Live Music', 'DJ Night', 'Theme Parties'] }],
  // [CONFIRM] list scrolled after "HD Channels".
  tv: [{ id: 'type', label: 'Select', type: 'select', options: ['LED', 'LCD', 'Flat screen', 'International Channels', 'HD Channels', 'Smart TV'] }],

  // Water, indoor, live shows
  // [CONFIRM] list scrolled after "Fishing".
  waterSports: [{ id: 'sports', label: 'Select', type: 'multi', options: ['Wind surfing', 'Water Skiing', 'Diving', 'Fishing', 'Kayaking', 'Jet skiing'] }],
  // [CONFIRM] list scrolled after "Dart".
  indoorGames: [{ id: 'games', label: 'Select', type: 'multi', options: ['Board Games', 'Pool Table', 'Air Hockey', 'Dart', 'Carrom', 'Chess', 'Table Tennis'] }],
  casino: [{ id: 'entry', label: 'Select', type: 'multi', options: ['Free Entry', 'Paid Entry'] }],
  bonfire: [{ id: 'type', label: 'Select', type: 'select', options: ['On Request'] }],
}

/* ---------------- full forms ("+ Add …") ---------------- */

export type FormField =
  | { id: string; label: string; type: 'text'; optional?: boolean }
  | { id: string; label: string; type: 'radio' | 'check' | 'chips'; options: string[]; optional?: boolean; hint?: string }
  | { id: string; label: string; type: 'yesno'; optional?: boolean }
  | { id: string; label: string; type: 'stepper'; optional?: boolean }
  | { id: string; label: string; type: 'timing'; optional?: boolean }
  | { id: string; label: string; type: 'depth'; optional?: boolean }
  | { id: string; label: string; type: 'group'; optional?: boolean; parts: { id: string; label: string; type: 'check' | 'chips'; options: string[]; optional?: boolean; hint?: string }[] }

export interface AmenityForm {
  title: string
  /** Photos are always asked for; at least one is required. */
  photoLabel: string
  photoTag: 'Other' | 'Dining'
  fields: FormField[]
}

const ACCESS: FormField = { id: 'access', label: 'Access Type', type: 'radio', options: ['Private', 'Shared'] }
const simple = (title: string, photoTag: AmenityForm['photoTag'] = 'Other'): AmenityForm => ({ title, photoLabel: 'Photos', photoTag, fields: [{ id: 'name', label: 'Name', type: 'text' }, ACCESS] })

export const amenityForms: Record<string, AmenityForm> = {
  parking: {
    title: 'Parking',
    photoLabel: 'Parking Photos',
    photoTag: 'Other',
    fields: [
      { id: 'name', label: 'Parking Name', type: 'text' },
      ACCESS,
      { id: 'availability', label: 'Availability', type: 'radio', options: ['Ample Space Available', 'First Come First Serve'], optional: true },
      { id: 'location', label: 'Location & Type', type: 'radio', options: ['Inside property premises', 'Outside property premises'] },
      { id: 'vehicles', label: 'Vehicles Allowed', type: 'check', options: ['Car', 'Two-Wheeler', 'Mini-Van / Mini-Bus'], optional: true },
      { id: 'cost', label: 'Cost Of Parking', type: 'radio', options: FREE_PAID, optional: true },
      { id: 'features', label: 'Parking Features & Characteristics', type: 'chips', options: ['Covered', 'Valet', 'Secured/CCTV Monitored', 'Accessible Parking', 'EV Charging Available'], optional: true },
    ],
  },
  pool: {
    title: 'Swimming Pool',
    photoLabel: 'Pool Photos & Videos',
    photoTag: 'Other',
    fields: [
      { id: 'name', label: 'Pool Name', type: 'text' },
      { id: 'poolType', label: 'Pool Type', type: 'radio', options: ['Indoor', 'Outdoor'] },
      { id: 'suitable', label: 'Suitable for', type: 'radio', options: ['All ages', "Kid's only", 'Adult only'] },
      // [CONFIRM] the reference has a "View All" with more features.
      { id: 'features', label: 'Pool features and characteristics', type: 'chips', options: ['Roof top', 'Infinity edge', 'Temperature-controlled Pool', 'Glass edge pool', 'Heated pool', 'Plunge pool', 'Saltwater pool'], optional: true },
      { id: 'winter', label: 'Is the pool accessible during the winter season?', type: 'yesno' },
      // [CONFIRM] the reference has a "View All" with more facilities.
      { id: 'facilities', label: 'Facilities provided at the pool', type: 'chips', options: ['Showers/changing rooms', 'Sun umbrellas', 'Pool Towels', 'Toys/Floaties', 'Lifeguard on Duty', 'Sun loungers', 'Poolside bar'], optional: true },
      { id: 'timing', label: 'Timing', type: 'timing', optional: true },
      { id: 'depth', label: 'What is the depth of the pool?', type: 'depth', optional: true },
    ],
  },
  kitchen: {
    title: 'Kitchen/Kitchenette',
    photoLabel: 'Kitchen Photos',
    photoTag: 'Other',
    fields: [
      { id: 'name', label: 'Kitchen Name', type: 'text' },
      { id: 'size', label: 'Size of Kitchen', type: 'radio', options: ['Full Kitchen', 'Kitchenette'] },
      { id: 'use', label: 'What can the kitchen be used for', type: 'check', options: ['Cooking', 'Reheating'] },
      { id: 'nonVeg', label: 'Can non-veg be cooked/reheated in the kitchen? (includes eggs, meat, fish)', type: 'yesno' },
      {
        id: 'amenities',
        label: 'Kitchen Amenities',
        type: 'group',
        parts: [
          { id: 'equipment', label: 'Cooking Equipments', hint: 'Select at least one', type: 'check', options: ['Stove', 'Induction', 'Microwave', 'Oven'] },
          { id: 'cookware', label: 'Essential cookware / utensils', type: 'chips', options: ['Pots', 'Pans', 'Plates', 'Bowls', 'Glasses/Cups', 'Spoons/Fork', 'Knife', 'Cooking Spoons/Spatula'], optional: true },
          { id: 'groceries', label: 'Essential groceries', type: 'chips', options: ['Oil', 'Salt', 'Sugar'], optional: true },
        ],
      },
    ],
  },
  driverSAccommodation: simple("Driver's Accommodation"),
  balconyTerrace: simple('Balcony/ Terrace'),
  garden: simple('Garden'),
  lounge: simple('Lounge'),
  diningArea: {
    title: 'Dining Area',
    photoLabel: 'Photos',
    photoTag: 'Dining',
    fields: [
      { id: 'name', label: 'Name', type: 'text' },
      ACCESS,
      { id: 'seats', label: 'Number of seats', type: 'stepper', optional: true },
      { id: 'location', label: 'Location', type: 'radio', options: ['Indoor', 'Outdoor'], optional: true },
    ],
  },
}

// [CONFIRM] depth options weren't visible in the screenshots.
export const poolDepths = ['Up to 3 ft', '3–4 ft', '4–5 ft', '5–6 ft', '6–8 ft', 'More than 8 ft']
export const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

/** The amenity title shown on the form, e.g. "Mentioning a parking can positively influence…". */
export const formIntro = (title: string) => `Mentioning a ${title.toLowerCase()} can positively influence a guest’s booking decision`
