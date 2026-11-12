import { addDays, parseISODate } from './format'
import { site } from '../config/site'
import type { Listing, Reservation } from './types'

/**
 * What one booking means for the owner.
 * Pay online: StayEasy collected the money and pays out the amount minus commission and its GST.
 * Pay at hotel: the hotel collected it, so the commission and its GST are taken from the next payout.
 */
export function settle(r: Reservation, l?: Pick<Listing, 'legal'>) {
  const roomAmount = r.amount - r.tax // what commission is charged on (before room GST)
  const commission = Math.round(roomAmount * site.commissionRate)
  const gst = Math.round(commission * site.gstOnCommission)
  const gstRegistered = !!(l?.legal.hasGstin || l?.legal.gstin?.trim())
  // Tax deductions the platform must make: TDS (194-O) on the gross amount; GST TCS only for registered properties.
  const tds = Math.round(r.amount * site.tdsRate)
  const tcs = gstRegistered ? Math.round(roomAmount * site.tcsRate) : 0
  const collectedByHotel = r.pay_mode === 'hotel'
  const earned = r.amount - commission - gst - tds - tcs
  const payout = collectedByHotel ? -(commission + gst + tds + tcs) : earned
  return { roomAmount, roomGst: r.tax, commission, gst, tds, tcs, gstRegistered, collectedByHotel, payout, earned }
}

/** Payout date for a stay: the Tuesday of the week after check-out (see site.payoutCycle). */
export function payoutDate(checkOut: string) {
  const mon = (parseISODate(checkOut).getDay() + 6) % 7
  return addDays(checkOut, 7 - mon + 1)
}
