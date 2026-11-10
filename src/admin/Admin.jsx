import { useEffect, useState } from 'react'
import { Link, NavLink, Navigate, Route, Routes } from 'react-router-dom'
import api, { DEMO } from '../lib/api'
import Agenda from './Agenda'
import Pagos from './Pagos'
import Horarios from './Horarios'
import Disciplinas from './Disciplinas'
import Feriados from './Feriados'
import Ajustes from './Ajustes'
import './admin.css'

const { auth } = api

function Brand({ big }) {
  return (
    <span className={`a-brand${big ? ' a-brand--big' : ''}`}>
      <span className="a-brand__nube">NUBE</span>
      <span className="a-brand__sub">{big ? 'panel de reservas' : 'panel'}</span>
    </span>
  )
}

// Panel de administración (/admin)
export default function Admin() {
  const [session, setSession] = useState(undefined)
  const [isAdmin, setIsAdmin] = useState(null)
  // Llegó desde el email de invitación o de "olvidé mi contraseña"
  const [newPassword, setNewPassword] = useState(() => /type=(recovery|invite)/.test(window.location.hash))

  useEffect(() => {
    document.title = 'Panel · Nube Estudio'
    auth.getSession().then(setSession)
    return auth.onChange((event, s) => {
      setSession(s)
      if (event === 'PASSWORD_RECOVERY') setNewPassword(true)
    })
  }, [])

  useEffect(() => {
    if (!session) return setIsAdmin(null)
    auth.isAdmin().then(setIsAdmin)
  }, [session])

  return (
    <div className="a">
      {session === undefined || (session && isAdmin === null) ? (
        <div className="a-center"><Brand big /></div>
      ) : !session ? (
        <Login />
      ) : newPassword ? (
        <SetPassword onDone={() => setNewPassword(false)} />
      ) : !isAdmin ? (
        <div className="a-center"><div className="a-box a-login">
          <Brand big />
          <p>Esta cuenta ({session.user.email}) no tiene acceso al panel.</p>
          <button className="a-btn" onClick={() => auth.signOut()}>Salir</button>
        </div></div>
      ) : (
        <Shell email={session.user.email} />
      )}
    </div>
  )
}

const TABS = [
  ['agenda', 'Agenda'],
  ['pagos', 'Pagos'],
  ['horarios', 'Horarios'],
  ['disciplinas', 'Disciplinas'],
  ['feriados', 'Feriados'],
  ['ajustes', 'Ajustes'],
]

function Shell({ email }) {
  return (
    <>
      {DEMO && <div className="a-demo">Modo demo: podés probar todo, pero nada se guarda al recargar. <Link to="/">← Volver al sitio</Link></div>}
      <header className="a-top">
        <Link to="/" title="Ver el sitio"><Brand /></Link>
        <nav className="a-tabs">
          {TABS.map(([to, label]) => (
            <NavLink key={to} to={to} className={({ isActive }) => (isActive ? 'is-active' : '')}>{label}</NavLink>
          ))}
        </nav>
        <span className="a-user">
          <span className="a-user__mail">{email}</span>
          <button className="a-link" onClick={() => auth.signOut()}>Salir</button>
        </span>
      </header>
      <main className="a-main">
        <Routes>
          <Route index element={<Navigate to="agenda" replace />} />
          <Route path="agenda" element={<Agenda />} />
          <Route path="pagos" element={<Pagos />} />
          <Route path="horarios" element={<Horarios />} />
          <Route path="disciplinas" element={<Disciplinas />} />
          <Route path="feriados" element={<Feriados />} />
          <Route path="ajustes" element={<Ajustes />} />
          <Route path="*" element={<Navigate to="agenda" replace />} />
        </Routes>
      </main>
    </>
  )
}

function Login() {
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  async function submit(e) {
    e.preventDefault()
    const { email, password } = Object.fromEntries(new FormData(e.currentTarget))
    setBusy(true)
    setError(null)
    try {
      await auth.signIn(email, password)
    } catch (err) {
      setError(err.message.includes('Invalid') ? 'Email o contraseña incorrectos.' : err.message)
      setBusy(false)
    }
  }

  async function reset(e) {
    const email = new FormData(e.currentTarget.closest('form')).get('email')
    if (!email) return setError('Escribí tu email y tocá de nuevo "Olvidé mi contraseña".')
    try {
      await auth.resetPassword(email)
      setResetSent(true)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="a-center">
      <form className="a-box a-login" onSubmit={submit}>
        <Brand big />
        {DEMO && <p className="a-note">Modo demo: entrá con cualquier email y contraseña.</p>}
        <label className="a-field"><span>Email</span><input name="email" type="email" required autoComplete="username" defaultValue={DEMO ? 'lizbeth@nube.com' : ''} /></label>
        <label className="a-field"><span>Contraseña</span><input name="password" type="password" required autoComplete="current-password" defaultValue={DEMO ? 'demo1234' : ''} /></label>
        {error && <p className="a-error">{error}</p>}
        {resetSent && <p className="a-ok">Te mandamos un email para crear una contraseña nueva.</p>}
        <button className="a-btn a-btn--main" disabled={busy}>{busy ? 'Entrando…' : 'Entrar'}</button>
        <button type="button" className="a-link" onClick={reset}>Olvidé mi contraseña</button>
      </form>
    </div>
  )
}

function SetPassword({ onDone }) {
  const [error, setError] = useState(null)
  async function submit(e) {
    e.preventDefault()
    const { password, repeat } = Object.fromEntries(new FormData(e.currentTarget))
    if (password.length < 8) return setError('Usá al menos 8 caracteres.')
    if (password !== repeat) return setError('Las dos contraseñas no coinciden.')
    try {
      await auth.updatePassword(password)
      window.history.replaceState(null, '', '/admin')
      onDone()
    } catch (err) {
      setError(err.message)
    }
  }
  return (
    <div className="a-center">
      <form className="a-box a-login" onSubmit={submit}>
        <Brand big />
        <h1>Elegí tu contraseña</h1>
        <label className="a-field"><span>Contraseña nueva</span><input name="password" type="password" required autoComplete="new-password" /></label>
        <label className="a-field"><span>Repetila</span><input name="repeat" type="password" required autoComplete="new-password" /></label>
        {error && <p className="a-error">{error}</p>}
        <button className="a-btn a-btn--main">Guardar</button>
      </form>
    </div>
  )
}
