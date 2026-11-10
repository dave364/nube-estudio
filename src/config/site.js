// Datos del estudio que se muestran en el sitio.
// Lo que dice "COMPLETAR" está pendiente de que lo confirme Lisbeth.
export const SITE = {
  name: 'Nube Estudio',
  tagline: 'Movimiento · Arte · Bienestar',
  intro: 'Un espacio en José Mármol para moverte, crear y sentirte bien: Pilates, danza y música en grupos reducidos.',
  // Número con código de país, sin espacios ni signos (para wa.me)
  whatsapp: '5491161084203',
  whatsappLabel: '11 6108-4203',
  instagram: 'nubestudiooo',
  // COMPLETAR: dirección exacta (calle y número). Mientras tanto se muestra la zona.
  address: 'José Mármol, Buenos Aires',
  mapQuery: 'José Mármol, Almirante Brown, Buenos Aires',
  // COMPLETAR: horario de atención general del estudio
  hours: 'Lunes a sábados · consultá los horarios de cada clase',
}

export const TIMEZONE = 'America/Argentina/Buenos_Aires'

// Ilustraciones del flyer para cada disciplina (por su "key")
import reformer from '../assets/clases/reformer.png'
import mat from '../assets/clases/mat.png'
import danza from '../assets/clases/danza.png'
import piano from '../assets/clases/piano.png'
import guitarra from '../assets/clases/guitarra.png'

export const ART = {
  'pilates-reformer': reformer,
  'pilates-mat': mat,
  danza,
  piano,
  guitarra,
}

export const waLink = (text = '') =>
  `https://wa.me/${SITE.whatsapp}${text ? `?text=${encodeURIComponent(text)}` : ''}`
