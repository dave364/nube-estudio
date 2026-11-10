import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import Logo from './Logo'
import { Close, Menu } from './Icons'

export default function Header() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const { pathname } = useLocation()

  useEffect(() => setOpen(false), [pathname])
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8)
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])

  return (
    <header className={`header${scrolled ? ' is-scrolled' : ''}`}>
      <div className="wrap header__in">
        <Logo />
        <button className="menu-btn" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label="Menú">
          {open ? <Close /> : <Menu />}
        </button>
        <nav className={`nav${open ? ' is-open' : ''}`}>
          <NavLink to="/" end>Inicio</NavLink>
          <NavLink to="/clases">Clases y horarios</NavLink>
          <Link to="/#contacto" onClick={() => setOpen(false)}>Contacto</Link>
          <NavLink to="/reservar" className="btn btn--sm">Reservar clase</NavLink>
        </nav>
      </div>
    </header>
  )
}
