import { site } from '../config/site'

/** Partner Help: topics, articles and the "Most viewed" list. Written for InnDesk / TRPOTELS. */
export type Block = string | { steps: string[] } | { list: string[] } | { tip: string }
export type Article = { slug: string; title: string; topic: string; tag?: string; body: Block[] }
export type Topic = { id: string; title: string; icon: string; articles: string[] }

const m = site.marketplace
const pct = (n: number) => `${Math.round(n * 100)}%`

export const articles: Article[] = [
  // Account, login and contacting us
  {
    slug: 'inndesk-account',
    topic: 'account',
    title: 'InnDesk sign-in and your account',
    body: [
      `InnDesk is where you list and manage your properties on ${m}. You sign in with the email and password you chose when you created your account.`,
      { steps: ['Open InnDesk and enter your email and password.', 'Forgot your password? Choose “Forgot password” and follow the code we email you.', 'To change your password later, open the menu under your name (top right) and choose “Change password”.'] },
      { tip: 'Keep your email address up to date: booking alerts, sign-in codes and payout notices are sent there.' },
    ],
  },
  {
    slug: 'contact-us',
    topic: 'account',
    title: `${m} support for property partners`,
    tag: 'Contact us',
    body: [
      `Our partner team helps with listings, bookings, payments and anything else on ${m}.`,
      { list: [site.supportPhone ? `Phone: ${site.supportPhone}` : 'Phone: shown here once the support number is set up', site.supportEmail ? `Email: ${site.supportEmail}` : 'Email: shown here once the support email is set up', 'Hours: Monday to Saturday, 10 am to 7 pm'] },
      'When you contact us, mention your property name and, for a booking question, the booking ID (it starts with TRP-). It helps us answer faster.',
    ],
  },
  // Guest policies & payments
  {
    slug: 'guest-policies',
    topic: 'policies',
    title: 'Managing guest policies',
    body: [
      'Your policies tell guests what to expect before they book: check-in and check-out times, ID rules, couples, children, pets, smoking, food and more.',
      { steps: ['Open your property and go to Property Information → Rules & Policies.', 'Choose your check-in and check-out times.', 'Answer each rule group (for example “Guest profile” or “Pets”). Answers show on your hotel page.', 'Save. Changes reach the website straight away.'] },
      { tip: 'Clear rules mean fewer surprises at the front desk. If you don’t accept local IDs or unmarried couples, say so here.' },
    ],
  },
  {
    slug: 'guest-cancellations',
    topic: 'policies',
    title: 'Managing guest cancellations',
    body: [
      'You choose one cancellation policy per property. Guests see it on your hotel page, at checkout and on their voucher.',
      { list: ['Free cancellation till check-in', 'Free cancellation till 24, 48 or 72 hours before check-in', 'Non-refundable'] },
      'When a guest cancels, the booking shows as Cancelled in Bookings and the room goes back on sale. If the guest paid online, any refund follows your policy.',
      { tip: 'Flexible policies usually get more bookings. Non-refundable suits peak dates and special offers.' },
    ],
  },
  {
    slug: 'guest-payments',
    topic: 'policies',
    tag: 'Featured',
    title: 'What are the different payment methods and how do they work?',
    body: [
      `Guests can book in two ways on ${m}:`,
      { list: ['Pay at hotel: the guest pays you at check-in. This is the default for every property.', 'Pay online: the guest pays when booking, and we send you the money in your payout (being switched on soon).'] },
      'Each booking shows its payment model in Bookings, so the front desk knows whether to collect payment.',
    ],
  },
  {
    slug: 'pay-at-hotel',
    topic: 'policies',
    title: 'Pay at hotel (you collect from the guest)',
    body: [
      'For Pay at hotel bookings, you collect the full amount shown on the guest’s voucher when they arrive.',
      { steps: ['Check the amount in Bookings → View.', 'Collect payment at check-in (cash, card or UPI, as you accept).', 'Issue your GST invoice to the guest.', `Our commission (${pct(site.commissionRate)} + GST) for these stays is settled with you each month.`] },
    ],
  },
  {
    slug: 'online-payouts',
    topic: 'policies',
    tag: 'Payouts',
    title: 'How do I get paid for online bookings?',
    body: [
      `When a guest pays online, ${m} holds the money and pays it to your bank account after the stay.`,
      { list: [`Payouts are sent ${site.payoutCycle}.`, `We keep our commission (${pct(site.commissionRate)} of the room amount) plus ${pct(site.gstOnCommission)} GST on that commission.`, 'Your bank account must be added and verified first (Property Information → Financial & Bank Details).'] },
      { tip: 'See each payout under Payments → Payouts.' },
    ],
  },
  // Working together
  {
    slug: 'list-your-property',
    topic: 'together',
    tag: 'Featured',
    title: `How can I list my property on ${m}?`,
    body: [
      `Listing is free. You can list a hotel, home, villa, homestay or unique stay anywhere in India.`,
      { steps: ['On My Properties, choose “+ List New Property”.', 'Pick the type of property (Home-type, Hotel-type or Unique-type), then the exact kind.', `Complete the seven sections: Basic Info, Location, Amenities, Rooms, Photos (at least ${site.minPhotos}), Policies and Finance & Legal.`, 'Check the Review page and publish. Your property goes live on the website straight away.'] },
      { tip: 'You can stop at any point. Unfinished listings wait under In-Progress Properties; choose ⋮ → Resume listing to carry on.' },
    ],
  },
  {
    slug: 'working-with-us',
    topic: 'together',
    title: `Working with ${m}`,
    body: [
      `${m} sells rooms at your property to travellers, business travellers and travel agents. You stay in charge of your rooms, prices and rules; we bring the bookings.`,
      { list: ['You keep your listing up to date in InnDesk.', 'We show your property on the website, the business panel and the agent panel.', `We earn a commission (${pct(site.commissionRate)}) only on completed stays.`] },
    ],
  },
  // Rates & availability
  {
    slug: 'update-rates',
    topic: 'rates',
    title: 'Updating your rates and availability',
    body: [
      'Each room type has a price per night and a number of rooms you sell on our site.',
      { steps: ['Go to Property Information → Rooms & Rateplans.', 'Open a room and change the price, extra-guest charges or number of rooms.', 'Save. The website updates straight away.'] },
      { tip: 'Day-by-day prices and closing dates will be available under Rates & Inventory → Manage Rates & Inventory.' },
    ],
  },
  {
    slug: 'promotions',
    topic: 'rates',
    tag: 'Featured',
    title: 'What are promotions?',
    body: [
      'Promotions are discounts you offer to win more bookings, for example a last-minute deal, an early-bird discount or a long-stay offer.',
      'Promotions show a sale label on your hotel card, which helps you stand out in search results.',
      'There are three tiers. Promotions (Tier 1): Basic, Last Minute, Early Bird and Long Stay; only the best one applies. Special Audience Promotions (Tier 2): extra discounts for one group, such as mobile app users. Coupons (Tier 3): a code guests enter at checkout.',
      { steps: ['Go to Grow your Business → Promotions & Coupons.', 'Pick a promotion and click Create.', 'Set the discount, booking dates, stay dates and rooms, then save.', 'See every promotion, with its room nights and revenue, under My Promotions.'] },
      { tip: 'Use Check Post Promotion Price to see exactly what a guest pays after all three tiers.' },
    ],
  },
  {
    slug: 'surcharges',
    topic: 'rates',
    title: 'Loading surcharges',
    body: [
      'Surcharges are extra charges on top of the room price, such as an extra adult or child, an extra bed, or early check-in and late check-out.',
      { steps: ['Extra guest and extra bed charges: set them on each room in Rooms & Rateplans.', 'Paid early check-in or late check-out: coming under Rates & Inventory.'] },
      'Guests see these charges before they pay, so there are no surprises at check-in.',
    ],
  },
  // Reservations
  {
    slug: 'check-in-procedures',
    topic: 'reservations',
    tag: 'Featured',
    title: `What are the check-in procedures for ${m} bookings?`,
    body: [
      'Every guest gets a booking voucher with a booking ID (starting TRP-), a QR code and the amount to pay.',
      { steps: ['Ask for the booking ID or scan the voucher QR.', 'Find the booking in Bookings and check the guest name and room.', 'Check a valid photo ID as per your policies.', 'For Pay at hotel bookings, collect the amount shown.', 'Choose “Check in” in Bookings. At departure, choose “Check out”.'] },
      { tip: 'If a guest doesn’t arrive, mark the booking as a no-show from View so your records stay correct.' },
    ],
  },
  {
    slug: 'manage-reservations',
    topic: 'reservations',
    title: 'Managing your reservations',
    body: [
      'Bookings shows every reservation for your property, newest within seconds.',
      { list: ['Search by booking ID, guest name or phone.', 'Filter by check-in, stay or booking dates, and by status.', 'Export CSV downloads the bookings you see.', 'View opens the booking, with guest details, payment and quick actions.'] },
    ],
  },
  {
    slug: 'communicating',
    topic: 'reservations',
    title: 'Communicating with guests',
    body: [
      'Each booking includes the guest’s phone number and email. Use them to confirm arrival time, share directions or answer questions.',
      { tip: 'A short message the day before arrival (with your address and check-in time) reduces no-shows.' },
    ],
  },
  {
    slug: 'guest-reviews',
    topic: 'reservations',
    title: 'Guest reviews',
    body: [
      'After their stay, guests can rate your property and write a review. Good reviews help you rank higher and sell more.',
      { tip: 'Reading and replying to reviews will be available under Ratings & Reviews.' },
    ],
  },
  // Property page content
  {
    slug: 'general-info',
    topic: 'content',
    title: 'Managing property’s general information',
    body: [
      'Your property name, star rating, contact details and description are set in Basic Info.',
      { steps: ['Go to Property Information → Basic Information.', 'Update the details and save.', 'If you change your phone or email, verify it with the code we send.'] },
    ],
  },
  {
    slug: 'facilities',
    topic: 'content',
    title: 'Managing your facilities',
    body: [
      'Facilities (amenities) help guests choose you, and some guests filter by them, for example parking, Wi-Fi or a pool.',
      { steps: ['Go to Property Information → Amenities & Restaurant.', 'Tick everything you offer, and add details where asked (for example parking type).', 'Save.'] },
      { tip: 'Star-rated hotels need a minimum number of amenities for their rating.' },
    ],
  },
  {
    slug: 'photos',
    topic: 'content',
    title: 'Managing your photos',
    body: [
      `Great photos are the biggest reason guests book. You need at least ${site.minPhotos} photos, and they must be landscape (wider than tall).`,
      { steps: ['Go to Property Information → Photos & Videos.', 'Upload photos of the outside, lobby, every room type, bathrooms and facilities.', 'Tag each photo so it shows in the right place.'] },
      { tip: `Use bright, sharp photos up to ${site.maxPhotoMb} MB each. Don’t add watermarks or text.` },
    ],
  },
  // First steps
  {
    slug: 'getting-online',
    topic: 'first',
    title: 'Getting your property online and bookable',
    body: [
      'Once you publish, your property is live on the website and can take bookings straight away.',
      { list: ['Make sure every room has a price and rooms to sell.', 'Check your hotel page from Home → “View on TRPOTELS”.', 'Add your bank account so online payments can reach you.'] },
    ],
  },
  {
    slug: 'first-reservations',
    topic: 'first',
    title: 'Handling your first few reservations',
    body: [
      'Your first bookings matter: happy first guests leave the reviews that bring the next ones.',
      { steps: ['Watch Bookings for new reservations.', 'Contact the guest before arrival.', 'Follow the check-in steps and mark Check in / Check out.', 'Ask happy guests to leave a review.'] },
    ],
  },
  // Growing your business
  { slug: 'visibility', topic: 'grow', title: 'Increasing your visibility', body: ['Properties with complete information, many good photos and strong reviews show higher in search.', { list: ['Raise your Content Score by completing every section.', 'Keep prices competitive for your area.', 'Run promotions for quiet dates under Grow your Business → Promotions & Coupons.'] }] },
  { slug: 'revenue', topic: 'grow', title: 'Increasing your revenue', body: ['Small changes can raise what each booking earns.', { list: ['Offer meal plans and add-ons.', 'Charge fairly for extra guests and early check-in.', 'Use promotions for quiet dates instead of cutting your base price.'] }] },
  { slug: 'flexibility', topic: 'grow', title: 'Offering flexibility', body: ['Free cancellation and Pay at hotel make guests more confident to book. Many travellers filter for them.', { tip: 'Choose a free-cancellation policy outside peak dates to win more bookings.' }] },
  { slug: 'segments', topic: 'grow', title: 'Targeting market segments', body: [`${m} brings different kinds of guests: leisure travellers, business travellers (business panel) and travel agents (agent panel).`, { list: ['Business guests value Wi-Fi, a work desk, GST invoices and quick check-in.', 'Families look for family rooms and extra beds.', 'Agents book groups and need clear rates.'] }] },
  { slug: 'content-tips', topic: 'grow', title: 'Content', body: ['Your hotel page is your shop window. Write a clear description, keep amenities accurate and update photos every season.'] },
  { slug: 'reports', topic: 'grow', title: 'Reports for your property', body: ['Analytics shows your room nights, revenue and average daily rate, compared with the previous year, plus traveller insights such as lead time and length of stay.', { tip: 'Open your property and choose Analytics in the left menu.' }] },
  { slug: 'expert-advice', topic: 'grow', title: 'Industry expert advice', body: ['Keep your calendar open well ahead, respond quickly to guests, and price by demand: higher on weekends, festivals and events, and lower on quiet weekdays.'] },
  // Understanding an OTA
  { slug: 'what-is-ota', topic: 'ota', title: `${m} as an OTA`, body: [`An OTA (online travel agency) is a website where travellers find and book stays. ${m} is an OTA: we list your property, take the booking and send it to you.`] },
  { slug: 'ota-world', topic: 'ota', title: 'The “OTA” world', body: ['Most travellers in India now book stays online. Being on OTAs puts your property in front of guests you wouldn’t reach on your own.'] },
  { slug: 'ota-partners', topic: 'ota', title: 'OTA partners', body: ['You can list on several OTAs at once. Keep your prices and availability the same everywhere to avoid overbooking.', { tip: 'If you use a channel manager, tell us during Basic Info so we can connect it later.' }] },
  // Legal
  { slug: 'partner-agreement', topic: 'legal', title: 'Partner Agreement & Policies', body: [`When you publish a listing you accept the ${m} partner terms. They cover commission (${pct(site.commissionRate)} + GST), payments, cancellations, content rules and how either side can end the agreement.`, { tip: 'Ask our partner team for a copy of the full agreement.' }] },
  {
    slug: 'not-on-site',
    topic: 'first',
    title: `Why isn’t my property on ${m}?`,
    body: [
      'Only live properties are shown to guests. Open My Properties and check which tab your property is in.',
      { list: ['In-Progress: the listing isn’t finished. Choose ⋮ → Resume listing and complete every section.', 'Inactive: bookings are paused. Choose ⋮ → Resume listing to switch them back on.', `Active but a warning shows on Home: the last change didn’t reach ${m}. Press Retry.`] },
    ],
  },
  {
    slug: 'no-show',
    topic: 'reservations',
    title: 'A guest didn’t arrive. What do I do?',
    body: [
      'Open the booking in Bookings → View and mark it as a no-show. Any charge follows the cancellation policy shown on the booking.',
      { tip: 'Call the guest first: many late arrivals are simply delayed.' },
    ],
  },
  {
    slug: 'more-properties',
    topic: 'together',
    title: 'Can I list more than one property?',
    body: ['Yes. Each property is a separate listing with its own rooms, photos, prices, bookings and payouts. Choose “+ List New Property” on My Properties to add another.'],
  },
  {
    slug: 'guest-data',
    topic: 'reservations',
    title: 'Who can see my guests’ phone numbers?',
    body: ['Only you, for bookings at your own properties. Use guest details only for their stay, and don’t share them with anyone else.'],
  },
  // Most viewed extras
  {
    slug: 'bank-account',
    topic: 'policies',
    tag: 'Featured',
    title: 'How do I set up my bank account?',
    body: [
      'We pay online-booking money into the bank account you add in Finance & Legal.',
      { steps: ['Open your property → Property Information → Financial & Bank Details.', 'Enter the account holder name, account number and IFSC.', 'Add your PAN and GST details (if registered).', 'Upload the documents asked for and save.'] },
      { tip: 'The account holder name should match your PAN or business registration.' },
    ],
  },
  {
    slug: 'tax-invoice',
    topic: 'policies',
    tag: 'Featured',
    title: 'How do I issue a tax invoice?',
    body: [
      'For Pay at hotel stays, you issue the GST invoice to the guest for the room and services, using the guest and booking details in Bookings → View.',
      { list: ['Room tariff up to ₹7,500 a night: 5% GST; above ₹7,500: 18% (check with your accountant).', 'Business guests may give a company GSTIN: add it to the invoice.', `${m} sends you a separate invoice for our commission.`] },
    ],
  },
]

