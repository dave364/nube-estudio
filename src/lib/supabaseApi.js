// Conexión real con Supabase (base de datos, login del panel y funciones de servidor)
import { createClient } from '@supabase/supabase-js'

let client
const sb = () =>
  (client ??= createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY))

const must = ({ data, error }) => {
  if (error) throw error
  return data
}

// Llama a una función de servidor y devuelve el código de error que manda ('class_full', etc.)
async function invoke(name, body) {
  const { data, error } = await sb().functions.invoke(name, { body })
  if (error) {
    let code = 'generic'
    try {
      code = (await error.context.json()).error || code
    } catch {
      /* sin cuerpo JSON (sin conexión, etc.) */
    }
    throw Object.assign(new Error(code), { code })
  }
  return data
}

// ---------------------------------------------------------------------------
// Sitio público
// ---------------------------------------------------------------------------
export const getDisciplines = async () =>
  must(await sb().from('disciplines').select('*').eq('active', true).order('sort'))

export const getSchedule = async (from, to) =>
  must(await sb().rpc('public_schedule', { p_from: from, p_to: to }))

export const getPublicSettings = async () => (must(await sb().rpc('public_settings')) ?? [])[0] ?? {}

export const book = (payload) => invoke('book', payload)
export const cancelBooking = (token) => invoke('cancel', { token })
export const bookingByToken = async (token) =>
  (must(await sb().rpc('booking_by_token', { p_token: token })) ?? [])[0] ?? null

// ---------------------------------------------------------------------------
// Panel
// ---------------------------------------------------------------------------
export const auth = {
  getSession: async () => (await sb().auth.getSession()).data.session,
  onChange: (cb) => {
    const { data } = sb().auth.onAuthStateChange((event, s) => cb(event, s))
    return () => data.subscription.unsubscribe()
  },
  signIn: async (email, password) => {
    const { error } = await sb().auth.signInWithPassword({ email, password })
    if (error) throw error
  },
  signOut: () => sb().auth.signOut(),
  resetPassword: async (email) => {
    const { error } = await sb().auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/admin` })
    if (error) throw error
  },
  updatePassword: async (password) => {
    const { error } = await sb().auth.updateUser({ password })
    if (error) throw error
  },
  isAdmin: async () => !!(await sb().rpc('is_admin')).data,
}

export const adminSchedule = async (from, to) =>
  must(await sb().rpc('admin_schedule', { p_from: from, p_to: to }))

const BOOKING = '*, discipline:disciplines(key, name)'

export const listBookings = async ({ from, to, status, notStatus, limit = 500, ascending = true }) => {
  let q = sb().from('bookings').select(BOOKING)
  if (from) q = q.gte('starts_at', from)
  if (to) q = q.lt('starts_at', to)
  if (status) q = q.eq('status', status)
  if (notStatus) q = q.neq('status', notStatus)
  return must(await q.order('starts_at', { ascending }).limit(limit))
}

export const updateBooking = async (id, patch) =>
  must(await sb().from('bookings').update(patch).eq('id', id).select(BOOKING).single())

export const createBooking = async (row) =>
  must(await sb().from('bookings').insert({ ...row, source: 'admin' }).select(BOOKING).single())

export const notify = (bookingId, kind) => invoke('notify', { bookingId, kind })

const table = (name, order) => ({
  list: async () => must(await sb().from(name).select('*').order(order)),
  save: async (row) => {
    const { id, ...rest } = row
    return id
      ? must(await sb().from(name).update(rest).eq('id', id).select().single())
      : must(await sb().from(name).insert(rest).select().single())
  },
  remove: async (id) => must(await sb().from(name).delete().eq('id', id)),
})

export const disciplines = table('disciplines', 'sort')
export const classes = table('classes', 'start_time')
export const closures = table('closures', 'starts_at')

export const getSettings = async () => must(await sb().from('settings').select('*').eq('id', 1).single())
export const saveSettings = async (patch) =>
  must(await sb().from('settings').update(patch).eq('id', 1).select().single())
