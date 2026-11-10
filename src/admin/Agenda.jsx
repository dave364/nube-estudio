import { useCallback, useEffect, useMemo, useState } from 'react'
import api from '../lib/api'
import { addDays, arToIso, dayChip, fDayFull, fTime, money, todayKey } from '../lib/dates'
import BookingRow from './BookingRow'
import { errText } from './util'

// Agenda del día: cada clase con sus anotadas
export default function Agenda() {
  const [day, setDay] = useState(todayKey())
  const [occ, setOcc] = useState(null)
  const [rows, setRows] = useState([])
  const [error, setError] = useState(null)
  const [showCancelled, setShowCancelled] = useState(false)

  const load = useCallback(async () => {
    setError(null)
    try {
      const [o, b] = await Promise.all([
        api.adminSchedule(day, day),
        api.listBookings({ from: arToIso(day, '00:00'), to: arToIso(addDays(day, 1), '00:00') }),
      ])
      setOcc(o)
      setRows(b)
    } catch (e) {
      setError(errText(e))
    }
  }, [day])

  useEffect(() => {
    setOcc(null)
    load()
  }, [load])

  const update = (b) => setRows((list) => list.map((x) => (x.id === b.id ? b : x)))
  const add = (b) => setRows((list) => [...list, b])

  // Reservas agrupadas por clase; las que no coinciden con la grilla van aparte
  const { cards, others } = useMemo(() => {
    const key = (c, s) => `${c}|${Date.parse(s)}`
    const map = new Map((occ ?? []).map((o) => [key(o.class_id, o.starts_at), { o, list: [] }]))
    const others = []
    for (const b of rows) {
      const card = map.get(key(b.class_id, b.starts_at))
      if (card) card.list.push(b)
      else others.push(b)
    }
    return { cards: [...map.values()], others }
  }, [occ, rows])

  const active = rows.filter((b) => b.status !== 'cancelled')
  const pending = active.filter((b) => b.status === 'pending_payment')
  const strip = Array.from({ length: 14 }, (_, i) => addDays(todayKey(), i - 1))

  return (
    <section>
      <div className="a-bar">
        <h1>{fDayFull(arToIso(day, '12:00'))}</h1>
        <div className="a-bar__tools">
          <button className="a-btn" onClick={() => setDay(addDays(day, -1))} aria-label="Día anterior">‹</button>
          <button className="a-btn" onClick={() => setDay(todayKey())}>Hoy</button>
          <button className="a-btn" onClick={() => setDay(addDays(day, 1))} aria-label="Día siguiente">›</button>
          <input type="date" className="a-date" value={day} onChange={(e) => e.target.value && setDay(e.target.value)} />
        </div>
      </div>

      <div className="a-strip">
        {strip.map((k) => {
          const c = dayChip(k)
          return (
            <button key={k} className={`a-strip__d${k === day ? ' is-active' : ''}${k === todayKey() ? ' is-today' : ''}`} onClick={() => setDay(k)}>
              <small>{c.wd}</small><b>{c.day}</b>
            </button>
          )
        })}
      </div>

      <div className="a-stats">
        <div><b>{cards.length}</b><span>clases</span></div>
        <div><b>{active.length}</b><span>anotadas</span></div>
        <div className={pending.length ? 'is-warn' : ''}><b>{pending.length}</b><span>falta pagar</span></div>
        <label className="a-check"><input type="checkbox" checked={showCancelled} onChange={(e) => setShowCancelled(e.target.checked)} /> Ver canceladas</label>
      </div>

      {error && <p className="a-error">{error}</p>}
      {!occ ? <p className="a-muted">Cargando…</p> : cards.length === 0 && others.length === 0 ? (
        <p className="a-empty">No hay clases este día.</p>
      ) : (
        <div className="a-classes">
          {cards.map(({ o, list }) => (
            <ClassCard key={o.class_id + o.starts_at} o={o} list={list} showCancelled={showCancelled} onChange={update} onAdd={add} />
          ))}
          {others.length > 0 && (
            <div className="a-class">
              <div className="a-class__head"><div><b>Otras reservas</b><small>De clases que se cambiaron o borraron de la grilla</small></div></div>
              <ul className="a-roster">
                {others.filter((b) => showCancelled || b.status !== 'cancelled').map((b) => <BookingRow key={b.id} b={b} onChange={update} showTime />)}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  )
}

function ClassCard({ o, list, showCancelled, onChange, onAdd }) {
  const [adding, setAdding] = useState(false)
  const taken = list.filter((b) => b.status !== 'cancelled').length
  const shown = list.filter((b) => showCancelled || b.status !== 'cancelled')
  const pct = Math.min(100, Math.round((taken / o.capacity) * 100))
  const past = Date.parse(o.ends_at) < Date.now()

  return (
    <div className={`a-class${past ? ' is-past' : ''}`}>
      <div className="a-class__head">
        <div className="a-class__time">{fTime(o.starts_at)}<small>{fTime(o.ends_at)}</small></div>
        <div>
          <b>{o.discipline_name}</b>
          <small>{o.teacher ? `${o.teacher} · ` : ''}{money(o.price)}</small>
        </div>
        <div className="a-class__cap">
          <span className={taken >= o.capacity ? 'is-full' : ''}>{taken}/{o.capacity}</span>
          <i><em style={{ width: `${pct}%` }} /></i>
        </div>
      </div>
      {shown.length > 0 ? (
        <ul className="a-roster">{shown.map((b) => <BookingRow key={b.id} b={b} onChange={onChange} />)}</ul>
      ) : <p className="a-muted a-class__none">Todavía no hay nadie anotado.</p>}
      {adding ? (
        <NewBooking o={o} onCancel={() => setAdding(false)} onDone={(b) => { onAdd(b); setAdding(false) }} full={taken >= o.capacity} />
      ) : (
        <button className="a-link a-class__add" onClick={() => setAdding(true)}>+ Anotar a alguien</button>
      )}
    </div>
  )
}

// Alumna cargada a mano (por WhatsApp, en persona…)
function NewBooking({ o, onCancel, onDone, full }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  async function submit(e) {
    e.preventDefault()
    const v = Object.fromEntries(new FormData(e.currentTarget))
    setBusy(true)
    setError(null)
    try {
      const b = await api.createBooking({
        class_id: o.class_id,
        discipline_id: o.discipline_id,
        starts_at: o.starts_at,
        ends_at: o.ends_at,
        status: v.status,
        price: Number(v.price) || 0,
        client_name: v.name.trim(),
        client_email: v.email.trim().toLowerCase() || null,
        client_phone: v.phone.trim() || null,
        notes: v.notes.trim() || null,
      })
      if (v.send && b.client_email) await api.notify(b.id, 'confirmation').catch(() => setError('Se guardó, pero no se pudo mandar el email.'))
      onDone(b)
    } catch (err) {
      setError(errText(err))
      setBusy(false)
    }
  }

  return (
    <form className="a-new" onSubmit={submit}>
      {full && <p className="a-note">La clase está completa: si la anotás igual, queda un lugar extra.</p>}
      <div className="a-grid">
        <label className="a-field"><span>Nombre</span><input name="name" required autoFocus /></label>
        <label className="a-field"><span>WhatsApp</span><input name="phone" type="tel" /></label>
        <label className="a-field"><span>Email (opcional)</span><input name="email" type="email" /></label>
        <label className="a-field"><span>Precio</span><input name="price" type="number" min="0" step="100" defaultValue={Number(o.price)} /></label>
        <label className="a-field">
          <span>Estado</span>
          <select name="status" defaultValue="pending_payment">
            <option value="pending_payment">Falta pagar</option>
            <option value="paid">Pagada</option>
            <option value="confirmed">Confirmada (sin cargo)</option>
          </select>
        </label>
        <label className="a-field"><span>Nota</span><input name="notes" /></label>
      </div>
      <label className="a-check"><input type="checkbox" name="send" defaultChecked /> Mandarle el email de confirmación (si dejó email)</label>
      {error && <p className="a-error">{error}</p>}
      <div className="a-actions">
        <button className="a-btn a-btn--main" disabled={busy}>{busy ? 'Guardando…' : 'Anotar'}</button>
        <button type="button" className="a-btn" onClick={onCancel}>Cancelar</button>
      </div>
    </form>
  )
}
