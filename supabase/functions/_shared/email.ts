// Envío de emails. Se usa el primero que esté configurado:
//   1. Brevo (recomendado):  BREVO_API_KEY + EMAIL_FROM (remitente verificado en Brevo)
//   2. Resend (dominio propio): RESEND_API_KEY + EMAIL_FROM
//   3. Gmail por SMTP: SMTP_USER + SMTP_PASS (contraseña de aplicación)
// EMAIL_FROM es solo la dirección, por ejemplo nubestudio@gmail.com
import nodemailer from 'npm:nodemailer@6'

export type Mail = { to: string; subject: string; html: string; replyTo?: string }

const FROM_NAME = 'Nube Estudio'

let transport: ReturnType<typeof nodemailer.createTransport> | null = null

export async function sendEmail(mail: Mail) {
  // Para probar en local sin mandar nada: EMAIL_LOG=ruta/al/archivo.jsonl
  const log = Deno.env.get('EMAIL_LOG')
  if (log) {
    await Deno.writeTextFile(log, JSON.stringify(mail) + '\n', { append: true })
    return
  }

  const brevoKey = Deno.env.get('BREVO_API_KEY')
  if (brevoKey) {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': brevoKey, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        sender: { name: FROM_NAME, email: Deno.env.get('EMAIL_FROM') ?? 'nubestudio@gmail.com' },
        to: [{ email: mail.to }],
        subject: mail.subject,
        htmlContent: mail.html,
        ...(mail.replyTo ? { replyTo: { email: mail.replyTo } } : {}),
      }),
    })
    if (!res.ok) throw new Error(`brevo ${res.status}: ${await res.text()}`)
    return
  }

  const resendKey = Deno.env.get('RESEND_API_KEY')
  if (resendKey) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: `${FROM_NAME} <${Deno.env.get('EMAIL_FROM') ?? 'onboarding@resend.dev'}>`,
        to: [mail.to],
        subject: mail.subject,
        html: mail.html,
        reply_to: mail.replyTo,
      }),
    })
    if (!res.ok) throw new Error(`resend ${res.status}: ${await res.text()}`)
    return
  }

  const user = Deno.env.get('SMTP_USER')
  const pass = Deno.env.get('SMTP_PASS')
  if (!user || !pass) throw new Error('email_not_configured')
  // Supabase bloquea los puertos 25 y 587: se usa 465 (SSL)
  transport ??= nodemailer.createTransport({
    host: Deno.env.get('SMTP_HOST') ?? 'smtp.gmail.com',
    port: Number(Deno.env.get('SMTP_PORT') ?? 465),
    secure: true,
    auth: { user, pass },
  })
  await transport.sendMail({
    from: `"${FROM_NAME}" <${user}>`,
    to: mail.to,
    subject: mail.subject,
    html: mail.html,
    replyTo: mail.replyTo,
  })
}

// Manda varios y no corta si uno falla (la reserva ya quedó guardada)
export async function sendAll(mails: Mail[]) {
  const results = await Promise.allSettled(mails.map(sendEmail))
  const failed = results.filter((r) => r.status === 'rejected') as PromiseRejectedResult[]
  failed.forEach((r) => console.error('email error:', r.reason))
  return failed.length === 0
}
