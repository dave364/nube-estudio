import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../lib/api'
import { addDays, dayKey, fTime, isoWeekday, money, todayKey, WEEKDAYS } from '../lib/dates'
import { ART } from '../config/site'
import { usePageTitle } from '../lib/usePageTitle'

// Disciplinas + grilla semanal (la próxima semana, desde mañana)
export default function Clases() {
  usePageTitle('Clases y horarios')
  const [list, setList] = useState(null)
  const [occ, setOcc] = useState(null)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    const from = addDays(todayKey(), 1)
    api.getDisciplines().then(setList).catch(() => setList([]))
    api.getSchedule(from, addDays(from, 6)).then(setOcc).catch(() => setOcc([]))
  }, [])

  const week = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => ({ wd: i + 1, items: [] }))
    for (const o of occ ?? []) {
      if (filter !== 'all' && o.discipline_key !== filter) continue
      days[isoWeekday(dayKey(o.starts_at)) - 1].items.push(o)
    }
    days.forEach((d) => d.items.sort((a, b) => fTime(a.starts_at).localeCompare(fTime(b.starts_at))))
    return days.filter((d) => d.wd < 7 || d.items.length)
  }, [occ, filter])

  return (
    <>
      <section className="page-head">
        <div className="wrap">
          <p className="eyebrow">Clases y horarios</p>
          <h1>Encontrá tu clase</h1>
          <p className="lead">Tocá un horario para reservar tu lugar. Los cupos se actualizan en el momento.</p>
        </div>
      </section>

      <section className="wrap">
        <div className="filters" role="group" aria-label="Filtrar por disciplina">
          <button className={`chip${filter === 'all' ? ' is-active' : ''}`} onClick={() => setFilter('all')}>Todas</button>
          {(list ?? []).map((d) => (
            <button key={d.key} className={`chip${filter === d.key ? ' is-active' : ''}`} onClick={() => setFilter(d.key)}>{d.name}</button>
          ))}
        </div>
        {!occ ? (
          <div className="week">{Array.from({ length: 6 }, (_, i) => <div key={i} className="skeleton" style={{ height: 220 }} />)}</div>
        ) : (
          <div className="week" style={week.length === 7 ? { gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' } : undefined}>
            {week.map((d) => (
              <div key={d.wd} className="week__day">
                <h3>{WEEKDAYS[d.wd - 1]}</h3>
                {d.items.length === 0 && <p className="week__empty">—</p>}
                {d.items.map((o) => (
                  <Link key={o.class_id} className="week__item" to={`/reservar?d=${o.discipline_key}&dia=${dayKey(o.starts_at)}`}>
                    <b>{fTime(o.starts_at)}</b>
                    <span>{o.discipline_name}{o.teacher ? ` · ${o.teacher}` : ''}</span>
                  </Link>
                ))}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="section">
        <div className="wrap">
          <div className="section__head">
            <p className="eyebrow">Disciplinas</p>
            <h2>Qué hacemos en Nube</h2>
          </div>
          <div className="disc-grid">
            {(list ?? []).map((d) => (
              <article key={d.id} className="disc" style={{ background: 'var(--white)' }}>
                <div className="disc__art">{ART[d.key] && <img src={ART[d.key]} alt="" loading="lazy" />}</div>
                <h3 className="disc__name">{d.name}</h3>
                <p>{d.description}</p>
                <div className="disc__foot">
                  <span>{d.kind === 'individual' ? 'Individual' : 'Grupal'} · {d.minutes} min · <strong>{money(d.price)}</strong></span>
                  <Link to={`/reservar?d=${d.key}`} className="btn btn--sm">Reservar</Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
