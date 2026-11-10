// Utilidades compartidas por las funciones de servidor (Supabase Edge Functions)
import { createClient } from 'npm:@supabase/supabase-js@2'

export const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })

// Cliente con permisos de servidor (nunca se expone al navegador)
export const admin = () =>
  createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  })

export type Settings = {
  timezone: string
  reminder_hours: number
  cancel_hours: number
  admin_email: string
  site_url: string
  address: string
  whatsapp: string
  transfer_alias: string
  transfer_cbu: string
  transfer_holder: string
  mp_link: string
  pay_at_studio: boolean
  payment_note: string
}

export type Booking = {
  id: string
  starts_at: string
  ends_at: string
  status: 'pending_payment' | 'paid' | 'confirmed' | 'cancelled'
  price: number
  client_name: string
  client_email: string | null
  client_phone: string | null
  notes: string | null
  cancel_token: string
  created_at: string
}

export type Full = {
  booking: Booking
  settings: Settings
  discipline: string
  teacher: string | null
  minutes: number
}

// Reserva con todo lo necesario para armar los emails
export async function loadFull(id: string): Promise<Full> {
  const db = admin()
  const [{ data: booking, error }, { data: settings }] = await Promise.all([
    db.from('bookings')
      .select('*, discipline:disciplines(name), class:classes(teacher)')
      .eq('id', id)
      .single(),
    db.from('settings').select('*').eq('id', 1).single(),
  ])
  if (error || !booking || !settings) throw new Error('booking_not_found')
  const { discipline, class: cls, ...b } = booking
  return {
    booking: { ...b, price: Number(b.price) },
    settings,
    discipline: discipline?.name ?? 'Clase',
    teacher: cls?.teacher ?? null,
    minutes: Math.round((Date.parse(b.ends_at) - Date.parse(b.starts_at)) / 60000),
  }
}

export const money = (n: number) =>
  n > 0 ? `$${n.toLocaleString('es-AR', { maximumFractionDigits: 2 })}` : 'Sin cargo'

export const cancelLink = (s: Settings, b: Booking) =>
  `${s.site_url.replace(/\/+$/, '')}/reservar/cancelar?t=${b.cancel_token}`

export const isEmail = (s: unknown) =>
  typeof s === 'string' && s.length <= 200 && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s.trim())

export const clean = (s: unknown, max: number) =>
  typeof s === 'string' ? s.trim().slice(0, max) : ''

// Errores de la base que el sitio muestra con un mensaje propio
export const KNOWN_ERRORS = [
  'class_not_found', 'class_unavailable', 'class_full', 'already_registered',
  'booking_not_found', 'already_cancelled', 'booking_past', 'too_late',
]
export const errorCode = (message = '') =>
  KNOWN_ERRORS.find((c) => message.includes(c)) ??
  (message.includes('bookings_one_per_person') ? 'already_registered' : 'server_error')
