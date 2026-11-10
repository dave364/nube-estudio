// Emails a la alumna y a Lisbeth
import { cancelLink, type Full, money } from './common.ts'
import type { Mail } from './email.ts'

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const when = (f: Full) => {
  const d = new Intl.DateTimeFormat('es-AR', {
    timeZone: f.settings.timezone, weekday: 'long', day: 'numeric', month: 'long',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).format(new Date(f.booking.starts_at))
  return d.charAt(0).toUpperCase() + d.slice(1) + ' h'
}

const waUrl = (f: Full) => `https://wa.me/${f.settings.whatsapp.replace(/\D/g, '')}`

// Marco común: logo de texto, tarjeta blanca, pie con contacto
function layout(body: string, f: Full) {
  return `<!doctype html><html lang="es"><body style="margin:0;background:#eef6fc;font-family:Helvetica,Arial,sans-serif;color:#1f3b5c">
  <div style="max-width:560px;margin:0 auto;padding:28px 16px">
    <div style="text-align:center;margin-bottom:18px">
      <div style="font-family:Georgia,'Times New Roman',serif;font-size:34px;letter-spacing:4px;color:#2e5687">NUBE</div>
      <div style="font-size:13px;letter-spacing:5px;color:#4f78a8">ESTUDIO</div>
    </div>
    <div style="background:#fff;border-radius:16px;padding:26px 24px;line-height:1.55;font-size:15px">${body}</div>
    <p style="text-align:center;font-size:12px;color:#5d7b9c;margin-top:18px">
      Nube Estudio · ${esc(f.settings.address)}<br>
      WhatsApp: <a href="${waUrl(f)}" style="color:#2e5687">${esc(f.settings.whatsapp)}</a>
    </p>
  </div></body></html>`
}

const button = (href: string, label: string) =>
  `<p style="text-align:center;margin:22px 0"><a href="${href}" style="background:#2e5687;color:#fff;text-decoration:none;padding:12px 22px;border-radius:999px;display:inline-block;font-weight:bold">${label}</a></p>`

function details(f: Full) {
  const row = (k: string, v: string) =>
    `<tr><td style="padding:6px 0;color:#5d7b9c;width:110px">${k}</td><td style="padding:6px 0"><strong>${v}</strong></td></tr>`
  return `<table style="width:100%;border-collapse:collapse;margin:16px 0;border-top:1px solid #dbe9f5;border-bottom:1px solid #dbe9f5">
    ${row('Clase', esc(f.discipline))}
    ${row('Cuándo', esc(when(f)))}
    ${row('Duración', `${f.minutes} min`)}
    ${f.teacher ? row('Con', esc(f.teacher)) : ''}
    ${row('Dónde', esc(f.settings.address))}
    ${row('Valor', money(f.booking.price))}
  </table>`
}

// Cómo pagar: transferencia, Mercado Pago y/o en el estudio
function payment(f: Full) {
  const s = f.settings
  const lines: string[] = []
  if (s.transfer_alias || s.transfer_cbu) {
    lines.push(`<li><strong>Transferencia</strong>${s.transfer_alias ? ` · Alias: <strong>${esc(s.transfer_alias)}</strong>` : ''}${
      s.transfer_cbu ? ` · CBU/CVU: ${esc(s.transfer_cbu)}` : ''}${s.transfer_holder ? ` · Titular: ${esc(s.transfer_holder)}` : ''}</li>`)
  }
  if (s.mp_link) lines.push(`<li><strong>Mercado Pago</strong>: <a href="${s.mp_link}" style="color:#2e5687">pagar online</a></li>`)
  if (s.pay_at_studio) lines.push('<li><strong>En el estudio</strong>, antes de empezar la clase</li>')
  if (!lines.length) return ''
  return `<p>Para confirmar tu lugar, aboná <strong>${money(f.booking.price)}</strong>:</p>
    <ul style="padding-left:18px">${lines.join('')}</ul>
    ${s.payment_note ? `<p style="font-size:14px;color:#5d7b9c">${esc(s.payment_note)}</p>` : ''}`
}

const cancelBlock = (f: Full) =>
  `<p style="font-size:14px;color:#5d7b9c">¿No podés venir? Cancelá hasta ${f.settings.cancel_hours} h antes así le dejás el lugar a otra persona:</p>
   ${button(cancelLink(f.settings, f.booking), 'Cancelar mi reserva')}`

const hello = (f: Full) => `<p>Hola ${esc(f.booking.client_name.split(' ')[0])}:</p>`

export function confirmationEmail(f: Full): Mail {
  const pending = f.booking.status === 'pending_payment'
  return {
    to: f.booking.client_email ?? '',
    replyTo: f.settings.admin_email || undefined,
    subject: `Tu reserva: ${f.discipline}, ${when(f)}`,
    html: layout(`${hello(f)}
      <p>${pending ? '¡Gracias por reservar! Tu lugar quedó guardado.' : '¡Gracias por reservar! Tu clase está confirmada.'}</p>
      ${details(f)}
      ${pending ? payment(f) : ''}
      <p style="font-size:14px">Te recomendamos llegar 5 minutos antes, con ropa cómoda${/pilates/i.test(f.discipline) ? ' y medias' : ''}.</p>
      ${cancelBlock(f)}
      <p>¡Nos vemos en Nube! ☁️</p>`, f),
  }
}

export function reminderEmail(f: Full): Mail {
  const pending = f.booking.status === 'pending_payment'
  return {
    to: f.booking.client_email ?? '',
    replyTo: f.settings.admin_email || undefined,
    subject: `Recordatorio: ${f.discipline}, ${when(f)}`,
    html: layout(`${hello(f)}
      <p>Te recordamos tu clase en Nube Estudio:</p>
      ${details(f)}
      ${pending ? payment(f) : ''}
      ${cancelBlock(f)}`, f),
  }
}

export function cancelledEmail(f: Full): Mail {
  const site = f.settings.site_url.replace(/\/+$/, '')
  return {
    to: f.booking.client_email ?? '',
    replyTo: f.settings.admin_email || undefined,
    subject: `Reserva cancelada: ${f.discipline}, ${when(f)}`,
    html: layout(`${hello(f)}
      <p>Tu reserva fue cancelada.</p>
      ${details(f)}
      <p>Cuando quieras, podés reservar otra clase:</p>
      ${button(`${site}/reservar`, 'Ver horarios')}`, f),
  }
}

export function paidEmail(f: Full): Mail {
  return {
    to: f.booking.client_email ?? '',
    replyTo: f.settings.admin_email || undefined,
    subject: `Pago recibido: ${f.discipline}, ${when(f)}`,
    html: layout(`${hello(f)}
      <p>Recibimos tu pago de <strong>${money(f.booking.price)}</strong>. ¡Tu lugar está confirmado!</p>
      ${details(f)}
      ${cancelBlock(f)}`, f),
  }
}

// Aviso a Lisbeth
export function adminEmail(f: Full, kind: 'new' | 'cancelled'): Mail | null {
  if (!f.settings.admin_email) return null
  const b = f.booking
  const wa = b.client_phone ? `https://wa.me/${b.client_phone.replace(/\D/g, '')}` : null
  return {
    to: f.settings.admin_email,
    replyTo: b.client_email ?? undefined,
    subject: `${kind === 'new' ? 'Nueva reserva' : 'Canceló'}: ${b.client_name} · ${f.discipline}, ${when(f)}`,
    html: layout(`<p><strong>${esc(b.client_name)}</strong> ${kind === 'new' ? 'reservó una clase' : 'canceló su reserva'}.</p>
      ${details(f)}
      <p>Email: ${b.client_email ? `<a href="mailto:${b.client_email}">${esc(b.client_email)}</a>` : "—"}<br>
      Teléfono: ${b.client_phone ? `${esc(b.client_phone)}${wa ? ` · <a href="${wa}">WhatsApp</a>` : ''}` : '—'}</p>
      ${b.notes ? `<p>Mensaje: ${esc(b.notes)}</p>` : ''}
      ${button(`${f.settings.site_url.replace(/\/+$/, '')}/admin`, 'Abrir el panel')}`, f),
  }
}
