// POST /functions/v1/reminders   Header: Authorization: Bearer <CRON_SECRET>
// La llama la base cada 30 minutos (ver supabase/cron.sql). Manda un
// recordatorio a cada reserva que empieza dentro de las próximas
// `settings.reminder_hours` horas (24 por defecto), con los datos de pago
// si todavía no está pagada.
import { admin, json, loadFull } from '../_shared/common.ts'
import { sendEmail } from '../_shared/email.ts'
import { reminderEmail } from '../_shared/templates.ts'

Deno.serve(async (req) => {
  const secret = Deno.env.get('CRON_SECRET')
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return json({ error: 'unauthorized' }, 401)
  }

  const db = admin()
  const { data: s } = await db.from('settings').select('reminder_hours').eq('id', 1).single()
  const hours = s?.reminder_hours ?? 24
  const now = new Date()
  const limit = new Date(now.getTime() + hours * 3600_000)

  const { data: due, error } = await db
    .from('bookings')
    .select('id, created_at, starts_at')
    .is('reminder_sent_at', null)
    .neq('status', 'cancelled')
    .not('client_email', 'is', null)
    .gt('starts_at', now.toISOString())
    .lte('starts_at', limit.toISOString())
    .limit(50)
  if (error) return json({ error: error.message }, 500)

  let sent = 0
  let skipped = 0
  for (const row of due ?? []) {
    // Si reservó hace menos de 3 horas acaba de recibir la confirmación:
    // no hace falta otro email
    const fresh = now.getTime() - Date.parse(row.created_at) < 3 * 3600_000
    try {
      if (!fresh) {
        await sendEmail(reminderEmail(await loadFull(row.id)))
        sent++
      } else {
        skipped++
      }
      await db.from('bookings').update({ reminder_sent_at: now.toISOString() }).eq('id', row.id)
    } catch (e) {
      console.error('reminder error', row.id, e) // se reintenta en la próxima pasada
    }
  }
  return json({ ok: true, sent, skipped })
})
