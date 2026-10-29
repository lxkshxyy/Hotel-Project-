import { useSession } from '../context/Session'
import { balanceOf, getHotels, getLedger, listBookings, listCustomers, listQuotes, useData } from './store'

export const useHotels = () => useData(() => getHotels(), [])

export function useWallet() {
  const { agency } = useSession()
  const r = useData(() => (agency ? getLedger(agency) : Promise.resolve([])), [agency?.id])
  const balance = balanceOf(r.data ?? [])
  return { ...r, balance, available: balance + (agency?.creditLimit ?? 0) }
}

export function useBookings() {
  const { agency } = useSession()
  return useData(() => (agency ? listBookings(agency) : Promise.resolve([])), [agency?.id])
}

export function useCustomers() {
  const { agency } = useSession()
  return useData(() => (agency ? listCustomers(agency) : Promise.resolve([])), [agency?.id])
}

export function useQuotes() {
  const { agency } = useSession()
  return useData(() => (agency ? listQuotes(agency) : Promise.resolve([])), [agency?.id])
}
