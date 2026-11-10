// MODO DEMO: misma interfaz que supabaseApi.js, pero todo vive en memoria.
// Sirve para mostrar el sitio y el panel antes de conectar Supabase.
// Las reservas de prueba se pierden al recargar la página.
import { addDays, arToIso, dayKey, isoWeekday, todayKey } from './dates'

const uid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2))
const wait = (ms = 250) => new Promise((r) => setTimeout(r, ms))
const clone = (x) => JSON.parse(JSON.stringify(x))
const fail = (code) => {
  throw Object.assign(new Error(code), { code })
}

// --- Datos de ejemplo (los mismos que la migración de la base) -------------
const D = [
  ['pilates-reformer', 'Pilates Reformer', 'Clase en camilla Reformer en grupos reducidos. Fortalece, alinea y mejora la postura.', 'group', 15000, 50],
  ['pilates-mat', 'Pilates Mat', 'Pilates en colchoneta con elementos: pelota, bandas y pesitas. Ideal para empezar.', 'group', 10000, 50],
  ['danza', 'Danza', 'Clases de danza para trabajar técnica, expresión y musicalidad.', 'group', 10000, 60],
  ['piano', 'Piano', 'Clase individual de piano, para todas las edades y niveles.', 'individual', 18000, 45],
  ['guitarra', 'Guitarra', 'Clase individual de guitarra criolla o eléctrica, desde cero o para avanzar.', 'individual', 18000, 45],
]
const store = {
  settings: {
    id: 1, timezone: 'America/Argentina/Buenos_Aires', min_notice_hours: 2, max_days_ahead: 21,
    cancel_hours: 12, reminder_hours: 24, admin_email: 'nubestudio@ejemplo.com', site_url: window.location.origin,
    address: 'José Mármol, Buenos Aires', whatsapp: '5491161084203',
    transfer_alias: 'NUBE.ESTUDIO.MP', transfer_cbu: '', transfer_holder: 'Nube Estudio',
    mp_link: '', pay_at_studio: true, payment_note: 'Mandanos el comprobante por WhatsApp y te confirmamos el lugar.',
  },
  disciplines: D.map(([key, name, description, kind, price, minutes], i) => ({
    id: `d-${key}`, key, name, description, kind, price, minutes, active: true, sort: (i + 1) * 10,
  })),
  classes: [],
  closures: [],
  bookings: [],
}
const G = [
  ['pilates-reformer', 1, '09:00', 4], ['pilates-reformer', 1, '18:00', 4], ['pilates-reformer', 1, '19:00', 4],
  ['pilates-reformer', 3, '09:00', 4], ['pilates-reformer', 3, '18:00', 4], ['pilates-reformer', 3, '19:00', 4],
  ['pilates-reformer', 5, '18:00', 4], ['pilates-reformer', 6, '10:00', 4],
  ['pilates-mat', 2, '10:00', 8], ['pilates-mat', 2, '19:00', 8], ['pilates-mat', 4, '10:00', 8], ['pilates-mat', 4, '19:00', 8],
  ['danza', 3, '17:00', 10], ['danza', 5, '17:00', 10], ['danza', 6, '11:00', 10],
  ['piano', 2, '16:00', 1], ['piano', 2, '17:00', 1], ['piano', 4, '16:00', 1], ['piano', 4, '17:00', 1],
  ['guitarra', 1, '16:00', 1], ['guitarra', 1, '17:00', 1], ['guitarra', 3, '16:00', 1],
]
store.classes = G.map(([key, weekday, t, capacity], i) => ({
  id: `c-${i}`, discipline_id: `d-${key}`, weekday, start_time: `${t}:00`, minutes: null, capacity,
  teacher: null, active: true,
}))

const disc = (id) => store.disciplines.find((d) => d.id === id)
const withDisc = (b) => ({ ...b, discipline: { key: disc(b.discipline_id)?.key, name: disc(b.discipline_id)?.name } })

