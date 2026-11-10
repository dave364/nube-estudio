import { useCallback, useEffect, useState } from 'react'
import api from '../lib/api'
import { hhmm, WEEKDAYS } from '../lib/dates'
import { ask, errText } from './util'

// Grilla semanal: qué clase, qué día, a qué hora y con cuántos lugares
export default function Horarios() {
  const [rows, setRows] = useState(null)
  const [discs, setDiscs] = useState([])
  const [edit, setEdit] = useState(null)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    try {
      const [c, d] = await Promise.all([api.classes.list(), api.disciplines.list()])
      setRows(c)
      setDiscs(d)
    } catch (e) {
      setError(errText(e))
    }
  }, [])
  useEffect(() => { load() }, [load])

  const dName = (id) => discs.find((d) => d.id === id)?.name ?? '—'

  async function save(e) {
    e.preventDefault()
    const v = Object.fromEntries(new FormData(e.currentTarget))
    setError(null)
    try {
      await api.classes.save({
        ...(edit.id ? { id: edit.id } : {}),
        discipline_id: v.discipline_id,
        weekday: Number(v.weekday),
        start_time: v.start_time,
        minutes: v.minutes ? Number(v.minutes) : null,
        capacity: Number(v.capacity),
        teacher: v.teacher.trim() || null,
        active: v.active === 'on',
      })
      setEdit(null)
      load()
    } catch (err) {
      setError(errText(err))
    }
  }

  async function remove(c) {
    if (!ask(`¿Borrar ${dName(c.discipline_id)} del ${WEEKDAYS[c.weekday - 1].toLowerCase()} ${hhmm(c.start_time)}? Las reservas ya hechas no se borran.`)) return
    try {
      await api.classes.remove(c.id)
      setEdit(null)
      load()
    } catch (err) {
      setError(errText(err))
    }
  }

  return (
    <section>
      <div className="a-bar">
        <h1>Horarios</h1>
        <button className="a-btn a-btn--main" onClick={() => setEdit({ weekday: 1, start_time: '18:00', capacity: 4, active: true })}>+ Nueva clase</button>
      </div>
      <p className="a-muted">La grilla se repite todas las semanas. Para una clase individual (piano, guitarra) poné 1 lugar.</p>
      {error && <p className="a-error">{error}</p>}

      {edit && (
        <form className="a-box a-form" onSubmit={save} key={edit.id ?? 'new'}>
          <h2>{edit.id ? 'Editar clase' : 'Nueva clase'}</h2>
          <div className="a-grid">
            <label className="a-field"><span>Disciplina</span>
              <select name="discipline_id" required defaultValue={edit.discipline_id ?? ''}>
                <option value="" disabled>Elegí…</option>
                {discs.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select></label>
            <label className="a-field"><span>Día</span>
              <select name="weekday" defaultValue={edit.weekday}>{WEEKDAYS.map((w, i) => <option key={w} value={i + 1}>{w}</option>)}</select></label>
            <label className="a-field"><span>Hora</span><input name="start_time" type="time" required step="300" defaultValue={hhmm(edit.start_time)} /></label>
            <label className="a-field"><span>Lugares</span><input name="capacity" type="number" min="1" max="100" required defaultValue={edit.capacity} /></label>
            <label className="a-field"><span>Duración (min)</span><input name="minutes" type="number" min="15" max="240" placeholder="la de la disciplina" defaultValue={edit.minutes ?? ''} /></label>
            <label className="a-field"><span>Profe (opcional)</span><input name="teacher" defaultValue={edit.teacher ?? ''} /></label>
          </div>
          <label className="a-check"><input type="checkbox" name="active" defaultChecked={edit.active} /> Activa (se puede reservar)</label>
          <div className="a-actions">
            <button className="a-btn a-btn--main">Guardar</button>
            <button type="button" className="a-btn" onClick={() => setEdit(null)}>Cerrar</button>
            {edit.id && <button type="button" className="a-btn a-btn--danger" onClick={() => remove(edit)}>Borrar</button>}
          </div>
        </form>
      )}

      {!rows ? <p className="a-muted">Cargando…</p> : (
        <div className="a-week">
          {WEEKDAYS.map((w, i) => {
            const items = rows.filter((c) => c.weekday === i + 1).sort((a, b) => a.start_time.localeCompare(b.start_time))
            return (
              <div key={w} className="a-week__day">
                <h3>{w}</h3>
                {items.length === 0 && <p className="a-muted">—</p>}
                {items.map((c) => (
                  <button key={c.id} className={`a-week__item${c.active ? '' : ' is-off'}`} onClick={() => { setEdit(c); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>
                    <b>{hhmm(c.start_time)}</b> {dName(c.discipline_id)}
                    <small>{c.capacity} {c.capacity === 1 ? 'lugar' : 'lugares'}{c.teacher ? ` · ${c.teacher}` : ''}{c.active ? '' : ' · pausada'}</small>
                  </button>
                ))}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
