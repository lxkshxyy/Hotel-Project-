import { lazy, Suspense, type ReactNode } from 'react'
import { createBrowserRouter, Link, RouterProvider } from 'react-router-dom'
import AppLayout from './components/AppLayout'
import { Spinner } from './components/ui'
import { SessionProvider } from './context/Session'
import { Landing, Login, Register } from './pages/Public'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const Hotels = lazy(() => import('./pages/Hotels'))
const HotelPage = lazy(() => import('./pages/HotelPage'))
const Book = lazy(() => import('./pages/Book'))
const Bookings = lazy(() => import('./pages/Bookings'))
const Quotes = lazy(() => import('./pages/Quotes'))
const Customers = lazy(() => import('./pages/Customers'))
const Wallet = lazy(() => import('./pages/Wallet'))
const Earnings = lazy(() => import('./pages/Earnings'))
const Settings = lazy(() => import('./pages/Settings'))
const Help = lazy(() => import('./pages/Settings').then((m) => ({ default: m.Help })))

const s = (el: ReactNode) => <Suspense fallback={<Spinner />}>{el}</Suspense>

const router = createBrowserRouter([
  { path: '/', element: <Landing /> },
  { path: '/login', element: <Login /> },
  { path: '/register', element: <Register /> },
  {
    path: '/app',
    element: <AppLayout />,
    children: [
      { index: true, element: s(<Dashboard />) },
      { path: 'hotels', element: s(<Hotels />) },
      { path: 'hotel/:slug', element: s(<HotelPage />) },
      { path: 'book', element: s(<Book />) },
      { path: 'bookings', element: s(<Bookings />) },
      { path: 'quotes', element: s(<Quotes />) },
      { path: 'customers', element: s(<Customers />) },
      { path: 'wallet', element: s(<Wallet />) },
      { path: 'earnings', element: s(<Earnings />) },
      { path: 'settings', element: s(<Settings />) },
      { path: 'help', element: s(<Help />) },
    ],
  },
  {
    path: '*',
    element: (
      <div className="page flex flex-col items-center gap-4 py-24 text-center">
        <h1 className="text-3xl font-extrabold">Page not found</h1>
        <Link to="/app" className="btn-ink">
          Go to your portal
        </Link>
      </div>
    ),
  },
])

export default function App() {
  return (
    <SessionProvider>
      <RouterProvider router={router} />
    </SessionProvider>
  )
}
