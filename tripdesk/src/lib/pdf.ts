import { inr, plural, shortDate } from '@stayeasy/lib/format'
import { site } from '../config/site'
import type { Agency, AgentBooking, Quote } from './types'

/*
 * Customer-facing PDFs carry the AGENCY's name, never the net rate.
 * jsPDF is loaded only when a PDF is made.
 */

const INK: [number, number, number] = [27, 34, 64]
const GOLD: [number, number, number] = [240, 162, 2]
const GREY: [number, number, number] = [91, 100, 119]

/** Loads any image (webp included) as a JPEG data URL that jsPDF can embed. */
async function jpeg(url?: string): Promise<string | null> {
  if (!url) return null
  try {
    const img = await new Promise<HTMLImageElement>((ok, bad) => {
      const i = new Image()
      i.crossOrigin = 'anonymous'
      i.onload = () => ok(i)
      i.onerror = bad
      i.src = url
    })
    const c = document.createElement('canvas')
    const w = 900
    c.width = w
    c.height = Math.round((img.height / img.width) * w)
    c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
    return c.toDataURL('image/jpeg', 0.8)
  } catch {
    return null
  }
}

async function doc() {
  const { jsPDF } = await import('jspdf')
  return new jsPDF({ unit: 'mm', format: 'a4' })
}

function header(d: Awaited<ReturnType<typeof doc>>, agency: Agency, title: string) {
  d.setFillColor(...INK)
  d.rect(0, 0, 210, 30, 'F')
  d.setTextColor(255, 255, 255)
  d.setFont('helvetica', 'bold')
  d.setFontSize(17)
  d.text(agency.name, 14, 14)
  d.setFont('helvetica', 'normal')
  d.setFontSize(9.5)
  d.text([`+91 ${agency.phone}`, agency.email, agency.gstin ? `GSTIN ${agency.gstin}` : ''].filter(Boolean).join('   '), 14, 22)
  d.setTextColor(...GOLD)
  d.setFont('helvetica', 'bold')
  d.setFontSize(12)
  d.text(title, 196, 14, { align: 'right' })
}

const rs = (n: number) => inr(n).replace('₹', 'Rs. ')

export async function quotePdf(agency: Agency, q: Quote) {
  const d = await doc()
  header(d, agency, 'Hotel quote')
  d.setTextColor(...INK)
  d.setFont('helvetica', 'bold')
  d.setFontSize(13)
  d.text(`For ${q.customerName}`, 14, 42)
  d.setFont('helvetica', 'normal')
  d.setFontSize(9.5)
  d.setTextColor(...GREY)
  d.text(`Quote ${q.id.toUpperCase()}, ${new Date(q.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}. Prices include taxes and may change until booked.`, 14, 48)
  let y = 56
  for (const [i, it] of q.items.entries()) {
    if (y > 240) {
      d.addPage()
      y = 20
    }
    const img = await jpeg(it.photo)
    d.setDrawColor(220, 225, 234)
    d.roundedRect(14, y, 182, 44, 2, 2)
    if (img) d.addImage(img, 'JPEG', 16, y + 2, 56, 40)
    const x = img ? 76 : 18
    d.setTextColor(...INK)
    d.setFont('helvetica', 'bold')
    d.setFontSize(12)
    d.text(`Option ${i + 1}: ${it.hotelName}`, x, y + 9)
    d.setFont('helvetica', 'normal')
    d.setFontSize(9.5)
    d.setTextColor(...GREY)
    d.text(`${it.area}, ${it.city}`, x, y + 15)
    d.text(`${it.roomName}, ${plural(it.rooms, 'room')}, ${plural(it.adults + it.children, 'guest')}`, x, y + 21)
    d.text(`${shortDate(it.checkIn)} to ${shortDate(it.checkOut)}`, x, y + 27)
    d.text(it.freeCancel, x, y + 33)
    d.setTextColor(...INK)
    d.setFont('helvetica', 'bold')
    d.setFontSize(15)
    d.text(rs(it.sellingTotal), 192, y + 38, { align: 'right' })
    y += 50
  }
  if (q.note) {
    d.setFont('helvetica', 'normal')
    d.setFontSize(10)
    d.setTextColor(...INK)
    d.text(d.splitTextToSize(q.note, 180), 14, y + 4)
  }
  d.setFontSize(8.5)
  d.setTextColor(...GREY)
  d.text(`Hotels by ${site.marketplace}. Contact ${agency.name} to confirm your booking.`, 14, 288)
  d.save(`Quote-${q.customerName.replace(/\W+/g, '-')}.pdf`)
}

