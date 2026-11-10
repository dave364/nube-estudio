import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import api, { DEMO, errorText } from '../lib/api'
import { addDays, dayChip, dayKey, fDayLong, fTime, money, todayKey } from '../lib/dates'
import { ART, SITE, waLink } from '../config/site'
import { Calendar, Check, WhatsApp } from '../components/Icons'
import { usePageTitle } from '../lib/usePageTitle'

const spotsText = (o) =>
  o.spots_left <= 0 ? 'Completa'
    : o.capacity === 1 ? 'Disponible'
      : o.spots_left === 1 ? 'Queda 1 lugar' : `Quedan ${o.spots_left} lugares`

export default function Reservar() {
  usePageTitle('Reservar')
  const [params, setParams] = useSearchParams()
  const filter = params.get('d') || 'all'
  const [list, setList] = useState([])
  const [settings, setSettings] = useState(null)
  const [occ, setOcc] = useState(null)
  const [day, setDay] = useState(params.get('dia'))
  const [picked, setPicked] = useState(null)
  const [done, setDone] = useState(null)
  const [notice, setNotice] = useState(null)

  const load = async () => {
    const st = settings ?? (await api.getPublicSettings().catch(() => ({})))
    setSettings(st)
    const today = todayKey()
    setOcc(await api.getSchedule(today, addDays(today, st.max_days_ahead ?? 21)).catch(() => []))
  }
  useEffect(() => {
    api.getDisciplines().then(setList).catch(() => {})
    load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const visible = useMemo(() => (occ ?? []).filter((o) => filter === 'all' || o.discipline_key === filter), [occ, filter])
  const byDay = useMemo(() => {
    const m = new Map()
    for (const o of visible) {
      const k = dayKey(o.starts_at)
      if (!m.has(k)) m.set(k, [])
      m.get(k).push(o)
    }
    return m
  }, [visible])
  const days = useMemo(() => {
    const today = todayKey()
    return Array.from({ length: (settings?.max_days_ahead ?? 21) + 1 }, (_, i) => addDays(today, i))
  }, [settings])

  // Si el día elegido no tiene clases con este filtro, salta al primero que tenga
  useEffect(() => {
    if (!occ) return
    if (!day || !byDay.has(day)) setDay([...byDay.keys()][0] ?? null)
  }, [occ, byDay]) // eslint-disable-line react-hooks/exhaustive-deps

  const setFilter = (k) => {
    const p = new URLSearchParams(params)
    if (k === 'all') p.delete('d')
    else p.set('d', k)
    p.delete('dia')
    setParams(p, { replace: true })
  }

  if (done) return <Done result={done} settings={settings} onAgain={() => { setDone(null); setPicked(null); load() }} />

  return (
    <>
      <section className="page-head">
        <div className="wrap">
          <p className="eyebrow">Reservas</p>
          <h1>Reservá tu clase</h1>
          <p className="lead">Elegí disciplina, día y horario. Vas a ver en el momento cuántos lugares quedan.</p>
        </div>
      </section>

      <section className="wrap book">
        {picked ? (
          <BookingForm occ={picked} onBack={() => setPicked(null)} onDone={setDone}
            onFull={(msg) => { setPicked(null); setNotice(msg); load() }} />
        ) : (
          <>
            <div className="filters" role="group" aria-label="Disciplina">
              <button className={`chip${filter === 'all' ? ' is-active' : ''}`} onClick={() => setFilter('all')}>Todas</button>
              {list.map((d) => (
                <button key={d.key} className={`chip${filter === d.key ? ' is-active' : ''}`} onClick={() => setFilter(d.key)}>{d.name}</button>
              ))}
            </div>

            <div className="days" role="tablist" aria-label="Día">
              {days.map((k) => {
                const c = dayChip(k)
                const items = byDay.get(k)
                const free = items?.some((o) => o.spots_left > 0)
                return (
                  <button key={k} role="tab" aria-selected={day === k} disabled={!items}
                    className={`day${day === k ? ' is-active' : ''}`} onClick={() => setDay(k)}>
                    <small>{c.wd}</small><b>{c.day}</b><small>{c.month}</small>
                    {free && <span className="day__dot" />}
                  </button>
                )
              })}
            </div>

            {notice && <p className="alert alert--err" role="alert">{notice}</p>}

            {!occ ? (
              <div className="slots">{[0, 1, 2].map((i) => <div key={i} className="skeleton" />)}</div>
            ) : !day ? (
              <div className="empty">
                <p>No hay clases disponibles para reservar online en los próximos días.</p>
                <a className="btn btn--wa" href={waLink('¡Hola! Quería consultar por los horarios.')} target="_blank" rel="noopener"><WhatsApp /> Consultanos</a>
              </div>
            ) : (
              <>
                <h2 style={{ fontSize: '1.7rem', margin: '.4rem 0 0' }}>{fDayLong(byDay.get(day)[0].starts_at)}</h2>
                <div className="slots">
                  {byDay.get(day).map((o) => {
                    const full = o.spots_left <= 0
                    return (
                      <article key={o.class_id + o.starts_at} className={`slot${full ? ' is-full' : ''}`}>
                        <div className="slot__time">{fTime(o.starts_at)}<small>{Math.round((Date.parse(o.ends_at) - Date.parse(o.starts_at)) / 60000)} min</small></div>
                        <div className="slot__info">
                          <b>{o.discipline_name}</b>
                          <span>{o.kind === 'individual' ? 'Clase individual' : 'Clase grupal'}{o.teacher ? ` · con ${o.teacher}` : ''} · {money(o.price)}</span>
                        </div>
                        <div className="slot__side">
                          <span className={`spots${full ? ' spots--full' : o.spots_left <= 2 && o.capacity > 1 ? ' spots--few' : ''}`}>{spotsText(o)}</span>
                          {full ? (
                            <a className="btn btn--sm btn--ghost" href={waLink(`¡Hola! Quería anotarme en lista de espera para ${o.discipline_name}, ${fDayLong(o.starts_at)} ${fTime(o.starts_at)} h.`)} target="_blank" rel="noopener">Lista de espera</a>
                          ) : (
                            <button className="btn btn--sm" onClick={() => { setNotice(null); setPicked(o); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>Reservar</button>
                          )}
                        </div>
                      </article>
                    )
                  })}
                </div>
              </>
            )}
          </>
        )}
      </section>
    </>
  )
}

function BookingForm({ occ, onBack, onDone, onFull }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  async function submit(e) {
    e.preventDefault()
    const v = Object.fromEntries(new FormData(e.currentTarget))
    setBusy(true)
    setError(null)
    try {
      const res = await api.book({ classId: occ.class_id, startsAt: occ.starts_at, ...v })
      onDone({ ...res, occ, name: v.name })
    } catch (err) {
      if (['class_full', 'class_unavailable'].includes(err.code)) return onFull(errorText(err))
      setError(errorText(err))
      setBusy(false)
    }
  }

  return (
    <div className="panel">
      <div className="summary">
        {ART[occ.discipline_key] && <img src={ART[occ.discipline_key]} alt="" />}
        <div>
          <h2>{occ.discipline_name}</h2>
          <p>{fDayLong(occ.starts_at)} · {fTime(occ.starts_at)} h · {money(occ.price)}</p>
        </div>
      </div>
      <form className="form" onSubmit={submit}>
        <label className="field"><span>Nombre y apellido</span><input name="name" required maxLength={120} autoComplete="name" /></label>
        <label className="field"><span>WhatsApp</span><input name="phone" type="tel" required maxLength={40} autoComplete="tel" placeholder="11 1234-5678" /></label>
        <label className="field field--full"><span>Email (te mandamos la confirmación)</span><input name="email" type="email" required maxLength={200} autoComplete="email" /></label>
        <label className="field field--full"><span>¿Algo que debamos saber? <span className="muted">(opcional)</span></span>
          <textarea name="notes" maxLength={2000} placeholder="Por ejemplo: es mi primera clase, tengo una lesión en la rodilla…" /></label>
        <label className="hp" aria-hidden="true">No completar<input name="website" tabIndex={-1} autoComplete="off" /></label>
        {error && <p className="alert alert--err field--full" role="alert">{error}</p>}
        <div className="form__actions">
          <button className="btn" disabled={busy}>{busy ? 'Reservando…' : 'Confirmar reserva'}</button>
          <button type="button" className="btn btn--ghost" onClick={onBack} disabled={busy}>Elegir otro horario</button>
        </div>
      </form>
    </div>
  )
}

// Link para agregar la clase a Google Calendar
const gcal = (o, address) => {
  const f = (iso) => new Date(iso).toISOString().replace(/[-:]|\.\d{3}/g, '')
  const p = new URLSearchParams({ action: 'TEMPLATE', text: `${o.discipline_name} · Nube Estudio`, dates: `${f(o.starts_at)}/${f(o.ends_at)}`, location: address })
  return `https://calendar.google.com/calendar/render?${p}`
}

function Done({ result, settings, onAgain }) {
  const { occ, booking, name } = result
  const pending = booking?.status === 'pending_payment'
  const s = settings ?? {}
  const [copied, setCopied] = useState(null)
  const copy = (txt) => navigator.clipboard?.writeText(txt).then(() => { setCopied(txt); setTimeout(() => setCopied(null), 1800) })
  const when = `${fDayLong(occ.starts_at)} ${fTime(occ.starts_at)} h`
  const hasPay = s.transfer_alias || s.transfer_cbu || s.mp_link || s.pay_at_studio

  return (
    <section className="section">
      <div className="wrap">
        <div className="panel done">
          <div className="done__icon"><Check /></div>
          <p className="eyebrow eyebrow--center">{pending ? 'Lugar reservado' : 'Reserva confirmada'}</p>
          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 2.8rem)' }}>¡Listo, {name.split(' ')[0]}!</h1>
          <p className="lead" style={{ margin: '0 auto' }}>{occ.discipline_name} · {when}</p>
          <p className="muted small" style={{ marginTop: '.6rem' }}>
            {DEMO ? 'Modo demo: en el sitio real acá le llega un email con todos los datos.' : 'Te mandamos un email con los datos y el link para cancelar si no podés venir.'}
          </p>

          {pending && hasPay && (
            <div className="pay">
              <h3>Para confirmar tu lugar · {money(booking.price)}</h3>
              <ul>
                {s.transfer_alias && (
                  <li><span>Transferencia · alias</span>
                    <button className="copy" onClick={() => copy(s.transfer_alias)}>{copied === s.transfer_alias ? '¡Copiado!' : s.transfer_alias}</button></li>
                )}
                {s.transfer_cbu && (
                  <li><span>CBU / CVU</span>
                    <button className="copy" onClick={() => copy(s.transfer_cbu)}>{copied === s.transfer_cbu ? '¡Copiado!' : s.transfer_cbu}</button></li>
                )}
                {s.transfer_holder && <li><span>Titular</span><span>{s.transfer_holder}</span></li>}
                {s.mp_link && <li><span>Mercado Pago</span><a className="btn btn--sm" href={s.mp_link} target="_blank" rel="noopener">Pagar online</a></li>}
                {s.pay_at_studio && <li><span>O pagás en el estudio, antes de la clase</span></li>}
              </ul>
              {s.payment_note && <p className="small muted" style={{ margin: '1rem 0 0' }}>{s.payment_note}</p>}
            </div>
          )}

          <div className="done__actions">
            {pending && (
              <a className="btn btn--wa" target="_blank" rel="noopener"
                href={waLink(`¡Hola! Soy ${name}. Reservé ${occ.discipline_name} el ${when}. Te paso el comprobante.`)}>
                <WhatsApp /> Enviar comprobante
              </a>
            )}
            <a className="btn btn--ghost" href={gcal(occ, s.address || SITE.address)} target="_blank" rel="noopener"><Calendar /> Agendar</a>
            <button className="btn btn--ghost" onClick={onAgain}>Reservar otra clase</button>
          </div>
          <p className="small muted" style={{ marginTop: '1.4rem' }}>
            Podés cancelar hasta {s.cancel_hours ?? 12} h antes con el link del email. <Link to="/">Volver al inicio</Link>
          </p>
        </div>
      </div>
    </section>
  )
}
