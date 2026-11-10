// Prueba la base de datos de reservas en un Postgres en memoria: npm run test:db
import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'

const db = new PGlite()
await db.exec(`
  create role anon; create role authenticated; create role service_role;
  create schema auth;
  create table auth.users (id uuid primary key, email text);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  set timezone = 'UTC';
`)
await db.exec(readFileSync(new URL('../migrations/20261110000000_reservas.sql', import.meta.url), 'utf8'))

const q = async (sql, p) => (await db.query(sql, p)).rows
let fails = 0
const ok = (cond, msg) => { console.log(cond ? '✔' : '✘', msg); if (!cond) fails++ }
const err = async (sql, p, code, msg) => {
  try { await db.query(sql, p); ok(false, msg + ' (no dio error)') }
  catch (e) { ok(e.message.includes(code), `${msg} → ${e.message}`) }
}
const TZ = 'America/Argentina/Buenos_Aires'
const hhmm = (iso) => new Date(iso).toLocaleTimeString('es-AR', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })

// Próximo lunes (hora de Argentina)
const [{ mon }] = await q(`select (date_trunc('week', (now() at time zone '${TZ}')::date + 7))::date::text as mon`)
const sun = (await q(`select ($1::date + 6)::text d`, [mon]))[0].d
console.log('lunes:', mon)

const monday = await q(`select * from public_schedule($1, $1)`, [mon])
ok(monday.map((r) => `${hhmm(r.starts_at)} ${r.discipline_key}`).join(', ') ===
  '09:00 pilates-reformer, 16:00 guitarra, 17:00 guitarra, 18:00 pilates-reformer, 19:00 pilates-reformer',
  `lunes: ${monday.map((r) => `${hhmm(r.starts_at)} ${r.discipline_name}`).join(', ')}`)
ok((await q(`select * from public_schedule($1, $1)`, [sun])).length === 0, 'domingo sin clases')

const ref = monday.find((r) => hhmm(r.starts_at) === '18:00')
ok(ref.capacity === 4 && ref.spots_left === 4 && Number(ref.price) === 15000, 'Reformer 18 h: 4 lugares, $15.000')

// Reservas hasta llenar el cupo
const book = (cls, at, name, email) =>
  q(`select * from create_booking($1, $2, $3, $4, '11 1234-5678', '')`, [cls, at, name, email])
const [b1] = await book(ref.class_id, ref.starts_at, 'Ana', ' ANA@mail.com ')
ok(b1.status === 'pending_payment' && b1.client_email === 'ana@mail.com', 'reserva queda pendiente de pago')
await err(`select * from create_booking($1, $2, 'Ana', 'ana@mail.com', '', '')`, [ref.class_id, ref.starts_at], 'already_registered', 'la misma persona no se anota dos veces')
await book(ref.class_id, ref.starts_at, 'Bea', 'bea@mail.com')
await book(ref.class_id, ref.starts_at, 'Caro', 'caro@mail.com')
await book(ref.class_id, ref.starts_at, 'Dani', 'dani@mail.com')
const after = (await q(`select * from public_schedule($1, $1)`, [mon])).find((r) => r.class_id === ref.class_id)
ok(after.spots_left === 0, 'después de 4 reservas: 0 lugares')
await err(`select * from create_booking($1, $2, 'Eli', 'eli@mail.com', '', '')`, [ref.class_id, ref.starts_at], 'class_full', 'quinta reserva rechazada (clase completa)')
await err(`select * from create_booking($1, $2::timestamptz + interval '30 min', 'Eli', 'eli@mail.com', '', '')`, [ref.class_id, ref.starts_at], 'class_unavailable', 'horario que no existe rechazado')

// Clase individual (cupo 1)
const gui = monday.find((r) => r.discipline_key === 'guitarra')
await book(gui.class_id, gui.starts_at, 'Fer', 'fer@mail.com')
await err(`select * from create_booking($1, $2, 'Gabi', 'gabi@mail.com', '', '')`, [gui.class_id, gui.starts_at], 'class_full', 'guitarra individual: segunda persona rechazada')

// Cancelación libera el lugar
await q(`update bookings set status = 'cancelled' where id = $1`, [b1.id])
const freed = (await q(`select * from public_schedule($1, $1)`, [mon])).find((r) => r.class_id === ref.class_id)
ok(freed.spots_left === 1, 'cancelar libera un lugar')
const [again] = await book(ref.class_id, ref.starts_at, 'Ana', 'ana@mail.com')
ok(!!again, 'después de cancelar, puede volver a anotarse')

// Cancelación por token
const [{ cancel_token }] = await q(`select cancel_token from bookings where client_email = 'bea@mail.com'`)
const [c] = await q(`select * from cancel_booking($1)`, [cancel_token])
ok(c.status === 'cancelled' && c.cancelled_at, 'cancelación con el link del email')
await err(`select * from cancel_booking($1)`, [cancel_token], 'already_cancelled', 'no se cancela dos veces')
const [info] = await q(`select * from booking_by_token($1)`, [cancel_token])
ok(info.discipline_name === 'Pilates Reformer', 'booking_by_token devuelve la disciplina')

// Pagada → fecha
await q(`update bookings set status = 'paid' where client_email = 'caro@mail.com'`)
ok((await q(`select paid_at from bookings where client_email = 'caro@mail.com'`))[0].paid_at, 'marcar pagada guarda la fecha')

// Feriado: sin clases ese día
await q(`insert into closures (starts_at, ends_at, label) values (($1::date + 2)::timestamp at time zone '${TZ}', ($1::date + 3)::timestamp at time zone '${TZ}', 'Feriado')`, [mon])
const wed = (await q(`select ($1::date + 2)::text d`, [mon]))[0].d
ok((await q(`select * from public_schedule($1, $1)`, [wed])).length === 0, 'miércoles feriado sin clases')

// Clase gratis → confirmada
await q(`update disciplines set price = 0 where key = 'pilates-mat'`)
const tue = (await q(`select ($1::date + 1)::text d`, [mon]))[0].d
const mat = (await q(`select * from public_schedule($1, $1)`, [tue])).find((r) => r.discipline_key === 'pilates-mat')
const [free] = await book(mat.class_id, mat.starts_at, 'Hana', 'hana@mail.com')
ok(free.status === 'confirmed', 'clase gratis queda confirmada')

// Anticipación mínima y límite de días
const today = (await q(`select (now() at time zone '${TZ}')::date::text d`))[0].d
const soon = await q(`select * from public_schedule($1, ($1::date + 1)::date)`, [today])
ok(soon.every((r) => Date.parse(r.starts_at) >= Date.now() + 2 * 3600e3 - 60e3), 'no muestra clases con menos de 2 h de aviso')
const far = await q(`select * from public_schedule(($1::date + 30)::date, ($1::date + 40)::date)`, [today])
ok(far.length === 0, 'no muestra clases a más de 21 días')

// Permisos: el panel exige ser administradora
await err(`select * from admin_schedule($1, $1)`, [mon], 'unauthorized', 'admin_schedule rechaza a quien no es admin')
await q(`insert into auth.users values ('00000000-0000-0000-0000-000000000001', 'liz@mail.com')`)
await q(`insert into admins values ('00000000-0000-0000-0000-000000000001')`)
await db.exec(`set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001'`)
const adm = (await q(`select * from admin_schedule($1, $1)`, [mon])).find((r) => r.class_id === ref.class_id)
ok(adm.taken === 3, `el panel ve la clase con ${adm.taken} anotadas`)

console.log(fails ? `\n${fails} prueba(s) fallaron` : '\nTodo bien ✔')
process.exit(fails ? 1 : 0)
