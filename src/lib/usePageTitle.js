import { useEffect } from 'react'

export function usePageTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · Nube Estudio` : 'Nube Estudio · Pilates, danza y música en José Mármol'
  }, [title])
}