export async function voucherPdf(agency: Agency, b: AgentBooking, hotel: { address?: string; photos?: string[]; checkIn?: string; checkOut?: string } | null) {
  const d = await doc()
  header(d, agency, b.status === 'cancelled' ? 'Cancelled booking' : 'Hotel voucher')
  const img = await jpeg(hotel?.photos?.[0])
  if (img) d.addImage(img, 'JPEG', 14, 38, 70, 48)
  const x = img ? 90 : 14
  d.setTextColor(...INK)
  d.setFont('helvetica', 'bold')
  d.setFontSize(15)
  d.text(b.hotel_name, x, 46)
  d.setFont('helvetica', 'normal')
  d.setFontSize(10)
  d.setTextColor(...GREY)
  d.text(d.splitTextToSize(hotel?.address ?? b.hotel_city, 106), x, 53)
  d.setTextColor(...INK)
  d.setFont('helvetica', 'bold')
  d.setFontSize(11)
  d.text(`Booking ID  ${b.id}`, x, 72)
  const rows: [string, string][] = [
    ['Guest', b.guest_name],
    ['Phone', b.guest_phone],
    ['Room', `${b.rooms} x ${b.room_name}`],
    ['Guests', String(b.guests)],
    ['Check-in', `${shortDate(b.check_in)}, from ${hotel?.checkIn ?? '12:00 PM'}`],
    ['Check-out', `${shortDate(b.check_out)}, by ${hotel?.checkOut ?? '11:00 AM'}`],
    ['Nights', String(b.nights)],
  ]
  if (agency.showPriceOnVoucher) rows.push(['Amount', `${rs(b.selling_amount)} (paid to ${agency.name})`])
  else rows.push(['Payment', `Paid to ${agency.name}`])
  let y = 98
  d.setFontSize(10.5)
  for (const [k, v] of rows) {
    d.setFont('helvetica', 'normal')
    d.setTextColor(...GREY)
    d.text(k, 14, y)
    d.setFont('helvetica', 'bold')
    d.setTextColor(...INK)
    d.text(v, 60, y)
    y += 8
  }
  if (b.special_requests) {
    d.setFont('helvetica', 'normal')
    d.setTextColor(...GREY)
    d.text('Requests', 14, y)
    d.setTextColor(...INK)
    d.text(d.splitTextToSize(b.special_requests, 136), 60, y)
    y += 12
  }
  d.setDrawColor(...GOLD)
  d.line(14, y + 2, 196, y + 2)
  d.setFont('helvetica', 'normal')
  d.setFontSize(9.5)
  d.setTextColor(...GREY)
  d.text(d.splitTextToSize('Show this voucher and a government photo ID for every adult guest at check-in. No payment is due at the hotel for the room; extras used during the stay are paid at the hotel.', 182), 14, y + 10)
  d.text(`Booked through ${site.marketplace}. For changes, contact ${agency.name} on +91 ${agency.phone}.`, 14, 288)
  d.save(`Voucher-${b.id}.pdf`)
}

/** WhatsApp message for a quote (no net rates). */
export function quoteMessage(agency: Agency, q: Quote) {
  const lines = [
    `Hello ${q.customerName}, here are the hotel options from ${agency.name}:`,
    '',
    ...q.items.flatMap((it, i) => [
      `${i + 1}. ${it.hotelName}, ${it.area}, ${it.city}`,
      `   ${it.roomName}, ${shortDate(it.checkIn)} to ${shortDate(it.checkOut)}, ${plural(it.rooms, 'room')}`,
      `   ${inr(it.sellingTotal)} incl. taxes. ${it.freeCancel}.`,
      '',
    ]),
    q.note,
    `Reply with the option number to book. ${agency.ownerName}, +91 ${agency.phone}`,
  ].filter((x) => x !== undefined)
  return lines.join('\n').trim()
}

export const whatsappLink = (phone: string, text: string) => `https://wa.me/${phone.replace(/\D/g, '').replace(/^(\d{10})$/, '91$1')}?text=${encodeURIComponent(text)}`