export const topics: Topic[] = [
  { id: 'account', title: 'Account, login and contacting us', icon: 'headset', articles: ['inndesk-account', 'contact-us'] },
  { id: 'policies', title: 'Guest Policies & Payments', icon: 'card', articles: ['guest-policies', 'guest-cancellations', 'guest-payments', 'pay-at-hotel', 'online-payouts', 'bank-account', 'tax-invoice'] },
  { id: 'together', title: `Working together with ${m}`, icon: 'handshake', articles: ['list-your-property', 'working-with-us', 'more-properties'] },
  { id: 'rates', title: 'Your Rates & Availability', icon: 'calendar', articles: ['update-rates', 'promotions', 'surcharges'] },
  { id: 'reservations', title: 'Your Reservations', icon: 'guest', articles: ['manage-reservations', 'check-in-procedures', 'no-show', 'communicating', 'guest-reviews', 'guest-data'] },
  { id: 'content', title: 'Your Property Page Content', icon: 'camera', articles: ['general-info', 'facilities', 'photos'] },
  { id: 'first', title: `Your First Steps with ${m}`, icon: 'flag', articles: ['getting-online', 'not-on-site', 'first-reservations'] },
  { id: 'grow', title: 'Growing Your Business', icon: 'trend', articles: ['visibility', 'revenue', 'flexibility', 'segments', 'content-tips', 'reports', 'expert-advice'] },
  { id: 'ota', title: 'Understanding an “OTA”', icon: 'globe', articles: ['what-is-ota', 'ota-world', 'ota-partners'] },
  { id: 'legal', title: 'Legal', icon: 'shield', articles: ['partner-agreement'] },
]

/** "Common problems → Most viewed" cards. */
export const mostViewed = ['contact-us', 'bank-account', 'list-your-property', 'promotions', 'check-in-procedures', 'tax-invoice', 'guest-payments', 'online-payouts']

export const articleBySlug = (slug: string) => articles.find((a) => a.slug === slug)
export const topicById = (id: string) => topics.find((t) => t.id === id)
