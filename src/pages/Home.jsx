import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import api from '../lib/api'
import { money } from '../lib/dates'
import Logo from '../components/Logo'
import { Clock, Cloud, Instagram, Pin, Spark, WhatsApp } from '../components/Icons'
import { ART, SITE, waLink } from '../config/site'
import { usePageTitle } from '../lib/usePageTitle'

export default function Home() {
  usePageTitle()
  const [list, setList] = useState(null)
  const { hash } = useLocation()

  useEffect(() => {
    api.getDisciplines().then(setList).catch(() => setList([]))
  }, [])
  useEffect(() => {
    if (hash) setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth' }), 60)
  }, [hash])

  return (
    <>
      <section className="hero">
        <Cloud className="cloud cloud--a" />
        <Cloud className="cloud cloud--b" />
        <Cloud className="cloud cloud--c" />
        <div className="wrap">
          <h1 className="sr-only">Nube Estudio · Pilates, danza y música en José Mármol</h1>
          <div className="hero__logo"><Logo big as="div" /></div>
          <Spark className="hero__spark" />
          <p className="hero__tag">{SITE.tagline}</p>
          <p className="lead">{SITE.intro}</p>
          <div className="hero__cta">
            <Link to="/reservar" className="btn">Reservar una clase</Link>
            <Link to="/clases" className="btn btn--ghost">Ver horarios</Link>
          </div>
          <img className="hero__dancer" src={ART.danza} alt="" />
        </div>
      </section>

      <section className="section section--white" id="clases">
        <div className="wrap">
          <div className="section__head section__head--center">
            <p className="eyebrow eyebrow--center">Disciplinas</p>
            <h2>Un lugar para el cuerpo y el arte</h2>
            <p className="lead">Clases en grupos reducidos y clases individuales de música. Elegí la tuya y reservá tu lugar online.</p>
          </div>
          <div className="disc-grid">
            {(list ?? Array.from({ length: 5 }, (_, i) => ({ id: i, skeleton: true }))).map((d) =>
              d.skeleton ? <div key={d.id} className="disc skeleton" style={{ height: 330 }} /> : (
                <article key={d.id} className="disc">
                  <div className="disc__art">{ART[d.key] && <img src={ART[d.key]} alt="" loading="lazy" />}</div>
                  <h3 className="disc__name">{d.name}</h3>
                  <p>{d.description}</p>
                  <div className="disc__foot">
                    <span>{d.kind === 'individual' ? 'Individual' : 'Grupal'} · {d.minutes} min · <strong>{money(d.price)}</strong></span>
                    <Link to={`/reservar?d=${d.key}`} className="btn btn--sm btn--ghost">Reservar</Link>
                  </div>
                </article>
              ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="section__head section__head--center">
            <p className="eyebrow eyebrow--center">Cómo reservar</p>
            <h2>Tu lugar en tres pasos</h2>
          </div>
          <div className="steps">
            <div className="step"><h3>Elegí la clase</h3><p>Mirá los días y horarios disponibles y cuántos lugares quedan en cada clase.</p></div>
            <div className="step"><h3>Dejá tus datos</h3><p>Nombre, email y WhatsApp. Te llega un email con la confirmación y los datos de pago.</p></div>
            <div className="step"><h3>Vení a moverte</h3><p>Te recordamos la clase el día anterior. Si no podés venir, cancelás con un clic.</p></div>
          </div>
        </div>
      </section>

      <section className="section section--white">
        <div className="wrap split">
          <div className="split__art"><img src={ART['pilates-reformer']} alt="Camilla de Pilates Reformer" loading="lazy" /></div>
          <div>
            <p className="eyebrow">El estudio</p>
            <h2>Movimiento, arte y bienestar en un mismo lugar</h2>
            {/* COMPLETAR: texto de Lisbeth sobre el estudio y las profes */}
            <p className="muted">Nube es un espacio pensado para que te sientas cómoda desde el primer día. Trabajamos en grupos chicos para acompañarte de cerca, ya sea que empieces de cero o quieras ir por más.</p>
            <p className="muted">Además de Pilates Reformer y Mat, tenemos clases de danza y clases individuales de piano y guitarra, para todas las edades.</p>
            <div className="values"><span>Movimiento</span><span>Arte</span><span>Bienestar</span></div>
          </div>
        </div>
      </section>

      <section className="section" id="contacto">
        <div className="wrap">
          <div className="section__head">
            <p className="eyebrow">Visitanos</p>
            <h2>Estamos en José Mármol</h2>
          </div>
          <div className="visit">
            <div className="visit__card">
              <div className="visit__row"><Pin /><div><strong>Dirección</strong><span>{SITE.address}</span></div></div>
              <div className="visit__row"><Clock /><div><strong>Horarios</strong><span>{SITE.hours}</span></div></div>
              <div className="visit__row"><WhatsApp /><div><strong>WhatsApp</strong><span><a href={waLink()} target="_blank" rel="noopener">{SITE.whatsappLabel}</a></span></div></div>
              <div className="visit__row"><Instagram /><div><strong>Instagram</strong><span><a href={`https://instagram.com/${SITE.instagram}`} target="_blank" rel="noopener">@{SITE.instagram}</a></span></div></div>
              <a className="btn btn--wa" href={waLink('¡Hola! Quería consultar por las clases de Nube Estudio.')} target="_blank" rel="noopener"><WhatsApp /> Escribinos</a>
            </div>
            <iframe className="map" title="Mapa de Nube Estudio" loading="lazy" referrerPolicy="no-referrer-when-downgrade"
              src={`https://www.google.com/maps?q=${encodeURIComponent(SITE.mapQuery)}&z=14&output=embed`} />
          </div>
        </div>
      </section>

      <section className="wrap">
        <div className="cta-band">
          <Cloud className="cloud cloud--a" />
          <Cloud className="cloud cloud--b" />
          <h2>¿Arrancamos?</h2>
          <p>Reservá tu primera clase en un minuto. Elegís el horario, dejás tus datos y listo.</p>
          <Link to="/reservar" className="btn">Reservar ahora</Link>
        </div>
      </section>
    </>
  )
}
