import { jsPDF } from 'jspdf'
import QRCode from 'qrcode'
import { hotelRules } from '../components/hotel/PropertyRules'
import { amenityMeta } from '../components/ui'
import { site } from '../config/site'
import { brandLabel } from '../data/hotels'
import { kmLabel, landmarksNear } from '../data/landmarks'
import type { Booking, Hotel } from '../data/types'
import { addDays, parseISODate, ratingWord } from './format'
import { cancelTerms, freeCancelHours } from './quote'

/*
 * Booking voucher as a real A4 PDF (drawn with jsPDF, not a screenshot of the page),
 * so it looks the same on every phone and computer and can be forwarded as a file.
 * Built-in PDF fonts have no ₹ sign, so amounts are written as "INR".
 */

const C = {
  navy: '#14306B',
  navyDark: '#0B1F4A',
  ember: '#C2410C',
  ink: '#1B2333',
  grey: '#5B6475',
  light: '#8A94A6',
  line: '#E2E6EF',
  canvas: '#F5F7FB',
  leaf: '#15803D',
  leafBg: '#ECF7EF',
  warnBg: '#FFF4EC',
}
const W = 210
const H = 297
const M = 14 // page margin

const money = (n: number) => `INR ${Math.round(n).toLocaleString('en-IN')}`
const day = (iso: string) => parseISODate(iso).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
const photoLabel = (url: string) => {
  const k = url.split('/').pop()?.split('-')[0] ?? ''
  return ({ exterior: 'Exterior', room: 'Room', bath: 'Bathroom', dining: 'Dining', banquet: 'Banquet hall', lobby: 'Lobby' } as Record<string, string>)[k] ?? 'Photo'
}

/** Loads an image (any format the browser can show, incl. WebP) and crops it to fill a box, as JPEG. */
/** A logo file as a PNG data URL, keeping transparency (for the voucher header). */
async function pngData(url: string): Promise<{ data: string; ratio: number } | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const bmp = await createImageBitmap(await res.blob())
    const canvas = document.createElement('canvas')
    canvas.width = bmp.width
    canvas.height = bmp.height
    canvas.getContext('2d')!.drawImage(bmp, 0, 0)
    return { data: canvas.toDataURL('image/png'), ratio: bmp.width / bmp.height }
  } catch {
    return null
  }
}

async function coverJpeg(url: string, aspect: number, pxW = 900): Promise<string | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const bmp = await createImageBitmap(await res.blob())
    const pxH = Math.round(pxW / aspect)
    const canvas = document.createElement('canvas')
    canvas.width = pxW
    canvas.height = pxH
    const ctx = canvas.getContext('2d')!
    const scale = Math.max(pxW / bmp.width, pxH / bmp.height)
    const sw = pxW / scale
    const sh = pxH / scale
    ctx.drawImage(bmp, (bmp.width - sw) / 2, (bmp.height - sh) / 2, sw, sh, 0, 0, pxW, pxH)
    return canvas.toDataURL('image/jpeg', 0.85)
  } catch {
    return null
  }
}

