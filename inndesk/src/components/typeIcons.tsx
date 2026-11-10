/**
 * Thin line icons for the property-type picker, drawn to match the reference (MakeMyTrip/Agoda-style
 * outline pictograms). 32×32 grid, stroke only, so they take the text colour.
 */
const P: Record<string, string> = {
  // group cards
  home: '<path d="M5 27V13L16 5l11 8v14H5z"/><path d="M12 27v-7a4 4 0 0 1 8 0v7"/>',
  city: '<path d="M4 27h24"/><path d="M6 27V8h10v19"/><path d="M16 27V14h10v13"/><path d="M9 12h1.5M12 12h1.5M9 16h1.5M12 16h1.5M9 20h1.5M12 20h1.5M19 18h4M19 22h4"/>',
  circus: '<path d="M4 27h24"/><path d="M6 27l10-15 10 15"/><path d="M16 12V5l4 1.5L16 8"/><path d="M12 27l4-6 4 6"/><path d="M9.3 22h3.4M19.3 22h3.4"/>',
  // hotel-type
  hotel: '<path d="M4 27h24"/><path d="M7 27V13h6"/><path d="M13 27V5h12v22"/><path d="M25 14h3v13"/><path d="M17 9h1.5M21 9h1.5M17 13h1.5M21 13h1.5M17 17h1.5M21 17h1.5M9 17h1.5M9 21h1.5"/><path d="M17 27v-5h4v5"/>',
  guestHouse: '<path d="M5 14L16 5l11 9"/><path d="M8 12v15h16V12"/><path d="M4 27h24"/><path d="M14 27v-6h4v6"/><path d="M10.5 16h3v3h-3z"/>',
  serviced: '<path d="M9 19V5h14v14"/><path d="M12 9h2M18 9h2M12 13h2M18 13h2"/><path d="M15 19v-3h2v3"/><path d="M4 22h5l3 2h5a1.5 1.5 0 0 1 0 3h-5"/><path d="M17 25.5l6.5-3a1.8 1.8 0 0 1 2 3L18 29H4"/>',
  resort: '<path d="M16 7v15"/><path d="M5 13.5a11 6.5 0 0 1 22 0c-1.8-1.3-3.7-1.3-5.5 0-1.8-1.3-3.7-1.3-5.5 0-1.8-1.3-3.7-1.3-5.5 0-1.8-1.3-3.7-1.3-5.5 0z"/><path d="M4 23.5c2 1.3 4 1.3 6 0s4-1.3 6 0 4 1.3 6 0 4-1.3 6 0"/><path d="M4 27.5c2 1.3 4 1.3 6 0s4-1.3 6 0 4 1.3 6 0 4-1.3 6 0"/>',
  hostel: '<path d="M6 5v22M26 14v13"/><path d="M6 10h16a4 4 0 0 1 4 4H6"/><path d="M9.5 8.3h4"/><path d="M6 21h16a4 4 0 0 1 4 4H6"/><path d="M9.5 19.3h4"/>',
  bed: '<path d="M4 8v19M28 22v5"/><path d="M4 22h24"/><path d="M4 18h24v4"/><path d="M12 14h12a4 4 0 0 1 4 4"/><circle cx="7.5" cy="14.5" r="2"/>',
  capsule: '<rect x="5" y="6" width="22" height="19" rx="6"/><path d="M10 20h12M11 20v-3h10v3"/><path d="M8 28h16"/>',
  cruise: '<path d="M4 21l3 6h18l3-6z"/><path d="M7 21v-5h18v5"/><path d="M10 16v-4h12v4"/><path d="M14 12V7h4v5"/><path d="M11 18.5h1.5M15.3 18.5h1.5M19.5 18.5h1.5"/>',
  inn: '<path d="M6 27V5h20v22"/><path d="M4 27h24M6 9h20"/><path d="M10 13h3M19 13h3M10 17h3M19 17h3M10 21h3M19 21h3"/><path d="M14 27v-4h4v4"/>',
  lodge: '<path d="M4 27h24"/><path d="M7 27V14"/><path d="M25 27V14"/><path d="M4 15.5L16 7l12 8.5"/><path d="M10 11.6V7h3v2.5"/><path d="M12 27v-5a4 4 0 0 1 8 0v5"/><path d="M10.5 17.5h2M19.5 17.5h2"/>',
  love: '<path d="M4 27h24"/><path d="M6 27V9h12v18"/><path d="M18 16h8v11"/><path d="M9 13h2M13 13h2M9 17h2M13 17h2M9 21h2M13 21h2"/><path d="M22 13.5s-3.5-2-3.5-4c0-1.8 2.4-2.4 3.5-.8 1.1-1.6 3.5-1 3.5.8 0 2-3.5 4-3.5 4z"/>',
  motel: '<path d="M4 27h24"/><path d="M6 27V14h20v13"/><path d="M6 18h20"/><path d="M10 23h3M19 23h3"/><path d="M10 27v-2M22 27v-2"/><path d="M8 10h10V5H8zM13 10v4"/><path d="M10.5 7.5h5"/>',
  ryokan: '<path d="M3 13l4-5h18l4 5z"/><path d="M7 13v14h18V13"/><path d="M4 27h24M7 18h18"/><path d="M11 22v5M16 22v5M21 22v5"/>',
  resortVilla: '<path d="M4 27h24"/><path d="M11 27V16l7-6 7 6v11"/><path d="M16 27v-5h4v5"/><path d="M6.5 27V14"/><path d="M6.5 14c-3-.6-3.4-2.8-1.6-4M6.5 14c.6-3 2.8-3.4 4.3-2.2M6.5 14c-.8-3 .2-5 2.2-5.4"/>',
  palace: '<path d="M4 27h24"/><path d="M6 27V16h20v11"/><path d="M10 16a6 6 0 0 1 12 0"/><path d="M16 10V6"/><path d="M6 16v-4M26 16v-4"/><path d="M14 27v-5a2 2 0 0 1 4 0v5"/><path d="M9 20h1.5M21.5 20h1.5"/>',
  // home-type
  apartment: '<path d="M8 27V5h16v22"/><path d="M5 27h22"/><path d="M12 9h2M18 9h2M12 13h2M18 13h2M12 17h2M18 17h2"/><path d="M14 27v-5h4v5"/>',
  villa: '<path d="M4 27h24"/><path d="M6 27V15l6-5 6 5v12"/><path d="M18 27V10l8 4v13"/><path d="M10 27v-5h4v5"/><path d="M21 17h2M21 21h2"/>',
  bungalow: '<path d="M3 15l13-9 13 9"/><path d="M7 13v14h18V13"/><path d="M4 27h24"/><path d="M7 17h18"/><path d="M13 27v-6h6v6"/>',
  homestay: '<path d="M5 14L16 5l11 9"/><path d="M8 12v15h16V12"/><path d="M4 27h24"/><path d="M13 15h6v7h-6z"/><path d="M16 15v7M13 18.5h6"/>',
  farm: '<path d="M5 13l11-8 11 8v14H5z"/><path d="M5 13h22"/><path d="M10 27V17h12v10"/><path d="M10 17l12 10M22 17L10 27"/><path d="M13 9.5h6"/>',
  cabin: '<path d="M3 15L16 5l13 10"/><path d="M7 12.5V27h18V12.5"/><path d="M4 27h24"/><path d="M7 17h4M21 17h4M7 21h4M21 21h4"/><path d="M13 27v-8h6v8"/><path d="M16 9.5v2"/>',
  chalet: '<path d="M3 14L16 5l13 9"/><path d="M7 11.5V27h18V11.5"/><path d="M4 27h24"/><path d="M5 17h22"/><path d="M8 17v3M12 17v3M16 17v3M20 17v3M24 17v3"/><path d="M13 27v-4h6v4"/>',
  country: '<path d="M4 27h24"/><path d="M6 27v-7l7-5.5 7 5.5v7"/><path d="M11 27v-4h4v4"/><path d="M18.5 13a5 5 0 0 1 9 2.5"/><path d="M23 6.5v-2.5M28 9l1.6-1.6M17.5 9l-1.6-1.6"/>',
  haveli: '<path d="M4 27h24"/><path d="M6 27V15h20v12"/><path d="M6 15l2-3h16l2 3"/><path d="M12 12a4 4 0 0 1 8 0"/><path d="M16 8V5.5"/><path d="M9.5 19h2M20.5 19h2"/><path d="M14 27v-5a2 2 0 0 1 4 0v5"/>',
  holidayHome: '<path d="M4 27h24"/><path d="M11 27V16l7-6 7 6v11"/><path d="M16 27v-5h4v5"/><path d="M7 27V17"/><path d="M7 9.5l-3.3 7.5h6.6z"/>',
  townhouse: '<path d="M4 27h24"/><path d="M5 27V11l5-4 5 4v16"/><path d="M15 27V11l5-4 5 4v16"/><path d="M8.5 15h3M18.5 15h3M8.5 20h3M18.5 20h3"/><path d="M25 27V14h3v13"/>',
  cottage: '<path d="M5 15l11-9 11 9"/><path d="M8 13v14h16V13"/><path d="M4 27h24"/><path d="M21 9.5V5h3v7"/><path d="M14 27v-6h4v6"/><path d="M10.5 17h2.5M19 17h2.5"/>',
  farmhouse: '<path d="M4 27h24"/><path d="M6 27V14l7-6 7 6v13"/><path d="M20 27V16h6v11"/><path d="M10 27v-5h6v5"/><path d="M23 16v-3"/><path d="M9.5 16h7"/>',
  beachHut: '<path d="M4 25h24"/><path d="M6.5 15L16 7l9.5 8z"/><path d="M9 15v10M23 15v10"/><path d="M14 25v-6h4v6"/><path d="M4 29c2 1 4 1 6 0s4-1 6 0 4 1 6 0 4-1 6 0"/>',
  // unique-type
  castle: '<path d="M4 27h24"/><path d="M6 27V12h4v3h3v-3h6v3h3v-3h4v15"/><path d="M6 12V8h1.5v2h1.5V8H10v4"/><path d="M22 12V8h1.5v2H25V8h1v4"/><path d="M14 27v-5a2 2 0 0 1 4 0v5"/><path d="M16 12V5l3 1.2-3 1.2"/>',
  cave: '<path d="M4 27h24"/><path d="M6 27c0-12 4-20 10-20s10 8 10 20"/><path d="M12 27v-6a4 4 0 0 1 8 0v6"/><path d="M9 14l2 1M21.5 12.5l1.5-1"/>',
  dome: '<path d="M4 27h24"/><path d="M6 27a10 10 0 0 1 20 0"/><path d="M14 27v-4a2 2 0 0 1 4 0v4"/><path d="M16 17v-6l3 1.2-3 1.2"/><path d="M9.5 22.5h2M20.5 22.5h2"/>',
  holidayPark: '<path d="M4 27h24"/><path d="M8 27V19"/><path d="M8 9l-4 6.5h8z"/><path d="M8 13l-3.5 6h7z"/><path d="M15 27l6-10 6 10"/><path d="M21 17v-3"/><path d="M19 27l2-3.5 2 3.5"/>',
  houseboat: '<path d="M4 22h24l-3 4H7z"/><path d="M8 22v-6l8-6 8 6v6"/><path d="M13 22v-4h6v4"/><path d="M4 29c2 1 4 1 6 0s4-1 6 0 4 1 6 0 4-1 6 0"/>',
  igloo: '<path d="M4 25h24"/><path d="M5 25a11 11 0 0 1 22 0"/><path d="M12 25v-3a4 4 0 0 1 8 0v3"/><path d="M6.5 19h19M9.5 14h13"/><path d="M12 19v-5M20 19v-5M16 14V8"/>',
  machiya: '<path d="M4 27h24"/><path d="M4 12l3-4h18l3 4z"/><path d="M6 12v15h20V12"/><path d="M6 17h20"/><path d="M10 17v10M14 17v10M18 17v10M22 17v10"/>',
  tent: '<path d="M4 27h24"/><path d="M6 27l10-17 10 17"/><path d="M16 10V4l4 1.5L16 7"/><path d="M12 27l4-7 4 7"/>',
  tipi: '<path d="M4 27h24"/><path d="M7 27l9-20 9 20"/><path d="M13.5 4l2.5 3 2.5-3"/><path d="M13 27l3-6 3 6"/>',
  treehouse: '<path d="M4 27h24"/><path d="M9 27V17"/><path d="M9 7a5 5 0 0 0-5 5c0 2.8 2.2 5 5 5s5-2.2 5-5a5 5 0 0 0-5-5z"/><path d="M15 15l5-4.5 5 4.5v5H15z"/><path d="M17 20v7M23 20v7"/><path d="M19 20v-2.5h2V20"/>',
  yurt: '<path d="M4 27h24"/><path d="M6 27V17h20v10"/><path d="M6 17l10-7 10 7"/><path d="M13 27v-5h6v5"/><path d="M6 21h7M19 21h7"/><path d="M16 10V7"/>',
  glamping: '<path d="M4 27h24"/><path d="M7 27l9-15 9 15"/><path d="M13 27l3-5 3 5"/><path d="M10.5 18.5h11"/><path d="M24 4.5v5M21.5 7h5"/><path d="M8 6v3M6.5 7.5h3"/>',
  rv: '<path d="M3 23V11a2 2 0 0 1 2-2h17l6 6v8z"/><path d="M3 23h25"/><circle cx="9" cy="24.5" r="2.5"/><circle cx="22" cy="24.5" r="2.5"/><path d="M7 13h5v4H7z"/><path d="M15 13h4v10"/><path d="M22 15h5"/>',
  dharamshala: '<path d="M4 27h24"/><path d="M6 27V14h20v13"/><path d="M4.5 14L16 7l11.5 7"/><path d="M10 27v-7h3v7M19 27v-7h3v7"/><path d="M16 7V4"/><path d="M15 17.5h2"/>',
  ashram: '<path d="M16 8c-3 3-3 8 0 12 3-4 3-9 0-12z"/><path d="M16 20c-4.5 0-8.5-2-10.5-6 4.5 0 8.5 2 10.5 6z"/><path d="M16 20c4.5 0 8.5-2 10.5-6-4.5 0-8.5 2-10.5 6z"/><path d="M5 25h22"/>',
}

export type TypeIconName = keyof typeof P

export function TypeIcon({ name, className = 'h-8 w-8', strokeWidth = 1.35 }: { name: string; className?: string; strokeWidth?: number }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: P[name] ?? P.home }}
    />
  )
}
