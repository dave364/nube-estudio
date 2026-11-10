// Elige la conexión: Supabase si está configurado, si no el modo demo.
import * as real from './supabaseApi'
import * as demo from './demoApi'

export const DEMO = import.meta.env.VITE_DEMO === 'true' || !import.meta.env.VITE_SUPABASE_URL

const api = DEMO ? demo : real
export default api

// Mensajes para la alumna según el código de error del servidor
export const ERRORS = {
  class_full: 'Esa clase se acaba de completar. Elegí otro horario.',
  class_unavailable: 'Ese horario ya no está disponible. Elegí otro.',
  class_not_found: 'Ese horario ya no está disponible. Elegí otro.',
  already_registered: 'Ya tenés una reserva para esa clase con ese email.',
  invalid_input: 'Revisá tu nombre y tu email.',
  booking_not_found: 'No encontramos esa reserva. Revisá el link del email.',
  already_cancelled: 'Esta reserva ya estaba cancelada.',
  booking_past: 'Esta clase ya pasó.',
  too_late: 'Ya no se puede cancelar online. Escribinos por WhatsApp.',
}
export const errorText = (e) => ERRORS[e?.code || e?.message] || 'Algo salió mal. Probá de nuevo o escribinos por WhatsApp.'
