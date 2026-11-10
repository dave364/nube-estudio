// Íconos de línea fina, en el estilo del flyer
const S = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' }

export const Cloud = (p) => (
  <svg viewBox="0 0 120 70" aria-hidden="true" {...p}>
    <path fill="currentColor" d="M28 66h66a24 24 0 0 0 3-47.8A32 32 0 0 0 36.4 14 25 25 0 0 0 28 66Z" />
  </svg>
)
export const CloudLine = (p) => (
  <svg viewBox="0 0 48 30" aria-hidden="true" {...p}>
    <path {...S} d="M12 27h24a8 8 0 0 0 1-15.9A11 11 0 0 0 15.3 9 8.6 8.6 0 0 0 12 27Z" />
  </svg>
)
export const Spark = (p) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...p}>
    <path fill="currentColor" d="M12 0c.8 6.6 5.4 11.2 12 12-6.6.8-11.2 5.4-12 12-.8-6.6-5.4-11.2-12-12C6.6 11.2 11.2 6.6 12 0Z" />
  </svg>
)
export const WhatsApp = (p) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...p}>
    <path fill="currentColor" d="M12 2a9.9 9.9 0 0 0-8.5 15l-1.3 4.8 4.9-1.3A10 10 0 1 0 12 2Zm0 18.2c-1.5 0-3-.4-4.3-1.2l-.3-.2-2.9.8.8-2.8-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.8-1.3.1-.2 0-.3 0-.5l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2c0 1.3.9 2.5 1 2.7.1.2 1.8 2.8 4.4 3.9 1.6.7 2.3.8 3.1.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3Z" />
  </svg>
)
export const Instagram = (p) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...p}>
    <rect x="3" y="3" width="18" height="18" rx="5" {...S} /><circle cx="12" cy="12" r="4" {...S} /><circle cx="17.3" cy="6.7" r=".9" fill="currentColor" />
  </svg>
)
export const Pin = (p) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...p}><path {...S} d="M12 21s7-6.1 7-11.5a7 7 0 1 0-14 0C5 14.9 12 21 12 21Z" /><circle cx="12" cy="9.5" r="2.5" {...S} /></svg>
)
export const Clock = (p) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...p}><circle cx="12" cy="12" r="9" {...S} /><path {...S} d="M12 7v5l3 2" /></svg>
)
export const Check = (p) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...p}><path {...S} strokeWidth="2" d="m5 12.5 4.5 4.5L19 7.5" /></svg>
)
export const Menu = (p) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...p}><path {...S} d="M4 7h16M4 12h16M4 17h16" /></svg>
)
export const Close = (p) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...p}><path {...S} d="M6 6l12 12M18 6 6 18" /></svg>
)
export const Calendar = (p) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...p}><rect x="3.5" y="5" width="17" height="15" rx="3" {...S} /><path {...S} d="M3.5 10h17M8 3v4M16 3v4" /></svg>
)
