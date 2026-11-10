// Utilidades del panel
export const STATUS = {
  pending_payment: { label: 'Falta pagar', tone: 'warn' },
  paid: { label: 'Pagada', tone: 'ok' },
  confirmed: { label: 'Confirmada', tone: 'ok' },
  cancelled: { label: 'Cancelada', tone: 'off' },
}

// Link de WhatsApp a partir del teléfono de la alumna (agrega 549 si es un celular argentino sin código)
export const waTo = (phone, text = '') => {
  let d = (phone || '').replace(/\D/g, '')
  if (d.length < 8) return null
  if (d.startsWith('0')) d = d.slice(1)
  if (d.length === 10) d = `549${d}`
  return `https://wa.me/${d}${text ? `?text=${encodeURIComponent(text)}` : ''}`
}

// Mensaje de error de la base en criollo
export function errText(e) {
  const m = e?.message || String(e)
  if (m.includes('bookings_one_per_person')) return 'Esa persona ya está anotada en esta clase.'
  if (m.includes('client_email')) return 'El email no es válido.'
  if (m.includes('foreign key')) return 'No se puede borrar: tiene reservas. Desactivala en su lugar.'
  if (m.includes('ends_at')) return 'La hora de fin tiene que ser después de la de inicio.'
  if (m.includes('Failed to fetch')) return 'Sin conexión. Probá de nuevo.'
  return m
}

// Confirmación: en la versión de muestra (que se ve dentro de claude.ai) los
// cuadros de confirm() del navegador están bloqueados, así que se asume la respuesta.
import { DEMO } from '../lib/api'
export const ask = (message, demoAnswer = true) => (DEMO ? demoAnswer : window.confirm(message))