// Todas las clases de la grilla entre dos fechas, con lugares (como class_occurrences)
function occurrences(from, to) {
  const out = []
  for (let k = from; k <= to; k = addDays(k, 1)) {
    const wd = isoWeekday(k)
    for (const c of store.classes.filter((c) => c.active && c.weekday === wd)) {
      const d = disc(c.discipline_id)
      if (!d?.active) continue
      const starts = arToIso(k, c.start_time)
      const ends = new Date(Date.parse(starts) + (c.minutes || d.minutes) * 60000).toISOString()
      if (store.closures.some((x) => x.starts_at < ends && x.ends_at > starts)) continue
      const taken = store.bookings.filter((b) => b.class_id === c.id && b.starts_at === starts && b.status !== 'cancelled').length
      out.push({
        class_id: c.id, discipline_id: d.id, discipline_key: d.key, discipline_name: d.name, kind: d.kind,
        starts_at: starts, ends_at: ends, capacity: c.capacity, taken,
        spots_left: Math.max(c.capacity - taken, 0), price: d.price, teacher: c.teacher, _sort: d.sort,
      })
    }
  }
  return out.sort((a, b) => a.starts_at.localeCompare(b.starts_at) || a._sort - b._sort)
}

// Algunas alumnas de ejemplo para que el panel no arranque vacío
const NAMES = ['Sofía Gómez', 'Valentina Ruiz', 'Camila Díaz', 'Martina López', 'Lucía Fernández', 'Julieta Romero',
  'Agustina Sosa', 'Florencia Torres', 'Micaela Álvarez', 'Carolina Benítez', 'Paula Medina', 'Rocío Herrera']
;(function seed() {
  let n = 0
  const today = todayKey()
  for (const o of occurrences(addDays(today, -3), addDays(today, 10))) {
    const fill = (n * 7 + o.capacity * 3) % (o.capacity + 2)
    for (let i = 0; i < Math.min(fill, o.capacity); i++) {
      const name = NAMES[(n + i * 5) % NAMES.length]
      const past = Date.parse(o.starts_at) < Date.now()
      store.bookings.push({
        id: uid(), class_id: o.class_id, discipline_id: o.discipline_id, starts_at: o.starts_at, ends_at: o.ends_at,
        status: past || (n + i) % 3 ? 'paid' : 'pending_payment', price: o.price, client_name: name,
        client_email: `${name.split(' ')[0].toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')}@ejemplo.com`,
        client_phone: `11 ${5000 + ((n * 37) % 4000)}-${1000 + ((n * 91) % 8999)}`, notes: null, source: 'web',
        cancel_token: uid(), created_at: new Date(Date.now() - 86400000 * 2).toISOString(), paid_at: null,
      })
    }
    n++
  }
})()

// ---------------------------------------------------------------------------
// Sitio público
// ---------------------------------------------------------------------------
export const getDisciplines = async () => (await wait(120), clone(store.disciplines.filter((d) => d.active)))

export async function getSchedule(from, to) {
  await wait()
  const st = store.settings
  const today = todayKey()
  const f = from < today ? today : from
  const last = addDays(today, st.max_days_ahead)
  const t = to > last ? last : to
  if (t < f) return []
  const min = Date.now() + st.min_notice_hours * 3600000
  return clone(occurrences(f, t).filter((o) => Date.parse(o.starts_at) >= min))
}

export async function getPublicSettings() {
  const { admin_email, site_url, timezone, ...pub } = store.settings // eslint-disable-line no-unused-vars
  return clone(pub)
}

export async function book({ classId, startsAt, name, email, phone, notes, website }) {
  await wait(600)
  if (website) return { ok: true, booking: null }
  const day = dayKey(startsAt)
  const occ = (await getSchedule(day, day)).find((o) => o.class_id === classId && o.starts_at === startsAt)
  if (!occ) fail('class_unavailable')
  if (occ.spots_left <= 0) fail('class_full')
  const mail = email.trim().toLowerCase()
  if (store.bookings.some((b) => b.class_id === classId && b.starts_at === startsAt && b.status !== 'cancelled' && b.client_email === mail)) {
    fail('already_registered')
  }
  const b = {
    id: uid(), class_id: classId, discipline_id: occ.discipline_id, starts_at: occ.starts_at, ends_at: occ.ends_at,
    status: occ.price > 0 ? 'pending_payment' : 'confirmed', price: occ.price, client_name: name.trim(),
    client_email: mail, client_phone: phone?.trim() || null, notes: notes?.trim() || null, source: 'web',
    cancel_token: uid(), created_at: new Date().toISOString(), paid_at: null,
  }
  store.bookings.push(b)
  return { ok: true, emailed: false, demo: true, booking: { status: b.status, price: b.price, startsAt: b.starts_at, endsAt: b.ends_at, cancelToken: b.cancel_token } }
}

