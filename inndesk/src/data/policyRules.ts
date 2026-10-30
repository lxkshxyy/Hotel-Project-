/**
 * Property Rules on the Policies step, grouped as on the big Indian extranets.
 * Answers are saved in listing.policies.house by rule id.
 * [CONFIRM] items: the second ID-proof question, the extra-kids bed question and the meal-price group
 * were only partly visible on the reference screens.
 */
export type RuleKind = 'yn' | 'yns' | 'multi' | 'choice' | 'price'

export interface PolicyRule {
  id: string
  q: string
  kind: RuleKind
  options?: string[]
  /** A follow-up shown when this rule's answer is one of `when`. */
  follow?: { when: string[]; rule: PolicyRule }
}

export interface PolicyGroup {
  id: string
  title: string
  intro?: string
  icon: 'guest' | 'id' | 'restrict' | 'pet' | 'clock' | 'infant' | 'bed' | 'beds' | 'meal'
  rules: PolicyRule[]
}

const bedTypes = ['Cot', 'Mattress', 'Sofa cum Bed']

export const policyGroups: PolicyGroup[] = [
  {
    id: 'guest',
    title: 'Guest Profile',
    icon: 'guest',
    rules: [
      { id: 'couples', q: 'Do you allow unmarried couples?', kind: 'yn', follow: { when: ['yes'], rule: { id: 'coupleTag', q: 'Do you want to show couple friendly tag on StayEasy?', kind: 'yn' } } },
      { id: 'under18', q: 'Do you allow guests below 18 years of age at your property?', kind: 'yn' },
      { id: 'maleGroups', q: 'Groups with only male guests are allowed at your property?', kind: 'yn' },
    ],
  },
  {
    id: 'ids',
    title: 'Acceptable Identity Proofs',
    icon: 'id',
    rules: [
      { id: 'idProofs', q: 'Acceptable Identity Proofs', kind: 'multi', options: ['Passport', 'Aadhaar', 'Driving License', 'Govt. ID'] },
      { id: 'localIds', q: 'Are IDs with an address in the same city as the property allowed?', kind: 'yn' },
    ],
  },
  {
    id: 'restrict',
    title: 'Property Restrictions',
    icon: 'restrict',
    rules: [
      { id: 'smoking', q: "Is smoking allowed anywhere within the premises? (Select 'No' if it's not permitted, even in outdoor spaces like balconies or lawns, or any designated smoking area)", kind: 'yn' },
      { id: 'parties', q: 'Are private parties or events allowed at the property?', kind: 'yn' },
      { id: 'wheelchair', q: 'Is your property accessible for guests who use a wheelchair?', kind: 'yn' },
      { id: 'visitors', q: 'Can guests invite any outside visitors in the room during their stay?', kind: 'yn' },
    ],
  },
  {
    id: 'pet',
    title: 'Pet Policy',
    icon: 'pet',
    rules: [
      { id: 'petsLiving', q: 'Any pet(s) living on the property?', kind: 'yn' },
      { id: 'petsAllowed', q: 'Are pets allowed?', kind: 'yn' },
    ],
  },
  {
    id: 'checkin',
    title: 'Checkin and Checkout Policies',
    icon: 'clock',
    rules: [{ id: 'checkin24', q: 'Do you have a 24-hour check-in?', kind: 'yn' }],
  },
  {
    id: 'infant',
    title: 'Infant Policy',
    icon: 'infant',
    rules: [
      { id: 'infantFree', q: 'Do you want to include 1 infant (0-2 yrs) per room without counting them in total room occupancy?', kind: 'yn' },
      {
        id: 'infantFood',
        q: 'Do you provide complimentary food item(s) like warm milk for infants (0-2 yrs) on request?',
        kind: 'yn',
        follow: { when: ['yes'], rule: { id: 'infantFoodItems', q: 'Please mention the complimentary food item(s)', kind: 'multi', options: ['Warm Milk', 'Khichdi', 'Pongal', 'Dalia', 'Rava Kanji', 'Fruit Purees', 'Vegetable Purees', 'Mashed Potatoes / Soft Mashed Vegetables'] } },
      },
    ],
  },
  {
    id: 'ebInclusion',
    title: 'Extra Bed Inclusion Policy',
    intro: 'This confirms whether extra bed/mattress is included in the extra adult/paid child rates defined for each room type',
    icon: 'bed',
    rules: [
      {
        id: 'ebIncluded',
        q: 'Is extra bed/mattress included in extra adult/paid child rates?',
        kind: 'yn',
        follow: { when: ['yes'], rule: { id: 'ebCovers', q: 'Which of the following rates does it cover?', kind: 'choice', options: ['Extra adult and Extra paid child', 'Extra adult only'] } },
      },
    ],
  },
  {
    id: 'extraBeds',
    title: 'Extra Bed Policies',
    icon: 'beds',
    rules: [
      { id: 'ebAdults', q: 'Do you provide bed to extra adults?', kind: 'yns', follow: { when: ['yes', 'subject'], rule: { id: 'ebAdultTypes', q: 'Please mention the type of extra bed provided to adults', kind: 'multi', options: bedTypes } } },
      { id: 'ebKids', q: 'Do you provide bed to extra kids?', kind: 'yns', follow: { when: ['yes', 'subject'], rule: { id: 'ebKidTypes', q: 'Please mention the type of extra bed provided to kids', kind: 'multi', options: bedTypes } } },
    ],
  },
  {
    id: 'meals',
    title: 'Meal Prices',
    intro: 'Price per person for meals not included in the room’s meal plan. Leave empty if not offered.',
    icon: 'meal',
    rules: [
      { id: 'mealBreakfast', q: 'Breakfast', kind: 'price' },
      { id: 'mealLunch', q: 'Lunch', kind: 'price' },
      { id: 'mealDinner', q: 'Dinner', kind: 'price' },
    ],
  },
]

