import { useCallback, useEffect, useState } from 'react'
import api from '../lib/api'
import { money } from '../lib/dates'
import { ask, errText } from './util'

// Disciplinas: nombre, descripción, precio y duración
export default function Disciplinas() {
  const [rows, setRows] = useState(null)
  const [edit, setEdit] = useState(null)
  const [error, setError] = useState(null)

  const load = useCallback(() => api.disciplines.list().then(setRows).catch((e) => setError(errText(e))), [])
  useEffect(() => { load() }, [load])

  async function save(e) {
    e.preventDefault()
    const v = Object.fromEntries(new FormData(e.currentTarget))
    setError(null)
    const key = edit.key || v.name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    try {
      await api.disciplines.save({
        ...(edit.id ? { id: edit.id } : { key }),
        name: v.name.trim(),
        description: v.description.trim(),
        kind: v.kind,
        price: Number(v.price) || 0,
        minutes: Number(v.minutes),
        sort: Number(v.sort) || 0,
        active: v.active === 'on',
      })
      setEdit(null)
      load()
    } catch (err) {
      setError(errText(err))
    }
  }

  async function remove(d) {
    if (!ask(`¿Borrar ${d.name} y todos sus horarios?`)) return
    try {
      await api.disciplines.remove(d.id)
      setEdit(null)
      load()
    } catch (err) {
      setError(errText(err))
    }
  }

  return (
    <section>
      <div className="a-bar">
        <h1>Disciplinas</h1>
        <button className="a-btn a-btn--main" onClick={() => setEdit({ kind: 'group', minutes: 60, price: 0, active: true, sort: ((rows?.length ?? 0) + 1) * 10 })}>+ Nueva</button>
      </div>
      <p className="a-muted">El precio es por clase. Si ponés 0, la reserva queda confirmada sin pago (sirve para una clase de prueba gratis).</p>
      {error && <p className="a-error">{error}</p>}

      {edit && (
        <form className="a-box a-form" onSubmit={save} key={edit.id ?? 'new'}>
          <h2>{edit.id ? `Editar ${edit.name}` : 'Nueva disciplina'}</h2>
          <div className="a-grid">
            <label className="a-field a-span2"><span>Nombre</span><input name="name" required defaultValue={edit.name ?? ''} /></label>
            <label className="a-field"><span>Tipo</span>
              <select name="kind" defaultValue={edit.kind}><option value="group">Grupal</option><option value="individual">Individual</option></select></label>
            <label className="a-field"><span>Precio por clase ($)</span><input name="price" type="number" min="0" step="100" defaultValue={Number(edit.price)} /></label>
            <label className="a-field"><span>Duración (min)</span><input name="minutes" type="number" min="15" max="240" required defaultValue={edit.minutes} /></label>
            <label className="a-field"><span>Orden en el sitio</span><input name="sort" type="number" defaultValue={edit.sort} /></label>
            <label className="a-field a-span2"><span>Descripción (se ve en el sitio)</span><textarea name="description" rows={3} defaultValue={edit.description ?? ''} /></label>
          </div>
          <label className="a-check"><input type="checkbox" name="active" defaultChecked={edit.active} /> Visible en el sitio</label>
          <div className="a-actions">
            <button className="a-btn a-btn--main">Guardar</button>
            <button type="button" className="a-btn" onClick={() => setEdit(null)}>Cerrar</button>
            {edit.id && <button type="button" className="a-btn a-btn--danger" onClick={() => remove(edit)}>Borrar</button>}
          </div>
        </form>
      )}

      {!rows ? <p className="a-muted">Cargando…</p> : (
        <ul className="a-cards">
          {rows.map((d) => (
            <li key={d.id} className={`a-card${d.active ? '' : ' is-off'}`}>
              <div>
                <b>{d.name}</b>
                <small>{d.kind === 'individual' ? 'Individual' : 'Grupal'} · {d.minutes} min · {money(d.price)}{d.active ? '' : ' · oculta'}</small>
                <p>{d.description}</p>
              </div>
              <button className="a-btn" onClick={() => { setEdit(d); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>Editar</button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
