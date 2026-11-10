# Nube Estudio

Sitio de **Nube Estudio** (Pilates, Danza y Música · José Mármol) con reservas de clases online y panel para Lizbeth.
React + Vite en el frente, Supabase (base de datos, login y funciones) detrás. Basado en el sistema de reservas de Le Papillon Danse 66, adaptado a **clases grupales con cupo**.

## Empezar

```bash
npm install
npm run dev        # http://localhost:5173  (sin .env arranca en MODO DEMO)
npm run build      # sitio de producción en dist/
npm run build:demo # versión de muestra en dist-demo/ (funciona en cualquier hosting, links con #)
npm run test:db    # prueba la base de reservas en un Postgres en memoria
```

**Modo demo:** si `VITE_SUPABASE_URL` está vacío, el sitio y el panel (`/admin`, entra con cualquier email) funcionan con horarios y alumnas de ejemplo que viven en memoria. Sirve para mostrárselo a Lizbeth antes de conectar la base.

## Cómo funcionan las reservas

| Concepto | Qué es |
|---|---|
| **Disciplina** | Pilates Reformer, Mat, Danza, Piano, Guitarra: precio por clase, duración, descripción |
| **Clase** (grilla semanal) | "Reformer, lunes 18:00, 4 lugares". Se repite todas las semanas. Piano/guitarra = 1 lugar |
| **Cierre** | Feriados o vacaciones: esos días no se puede reservar |
| **Reserva** | Una alumna en una clase de un día puntual. Estados: *falta pagar*, *pagada*, *confirmada* (sin cargo), *cancelada* |

1. La alumna elige día y clase en `/reservar`, ve cuántos lugares quedan y deja nombre, WhatsApp y email.
2. La base controla el cupo (nunca se sobrevende, aunque reserven dos al mismo tiempo).
3. Le llega un email con los datos de pago (alias, Mercado Pago o en el estudio) y un link para cancelar.
4. A Lizbeth le llega un aviso. En el panel marca "✓ Pagó" cuando recibe el comprobante.
5. Recordatorio automático 24 h antes. La alumna puede cancelar hasta 12 h antes y el lugar se libera.

Panel (`/admin`): **Agenda** del día con cada clase y sus anotadas · **Pagos** pendientes y cobrado del mes · **Horarios** · **Disciplinas** · **Feriados** · **Ajustes** (alias, Mercado Pago, reglas).

## Estructura

```
src/
  config/site.js     WhatsApp, Instagram, dirección, textos (lo marcado COMPLETAR)
  lib/api.js         elige Supabase o demo
  lib/supabaseApi.js conexión real
  lib/demoApi.js     datos de ejemplo en memoria
  pages/             Inicio, Clases, Reservar, Cancelar
  admin/             panel de Lizbeth
  assets/clases/     ilustraciones recortadas del flyer
supabase/
  migrations/        tablas, reglas, permisos y datos de ejemplo
  functions/         book, cancel, notify, reminders (+ emails en _shared/templates.ts)
  cron.sql           recordatorios cada 30 min
  tests/             npm run test:db
```

## Puesta en marcha (una sola vez)

### 1. Supabase
1. [supabase.com](https://supabase.com) → *New project* → nombre `nube-estudio`, región **South America (São Paulo)**.
2. *SQL Editor* → pegar todo `supabase/migrations/20261110000000_reservas.sql` → *Run*.
3. *Authentication → URL Configuration*: **Site URL** = dominio del sitio, y agregar `https://DOMINIO/admin` en **Redirect URLs**.
4. *Authentication → Users → Add user → Send invitation* con el email de Lizbeth. Después, en *SQL Editor*:
   ```sql
   insert into public.admins (user_id) select id from auth.users where email = 'EMAIL_DE_LIZBETH';
   ```
5. *Authentication → Sign In / Providers*: desactivar **Allow new users to sign up**.
6. En *Table Editor → settings*: completar `site_url` (dominio) y `admin_email`. El resto (alias, etc.) se carga desde el panel.

### 2. Emails (Brevo, gratis)
1. Cuenta en [brevo.com](https://www.brevo.com) con el Gmail del estudio; verificar ese Gmail como remitente.
2. *SMTP & API → API Keys*: generar una clave (`xkeysib-…`).

### 3. Funciones de servidor
```bash
npx supabase login
npx supabase link --project-ref ID_DEL_PROYECTO
npx supabase secrets set BREVO_API_KEY=xkeysib-... EMAIL_FROM=gmail-del-estudio@gmail.com CRON_SECRET=una-clave-larga
npx supabase functions deploy book cancel notify reminders
```
Después correr `supabase/cron.sql` en el *SQL Editor* (reemplazando `TU_PROYECTO` y `TU_SECRETO`).

### 4. Sitio
En el hosting (Render, Vercel, Netlify o Cloudflare Pages): build `npm run build`, carpeta `dist`, y las variables
`VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (*Project Settings → API*). Todas las rutas tienen que ir a `index.html`
(ya está `vercel.json` y `public/_redirects`; en Render: *Redirects/Rewrites* `/*` → `/index.html`, *Rewrite*).

## Pendiente (datos de Lizbeth)

- [ ] Grilla real: días, horarios y cupos (cuántas camas de Reformer) → panel › Horarios
- [ ] Precios reales → panel › Disciplinas (los cargados son **de ejemplo**)
- [ ] Alias / CBU / Mercado Pago → panel › Ajustes
- [ ] Dirección exacta → `src/config/site.js` y panel › Ajustes
- [ ] Texto "El estudio" y nombres de profes → `src/pages/Home.jsx`
- [ ] Fotos reales del espacio (opcional)
- [ ] ¿Packs de clases (ej. 8 por mes)? → próxima etapa
