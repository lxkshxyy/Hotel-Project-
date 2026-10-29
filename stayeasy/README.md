# StayEasy — hotel booking website & app

A hotel booking site for India's branded budget stays. It works as a normal website on any
device and installs as an app on Android, iPhone and desktop (PWA).

**Stack:** React 19 · TypeScript · Vite · Tailwind CSS v4 · Framer Motion · React Router ·
Supabase (database + email login) · vite-plugin-pwa

## What's inside

| Page | Route | What it does |
| --- | --- | --- |
| Home | `/` | Search, quick filters, cities, top-rated stays, brands, Club, offers |
| Search results | `/hotels` | Filters (price, brand, locality, rating, amenities), sorting, mobile filter sheet |
| Hotel | `/hotel/:slug` | Gallery, amenities, room picker, live price box, map, ratings |
| Checkout | `/checkout` | Guest details with validation, GST invoice, coupons, Club points |
| Confirmation | `/bookings/:id` | Booking voucher, cancel (free until 24 h before check-in) |
| My bookings | `/bookings` | Upcoming / past / cancelled |
| Sign in | `/login` | Email + 6-digit code, no password |
| Other | `/offers` `/club` `/business` `/partner` `/help` `/policies` `/about` `/account` | Info pages and enquiry forms |

## Run it on your computer

Needs Node.js 20 or newer.

```bash
git clone https://github.com/lxkshxyy/stayeasy.git
cd stayeasy
npm install
npm run dev
```

Open http://localhost:5173. With no Supabase keys it runs in **demo mode**: sample hotels,
any email signs you in with any 6-digit code, and bookings are saved in your browser only.

## Go live (Supabase + Vercel)

The live site needs a Supabase project (database, email login and server functions) and a Vercel
project for hosting. Until the Supabase keys are set the site runs in **demo mode** and shows a
"Preview site" banner on any public address.

### 1. Database
1. Create a project at https://supabase.com (region: Mumbai).
2. **SQL Editor:** run `supabase/schema.sql`, then `supabase/seed.sql` (replace the sample hotels first).
3. **Authentication → Email Templates → Magic Link:** include the code, e.g. `Your StayEasy code is {{ .Token }}`.
4. **Authentication → URL Configuration:** Site URL = your live address; add `http://localhost:5173` to redirect URLs.
5. **Authentication → SMTP:** connect a real sender (Resend, Zoho, SES). Supabase's built-in mailer only sends a few emails an hour.

### 2. Server functions
Bookings, payments and cancellations run in `supabase/functions` so prices and room counts are
checked on the server. Deploy them once (and again after changing pricing or Club rules):

```bash
npm run sync:functions               # copies the website's price rules into the functions
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase functions deploy create-booking verify-payment cancel-booking agent-create-booking agent-cancel-booking agent-wallet-topup agent-wallet-verify
npx supabase functions deploy razorpay-webhook --no-verify-jwt
npx supabase secrets set SITE_URL=https://<your-site> EMAIL_FROM="StayEasy <bookings@yourdomain.com>" RESEND_API_KEY=<key>
```

### 3. Online payment (when Razorpay is approved)
```bash
npx supabase secrets set RAZORPAY_KEY_ID=rzp_live_xxx RAZORPAY_KEY_SECRET=xxx RAZORPAY_WEBHOOK_SECRET=xxx
```
Then set `VITE_RAZORPAY_KEY_ID` on Vercel and redeploy. In Razorpay → Webhooks, add
`https://<project-ref>.supabase.co/functions/v1/razorpay-webhook` with the events `payment.captured`,
`order.paid` and `refund.processed`. "Pay at hotel" stays the default; "Pay now" gives 5% off.

### 4. Vercel
Import the GitHub repository, set **Root Directory** to `stayeasy`, and add the variables from
`.env.example`. Every push to `main` redeploys.

## Before launch (client to confirm)

- Real hotels, prices, street addresses and photo rights (the sample data is in `src/data/hotels.ts`).
- Contact details, registered company name and address, Grievance Officer name (legal pages).
- Legal pages in `src/pages/Legal.tsx` are drafts: a lawyer must approve them.
- GST rule in `src/config/site.ts` (5% up to ₹7,500 a night, 18% above).
- Club discounts (up to 20% for Platinum) and coupon values.
- The "30-minute service promise" on the home page and vouchers.
- Stay Protect stays off until there is an insurance partner (`VITE_STAY_PROTECT`, server `STAY_PROTECT`).
- The business panel stays off on the live site until its backend is built (`VITE_ENABLE_BUSINESS`).

On the live site, ratings come only from real guest reviews; sample reviews and ratings are demo-only.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the local dev server |
| `npm run build` | Typecheck and build to `dist/` |
| `npm run preview` | Serve the built site locally |
| `npm run seed:sql` | Regenerate `supabase/seed.sql` from `src/data/hotels.ts` |
| `npm run icons` | Regenerate the app icons from `public/favicon.svg` |
