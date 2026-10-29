# TripDesk — StayEasy travel-agent portal

TripDesk is the separate website where travel agencies book StayEasy hotels at **net rates**, add
their own **markup**, send **quotes** to customers (PDF or WhatsApp) and pay from a **wallet**.
It works like MakeMyTrip myPartner, for hotels.

| Page | What agents do there |
| --- | --- |
| Register | Agency details, PAN, GSTIN, a verification document. New agencies wait for approval. |
| Home | Search, wallet, this month's bookings and earnings, upcoming stays |
| Hotels / hotel page | Net rate, your markup, customer price for every room ("rate slip"); book or add to a quote |
| Book | Lead guest (or a saved customer), markup for this booking, pay the net rate from the wallet |
| Quotes | Several options in one quote, shared as a PDF or WhatsApp message, never showing net rates |
| Bookings | Vouchers with the agency's name, WhatsApp share, cancel with instant wallet refund |
| Customers | Every customer and their stays |
| Wallet | Balance, credit limit, top-ups (Razorpay), statement |
| Earnings | Monthly markup earned, CSV statement for the accountant |
| Settings | Agency profile, default and city markups, voucher price on/off, team logins |

Hotels, prices, room counts and photos come from **StayEasy** (`../stayeasy`), so this folder must
sit next to the `stayeasy` folder.

## Run it on your computer

```bash
npm install
npm run dev        # http://localhost:5175
```

Demo mode (no Supabase keys): any email and any 6-digit code; a new agency is approved at once with a
₹25,000 test balance, and everything stays in this browser. With StayEasy running on port 5173,
partner hotels from InnDesk appear here and agent bookings at those hotels show in InnDesk.

## Live

1. Use the same Supabase project as StayEasy and run StayEasy's `supabase/schema.sql` (it includes the
   "Travel-agent portal" section).
2. Deploy the agent functions from the `stayeasy` folder:
   `npx supabase functions deploy agent-create-booking agent-cancel-booking agent-wallet-topup agent-wallet-verify`
3. Vercel: new project from the same repository, **Root Directory** `tripdesk`, with
   `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_RAZORPAY_KEY_ID`, `VITE_SUPPORT_PHONE`, `VITE_SUPPORT_EMAIL`.
4. Approving an agency (until the admin dashboard exists): in Supabase → Table editor → `agents`, set
   `status` to `approved` and, if agreed, a `credit_limit`.

## To confirm with the client

- Agent discount (net rate = public price − 10%) in `stayeasy/src/lib/agentRates.ts`, and the default 8% markup.
- How hotels are paid for agent bookings (the booking stores net, markup and selling price separately).
- Agent terms document, minimum top-up, bank details for transfers (`src/config/site.ts`).
- GST treatment of the agent's markup (to be confirmed by the client's accountant).
