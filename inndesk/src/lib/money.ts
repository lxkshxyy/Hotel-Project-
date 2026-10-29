import { site } from '../config/site'
import type { Reservation } from './types'

/**
 * What one booking means for the owner.
 * Pay online: StayEasy collected the money and pays out the amount minus commission and its GST.
 * Pay at hotel: the hotel collected it, so the commission and its GST are taken from the next payout.
 */
export function settle(r: Reservation) {
  const roomAmount = r.amount - r.tax // what commission is charged on (before room GST)
  const commission = Math.round(roomAmount * site.commissionRate)
  const gst = Math.round(commission * site.gstOnCommission)
  const collectedByHotel = r.pay_mode === 'hotel'
  const payout = collectedByHotel ? -(commission + gst) : r.amount - commission - gst
  return { roomAmount, roomGst: r.tax, commission, gst, collectedByHotel, payout, earned: r.amount - commission - gst }
}
