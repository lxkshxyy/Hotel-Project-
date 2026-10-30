# Hotel Project — StayEasy platform

| Folder | Website | Who uses it |
| --- | --- | --- |
| `stayeasy/` | StayEasy customer site (B2C), plus the business panel (`/biz`, off on the live site for now) | Travellers |
| `inndesk/` | InnDesk hotel-owner panel: list a property, rates calendar, reservations, payouts | Hotel owners |
| `tripdesk/` | TripDesk travel-agent portal: net rates, markup, quotes, wallet, bookings | Travel agents |

All panels share one Supabase database. See each folder's README for running it locally and going live.

## Hosting on Hostinger

Build each folder (`npm ci && npm run build`) and upload the contents of its `dist` folder, including the
hidden `.htaccess` file (page routing, HTTPS, caching, security headers):

| Site | Address | Hostinger folder |
| --- | --- | --- |
| StayEasy | `yourdomain.com` | `public_html` |
| InnDesk | `partner.yourdomain.com` | the `partner` subdomain's folder |
| TripDesk | `agent.yourdomain.com` | the `agent` subdomain's folder |

With these addresses the sites find each other automatically. Other addresses: set `VITE_PARTNER_PANEL_URL`
and `VITE_AGENT_PANEL_URL` (StayEasy) and `VITE_MAIN_SITE_URL` (InnDesk, TripDesk) before building.
Turn on SSL for the domain and both subdomains. Vercel still works too (each folder has a `vercel.json`).
