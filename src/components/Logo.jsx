import { Link } from 'react-router-dom'

// Logo tipográfico: NUBE / — estudio —
export default function Logo({ big = false, to = '/', as }) {
  const inner = (
    <>
      <span className="logo__nube">NUBE</span>
      <span className="logo__est">estudio</span>
    </>
  )
  if (as === 'div') return <div className={`logo${big ? ' logo--big' : ''}`} aria-label="Nube Estudio">{inner}</div>
  return <Link to={to} className={`logo${big ? ' logo--big' : ''}`} aria-label="Nube Estudio, inicio">{inner}</Link>
}
