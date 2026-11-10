import { useEffect, useState } from 'react'
import api from '../lib/api'
import { errText } from './util'

// Datos de pago, contacto y reglas de reserva
export default function Ajustes() {
  const [s, setS] = useState(null)
  const [msg, setMsg] = useState(null)

  useEffect(() => { api.getSettings().then(setS).catch((e) => setMsg({ error: errText(e) })) }, [])

  async function save(e) {
    e.preventDefault()
    const v = Object.fromEntries(new FormData(e.currentTarget))
    setMsg(null)
    try {
      setS(await api.saveSettings({
        transfer_alias: v.transfer_alias.trim(),
        transfer_cbu: v.transfer_cbu.trim(),
        transfer_holder: v.transfer_holder.trim(),
        mp_link: v.mp_link.trim(),
        pay_at_studio: v.pay_at_studio === 'on',
        payment_note: v.payment_note.trim(),
        address: v.address.trim(),
        whatsapp: v.whatsapp.replace(/\D/g, ''),
        admin_email: v.admin_email.trim(),
        min_notice_hours: Number(v.min_notice_hours),
        max_days_ahead: Number(v.max_days_ahead),
        cancel_hours: Number(v.cancel_hours),
        reminder_hours: Number(v.reminder_hours),
      }))
      setMsg({ ok: 'Guardado.' })
    } catch (err) {
      setMsg({ error: errText(err) })
    }
  }

  if (!s) return <p className="a-muted">{msg?.error || 'Cargando…'}</p>

  return (
    <section>
      <div className="a-bar"><h1>Ajustes</h1></div>
      <form className="a-form" onSubmit={save}>
        <div className="a-box">
          <h2>Cómo te pagan</h2>
          <p className="a-muted">Esto aparece al terminar la reserva y en el email de confirmación.</p>
          <div className="a-grid">
            <label className="a-field"><span>Alias</span><input name="transfer_alias" defaultValue={s.transfer_alias} /></label>
            <label className="a-field"><span>CBU / CVU</span><input name="transfer_cbu" defaultValue={s.transfer_cbu} /></label>
            <label className="a-field"><span>Titular</span><input name="transfer_holder" defaultValue={s.transfer_holder} /></label>
            <label className="a-field"><span>Link de Mercado Pago (opcional)</span><input name="mp_link" type="url" defaultValue={s.mp_link} placeholder="https://mpago.la/…" /></label>
            <label className="a-field a-span2"><span>Nota de pago</span><input name="payment_note" defaultValue={s.payment_note} /></label>
          </div>
          <label className="a-check"><input type="checkbox" name="pay_at_studio" defaultChecked={s.pay_at_studio} /> También se puede pagar en el estudio</label>
        </div>

        <div className="a-box">
          <h2>Contacto</h2>
          <div className="a-grid">
            <label className="a-field a-span2"><span>Dirección</span><input name="address" defaultValue={s.address} /></label>
            <label className="a-field"><span>WhatsApp (con 549)</span><input name="whatsapp" defaultValue={s.whatsapp} /></label>
            <label className="a-field"><span>Email donde te llegan las reservas</span><input name="admin_email" type="email" defaultValue={s.admin_email} /></label>
          </div>
        </div>

        <div className="a-box">
          <h2>Reglas de reserva</h2>
          <div className="a-grid">
            <label className="a-field"><span>Se puede reservar hasta (horas antes)</span><input name="min_notice_hours" type="number" min="0" max="168" defaultValue={s.min_notice_hours} /></label>
            <label className="a-field"><span>Con cuántos días de anticipación</span><input name="max_days_ahead" type="number" min="1" max="120" defaultValue={s.max_days_ahead} /></label>
            <label className="a-field"><span>Cancelar online hasta (horas antes)</span><input name="cancel_hours" type="number" min="0" max="168" defaultValue={s.cancel_hours} /></label>
            <label className="a-field"><span>Recordatorio (horas antes)</span><input name="reminder_hours" type="number" min="1" max="168" defaultValue={s.reminder_hours} /></label>
          </div>
        </div>
        {msg?.ok && <p className="a-ok">{msg.ok}</p>}
        {msg?.error && <p className="a-error">{msg.error}</p>}
        <div className="a-actions"><button className="a-btn a-btn--main">Guardar cambios</button></div>
      </form>
    </section>
  )
}
