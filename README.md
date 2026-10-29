# Hotel Project — StayEasy platform

| Folder | Website | Who uses it |
| --- | --- | --- |
| `stayeasy/` | StayEasy customer site (B2C), plus the business panel (`/biz`, off on the live site for now) | Travellers |
| `inndesk/` | InnDesk hotel-owner panel: list a property, rates calendar, reservations, payouts | Hotel owners |
| `tripdesk/` | TripDesk travel-agent portal: net rates, markup, quotes, wallet, bookings | Travel agents |

All panels share one Supabase database. Each folder is its own Vercel project (set **Root Directory**
to the folder). See each folder's README for running it locally and going live.
