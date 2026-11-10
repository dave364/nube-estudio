// POST /functions/v1/book
// Reserva de una clase desde el sitio.
// Body: { classId, startsAt, name, email, phone?, notes?, website (trampa anti-spam, vacío) }
import { admin, clean, cors, errorCode, isEmail, json, loadFull } from '../_shared/common.ts'
import { type Mail, sendAll } from '../_shared/email.ts'
import { adminEmail, confirmationEmail } from '../_shared/templates.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return json({ error: 'invalid_input' }, 400)
  }

  // Los robots llenan el campo oculto "website": se les responde OK sin reservar
  if (clean(body.website, 200)) return json({ ok: true, booking: null })

  const name = clean(body.name, 120)
  const email = clean(body.email, 200).toLowerCase()
  const phone = clean(body.phone, 40)
  const notes = clean(body.notes, 2000)
  if (!name || !isEmail(email) || typeof body.classId !== 'string' || typeof body.startsAt !== 'string') {
    return json({ error: 'invalid_input' }, 400)
  }

  const { data, error } = await admin().rpc('create_booking', {
    p_class_id: body.classId, p_starts_at: body.startsAt, p_name: name,
    p_email: email, p_phone: phone, p_notes: notes,
  }).single()
  if (error || !data) {
    const code = errorCode(error?.message)
    if (code === 'server_error') console.error(error)
    return json({ error: code }, code === 'server_error' ? 500 : 409)
  }

  const f = await loadFull((data as { id: string }).id)
  const emailed = await sendAll([confirmationEmail(f), adminEmail(f, 'new')].filter(Boolean) as Mail[])

  const b = f.booking
  return json({
    ok: true,
    emailed,
    booking: { status: b.status, price: b.price, startsAt: b.starts_at, endsAt: b.ends_at, cancelToken: b.cancel_token },
  })
})
