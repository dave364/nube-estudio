import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, HashRouter, Link, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import Header from './components/Header'
import Footer, { WhatsAppFloat } from './components/Footer'
import Home from './pages/Home'
import Clases from './pages/Clases'
import Reservar from './pages/Reservar'
import Cancelar from './pages/Cancelar'
import { DEMO } from './lib/api'

const Admin = lazy(() => import('./admin/Admin'))

// La versión de muestra usa links con # para funcionar en cualquier hosting
const Router = import.meta.env.VITE_DEMO === 'true' ? HashRouter : BrowserRouter

function ScrollTop() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (!hash) window.scrollTo(0, 0)
  }, [pathname, hash])
  return null
}

function Layout() {
  return (
    <>
      {DEMO && (
        <div className="demo-bar">
          Versión de muestra: los horarios y reservas son de ejemplo. <Link to="/admin">Ver el panel de Lisbeth →</Link>
        </div>
      )}
      <Header />
      <main><Outlet /></main>
      <Footer />
      <WhatsAppFloat />
    </>
  )
}

function NotFound() {
  return (
    <section className="section">
      <div className="wrap" style={{ textAlign: 'center' }}>
        <h1>Esta página se fue volando</h1>
        <p className="muted">No encontramos lo que buscabas.</p>
        <Link className="btn" to="/">Volver al inicio</Link>
      </div>
    </section>
  )
}

export default function App() {
  return (
    <Router>
      <ScrollTop />
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="clases" element={<Clases />} />
          <Route path="reservar" element={<Reservar />} />
          <Route path="reservar/cancelar" element={<Cancelar />} />
          <Route path="*" element={<NotFound />} />
        </Route>
        <Route path="admin/*" element={<Suspense fallback={null}><Admin /></Suspense>} />
      </Routes>
    </Router>
  )
}
