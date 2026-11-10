import { useCallback, useEffect, useState } from 'react'
import api from '../lib/api'
import { arToIso, money, todayKey } from '../lib/dates'
import BookingRow from './BookingRow'
import { errText } from './util'

// Reservas que falta cobrar + lo cobrado en el mes
export default function Pagos() {
  const [pending, setPending] = useState(null)
  const [month, setMonth] = useState(null)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const first = `${todayKey().slice(0, 8)}01`
      const [p, m] = await Promise.all([
        api.listBookings({ status: 'pending_payment' }),
        api.listBookings({ from: arToIso(first, '00:00'), notStatus: 'cancelled' }),
      ])
      setPending(p)
      setMonth(m.filter((b) => b.starts_at.slice(0, 7) <= todayKey().slice(0, 7) && b.starts_at < new Date(Date.now() + 40 * 86400000).toISOString()))
    } catch (e) {
      setError(errText(e))
    }
  }, [])
  useEffect(() => { load() }, [load])

  const update = (b) => setPending((l) => l.map((x) => (x.id === b.id ? b : x)))
  const sum = (l) => l.reduce((a, b) => a + Number(b.price), 0)
  const still = (pending ?? []).filter((b) => b.status === 'pending_payment')
  const paidMonth = (month ?? []).filter((b) => b.status === 'paid')

  return (
    <section>
      <div className="a-bar"><h1>Pagos</h1><button className="a-link" onClick={load}>↻ Actualizar</button></div>
      <div className="a-stats">
        <div className={still.length ? 'is-warn' : ''}><b>{money(sum(still))}</b><span>falta cobrar ({still.length})</span></div>
        <div><b>{money(sum(paidMonth))}</b><span>cobrado este mes ({paidMonth.length})</span></div>
      </div>
      {error && <p className="a-error">{error}</p>}
      {!pending ? <p className="a-muted">Cargando…</p> : pending.length === 0 ? (
        <p className="a-empty">No hay pagos pendientes. 🎉</p>
      ) : (
        <ul className="a-roster a-box">
          {pending.map((b) => <BookingRow key={b.id} b={b} onChange={update} showDate />)}
        </ul>
      )}
    </section>
  )
}
