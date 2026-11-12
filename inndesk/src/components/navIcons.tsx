/**
 * Original illustrated icons for the property menu (TRPOTELS colours): soft two-tone
 * pictures with a dark outline, drawn for InnDesk. 36×36 grid.
 */
const ink = '#1d2b24'
const g = '#cfe3d7' // light pine
const b = '#f1dca8' // light brass
const w = '#ffffff'
const s = `stroke="${ink}" stroke-width="1.4" stroke-linejoin="round" stroke-linecap="round"`

const P: Record<string, string> = {
  home: `<path d="M7 17 18 8l11 9" fill="none" ${s}/><path d="M9.5 15.5V29h17V15.5L18 9z" fill="${w}" ${s}/><path d="M6 17.5 18 7.5l12 10-1.6 1.8L18 10.6 7.6 19.3z" fill="#24614b" ${s}/><path d="M15 29v-6h6v6" fill="${b}" ${s}/><rect x="11.5" y="18" width="3.5" height="3.2" fill="${g}" ${s}/><rect x="21" y="18" width="3.5" height="3.2" fill="${g}" ${s}/>`,
  bookings: `<path d="M8 12.5 24.5 7l3.5 10.5L11.5 23z" fill="${g}" ${s}/><path d="M7 15h19v13H7z" fill="${w}" ${s}/><path d="M7 15h19v3.5H7z" fill="${b}" ${s}/><path d="M11 13v4M22 13v4" ${s}/><path d="M10.5 22h4M10.5 25h7M19.5 22h3" ${s}/>`,
  rates: `<path d="M8 13h13v15H8z" fill="${w}" ${s}/><path d="M8 13l3-4h13l-3 4z" fill="${g}" ${s}/><path d="M21 13l3-4v15l-3 4z" fill="${g}" ${s}/><path d="M11 17h7M11 20h7M11 23h4" ${s}/><path d="M22.5 18.5l6.2 6.2-4.2 4.2-6.2-6.2V18.5z" fill="${b}" ${s}/><circle cx="21" cy="20.6" r="0.9" fill="${ink}"/>`,
  grow: `<path d="M18 5c4.5 2.8 6.3 8.4 4.6 14.6h-9.2C11.7 13.4 13.5 7.8 18 5z" fill="${w}" ${s}/><circle cx="18" cy="12.5" r="2.4" fill="${g}" ${s}/><path d="M13.4 19.6 9.5 22l1-5.6 3-2M22.6 19.6l3.9 2.4-1-5.6-3-2" fill="${b}" ${s}/><path d="M15 22.5c0 3 1.5 5.5 3 7 1.5-1.5 3-4 3-7" fill="#f4b860" ${s}/><path d="M13.4 19.6h9.2" ${s}/>`,
  payments: `<path d="M7 12.5h20a2 2 0 0 1 2 2V27a2 2 0 0 1-2 2H7z" fill="${w}" ${s}/><path d="M7 12.5 21.5 8l1.8 4.5" fill="${g}" ${s}/><path d="M7 12.5V29" ${s}/><path d="M22 18h7v5h-7a2.5 2.5 0 0 1 0-5z" fill="${b}" ${s}/><path d="M11.5 18h5M11.5 18c2.2 0 3 1.1 3 2.2s-.8 2.2-3 2.2h-.6l3.6 3.6M11.5 20.2h5" fill="none" ${s}/>`,
  property: `<path d="M8 29V11l9-4v22" fill="${w}" ${s}/><path d="M17 29V13l9 3.5V29" fill="${g}" ${s}/><path d="M6 29h24" ${s}/><path d="M11 13h3M11 17h3M11 21h3M20 19h3M20 23h3" ${s}/><circle cx="26.5" cy="10" r="4.3" fill="${b}" ${s}/><path d="M26.5 9.6v3M26.5 7.6v.1" ${s}/>`,
  ratings: `<path d="M8 9h18a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-9l-5 4.5V23H8a2 2 0 0 1-2-2V11a2 2 0 0 1 2-2z" fill="${w}" ${s}/><path d="m17 11.3 1.7 3.4 3.8.6-2.8 2.6.7 3.7-3.4-1.8-3.4 1.8.7-3.7-2.8-2.6 3.8-.6z" fill="#f4b860" ${s}/><circle cx="28" cy="26" r="3.5" fill="${g}" ${s}/><path d="m26.6 26 1 1 1.8-1.9" fill="none" ${s}/>`,
  analytics: `<rect x="6.5" y="7" width="23" height="19" rx="2" fill="${w}" ${s}/><path d="M11 22v-4M15.5 22v-7M20 22v-5M24.5 22v-10" stroke="#24614b" stroke-width="2.6" stroke-linecap="round"/><path d="M11 14.5l4.5-3.5 4.5 2.5 4.5-4" fill="none" stroke="#c8962e" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M14 26l-2 4M22 26l2 4M18 26v4" ${s}/>`,
  more: `<circle cx="18" cy="18" r="11" fill="${g}" ${s}/><circle cx="18" cy="18" r="7.8" fill="${w}" ${s}/><circle cx="14" cy="18" r="1.3" fill="${ink}"/><circle cx="18" cy="18" r="1.3" fill="${ink}"/><circle cx="22" cy="18" r="1.3" fill="${ink}"/>`,
  help: `<path d="M9 8h18a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-7l-6 5v-5H9a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2z" fill="${w}" ${s}/><path d="M15 13.5a3 3 0 1 1 4.2 2.8c-.8.4-1.2 1-1.2 1.8v.6" fill="none" ${s}/><circle cx="18" cy="21.3" r="0.9" fill="${ink}"/><path d="M27 8.5l2.5-2.5M29.5 12h2.2" ${s}/>`,
  back: `<path d="M21 9 12 18l9 9" fill="none" stroke="${ink}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`,
}

export function NavIcon({ name, className = 'h-9 w-9' }: { name: string; className?: string }) {
  return <svg viewBox="0 0 36 36" className={className} aria-hidden="true" dangerouslySetInnerHTML={{ __html: P[name] ?? P.home }} />
}
