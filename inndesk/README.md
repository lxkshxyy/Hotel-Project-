# InnDesk — StayEasy partner panel (Phase 3)

InnDesk is the separate website where hotel owners list their property on StayEasy and run it:
property details, map pin, amenities, room types and prices, photos, policies, payout details,
rates and availability, reservations and payouts.

There is **no "List your hotel" on the StayEasy customer site or business panel** — owners use InnDesk.

## Run it on your computer

```bash
npm install
npm run dev        # http://localhost:5174
```

StayEasy must also be running (`http://localhost:5173`). When an owner presses **Publish**, InnDesk
sends the listing to StayEasy's local publish channel (`/__partner/*`, see StayEasy's
`partner-bridge.ts`) and the hotel appears on StayEasy straight away. Bookings made on StayEasy for
that hotel come back into InnDesk → Reservations.

Local demo mode: any email, any 6-digit code. Listings and photos are kept in this browser
(IndexedDB); published listings are kept by StayEasy in `.partner-data/`.

## Live (Vercel + Supabase)

1. In Supabase, run StayEasy's `supabase/schema.sql` (it includes the **Partner panel** section:
   `partner_owners`, `partner_listings`, owner policies on `hotels` and `bookings`, and the
   `hotel-photos` storage bucket).
2. Deploy InnDesk as its own Vercel project with the **same** Supabase keys as StayEasy:
   `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `VITE_MAIN_SITE_URL` = the StayEasy address.
3. Published listings become rows in `hotels` (source `partner`), so StayEasy shows them with no
   extra setup.

## To confirm before launch (placeholders in `src/config/site.ts`)

- Commission rate (15%) and payout cycle
- Partner support phone and email
- Partner terms document
- TDS/TCS rates on payout statements
