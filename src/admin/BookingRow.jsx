import { useState } from 'react'
import api from '../lib/api'
import { fDayLong, fShort, fTime, money } from '../lib/dates'
import { STATUS, ask, errText, waTo } from './util'

// Una alumna anotada, con sus acciones: pagó, cancelar, reenviar email…
export default function BookingRow({ b, onChange, showTime = false, showDate = false }) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)
  const st = STATUS[b.status]
  const wa = waTo(b.client_phone)

  async function setStatus(status, { question, kind } = {}) {
    if (status === 'cancelled' && !ask(`¿Cancelar la reserva de ${b.client_name}?`)) return
    const tell = kind && b.client_email && ask(question, false)
    setBusy(true)
    setMsg(null)
    try {
      onChange(await api.updateBooking(b.id, { status }))
      if (tell) {
        await api.notify(b.id, kind)
          .then(() => setMsg({ ok: 'Email enviado.' }))
          .catch(() => setMsg({ error: 'Se guardó, pero no se pudo mandar el email.' }))
      }
    } catch (e) {
      setMsg({ error: errText(e) })
    }
    setBusy(false)
  }

  async function resend() {
    setBusy(true)
    setMsg(null)
    try {
      await api.notify(b.id, 'confirmation')
      setMsg({ ok: 'Email de confirmación reenviado.' })
    } catch {
      setMsg({ error: 'No se pudo mandar el email.' })
    }
    setBusy(false)
  }

  const remind = waTo(b.client_phone,
    `¡Hola ${b.client_name.split(' ')[0]}! Te escribo de Nube Estudio por tu clase de ${b.discipline?.name} del ${fDayLong(b.starts_at).toLowerCase()} a las ${fTime(b.starts_at)} h.`)

  return (
    <li className={`a-bk a-bk--${st.tone}`}>
      <div className="a-bk__row">
        <button className="a-bk__who" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          {(showTime || showDate) && <span className="a-bk__time">{showDate ? fShort(b.starts_at) : fTime(b.starts_at)}</span>}
          <strong>{b.client_name}</strong>
          {(showDate || showTime) && <small>{b.discipline?.name}</small>}
          {b.notes && <small className="a-bk__note" title={b.notes}>✎ {b.notes}</small>}
        </button>
        <span className={`a-badge a-badge--${st.tone}`}>{st.label}</span>
        {b.status === 'pending_payment' && (
          <button className="a-btn a-btn--sm a-btn--ok" disabled={busy}
            onClick={() => setStatus('paid', { kind: 'paid', question: '¿Le mando un email avisando que recibiste el pago?' })}>
            ✓ Pagó
          </button>
        )}
        {wa && <a className="a-btn a-btn--sm a-btn--wa" href={wa} target="_blank" rel="noopener" title="Abrir WhatsApp">WA</a>}
      </div>

      {open && (
        <div className="a-bk__body">
          <dl className="a-dl">
            <dt>Teléfono</dt><dd>{b.client_phone || '—'}</dd>
            <dt>Email</dt><dd>{b.client_email ? <a href={`mailto:${b.client_email}`}>{b.client_email}</a> : '—'}</dd>
            <dt>Valor</dt><dd>{money(b.price)}</dd>
            {b.notes && <><dt>Nota</dt><dd className="a-pre">{b.notes}</dd></>}
            <dt>Reservó</dt><dd>{fShort(b.created_at)}{b.source === 'admin' ? ' (cargada a mano)' : ' (desde la web)'}</dd>
            {b.paid_at && <><dt>Pagó</dt><dd>{fShort(b.paid_at)}</dd></>}
          </dl>
          <div className="a-actions">
            {remind && <a className="a-btn" href={remind} target="_blank" rel="noopener">Escribirle por WhatsApp</a>}
            {b.status === 'paid' && <button className="a-btn" disabled={busy} onClick={() => setStatus('pending_payment')}>Volver a "falta pagar"</button>}
            {b.status !== 'cancelled' && b.client_email && <button className="a-btn" disabled={busy} onClick={resend}>Reenviar email</button>}
            {b.status !== 'cancelled' ? (
              <button className="a-btn a-btn--danger" disabled={busy}
                onClick={() => setStatus('cancelled', { kind: 'cancelled', question: '¿Le mando un email avisando la cancelación?' })}>
                Cancelar reserva
              </button>
            ) : (
              <button className="a-btn" disabled={busy} onClick={() => setStatus(Number(b.price) > 0 ? 'pending_payment' : 'confirmed')}>Reactivar</button>
            )}
          </div>
          {msg?.ok && <p className="a-ok">{msg.ok}</p>}
          {msg?.error && <p className="a-error">{msg.error}</p>}
        </div>
      )}
    </li>
  )
}