export type HouseAnswers = Record<string, string | string[]>

export const answered = (v: string | string[] | undefined) => (Array.isArray(v) ? v.length > 0 : !!v)

/** Sentences guests read under Property Rules, from the answers above. */
export function houseRuleLines(h: HouseAnswers = {}): string[] {
  const out: string[] = []
  const yn = (id: string, yes: string, no: string) => {
    if (h[id] === 'yes') out.push(yes)
    else if (h[id] === 'no') out.push(no)
  }
  const list = (id: string) => (Array.isArray(h[id]) ? (h[id] as string[]) : [])
  yn('couples', 'Unmarried couples are welcome.', 'Unmarried couples are not allowed.')
  yn('under18', 'Guests below 18 years of age are allowed.', 'Guests below 18 years of age are not allowed.')
  yn('maleGroups', 'Groups with only male guests are allowed.', 'Groups with only male guests are not allowed.')
  if (list('idProofs').length) out.push(`Accepted ID proofs: ${list('idProofs').join(', ')}.`)
  yn('parties', 'Private parties or events are allowed.', 'Private parties or events are not allowed.')
  yn('wheelchair', 'The property is accessible for guests who use a wheelchair.', 'The property is not wheelchair accessible.')
  yn('visitors', 'Guests can invite outside visitors to their room.', 'Outside visitors are not allowed in the rooms.')
  if (h.petsLiving === 'yes') out.push('Pets live on the property.')
  if (h.checkin24 === 'yes') out.push('24-hour check-in is available.')
  if (h.infantFree === 'yes') out.push('1 infant (0-2 years) per room stays free and is not counted in room occupancy.')
  if (h.infantFood === 'yes') out.push(`Complimentary food for infants on request${list('infantFoodItems').length ? `: ${list('infantFoodItems').join(', ')}` : ''}.`)
  if (h.ebIncluded === 'yes') out.push(h.ebCovers === 'Extra adult only' ? 'An extra bed or mattress is included in the extra adult rate.' : 'An extra bed or mattress is included in the extra adult and paid child rates.')
  const beds = (id: string, types: string, who: string) => {
    if (h[id] === 'no') out.push(`Extra beds are not provided for ${who}.`)
    else if (h[id] === 'yes' || h[id] === 'subject') out.push(`Extra beds for ${who}${list(types).length ? ` (${list(types).join(', ')})` : ''}${h[id] === 'subject' ? ', subject to availability' : ''}.`)
  }
  beds('ebAdults', 'ebAdultTypes', 'adults')
  beds('ebKids', 'ebKidTypes', 'kids')
  const meals = (['Breakfast', 'Lunch', 'Dinner'] as const).filter((m) => h[`meal${m}`]).map((m) => `${m} ₹${h[`meal${m}`]}`)
  if (meals.length) out.push(`Meals per person: ${meals.join(', ')}.`)
  return out
}
