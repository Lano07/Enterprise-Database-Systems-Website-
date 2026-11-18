import { useEffect, useState } from 'react'

/** Hash routes like #/realm/r4 → ['realm', 'r4']. Hash routing works on GitHub Pages with no server config. */
export function parseHash(h = location.hash) {
  const [path, query = ''] = h.replace(/^#\/?/, '').split('?')
  return { parts: path.split('/').filter(Boolean).map(decodeURIComponent), query: new URLSearchParams(query) }
}

export function useRoute() {
  const [r, setR] = useState(parseHash)
  useEffect(() => {
    const f = () => { setR(parseHash()); window.scrollTo(0, 0) }
    window.addEventListener('hashchange', f)
    return () => window.removeEventListener('hashchange', f)
  }, [])
  return r
}

export const go = (path: string) => { location.hash = path.startsWith('#') ? path : '#/' + path.replace(/^\//, '') }
