# Live backup — 6 Nov 2026

An exact copy of the three websites as they are live on Hostinger (downloaded from the live sites on 10 Nov 2026).
Nothing changed on the live sites between 6 Nov and 10 Nov.

| Folder | Live address | Last uploaded |
| --- | --- | --- |
| `trpotels/` | trphotels.com | 6 Nov 2026 |
| `inndesk/` | partner.trphotels.com | 5 Nov 2026 |
| `tripdesk/` | agent.trphotels.com | 5 Nov 2026 |

Each folder is ready to upload: put its contents (including the hidden `.htaccess`) in that site's `public_html`.

## Important: the source code is older than these files

The source folders (`stayeasy/`, `inndesk/`, `tripdesk/`) were last saved on the morning of 6 Nov. Changes made after
that are only in this backup, as built files:

- **Main site:** typed "TRPOTELS" name in Lato Black, redesigned glass checkout, new results list and Quick book,
  Flagship stores, States / Union territories search, Coming soon everywhere, Club points expiry wording, client photos,
  hotel page layout, business panel switched on.
- **TripDesk:** TRPOTELS spelling, star rating filter and star badges, "Hotels are coming soon", new photos.
- **InnDesk:** TRPOTELS spelling and the new login photo (`img/hero-hotel.webp`).

Before the next change to a site, rebuild that site's source to match this backup, otherwise these changes will be undone.

Live builds connect to Supabase project `hqnjpkghwptxivkqseru` (public anon key, baked into the built files) and the
main site is built with `VITE_ENABLE_BUSINESS=on`.
