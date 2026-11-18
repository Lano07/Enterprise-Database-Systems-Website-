import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import App from './App'

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)

// Development-only hooks for checking content and engines from the browser console.
if (import.meta.env.DEV) {
  import('./devtools').then((m) => m.install())
}