export async function buildVoucher(b: Booking, hotel: Hotel | null) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true })
  doc.setProperties({ title: `${site.name} booking ${b.id}`, subject: `Hotel booking voucher – ${b.hotel_name}`, author: site.name, creator: site.name })
  const cancelled = b.status === 'cancelled'
  const room = hotel?.rooms.find((r) => r.name === b.room_name)
  const link = `${window.location.origin}/bookings/${b.id}`

  // Images in parallel
  const gallery = [room?.photo, ...(hotel?.photos ?? []).slice(1)].filter((x): x is string => !!x)
  const uniqueGallery = [...new Set(gallery)].slice(0, 4)
  const [emblem, wordmark, cover, qr, ...thumbs] = await Promise.all([
    pngData('/brand/emblem.png'),
    pngData('/brand/wordmark-gold.png'),
    hotel?.photos?.[0] ? coverJpeg(hotel.photos[0], 72 / 50) : Promise.resolve(null),
    QRCode.toDataURL(`${site.name} booking ${b.id}\n${link}`, { margin: 1, width: 360, color: { dark: C.navy, light: '#FFFFFF' } }),
    ...uniqueGallery.map((u) => coverJpeg(u, 43 / 25, 520)),
  ])

  let y = 0
  const text = (s: string, x: number, yy: number, o: { size?: number; bold?: boolean; color?: string; align?: 'left' | 'right' | 'center'; maxW?: number } = {}) => {
    doc.setFont('helvetica', o.bold ? 'bold' : 'normal')
    doc.setFontSize(o.size ?? 10)
    doc.setTextColor(o.color ?? C.ink)
    const lines = o.maxW ? doc.splitTextToSize(s, o.maxW) : [s]
    doc.text(lines, x, yy, { align: o.align ?? 'left' })
    return lines.length * (o.size ?? 10) * 0.42
  }
  const label = (s: string, x: number, yy: number) => text(s.toUpperCase(), x, yy, { size: 7.5, bold: true, color: C.light })
  const box = (x: number, yy: number, w: number, h: number, fill: string, stroke?: string) => {
    doc.setFillColor(fill)
    if (stroke) doc.setDrawColor(stroke)
    doc.roundedRect(x, yy, w, h, 2.5, 2.5, stroke ? 'FD' : 'F')
  }
  const section = (title: string, keep = 14) => {
    y += 3
    ensure(keep)
    text(title, M, y, { size: 12.5, bold: true, color: C.navy })
    doc.setDrawColor(C.line)
    doc.line(M, y + 2.2, W - M, y + 2.2)
    y += 8
  }
  const ensure = (need: number) => {
    if (y + need > H - 18) {
      doc.addPage()
      header(true)
    }
  }
  const header = (small = false) => {
    const h = small ? 16 : 34
    doc.setFillColor(C.navy)
    doc.rect(0, 0, W, h, 'F')
    // Client logo: round emblem + gold TRPOTELS lettering (falls back to text if the files can't load).
    const e = small ? 9 : 13
    const ey = small ? 3.5 : 7.5
    if (emblem) doc.addImage(emblem.data, 'PNG', M, ey, e, e)
    const wx = M + e + 3
    if (wordmark) {
      const wh = small ? 4 : 5.5
      doc.addImage(wordmark.data, 'PNG', wx, ey + (e - wh) / 2, wh * wordmark.ratio, wh)
    } else text(site.name, wx, small ? 9.8 : 17, { size: small ? 13 : 19, bold: true, color: '#FFFFFF' })
    if (!small) text(site.tagline, wx, ey + e + 4.5, { size: 8.5, color: '#C9D2E3' })
    text(small ? `Booking ${b.id}` : 'HOTEL BOOKING VOUCHER', W - M, small ? 9.8 : 13, { size: small ? 9 : 8, bold: true, color: '#F6B98A', align: 'right' })
    if (!small) {
      text(b.id, W - M, 21.5, { size: 17, bold: true, color: '#FFFFFF', align: 'right' })
      text(`Booked on ${new Date(b.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`, W - M, 27.5, { size: 8.5, color: '#C9D2E3', align: 'right' })
    }
    y = h + 9
  }

  /* ---------- page 1 ---------- */
  header()

  // Status strip
  box(M, y - 5, W - 2 * M, 11, cancelled ? C.warnBg : C.leafBg)
  text(cancelled ? 'CANCELLED' : 'CONFIRMED', M + 4, y + 1.8, { size: 10, bold: true, color: cancelled ? C.ember : C.leaf })
  text(
    cancelled ? 'This booking was cancelled. Nothing is payable.' : `Your stay is confirmed. Pay at the hotel by cash, card or UPI. Confirmation sent to ${b.guest_email}.`,
    M + 30,
    y + 1.8,
    { size: 8.5, color: C.ink, maxW: W - 2 * M - 34 },
  )
  y += 12

  // Hotel block
  const imgW = 72
  const imgH = 50
  if (cover) doc.addImage(cover, 'JPEG', M, y, imgW, imgH, undefined, 'FAST')
  else box(M, y, imgW, imgH, C.canvas)
  const hx = M + imgW + 7
  const hw = W - M - hx - 34
  let hy = y + 5
  hy += text(b.hotel_name, hx, hy, { size: 15, bold: true, color: C.navy, maxW: hw }) + 1
  if (hotel) {
    hy += text(`${brandLabel(hotel.brand)}  ·  ${hotel.rating > 0 ? `${hotel.rating.toFixed(1)}/5 ${ratingWord(hotel.rating)}  ·  ${hotel.reviews.toLocaleString('en-IN')} ratings` : 'New listing'}`, hx, hy, { size: 8.5, color: C.grey, maxW: hw }) + 1.5
    hy += text(hotel.address, hx, hy, { size: 9, maxW: hw }) + 1
    hy += text(hotel.distance, hx, hy, { size: 8.5, color: C.grey, maxW: hw }) + 2
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(C.ember)
    doc.textWithLink('Open in Google Maps >', hx, hy, { url: `https://www.google.com/maps/search/?api=1&query=${hotel.lat},${hotel.lng}` })
    hy += 5
  } else {
    hy += text(b.hotel_city, hx, hy, { size: 9, maxW: hw }) + 2
  }
  if (site.supportPhone) text(`Front desk & support: ${site.supportPhone}`, hx, hy, { size: 8.5, color: C.grey, maxW: hw })
  // QR
  doc.addImage(qr, 'PNG', W - M - 29, y, 29, 29)
  text('Show at check-in', W - M - 14.5, y + 33, { size: 7.5, color: C.grey, align: 'center' })
  y += imgH + 8

  // Stay grid
  const cells: [string, string, string][] = [
    ['Check-in', day(b.check_in), `from ${site.checkInTime}`],
    ['Check-out', day(b.check_out), `until ${site.checkOutTime}`],
    ['Stay', `${b.nights} night${b.nights > 1 ? 's' : ''}`, `${b.rooms} room${b.rooms > 1 ? 's' : ''} · ${b.guests} guest${b.guests > 1 ? 's' : ''}`],
    ['Room type', b.room_name, room ? room.size.split('·')[0].trim() : ''],
  ]
  const cw = (W - 2 * M - 9) / 4
  cells.forEach(([l, v, s], i) => {
    const x = M + i * (cw + 3)
    box(x, y, cw, 22, C.canvas)
    label(l, x + 3.5, y + 6)
    text(v, x + 3.5, y + 12.5, { size: 10.5, bold: true, maxW: cw - 6 })
    text(s, x + 3.5, y + 18, { size: 8, color: C.grey, maxW: cw - 6 })
  })
  y += 29

  // Guest
  section('Guest details')
  const g: [string, string][] = [
    ['Primary guest', b.guest_name],
    ['Mobile', b.guest_phone],
    ['Email', b.guest_email],
  ]
  const gw = (W - 2 * M) / 3
  g.forEach(([l, v], i) => {
    label(l, M + i * gw, y)
    text(v, M + i * gw, y + 5.5, { size: 10, bold: true, maxW: gw - 4 })
  })
  y += 13

  // Payment
  const extras = b.extras ?? []
  // Keep the whole payment block (rows + total) on one page.
  section('Payment summary', 8 + (3 + extras.length) * 6 + 26)
  const extrasTotal = extras.reduce((s, x) => s + x.amount, 0)
  const rows: [string, string, string?][] = [
    [`Room charges (${b.rooms} room${b.rooms > 1 ? 's' : ''} x ${b.nights} night${b.nights > 1 ? 's' : ''})`, money(b.room_total)],
    ...(b.discount_total > 0
      ? [[`Discounts (Club member saving${b.coupon ? `, coupon ${b.coupon}` : ''}${b.points_used ? `, ${b.points_used} Club points` : ''})`, `- ${money(b.discount_total)}`, C.leaf] as [string, string, string]]
      : []),
    ['GST on room', money(b.tax)],
    ...extras.map((x) => [x.label, money(x.amount)] as [string, string]),
  ]
  rows.forEach(([l, v, col]) => {
    ensure(7)
    text(l, M, y, { size: 9.5, color: col ?? C.ink, maxW: 130 })
    text(v, W - M, y, { size: 9.5, color: col ?? C.ink, align: 'right' })
    y += 6
  })
  ensure(16)
  box(M, y - 2, W - 2 * M, 13, C.navy)
  text(cancelled ? 'Booking amount (cancelled)' : 'Total payable at hotel', M + 4, y + 6.2, { size: 11, bold: true, color: '#FFFFFF' })
  text(money(b.amount), W - M - 4, y + 6.4, { size: 14, bold: true, color: '#FFFFFF', align: 'right' })
  y += 15
  text(
    `Includes GST of ${money(b.tax)}${extrasTotal ? ` and add-ons of ${money(extrasTotal)}` : ''}. A GST invoice is issued by the hotel at check-out.`,
    M,
    y,
    { size: 8, color: C.grey, maxW: W - 2 * M },
  )
  y += 8

  section('Before you arrive')
  ;[
    'Carry a government photo ID (Aadhaar, passport, driving licence or voter ID) for every adult guest.',
    `Show booking ID ${b.id} or the QR code on this voucher at the front desk.`,
    `Room not as promised? ${site.supportPhone ? `Call ${site.supportPhone}` : 'Tell the front desk'} — we fix it within 30 minutes or the night is free.`,
  ].forEach((x, i) => {
    ensure(7)
    y += text(`${i + 1}.  ${x}`, M, y, { size: 9, maxW: W - 2 * M }) + 2
  })


  /* ---------- details ---------- */
  // Photos
  const shots = thumbs.map((t, i) => ({ t, u: uniqueGallery[i] })).filter((x) => x.t)
  if (shots.length) {
    section('Your hotel and room', 40)
    const tw = (W - 2 * M - (shots.length - 1) * 3) / shots.length
    const th = tw * (25 / 43)
    shots.forEach(({ t, u }, i) => {
      const x = M + i * (tw + 3)
      doc.addImage(t!, 'JPEG', x, y, tw, th, undefined, 'FAST')
      text(i === 0 && room?.photo === u ? b.room_name : photoLabel(u), x, y + th + 4.5, { size: 8, color: C.grey })
    })
    y += th + 10
  }

  const reqs = (b.special_requests ?? '')
    .split('\n')
    .map((s) => s.trim())
    .filter((s) => s && !s.startsWith('Add-on:'))
  if (reqs.length) {
    section('Requests and notes for the hotel')
    reqs.forEach((r) => {
      ensure(6)
      y += text(`•  ${r}`, M, y, { size: 9, maxW: W - 2 * M }) + 1.5
    })
    text('Requests depend on availability at check-in.', M, y + 1, { size: 8, color: C.grey })
    y += 7
  }

  section('Cancellation policy')
  // Same rule as the website: the hotel's own window (partner hotels can differ), and a booking made
  // after the window closed can't be cancelled for a refund.
  const hours = hotel ? freeCancelHours(hotel) : site.freeCancelHours
  const refundable = hours !== null && cancelTerms({ ...b, status: 'confirmed' }, hotel, new Date(b.created_at).getTime()).free
  const deadline = hours ? addDays(b.check_in, -Math.ceil(hours / 24)) : b.check_in
  const cancelHow = `Cancel from My bookings on ${window.location.host}${site.supportPhone ? ` or call ${site.supportPhone}` : ''}.`
  ensure(22)
  const half = (W - 2 * M) / 2
  if (refundable) {
    doc.setFillColor('#1F8A7A')
    doc.rect(M, y, half, 6, 'F')
    doc.setFillColor('#FFF1D6')
    doc.rect(M + half, y, half, 6, 'F')
    text('100% refund', M + half / 2, y + 4.1, { size: 8, bold: true, color: '#FFFFFF', align: 'center' })
    text('Non-refundable', M + half * 1.5, y + 4.1, { size: 8, bold: true, color: '#9A6B12', align: 'center' })
    text('Now', M, y + 10, { size: 7.5, color: C.grey })
    text(`${day(deadline)}, ${site.checkInTime}`, M + half, y + 10, { size: 7.5, bold: true, align: 'center' })
  } else {
    doc.setFillColor('#FFF1D6')
    doc.rect(M, y, 2 * half, 6, 'F')
    text('Non-refundable', M + half, y + 4.1, { size: 8, bold: true, color: '#9A6B12', align: 'center' })
  }
  text(`Check-in ${day(b.check_in)}`, W - M, y + 10, { size: 7.5, color: C.grey, align: 'right' })
  y += 15
  y +=
    text(
      refundable
        ? `Free cancellation until ${hours === 0 ? 'check-in' : `${hours} hours before check-in`} (${day(deadline)}, ${site.checkInTime}). After that the first night is charged, and no-shows are charged in full. ${cancelHow}`
        : `${hours === null ? 'This is a non-refundable rate.' : 'This booking was made after the free-cancellation window closed.'} It can't be cancelled for a refund, and no-shows are charged in full.`,
      M,
      y,
      { size: 9, maxW: W - 2 * M },
    ) + 4

  if (hotel) {
    const r = hotelRules(hotel)
    section('Important information')
    ;[r.couple, ...r.must, ...r.fees.slice(0, 3)].forEach((x) => {
      ensure(6)
      y += text(`•  ${x}`, M, y, { size: 9, maxW: W - 2 * M }) + 1.5
    })
    y += 3

    const am = hotel.amenities.map((a) => amenityMeta[a].label)
    const colW = (W - 2 * M) / 3
    section('Amenities', Math.ceil(am.length / 3) * 5.5 + 12)
    am.forEach((a, i) => {
      text(`•  ${a}`, M + (i % 3) * colW, y + Math.floor(i / 3) * 5.5, { size: 9 })
    })
    y += Math.ceil(am.length / 3) * 5.5 + 4

    const near = landmarksNear(hotel.city, hotel.lat, hotel.lng).slice(0, 8)
    if (near.length) {
      section('Around the hotel', Math.ceil(near.length / 2) * 5.5 + 16)
      near.forEach((l, i) => {
        const x = M + (i % 2) * half
        const yy = y + Math.floor(i / 2) * 5.5
        text(l.name, x, yy, { size: 9, maxW: half - 22 })
        text(kmLabel(l.km), x + half - 6, yy, { size: 9, color: C.grey, align: 'right' })
      })
      y += Math.ceil(near.length / 2) * 5.5 + 2
      text('Distances are straight-line and approximate.', M, y, { size: 7.5, color: C.light })
      y += 6
    }
  }

  // Footer on every page
  const pages = doc.getNumberOfPages()
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p)
    doc.setDrawColor(C.line)
    doc.line(M, H - 13, W - M, H - 13)
    text([site.name, site.supportPhone, site.supportEmail].filter(Boolean).join('  ·  '), M, H - 8, { size: 7.5, color: C.grey })
    text(`Computer-generated voucher, no signature needed  ·  Page ${p} of ${pages}`, W - M, H - 8, { size: 7.5, color: C.grey, align: 'right' })
  }
  return doc
}

export const voucherFileName = (b: Booking) => `${site.name}-Booking-${b.id}.pdf`

/** Downloads the voucher PDF. */
export async function downloadVoucher(b: Booking, hotel: Hotel | null) {
  const doc = await buildVoucher(b, hotel)
  doc.save(voucherFileName(b))
}

/** Opens the phone's share sheet with the PDF (WhatsApp, email…). Falls back to download. */
export async function shareVoucher(b: Booking, hotel: Hotel | null) {
  const doc = await buildVoucher(b, hotel)
  const file = new File([doc.output('blob')], voucherFileName(b), { type: 'application/pdf' })
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean }
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: `${site.name} booking ${b.id}`, text: `My stay at ${b.hotel_name}, ${day(b.check_in)} – ${day(b.check_out)}` })
      return 'shared' as const
    } catch {
      return 'cancelled' as const
    }
  }
  doc.save(voucherFileName(b))
  return 'downloaded' as const
}
