// POST /functions/v1/cancel   Body: { token }
// La alumna cancela con el link de su email.
import { admin, cors, errorCode, json, loadFull } from '../_shared/common.ts'
import { type Mail, sendAll } from '../_shared/email.ts'
import { adminEmail, cancelledEmail } from '../_shared/templates.ts'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  const { token } = await req.json().catch(() => ({}))
  if (typeof token !== 'string' || !UUID.test(token)) return json({ error: 'booking_not_found' }, 400)

  const { data, error } = await admin().rpc('cancel_booking', { p_token: token }).single()
  if (error || !data) {
    const code = errorCode(error?.message)
    if (code === 'server_error') console.error(error)
    return json({ error: code }, code === 'server_error' ? 500 : 409)
  }

  const f = await loadFull((data as { id: string }).id)
  await sendAll([cancelledEmail(f), adminEmail(f, 'cancelled')].filter(Boolean) as Mail[])
  return json({ ok: true })
})
