import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import api, { errorText } from '../lib/api'
import { fDayLong, fTime } from '../lib/dates'
import { waLink } from '../config/site'
import { usePageTitle } from '../lib/usePageTitle'

// /reservar/cancelar?t=TOKEN (link del email)
export default function Cancelar() {
  usePageTitle('Cancelar reserva')
  const [params] = useSearchParams()
  const token = params.get('t')
  const [b, setB] = useState(undefined)
  const [state, setState] = useState('idle')
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!token) return setB(null)
    api.bookingByToken(token).then(setB).catch(() => setB(null))
  }, [token])

  async function cancel() {
    setState('busy')
    setError(null)
    try {
      await api.cancelBooking(token)
      setState('done')
    } catch (e) {
      setError(errorText(e))
      setState('idle')
    }
  }

  const late = b && Date.parse(b.cancel_until) < Date.now()

  return (
    <section className="section">
      <div className="wrap" style={{ maxWidth: 620 }}>
        <div className="panel done">
          <p className="eyebrow eyebrow--center">Tu reserva</p>
          {b === undefined ? <p>Cargando…</p> : !b ? (
            <>
              <h1 style={{ fontSize: '2.2rem' }}>No encontramos la reserva</h1>
              <p className="muted">Revisá que el link esté completo o escribinos por WhatsApp.</p>
            </>
          ) : (
            <>
              <h1 style={{ fontSize: '2.2rem' }}>{b.discipline_name}</h1>
              <p className="lead" style={{ margin: '0 auto 1.4rem' }}>{fDayLong(b.starts_at)} · {fTime(b.starts_at)} h</p>
              {state === 'done' || b.status === 'cancelled' ? (
                <p className="alert alert--ok">Tu reserva está cancelada. ¡Gracias por avisar!</p>
              ) : Date.parse(b.starts_at) < Date.now() ? (
                <p className="alert alert--info">Esta clase ya pasó.</p>
              ) : late ? (
                <p className="alert alert--info">Ya no se puede cancelar online. Escribinos por WhatsApp y lo vemos.</p>
              ) : (
                <>
                  <p className="muted">¿Seguro que querés cancelar? El lugar va a quedar libre para otra persona.</p>
                  {error && <p className="alert alert--err">{error}</p>}
                  <div className="done__actions" style={{ marginTop: '1rem' }}>
                    <button className="btn" onClick={cancel} disabled={state === 'busy'}>{state === 'busy' ? 'Cancelando…' : 'Sí, cancelar mi reserva'}</button>
                  </div>
                </>
              )}
            </>
          )}
          <div className="done__actions" style={{ marginTop: '1.4rem' }}>
            <Link className="btn btn--ghost" to="/reservar">Ver horarios</Link>
            <a className="btn btn--ghost" href={waLink()} target="_blank" rel="noopener">WhatsApp</a>
          </div>
        </div>
      </div>
    </section>
  )
}
