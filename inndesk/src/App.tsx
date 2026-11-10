import { lazy, Suspense, type ReactNode } from 'react'
import { createBrowserRouter, createMemoryRouter, Link, Navigate, RouterProvider } from 'react-router-dom'
import AppLayout from './components/AppLayout'
import { Spinner } from './components/ui'
import { SessionProvider } from './context/Session'
import Landing from './pages/Landing'

const Properties = lazy(() => import('./pages/Properties'))
const PropertyOverview = lazy(() => import('./pages/PropertyOverview'))
const Wizard = lazy(() => import('./pages/Wizard'))
const Calendar = lazy(() => import('./pages/Calendar'))
const Reservations = lazy(() => import('./pages/Reservations'))
const Analytics = lazy(() => import('./pages/Analytics'))
const Payouts = lazy(() => import('./pages/Payouts'))
const Settings = lazy(() => import('./pages/Settings'))
const Help = lazy(() => import('./pages/Help'))

const s = (el: ReactNode) => <Suspense fallback={<Spinner />}>{el}</Suspense>

function NotFound() {
  return (
    <div className="container-page flex flex-col items-center gap-4 py-24 text-center">
      <h1 className="text-3xl font-bold text-pine-950">Page not found</h1>
      <Link to="/app" className="btn-primary">
        Go to your panel
      </Link>
    </div>
  )
}

// The single-file review demo (VITE_SINGLE) has no real address, so it routes in memory and opens on My Properties.
const makeRouter: typeof createBrowserRouter = import.meta.env.VITE_SINGLE ? (r) => createMemoryRouter(r, { initialEntries: ['/app/properties'] }) : createBrowserRouter
const router = makeRouter([
  { path: '/', element: <Landing /> },
  { path: '/login', element: <Landing /> },
  { path: '/signup', element: <Landing /> },
  { path: '/welcome', element: <Navigate to="/app" replace /> },
  {
    path: '/app',
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/app/properties" replace /> },
      { path: 'properties', element: s(<Properties />) },
      { path: 'properties/:id', element: s(<PropertyOverview />) },
      { path: 'properties/:id/edit', element: s(<Wizard />) },
      { path: 'properties/:id/analytics', element: s(<Analytics />) },
      { path: 'properties/:id/reservations', element: s(<Reservations />) },
      { path: 'calendar', element: s(<Calendar />) },
      { path: 'reservations', element: s(<Reservations />) },
      { path: 'payouts', element: s(<Payouts />) },
      { path: 'settings', element: s(<Settings />) },
      { path: 'help', element: s(<Help />) },
    ],
  },
  { path: '*', element: <NotFound /> },
])

export default function App() {
  return (
    <SessionProvider>
      <RouterProvider router={router} />
    </SessionProvider>
  )
}
