import { Link } from 'react-router-dom'
import Logo from './Logo'
import { Instagram, WhatsApp } from './Icons'
import { SITE, waLink } from '../config/site'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="wrap footer__in">
        <Logo />
        <nav className="footer__links">
          <Link to="/clases">Clases</Link>
          <Link to="/reservar">Reservar</Link>
          <Link to="/#contacto">Contacto</Link>
        </nav>
        <div className="footer__social">
          <a className="icon-btn" href={`https://instagram.com/${SITE.instagram}`} target="_blank" rel="noopener" aria-label="Instagram"><Instagram /></a>
          <a className="icon-btn" href={waLink()} target="_blank" rel="noopener" aria-label="WhatsApp"><WhatsApp /></a>
        </div>
        <p className="footer__legal">{SITE.tagline} · {SITE.address.split(',')[0]}</p>
      </div>
    </footer>
  )
}

export function WhatsAppFloat() {
  return (
    <a className="wa-float" href={waLink('¡Hola! Quería consultar por las clases de Nube Estudio.')} target="_blank" rel="noopener" aria-label="Escribinos por WhatsApp">
      <WhatsApp />
    </a>
  )
}
