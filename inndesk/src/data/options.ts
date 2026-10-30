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
 * Property amenities, grouped as on the big Indian travel extranets. Owners tick what the property has.
 * `key` matches StayEasy's own amenity list, so those show with icons and work as search filters
 * on StayEasy; the rest are listed on the hotel page as text.
 */
export const amenityGroups: { group: string; items: { id: string; label: string; key?: string }[] }[] = [
  {
    group: "Most popular",
    items: [
      {
        id: "ac",
        label: "Air conditioning",
        key: "ac"
      },
      {
        id: "parking",
        label: "Parking",
        key: "parking"
      },
      {
        id: "roomService",
        label: "Room service",
        key: "roomService"
      },
      {
        id: "pool",
        label: "Swimming pool",
        key: "pool"
      },
      {
        id: "wifi",
        label: "Free Wi-Fi",
        key: "wifi"
      },
      {
        id: "frontDesk",
        label: "24-hour front desk"
      },
      {
        id: "bar",
        label: "Bar"
      },
      {
        id: "restaurant",
        label: "Restaurant",
        key: "restaurant"
      },
      {
        id: "luggageAssistance",
        label: "Luggage assistance"
      },
      {
        id: "wheelchair",
        label: "Wheelchair accessible"
      },
      {
        id: "gym",
        label: "Gym / Fitness centre",
        key: "gym"
      },
      {
        id: "cctv",
        label: "CCTV in common areas"
      },
      {
        id: "shuttle",
        label: "Airport pickup / drop"
      },
      {
        id: "lift",
        label: "Lift / Elevator",
        key: "lift"
      },
      {
        id: "housekeeping",
        label: "Housekeeping"
      },
      {
        id: "kitchen",
        label: "Kitchen / Guest kitchen"
      },
      {
        id: "powerBackup",
        label: "Power backup",
        key: "powerBackup"
      },
      {
        id: "spa",
        label: "Spa"
      },
      {
        id: "kidsPlayArea",
        label: "Kids' Play Area"
      }
    ]
  },
  {
    group: "General Services",
    items: [
      {
        id: "laundry",
        label: "Laundry"
      },
      {
        id: "newspaper",
        label: "Newspaper"
      },
      {
        id: "smokingRooms",
        label: "Smoking rooms"
      },
      {
        id: "firstAidServices",
        label: "First-aid services"
      },
      {
        id: "lobbyLounge",
        label: "Lobby Lounge"
      },
      {
        id: "concierge",
        label: "Concierge"
      },
      {
        id: "multilingualStaff",
        label: "Multilingual Staff"
      },
      {
        id: "cloakRoom",
        label: "Cloak Room"
      },
      {
        id: "speciallyAbledAssistance",
        label: "Specially abled assistance"
      },
      {
        id: "butlerServices",
        label: "Butler Services"
      },
      {
        id: "doctorOnCall",
        label: "Doctor on call"
      },
      {
        id: "medicalCentreWithinPremise",
        label: "Medical centre (Within Premise)"
      },
      {
        id: "poolBeachTowels",
        label: "Pool / Beach towels"
      }
    ]
  },
  {
    group: "Security",
    items: [
      {
        id: "smokeDetector",
        label: "Smoke detector"
      },
      {
        id: "fireSafety",
        label: "Fire extinguishers"
      },
      {
        id: "securityAlarms",
        label: "Security alarms"
      },
      {
        id: "security",
        label: "24-hour security",
        key: "security"
      },
      {
        id: "carbonMonoxideDetector",
        label: "Carbon Monoxide Detector"
      },
      {
        id: "doorEye",
        label: "Door-Eye"
      },
      {
        id: "doorChain",
        label: "Door Chain"
      }
    ]
  },
  {
    group: "Basic Facilities",
    items: [
      {
        id: "hotWater",
        label: "24-hour hot water",
        key: "hotWater"
      },
      {
        id: "lan",
        label: "LAN"
      },
      {
        id: "refrigerator",
        label: "Refrigerator"
      },
      {
        id: "umbrellas",
        label: "Umbrellas"
      },
      {
        id: "washingMachine",
        label: "Washing Machine"
      },
      {
        id: "laundromat",
        label: "Laundromat"
      },
      {
        id: "evChargingStationWithinPremise",
        label: "EV Charging Station (Within Premise)"
      },
      {
        id: "driverSAccommodation",
        label: "Driver's Accommodation"
      },
      {
        id: "groceryPurchase",
        label: "Grocery Purchase"
      },
      {
        id: "utensilCleaning",
        label: "Utensil Cleaning"
      }
    ]
  },
  {
    group: "Outdoor Sports & Activities",
    items: [
      {
        id: "beach",
        label: "Beach"
      },
      {
        id: "golfCourseMiniGolf",
        label: "Golf Course / Mini Golf"
      },
      {
        id: "outdoorSports",
        label: "Outdoor sports"
      },
      {
        id: "skiing",
        label: "Skiing"
      },
      {
        id: "cycling",
        label: "Cycling"
      },
      {
        id: "rockClimbing",
        label: "Rock Climbing"
      },
      {
        id: "ziplining",
        label: "Ziplining"
      },
      {
        id: "archery",
        label: "Archery"
      },
      {
        id: "tennis",
        label: "Tennis"
      },
      {
        id: "basketballCourt",
        label: "Basketball court"
      },
      {
        id: "cricket",
        label: "Cricket"
      },
      {
        id: "badminton",
        label: "Badminton"
      },
      {
        id: "volleyBall",
        label: "Volleyball"
      },
      {
        id: "highRopeCourse",
        label: "High rope course"
      },
      {
        id: "paintball",
        label: "Paintball"
      },
      {
        id: "paragliding",
        label: "Paragliding"
      },
      {
        id: "camping",
        label: "Camping"
      },
      {
        id: "hotAirBalloonRide",
        label: "Hot Air Balloon Ride"
      },
      {
        id: "airRifleShooting",
        label: "Air Rifle Shooting"
      },
      {
        id: "footballSoccer",
        label: "Football / Soccer"
      },
      {
        id: "pickleBall",
        label: "Pickleball"
      },
      {
        id: "atvOrBuggyRide",
        label: "ATV or Buggy Ride"
      },
      {
        id: "zorbing",
        label: "Zorbing"
      },
      {
        id: "wallClimbing",
        label: "Wall Climbing"
      },
      {
        id: "bungeeJumping",
        label: "Bungee Jumping"
      },
      {
        id: "beachVolleyFootball",
        label: "Beach Volley / Football"
      },
      {
        id: "golfSimulator",
        label: "Golf Simulator"
      },
      {
        id: "rappelling",
        label: "Rappelling"
      }
    ]
  },
  {
    group: "Common Area",
    items: [
      {
        id: "balconyTerrace",
        label: "Balcony / Terrace"
      },
      {
        id: "garden",
        label: "Garden"
      },
      {
        id: "lounge",
        label: "Lounge"
      },
      {
        id: "sunDeck",
        label: "Sun Deck"
      },
      {
        id: "prayerRoom",
        label: "Prayer Room"
      },
      {
        id: "livingRoom",
        label: "Living Room"
      },
      {
        id: "outdoorFurniture",
        label: "Outdoor Furniture"
      }
    ]
  },
  {
    group: "Food and Drink",
    items: [
      {
        id: "barbeque",
        label: "Barbeque"
      },
      {
        id: "diningArea",
        label: "Dining Area"
      },
      {
        id: "kidSMenu",
        label: "Kid's Menu"
      },
      {
        id: "breakfast",
        label: "Breakfast available",
        key: "breakfast"
      },
      {
        id: "foodOptionsAvailable",
        label: "Food Options Available"
      },
      {
        id: "indianChef",
        label: "Indian Chef"
      },
      {
        id: "cookService",
        label: "Cook Service"
      }
    ]
  },
  {
    group: "Business Center and Conferences",
    items: [
      {
        id: "banquet",
        label: "Banquet hall"
      },
      {
        id: "businessCenter",
        label: "Business Center"
      },
      {
        id: "conferenceRoom",
        label: "Conference room"
      },
      {
        id: "photocopying",
        label: "Photocopying"
      },
      {
        id: "faxService",
        label: "Fax service"
      },
      {
        id: "printer",
        label: "Printer"
      }
    ]
  },
  {
    group: "Transfers",
    items: [
      {
        id: "pickupDrop",
        label: "Pickup / Drop"
      },
      {
        id: "shuttleService",
        label: "Shuttle Service"
      },
      {
        id: "railwayStationTransfers",
        label: "Railway Station Transfers"
      },
      {
        id: "busStationTransfers",
        label: "Bus Station Transfers"
      }
    ]
  },
  {
    group: "Entertainment",
    items: [
      {
        id: "events",
        label: "Events"
      },
      {
        id: "professionalPhotography",
        label: "Professional Photography"
      },
      {
        id: "nightClub",
        label: "Night Club"
      },
      {
        id: "beachClub",
        label: "Beach club"
      },
      {
        id: "movieRoom",
        label: "Movie Room"
      },
      {
        id: "musicSystem",
        label: "Music System"
      }
    ]
  },
  {
    group: "Shopping",
    items: [
      {
        id: "grocerySupermarketWithinPremise",
        label: "Grocery / Supermarket (Within Premise)"
      },
      {
        id: "souvenirShop",
        label: "Souvenir shop"
      },
      {
        id: "jewelleryShop",
        label: "Jewellery Shop"
      }
    ]
  },
  {
    group: "Media and technology",
    items: [
      {
        id: "tv",
        label: "TV in rooms",
        key: "tv"
      }
    ]
  },
  {
    group: "Payment Services",
    items: [
      {
        id: "atm",
        label: "ATM"
      },
      {
        id: "currencyExchange",
        label: "Currency Exchange"
      }
    ]
  },
  {
    group: "Family and kids",
    items: [
      {
        id: "kidsClub",
        label: "Kids' Club"
      },
      {
        id: "babysitting",
        label: "Babysitting"
      },
      {
        id: "crib",
        label: "Crib"
      }
    ]
  },
  {
    group: "Pet essentials",
    items: [
      {
        id: "petBowls",
        label: "Pet bowls"
      },
      {
        id: "petBaskets",
        label: "Pet baskets"
      }
    ]
  },
  {
    group: "Spa & Wellness",
    items: [
      {
        id: "massage",
        label: "Massage"
      },
      {
        id: "salon",
        label: "Salon"
      },
      {
        id: "steamAndSauna",
        label: "Steam and Sauna"
      },
      {
        id: "jacuzzi",
        label: "Jacuzzi"
      },
      {
        id: "activityCentre",
        label: "Activity Centre"
      },
      {
        id: "yoga",
        label: "Yoga"
      },
      {
        id: "meditationRoom",
        label: "Meditation Room"
      },
      {
        id: "solarium",
        label: "Solarium"
      },
      {
        id: "hotSpringBathWithinPremise",
        label: "Hot Spring bath (Within Premise)"
      },
      {
        id: "hammam",
        label: "Hammam"
      },
      {
        id: "ayurvedicTreatmentWithinPremise",
        label: "Ayurvedic Treatment (Within Premise)"
      }
    ]
  },
  {
    group: "Accessibility",
    items: [
      {
        id: "auditoryGuidance",
        label: "Auditory Guidance"
      },
      {
        id: "visualAidsBraille",
        label: "Visual aids (Braille)"
      },
      {
        id: "visualAidsTactileSigns",
        label: "Visual aids (tactile signs)"
      },
      {
        id: "ramp",
        label: "Ramp"
      },
      {
        id: "stepFreeEntrance",
        label: "Step free entrance"
      },
      {
        id: "designatedAccessibleParking",
        label: "Designated Accessible Parking"
      },
      {
        id: "widePathways",
        label: "Wide Pathways"
      },
      {
        id: "toiletWithGrabrails",
        label: "Toilet with grabrails"
      },
      {
        id: "raisedToilet",
        label: "Raised toilet"
      },
      {
        id: "loweredSink",
        label: "Lowered sink"
      },
      {
        id: "bathroomEmergencyCord",
        label: "Bathroom emergency cord"
      }
    ]
  },
  {
    group: "Water Sports & Activities",
    items: [
      {
        id: "kayaking",
        label: "Kayaking"
      },
      {
        id: "snorkelling",
        label: "Snorkelling"
      },
      {
        id: "waterSports",
        label: "Water sports"
      },
      {
        id: "canoeing",
        label: "Canoeing"
      },
      {
        id: "waterParkWithinPremise",
        label: "Water Park (Within Premise)"
      },
      {
        id: "scubaDiving",
        label: "Scuba Diving"
      },
      {
        id: "jetSkiing",
        label: "Jet skiing"
      },
      {
        id: "paddleBoarding",
        label: "Paddle Boarding"
      },
      {
        id: "pedalBoats",
        label: "Pedal Boats"
      },
      {
        id: "bananaBoatRide",
        label: "Banana Boat Ride"
      },
      {
        id: "fishing",
        label: "Fishing"
      },
      {
        id: "windsurfing",
        label: "Windsurfing"
      },
      {
        id: "beachVolleyball",
        label: "Beach Volleyball"
      },
      {
        id: "laserBoat",
        label: "Laser Boat"
      },
      {
        id: "glassBottomBoat",
        label: "Glass Bottom Boat"
      },
      {
        id: "parasailing",
        label: "Parasailing"
      },
      {
        id: "beachFootball",
        label: "Beach football"
      },
      {
        id: "surfing",
        label: "Surfing"
      },
      {
        id: "riverRafting",
        label: "River Rafting"
      },
      {
        id: "dolphinBoatRide",
        label: "Dolphin Boat Ride"
      },
      {
        id: "waterSkiing",
        label: "Water Skiing"
      },
      {
        id: "diving",
        label: "Diving"
      },
      {
        id: "motorBoatRide",
        label: "Motor Boat ride"
      },
      {
        id: "boatRide",
        label: "Boat Ride"
      },
      {
        id: "beachSports",
        label: "Beach Sports"
      }
    ]
  },
  {
    group: "Indoor Sports & Activities",
    items: [
      {
        id: "library",
        label: "Library"
      },
      {
        id: "indoorGames",
        label: "Indoor games"
      },
      {
        id: "indoorGamesRoom",
        label: "Indoor games room"
      },
      {
        id: "tableTennis",
        label: "Table Tennis"
      },
      {
        id: "billiardsPoolTable",
        label: "Billiards / Pool table"
      },
      {
        id: "boardGames",
        label: "Board Games"
      },
      {
        id: "foosballTable",
        label: "Foosball table"
      },
      {
        id: "airHockeyTable",
        label: "Air hockey table"
      },
      {
        id: "gameZoneArcade",
        label: "Game Zone / Arcade"
      },
      {
        id: "virtualGamingVrZone",
        label: "Virtual Gaming / VR Zone"
      },
      {
        id: "dartBoard",
        label: "Dart Board"
      },
      {
        id: "bowling",
        label: "Bowling"
      },
      {
        id: "squash",
        label: "Squash"
      }
    ]
  },
  {
    group: "Live Shows, Music & Entertainment Activities",
    items: [
      {
        id: "casino",
        label: "Casino"
      },
      {
        id: "bonfire",
        label: "Bonfire"
      },
      {
        id: "liveMusic",
        label: "Live Music"
      },
      {
        id: "culturalProgramme",
        label: "Cultural Programme"
      },
      {
        id: "movieScreenings",
        label: "Movie Screenings"
      },
      {
        id: "karaoke",
        label: "Karaoke"
      },
      {
        id: "magicShows",
        label: "Magic Shows"
      },
      {
        id: "puppetShows",
        label: "Puppet Shows"
      },
      {
        id: "liveArtPerformance",
        label: "Live Art Performance"
      },
      {
        id: "standUpComedy",
        label: "Stand-up Comedy"
      },
      {
        id: "lightSoundShow",
        label: "Light & Sound Show"
      },
      {
        id: "rainDance",
        label: "Rain Dance"
      },
      {
        id: "djParty",
        label: "DJ Party"
      },
      {
        id: "fireworkShow",
        label: "Firework Show"
      },
      {
        id: "dancePerformance",
        label: "Dance Performance"
      },
      {
        id: "discoClub",
        label: "Disco Club"
      },
      {
        id: "aartiCeremony",
        label: "Aarti Ceremony"
      },
      {
        id: "droneShow",
        label: "Drone Show"
      }
    ]
  },
  {
    group: "Wildlife Safari and Wildlife Exploration",
    items: [
      {
        id: "jungleSafari",
        label: "Jungle Safari"
      },
      {
        id: "wildlifePhotography",
        label: "Wildlife Photography"
      },
      {
        id: "wildlifeDocumentary",
        label: "Wildlife Documentary"
      },
      {
        id: "nightSafari",
        label: "Night Safari"
      },
      {
        id: "forestCamping",
        label: "Forest Camping"
      },
      {
        id: "dolphinWatching",
        label: "Dolphin Watching"
      },
      {
        id: "tigerSafari",
        label: "Tiger Safari"
      },
      {
        id: "leopardSafari",
        label: "Leopard Safari"
      },
      {
        id: "lionSafari",
        label: "Lion Safari"
      },
      {
        id: "elephantSafari",
        label: "Elephant Safari"
      },
      {
        id: "whaleWatching",
        label: "Whale Watching"
      },
      {
        id: "turtleWatching",
        label: "Turtle Watching"
      },
      {
        id: "seaLifeExploration",
        label: "Sea Life Exploration"
      }
    ]
  },
  {
    group: "Rides, Safari, Excursions & Tour",
    items: [
      {
        id: "bicycleRide",
        label: "Bicycle Ride"
      },
      {
        id: "jeepSafari",
        label: "Jeep Safari"
      },
      {
        id: "camelRide",
        label: "Camel Ride"
      },
      {
        id: "horseRide",
        label: "Horse Ride"
      },
      {
        id: "tractorRide",
        label: "Tractor Ride"
      },
      {
        id: "carriageOrCartRide",
        label: "Carriage or Cart Ride"
      },
      {
        id: "cableCarRide",
        label: "Cable Car Ride"
      },
      {
        id: "shikaraRide",
        label: "Shikara Ride"
      },
      {
        id: "gondolaRide",
        label: "Gondola Ride"
      },
      {
        id: "desertSafari",
        label: "Desert Safari"
      },
      {
        id: "walkingTours",
        label: "Walking Tours"
      },
      {
        id: "boatRideOrTour",
        label: "Boat Ride or Tour"
      },
      {
        id: "pubCrawls",
        label: "Pub Crawls"
      },
      {
        id: "plantationTour",
        label: "Plantation Tour"
      },
      {
        id: "horticultureTour",
        label: "Horticulture Tour"
      },
      {
        id: "cyclingTrail",
        label: "Cycling Trail"
      },
      {
        id: "vintageCarRide",
        label: "Vintage Car ride"
      },
      {
        id: "hillTrek",
        label: "Hill Trek"
      }
    ]
  },
  {
    group: "Nature Activities, Walks & Treks",
    items: [
      {
        id: "forestHiking",
        label: "Forest Hiking"
      },
      {
        id: "riversideTrek",
        label: "Riverside Trek"
      },
      {
        id: "natureWalkHike",
        label: "Nature Walk / Hike"
      },
      {
        id: "birdWatching",
        label: "Bird Watching"
      },
      {
        id: "guidedNightWalk",
        label: "Guided Night Walk"
      },
      {
        id: "teaFactoryVisit",
        label: "Tea Factory Visit"
      },
      {
        id: "teaPlantationWalk",
        label: "Tea Plantation Walk"
      },
      {
        id: "villageWalk",
        label: "Village Walk"
      },
      {
        id: "starGazing",
        label: "Star Gazing"
      },
      {
        id: "trekking",
        label: "Trekking"
      }
    ]
  },
  {
    group: "Hands-on Workshops & Interactive Activities",
    items: [
      {
        id: "cookingClass",
        label: "Cooking class"
      },
      {
        id: "potteryMaking",
        label: "Pottery Making"
      },
      {
        id: "drawingPaintingActivities",
        label: "Drawing & Painting Activities"
      },
      {
        id: "craftActivities",
        label: "Craft Activities"
      },
      {
        id: "bangleMaking",
        label: "Bangle Making"
      },
      {
        id: "blockPainting",
        label: "Block Painting"
      },
      {
        id: "photographyClass",
        label: "Photography Class"
      },
      {
        id: "heenaArt",
        label: "Henna Art"
      },
      {
        id: "cocktailMakingWorkshop",
        label: "Cocktail Making Workshop"
      },
      {
        id: "environmentActivities",
        label: "Environment Activities"
      },
      {
        id: "astrologerSession",
        label: "Astrologer Session"
      },
      {
        id: "caricatureDrawings",
        label: "Caricature Drawings"
      }
    ]
  }
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

/** Room Details dropdowns. [CONFIRM] lists against the reference screens when available. */
export const roomTypes = ['Standard Room', 'Deluxe Room', 'Super Deluxe Room', 'Premium Room', 'Executive Room', 'Club Room', 'Junior Suite', 'Suite', 'Family Room', 'Studio', 'Apartment', 'Cottage', 'Villa', 'Dormitory', 'Tent']
export const roomViews = ['City View', 'Garden View', 'Pool View', 'Sea View', 'Beach View', 'Mountain View', 'Lake View', 'River View', 'Valley View', 'Forest View', 'Courtyard View', 'No View']
export const mealPlans = ['Room only', 'Breakfast included']
