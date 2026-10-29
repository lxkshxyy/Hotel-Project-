import { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom'
import Layout from './components/Layout'
import { features } from './config/launch'
import { Spinner } from './components/ui'
import { AccountProvider, useAccount } from './context/AccountContext'
import { AuthProvider } from './context/AuthContext'
import { RequireBusiness } from './pages/biz/shared'
import Home from './pages/Home'

// Split the less-visited pages into their own chunks so the home page loads fast.
const Results = lazy(() => import('./pages/Results'))
const HotelDetail = lazy(() => import('./pages/HotelDetail'))
const Checkout = lazy(() => import('./pages/Checkout'))
const Login = lazy(() => import('./pages/Login'))
const MyBookings = lazy(() => import('./pages/Bookings'))
const BookingDetail = lazy(() => import('./pages/Bookings').then((m) => ({ default: m.BookingDetail })))
const info = (name: 'Offers' | 'Business' | 'Partner' | 'About' | 'Help' | 'NotFound') =>
  lazy(() => import('./pages/Info').then((m) => ({ default: m[name] })))

const Offers = info('Offers')
const Club = lazy(() => import('./pages/Club'))
const Business = info('Business')
const Partner = info('Partner')
const About = info('About')
const Help = info('Help')
const Profile = lazy(() => import('./pages/Profile'))
const legal = (name: 'Terms' | 'Privacy' | 'Cancellation' | 'GuestPolicy') => lazy(() => import('./pages/Legal').then((m) => ({ default: m[name] })))
const Terms = legal('Terms')
const Privacy = legal('Privacy')
const Cancellation = legal('Cancellation')
const GuestPolicy = legal('GuestPolicy')
const NotFound = info('NotFound')

// StayEasy for Business (corporate panel)
const BizHome = lazy(() => import('./pages/biz/BizHome'))
const BizResults = lazy(() => import('./pages/biz/BizResults'))
const BizHotel = lazy(() => import('./pages/biz/BizHotel'))
const BizCheckout = lazy(() => import('./pages/biz/BizCheckout'))
const biz = (name: 'BizTrips' | 'BizReports') => lazy(() => import('./pages/biz/BizAccount').then((m) => ({ default: m[name] })))
const BizTrips = biz('BizTrips')
const BizReports = biz('BizReports')
const BizRequests = lazy(() => import('./pages/biz/BizRequests'))
const BizAdmin = lazy(() => import('./pages/biz/BizAdmin'))

const s = (el: React.ReactNode) => <Suspense fallback={<Spinner />}>{el}</Suspense>
// With the business panel switched off (live site until its backend is ready), /biz goes home.
const b = (el: React.ReactNode) => (features.business ? s(<RequireBusiness>{el}</RequireBusiness>) : <Navigate to="/" replace />)

/** With the Business account switched on, the home page is the business home. */
function HomeRoute() {
  const { isBusiness } = useAccount()
  return isBusiness ? <Navigate to="/biz" replace /> : <Home />
}

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <HomeRoute /> },
      { path: '/hotels', element: s(<Results />) },
      { path: '/hotel/:slug', element: s(<HotelDetail />) },
      { path: '/checkout', element: s(<Checkout />) },
      { path: '/login', element: s(<Login />) },
      { path: '/bookings', element: s(<MyBookings />) },
      { path: '/bookings/:id', element: s(<BookingDetail />) },
      { path: '/account', element: s(<Profile />) },
      { path: '/offers', element: s(<Offers />) },
      { path: '/club', element: s(<Club />) },
      { path: '/business', element: s(<Business />) },
      { path: '/partner', element: s(<Partner />) },
      { path: '/about', element: s(<About />) },
      { path: '/help', element: s(<Help />) },
      { path: '/policies', element: <Navigate to="/terms" replace /> },
      { path: '/terms', element: s(<Terms />) },
      { path: '/privacy', element: s(<Privacy />) },
      { path: '/cancellation-policy', element: s(<Cancellation />) },
      { path: '/guest-policy', element: s(<GuestPolicy />) },
      { path: '/biz', element: b(<BizHome />) },
      { path: '/biz/hotels', element: b(<BizResults />) },
      { path: '/biz/hotel/:slug', element: b(<BizHotel />) },
      { path: '/biz/checkout', element: b(<BizCheckout />) },
      { path: '/biz/trips', element: b(<BizTrips />) },
      { path: '/biz/reports', element: b(<BizReports />) },
      { path: '/biz/requests', element: b(<BizRequests />) },
      { path: '/biz/admin', element: b(<BizAdmin />) },
      { path: '/biz/profile', element: b(<Profile />) },
      { path: '/biz/company', element: <Navigate to="/biz/admin" replace /> },
      { path: '*', element: s(<NotFound />) },
    ],
  },
])

export default function App() {
  return (
    <AuthProvider>
      <AccountProvider>
        <RouterProvider router={router} />
      </AccountProvider>
    </AuthProvider>
  )
}
