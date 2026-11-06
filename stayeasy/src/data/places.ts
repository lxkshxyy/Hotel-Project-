import type { Hotel } from './types'

/** India's 28 states and 8 union territories, with the main cities used to match hotels to them. */
export const states: { name: string; kind: 'State' | 'Union Territory'; cities: string[] }[] = [
  { name: 'Andhra Pradesh', kind: 'State', cities: ['Visakhapatnam', 'Vijayawada', 'Tirupati', 'Guntur', 'Nellore', 'Amaravati'] },
  { name: 'Arunachal Pradesh', kind: 'State', cities: ['Itanagar', 'Tawang', 'Ziro'] },
  { name: 'Assam', kind: 'State', cities: ['Guwahati', 'Dibrugarh', 'Silchar', 'Jorhat', 'Tezpur'] },
  { name: 'Bihar', kind: 'State', cities: ['Patna', 'Gaya', 'Bodh Gaya', 'Muzaffarpur', 'Bhagalpur'] },
  { name: 'Chhattisgarh', kind: 'State', cities: ['Raipur', 'Bilaspur', 'Bhilai', 'Durg'] },
  { name: 'Goa', kind: 'State', cities: ['Goa', 'Panaji', 'Panjim', 'Margao', 'Calangute', 'Candolim', 'Baga', 'Vasco da Gama', 'Mapusa'] },
  { name: 'Gujarat', kind: 'State', cities: ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Gandhinagar', 'Dwarka', 'Somnath'] },
  { name: 'Haryana', kind: 'State', cities: ['Gurugram', 'Gurgaon', 'Faridabad', 'Panipat', 'Ambala', 'Karnal', 'Kurukshetra'] },
  { name: 'Himachal Pradesh', kind: 'State', cities: ['Shimla', 'Manali', 'Dharamshala', 'McLeod Ganj', 'Kasauli', 'Dalhousie'] },
  { name: 'Jharkhand', kind: 'State', cities: ['Ranchi', 'Jamshedpur', 'Dhanbad', 'Deoghar'] },
  { name: 'Karnataka', kind: 'State', cities: ['Bengaluru', 'Bangalore', 'Mysuru', 'Mysore', 'Mangaluru', 'Hubballi', 'Coorg', 'Hampi'] },
  { name: 'Kerala', kind: 'State', cities: ['Kochi', 'Cochin', 'Thiruvananthapuram', 'Trivandrum', 'Munnar', 'Alleppey', 'Alappuzha', 'Kozhikode', 'Varkala'] },
  { name: 'Madhya Pradesh', kind: 'State', cities: ['Bhopal', 'Indore', 'Gwalior', 'Jabalpur', 'Ujjain', 'Khajuraho'] },
  { name: 'Maharashtra', kind: 'State', cities: ['Mumbai', 'Pune', 'Nagpur', 'Nashik', 'Aurangabad', 'Thane', 'Navi Mumbai', 'Lonavala', 'Mahabaleshwar', 'Shirdi'] },
  { name: 'Manipur', kind: 'State', cities: ['Imphal'] },
  { name: 'Meghalaya', kind: 'State', cities: ['Shillong', 'Cherrapunji', 'Sohra'] },
  { name: 'Mizoram', kind: 'State', cities: ['Aizawl'] },
  { name: 'Nagaland', kind: 'State', cities: ['Kohima', 'Dimapur'] },
  { name: 'Odisha', kind: 'State', cities: ['Bhubaneswar', 'Puri', 'Cuttack', 'Konark', 'Rourkela'] },
  { name: 'Punjab', kind: 'State', cities: ['Amritsar', 'Ludhiana', 'Jalandhar', 'Patiala', 'Mohali'] },
  { name: 'Rajasthan', kind: 'State', cities: ['Jaipur', 'Udaipur', 'Jodhpur', 'Jaisalmer', 'Pushkar', 'Ajmer', 'Mount Abu', 'Bikaner'] },
  { name: 'Sikkim', kind: 'State', cities: ['Gangtok', 'Pelling', 'Lachung'] },
  { name: 'Tamil Nadu', kind: 'State', cities: ['Chennai', 'Coimbatore', 'Madurai', 'Ooty', 'Kodaikanal', 'Tiruchirappalli', 'Mahabalipuram', 'Rameswaram'] },
  { name: 'Telangana', kind: 'State', cities: ['Hyderabad', 'Secunderabad', 'Warangal'] },
  { name: 'Tripura', kind: 'State', cities: ['Agartala'] },
  { name: 'Uttar Pradesh', kind: 'State', cities: ['Lucknow', 'Agra', 'Varanasi', 'Noida', 'Greater Noida', 'Ghaziabad', 'Kanpur', 'Prayagraj', 'Ayodhya', 'Mathura', 'Vrindavan'] },
  { name: 'Uttarakhand', kind: 'State', cities: ['Dehradun', 'Rishikesh', 'Haridwar', 'Nainital', 'Mussoorie', 'Jim Corbett'] },
  { name: 'West Bengal', kind: 'State', cities: ['Kolkata', 'Darjeeling', 'Siliguri', 'Howrah', 'Digha'] },
  { name: 'Andaman and Nicobar Islands', kind: 'Union Territory', cities: ['Port Blair', 'Havelock'] },
  { name: 'Chandigarh', kind: 'Union Territory', cities: ['Chandigarh'] },
  { name: 'Dadra and Nagar Haveli and Daman and Diu', kind: 'Union Territory', cities: ['Daman', 'Diu', 'Silvassa'] },
  { name: 'Delhi', kind: 'Union Territory', cities: ['New Delhi', 'Delhi'] },
  { name: 'Jammu and Kashmir', kind: 'Union Territory', cities: ['Srinagar', 'Jammu', 'Gulmarg', 'Pahalgam', 'Katra'] },
  { name: 'Ladakh', kind: 'Union Territory', cities: ['Leh', 'Kargil'] },
  { name: 'Lakshadweep', kind: 'Union Territory', cities: ['Kavaratti', 'Agatti'] },
  { name: 'Puducherry', kind: 'Union Territory', cities: ['Puducherry', 'Pondicherry'] },
]

const norm = (s: string) => s.trim().toLowerCase()

/** The state or UT named by a search, if it names one (Goa and Chandigarh are both a state/UT and a city). */
export const stateNamed = (place: string) => states.find((s) => norm(s.name) === norm(place))

/** Does this hotel sit in the searched city, area, hotel name, state or union territory? */
export function hotelInPlace(h: Hotel, place: string): boolean {
  const q = norm(place)
  if (!q) return true
  if ([h.city, h.area, h.name].some((v) => norm(v).includes(q))) return true
  if (q === 'delhi' && h.city === 'New Delhi') return true
  const st = stateNamed(place)
  if (!st) return false
  const city = norm(h.city)
  return st.cities.some((c) => norm(c) === city) || norm(h.address ?? '').includes(q)
}
