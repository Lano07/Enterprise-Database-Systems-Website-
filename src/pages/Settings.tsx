import { useState } from 'react'
import { exportSave, importSave, resetSave, setName, setSettings, useSave } from '../game/store'

export function Settings() {
  const s = useSave()
  const [msg, setMsg] = useState('')
  const [confirm, setConfirm] = useState(false)
  const download = () => {
    const blob = new Blob([exportSave()], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `dbquest-save-${new Date().toLocaleDateString('en-CA')}.json`
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  }
  const upload = (f: File) => {
    f.text().then((t) => { try { importSave(t); setMsg('Save restored.') } catch (e) { setMsg(e instanceof Error ? e.message : 'Could not read that file.') } })
  }
  return (
    <div className="page narrow">
      <div className="crumbs"><a href="#/">Map</a><span>›</span><span>Settings</span></div>
      <h1 className="title">Settings and your data</h1>

      <div className="sec-h"><h2>Profile</h2></div>
      <div className="card"><label className="row">Architect name <input type="text" value={s.name} onChange={(e) => setName(e.target.value)} placeholder="optional" /></label></div>

      <div className="sec-h"><h2>Gameplay</h2></div>
      <div className="card" style={{ display: 'grid', gap: 12 }}>
        <label className="row" style={{ alignItems: 'flex-start' }}>
          <input type="checkbox" checked={s.settings.freeRoam} onChange={(e) => setSettings({ freeRoam: e.target.checked })} style={{ marginTop: 5 }} />
          <span><b>Free Roam (exam mode)</b><br /><span className="small muted">Unlock every realm and boss immediately. Recommended once you are revising for the final.</span></span>
        </label>
        <label className="row">
          Final exam date <input type="date" value={s.settings.examDate} onChange={(e) => setSettings({ examDate: e.target.value })} />
          <span className="small muted">Shows a countdown on the map.</span>
        </label>
      </div>

      <div className="sec-h"><h2>Appearance</h2></div>
      <div className="card" style={{ display: 'grid', gap: 12 }}>
        <label className="row">Theme
          <select value={s.settings.theme} onChange={(e) => setSettings({ theme: e.target.value as 'auto' | 'light' | 'dark' })}>
            <option value="auto">Match my device</option><option value="light">Light</option><option value="dark">Dark</option>
          </select>
        </label>
        <label className="row"><input type="checkbox" checked={s.settings.motion} onChange={(e) => setSettings({ motion: e.target.checked })} /> Animations and confetti</label>
      </div>

      <div className="sec-h"><h2>Backups</h2></div>
      <div className="card">
        <p>Your progress lives only in this browser. Download a backup to move it to another device or protect it from cleared site data.</p>
        <div className="row">
          <button className="btn primary" onClick={download}>Download save file</button>
          <label className="btn">Restore from file<input type="file" accept="application/json,.json" hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} /></label>
          {msg && <span className="small">{msg}</span>}
        </div>
      </div>

      <div className="sec-h"><h2>Start again</h2></div>
      <div className="card">
        {!confirm ? <button className="btn danger" onClick={() => setConfirm(true)}>Reset all progress…</button> : (
          <div className="row"><span>This permanently erases XP, lessons, badges and history in this browser. Continue?</span>
            <button className="btn danger" onClick={() => { resetSave(); setConfirm(false); setMsg('Progress reset.') }}>Yes, reset</button>
            <button className="btn" onClick={() => setConfirm(false)}>Cancel</button></div>
        )}
      </div>
    </div>
  )
}
