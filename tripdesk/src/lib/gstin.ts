/*
 * GSTIN / PAN / IFSC format checks. They confirm a number is correctly formed (GSTIN including
 * its check digit); they don't confirm it is registered to this owner. Connect a GST or bank
 * verification service on the server before relying on them for payouts.
 */
const STATES: Record<string, string> = {
  '01': 'Jammu and Kashmir', '02': 'Himachal Pradesh', '03': 'Punjab', '04': 'Chandigarh', '05': 'Uttarakhand', '06': 'Haryana',
  '07': 'Delhi', '08': 'Rajasthan', '09': 'Uttar Pradesh', '10': 'Bihar', '11': 'Sikkim', '12': 'Arunachal Pradesh', '13': 'Nagaland',
  '14': 'Manipur', '15': 'Mizoram', '16': 'Tripura', '17': 'Meghalaya', '18': 'Assam', '19': 'West Bengal', '20': 'Jharkhand',
  '21': 'Odisha', '22': 'Chhattisgarh', '23': 'Madhya Pradesh', '24': 'Gujarat', '26': 'Dadra and Nagar Haveli and Daman and Diu',
  '27': 'Maharashtra', '29': 'Karnataka', '30': 'Goa', '31': 'Lakshadweep', '32': 'Kerala', '33': 'Tamil Nadu', '34': 'Puducherry',
  '35': 'Andaman and Nicobar Islands', '36': 'Telangana', '37': 'Andhra Pradesh', '38': 'Ladakh', '97': 'Other Territory',
}
const CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'

function checkChar(first14: string) {
  let sum = 0
  for (let i = 0; i < 14; i++) {
    const p = CHARS.indexOf(first14[i]) * (i % 2 === 0 ? 1 : 2)
    sum += Math.floor(p / 36) + (p % 36)
  }
  return CHARS[(36 - (sum % 36)) % 36]
}

/** Returns an error message, or '' when the GSTIN is valid. */
export function gstinError(raw: string) {
  const v = raw.trim().toUpperCase()
  if (v.length !== 15) return 'A GSTIN has exactly 15 characters.'
  if (!/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(v)) return 'That isn’t a GSTIN. Check the PAN part (5 letters, 4 digits, 1 letter) and the Z in position 14.'
  if (!STATES[v.slice(0, 2)]) return `${v.slice(0, 2)} isn’t a GST state code.`
  if (checkChar(v.slice(0, 14)) !== v[14]) return 'The last character (check digit) doesn’t match. Re-check the GSTIN.'
  return ''
}
export const gstinState = (v: string) => STATES[v.slice(0, 2)] ?? ''

export const panError = (v: string) => (/^[A-Z]{5}\d{4}[A-Z]$/.test(v.trim().toUpperCase()) ? '' : 'A PAN looks like ABCDE1234F.')
export const ifscError = (v: string) => (/^[A-Z]{4}0[A-Z0-9]{6}$/.test(v.trim().toUpperCase()) ? '' : 'An IFSC has 11 characters, like HDFC0001234.')

/** Made-up test numbers that pass the checks (local demo only). */
export const demoIds = { gstin: '07ABCDE1234F1Z2', pan: 'ABCDE1234F', ifsc: 'HDFC0001234' }
