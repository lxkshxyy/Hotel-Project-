/*
 * Organisation verification: GSTIN, Udyam registration number or NGO Darpan ID.
 * These checks confirm the number is correctly formed (for GSTIN, including its check digit).
 * They do not confirm the number is registered to this company — connect a GST verification
 * API (e.g. through a GSP) on the server before relying on it for invoices.
 */

export type OrgIdType = 'GSTIN' | 'UDYAM' | 'NGO'

export const orgIdTypes: { type: OrgIdType; label: string; placeholder: string; hint: string }[] = [
  { type: 'GSTIN', label: 'GSTIN No.', placeholder: '07ABCDE1234F1Z5', hint: '15 characters, as printed on your GST certificate' },
  { type: 'UDYAM', label: 'Udyam ID', placeholder: 'UDYAM-DL-07-0012345', hint: 'MSME Udyam registration number' },
  { type: 'NGO', label: 'NGO Darpan ID', placeholder: 'DL/2019/0234567', hint: 'NITI Aayog NGO Darpan unique ID' },
]

export const gstStates: Record<string, string> = {
  '01': 'Jammu and Kashmir', '02': 'Himachal Pradesh', '03': 'Punjab', '04': 'Chandigarh', '05': 'Uttarakhand', '06': 'Haryana',
  '07': 'Delhi', '08': 'Rajasthan', '09': 'Uttar Pradesh', '10': 'Bihar', '11': 'Sikkim', '12': 'Arunachal Pradesh', '13': 'Nagaland',
  '14': 'Manipur', '15': 'Mizoram', '16': 'Tripura', '17': 'Meghalaya', '18': 'Assam', '19': 'West Bengal', '20': 'Jharkhand',
  '21': 'Odisha', '22': 'Chhattisgarh', '23': 'Madhya Pradesh', '24': 'Gujarat', '26': 'Dadra and Nagar Haveli and Daman and Diu',
  '27': 'Maharashtra', '29': 'Karnataka', '30': 'Goa', '31': 'Lakshadweep', '32': 'Kerala', '33': 'Tamil Nadu', '34': 'Puducherry',
  '35': 'Andaman and Nicobar Islands', '36': 'Telangana', '37': 'Andhra Pradesh', '38': 'Ladakh', '97': 'Other Territory',
}

const CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'

/** GSTIN check character for the first 14 characters (GSTN's published mod-36 scheme). */
export function gstinCheckChar(first14: string) {
  let sum = 0
  for (let i = 0; i < 14; i++) {
    const v = CHARS.indexOf(first14[i])
    const p = v * (i % 2 === 0 ? 1 : 2)
    sum += Math.floor(p / 36) + (p % 36)
  }
  return CHARS[(36 - (sum % 36)) % 36]
}

export function validateOrgId(type: OrgIdType, raw: string): { ok: true; value: string; note: string } | { ok: false; error: string } {
  const v = raw.trim().toUpperCase().replace(/\s+/g, '')
  if (!v) return { ok: false, error: 'Enter the number to verify.' }
  if (type === 'GSTIN') {
    if (v.length !== 15) return { ok: false, error: 'A GSTIN has exactly 15 characters.' }
    if (!/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(v)) return { ok: false, error: 'That doesn’t look like a GSTIN. Check the PAN part (5 letters, 4 digits, 1 letter) and the “Z” in position 14.' }
    const state = gstStates[v.slice(0, 2)]
    if (!state) return { ok: false, error: `State code ${v.slice(0, 2)} isn’t a valid GST state code.` }
    if (gstinCheckChar(v.slice(0, 14)) !== v[14]) return { ok: false, error: 'The last character (check digit) doesn’t match. Please re-check the GSTIN.' }
    return { ok: true, value: v, note: `Registered in ${state} · PAN ${v.slice(2, 12)}` }
  }
  if (type === 'UDYAM') {
    if (!/^UDYAM-[A-Z]{2}-\d{2}-\d{7}$/.test(v)) return { ok: false, error: 'Udyam numbers look like UDYAM-DL-07-0012345.' }
    return { ok: true, value: v, note: 'MSME Udyam registration' }
  }
  if (!/^[A-Z]{2}\/\d{4}\/\d{7}$/.test(v)) return { ok: false, error: 'NGO Darpan IDs look like DL/2019/0234567.' }
  return { ok: true, value: v, note: 'NGO Darpan registration' }
}