export async function bookingByToken(token) {
  await wait()
  const b = store.bookings.find((x) => x.cancel_token === token)
  if (!b) return null
  return {
    status: b.status, starts_at: b.starts_at, ends_at: b.ends_at, discipline_name: disc(b.discipline_id)?.name,
    cancel_until: new Date(Date.parse(b.starts_at) - store.settings.cancel_hours * 3600000).toISOString(),
  }
}

export async function cancelBooking(token) {
  await wait(400)
  const b = store.bookings.find((x) => x.cancel_token === token)
  if (!b) fail('booking_not_found')
  if (b.status === 'cancelled') fail('already_cancelled')
  if (Date.parse(b.starts_at) < Date.now() + store.settings.cancel_hours * 3600000) fail('too_late')
  b.status = 'cancelled'
  return { ok: true }
}

// ---------------------------------------------------------------------------
// Panel (en demo entra cualquier email y contraseña)
// ---------------------------------------------------------------------------
let session = null
const listeners = new Set()
export const auth = {
  getSession: async () => session,
  onChange: (cb) => {
    listeners.add(cb)
    return () => listeners.delete(cb)
  },
  signIn: async (email) => {
    await wait(300)
    session = { user: { email } }
    listeners.forEach((cb) => cb('SIGNED_IN', session))
  },
  signOut: async () => {
    session = null
    listeners.forEach((cb) => cb('SIGNED_OUT', null))
  },
  resetPassword: async () => {},
  updatePassword: async () => {},
  isAdmin: async () => true,
}

export const adminSchedule = async (from, to) => (await wait(150), clone(occurrences(from, to)))

export async function listBookings({ from, to, status, notStatus, limit = 500, ascending = true }) {
  await wait(150)
  return clone(store.bookings
    .filter((b) => (!from || b.starts_at >= from) && (!to || b.starts_at < to) &&
      (!status || b.status === status) && (!notStatus || b.status !== notStatus))
    .sort((a, b) => (ascending ? 1 : -1) * a.starts_at.localeCompare(b.starts_at))
    .slice(0, limit)
    .map(withDisc))
}

export async function updateBooking(id, patch) {
  await wait(200)
  const b = store.bookings.find((x) => x.id === id)
  Object.assign(b, patch)
  if (patch.status === 'paid') b.paid_at = new Date().toISOString()
  return clone(withDisc(b))
}

export async function createBooking(row) {
  await wait(200)
  const mail = row.client_email ? row.client_email.toLowerCase() : null
  if (store.bookings.some((b) => b.class_id === row.class_id && b.starts_at === row.starts_at && b.status !== 'cancelled' && mail && b.client_email === mail)) {
    throw new Error('bookings_one_per_person')
  }
  const b = { id: uid(), cancel_token: uid(), created_at: new Date().toISOString(), source: 'admin', paid_at: null, ...row, client_email: mail }
  store.bookings.push(b)
  return clone(withDisc(b))
}

export const notify = async () => (await wait(300), { ok: true, demo: true })

const table = (name, sortKey) => ({
  list: async () => (await wait(120), clone([...store[name]].sort((a, b) => String(a[sortKey]).localeCompare(String(b[sortKey]), undefined, { numeric: true })))),
  save: async (row) => {
    await wait(200)
    if (row.id) {
      const x = store[name].find((r) => r.id === row.id)
      Object.assign(x, row)
      return clone(x)
    }
    const x = { ...row, id: uid() }
    store[name].push(x)
    return clone(x)
  },
  remove: async (id) => {
    await wait(150)
    if (name === 'disciplines' && store.bookings.some((b) => b.discipline_id === id)) {
      throw new Error('violates foreign key constraint')
    }
    store[name] = store[name].filter((r) => r.id !== id)
    if (name === 'disciplines') store.classes = store.classes.filter((c) => c.discipline_id !== id)
    if (name === 'classes') store.bookings.forEach((b) => { if (b.class_id === id) b.class_id = null })
  },
})

export const disciplines = table('disciplines', 'sort')
export const classes = table('classes', 'start_time')
export const closures = table('closures', 'starts_at')

export const getSettings = async () => clone(store.settings)
export const saveSettings = async (patch) => (await wait(200), Object.assign(store.settings, patch), clone(store.settings))
