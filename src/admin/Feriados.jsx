import { useCallback, useEffect, useState } from 'react'
import api from '../lib/api'
import { addDays, arToIso, fDayLong, fTime, todayKey } from '../lib/dates'
import { ask, errText } from './util'

// Días sin clases (feriados, vacaciones) o una franja puntual
export default function Feriados() {
  const [rows, setRows] = useState(null)
  const [error, setError] = useState(null)
  const [allDay, setAllDay] = useState(true)

  const load = useCallback(() => api.closures.list().then(setRows).catch((e) => setError(errText(e))), [])
  useEffect(() => { load() }, [load])

  async function add(e) {
    e.preventDefault()
    const form = e.currentTarget
    const v = Object.fromEntries(new FormData(form))
    const to = v.to || v.from
    setError(null)
    try {
      await api.closures.save({
        starts_at: arToIso(v.from, allDay ? '00:00' : v.t1),
        ends_at: allDay ? arToIso(addDays(to, 1), '00:00') : arToIso(v.from, v.t2),
        label: v.label.trim() || null,
      })
      form.reset()
      load()
    } catch (err) {
      setError(errText(err))
    }
  }

  async function remove(c) {
    if (!ask('¿Borrar este cierre? Las clases de esas fechas vuelven a estar disponibles.')) return
    await api.closures.remove(c.id).catch((e) => setError(errText(e)))
    load()
  }

  const now = new Date().toISOString()
  const upcoming = (rows ?? []).filter((c) => c.ends_at > now)

  return (
    <section>
      <div className="a-bar"><h1>Feriados y cierres</h1></div>
      <p className="a-muted">Mientras dure el cierre no se puede reservar. Las reservas que ya estaban hechas no se cancelan solas: avisales desde la Agenda.</p>
      <form className="a-box a-form" onSubmit={add}>
        <h2>Cerrar el estudio</h2>
        <div className="a-grid">
          <label className="a-field"><span>{allDay ? 'Desde' : 'Día'}</span><input name="from" type="date" required min={todayKey()} defaultValue={todayKey()} /></label>
          {allDay ? (
            <label className="a-field"><span>Hasta (inclusive)</span><input name="to" type="date" min={todayKey()} /></label>
          ) : (
            <>
              <label className="a-field"><span>De</span><input name="t1" type="time" required defaultValue="09:00" /></label>
              <label className="a-field"><span>A</span><input name="t2" type="time" required defaultValue="13:00" /></label>
            </>
          )}
          <label className="a-field"><span>Motivo (opcional)</span><input name="label" placeholder="Feriado, vacaciones…" /></label>
        </div>
        <label className="a-check"><input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} /> Días completos</label>
        {error && <p className="a-error">{error}</p>}
        <div className="a-actions"><button className="a-btn a-btn--main">Agregar cierre</button></div>
      </form>

      {!rows ? <p className="a-muted">Cargando…</p> : upcoming.length === 0 ? <p className="a-empty">No hay cierres programados.</p> : (
        <ul className="a-cards">
          {upcoming.map((c) => {
            const lastDay = new Date(Date.parse(c.ends_at) - 1).toISOString()
            const whole = fTime(c.starts_at) === '00:00' && fTime(c.ends_at) === '00:00'
            return (
              <li key={c.id} className="a-card">
                <div>
                  <b>{whole ? (fDayLong(c.starts_at) === fDayLong(lastDay) ? fDayLong(c.starts_at) : `${fDayLong(c.starts_at)} → ${fDayLong(lastDay)}`)
                    : `${fDayLong(c.starts_at)}, ${fTime(c.starts_at)} a ${fTime(c.ends_at)}`}</b>
                  <small>{c.label || 'Sin clases'}</small>
                </div>
                <button className="a-btn a-btn--danger" onClick={() => remove(c)}>Borrar</button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
