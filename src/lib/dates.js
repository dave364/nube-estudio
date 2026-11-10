// Fechas siempre en hora de Argentina (aunque quien visite esté en otro lado)
import { TIMEZONE } from '../config/site'

const fmt = (opts) => new Intl.DateTimeFormat('es-AR', { timeZone: TIMEZONE, ...opts })
export const cap = (s) => s.charAt(0).toLocaleUpperCase('es') + s.slice(1)

// '2026-11-16' del instante dado
export const dayKey = (d) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit' })
    .format(new Date(d))

export const todayKey = () => dayKey(new Date())

// Suma días a una fecha 'AAAA-MM-DD'
export const addDays = (key, n) => {
  const d = new Date(`${key}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

// Día de la semana ISO (1 = lunes … 7 = domingo) de 'AAAA-MM-DD'
export const isoWeekday = (key) => ((new Date(`${key}T12:00:00Z`).getUTCDay() + 6) % 7) + 1

// Fecha + hora de Argentina → instante ISO. Argentina no tiene horario de verano (UTC−3).
export const arToIso = (date, time) => new Date(`${date}T${time.slice(0, 5)}:00-03:00`).toISOString()

export const fTime = (iso) => fmt({ hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(iso))
export const fDayLong = (iso) => cap(fmt({ weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(iso)))
export const fDayFull = (iso) => cap(fmt({ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso)))
export const fShort = (iso) => fmt({ day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(iso))

// Para la tira de días: { wd: 'lun', day: '16', month: 'nov' }
export const dayChip = (key) => {
  const d = new Date(`${key}T15:00:00Z`)
  const p = (o) => fmt(o).format(d).replace('.', '')
  return { wd: p({ weekday: 'short' }), day: p({ day: 'numeric' }), month: p({ month: 'short' }) }
}

export const WEEKDAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

export const money = (n) =>
  Number(n) > 0 ? `$${Number(n).toLocaleString('es-AR', { maximumFractionDigits: 2 })}` : 'Sin cargo'

// "18:00:00" → "18:00"
export const hhmm = (t) => String(t).slice(0, 5)
