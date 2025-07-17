import React, { useState } from 'react'

type Props = {
  settings: any
  setSettings: (s: any) => void
  setAuthed: (b: boolean) => void
}

export default function AuthDialog({ settings, setSettings, setAuthed }: Props) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [mode, setMode] = useState(settings.password ? 'login' : 'setup')
  const [start, setStart] = useState(settings.timeSlot?.start || '')
  const [end, setEnd] = useState(settings.timeSlot?.end || '')

  const handleLogin = () => {
    if (password === settings.password) {
      setAuthed(true)
    } else {
      setError('密碼錯誤')
    }
  }

  const handleSetup = () => {
    if (!password) return setError('請設置密碼')
    setSettings({
      ...settings,
      password,
      timeSlot: { start, end }
    })
    setAuthed(true)
  }

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      background: '#fff', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }}>
      <h2>{mode === 'login' ? '請輸入密碼' : '設置密碼與使用時段'}</h2>
      <input
        type="password"
        placeholder="密碼"
        value={password}
        onChange={e => setPassword(e.target.value)}
        style={{ fontSize: 18, margin: 8 }}
      />
      {mode === 'setup' && (
        <>
          <div>
            <label>允許開始時間: </label>
            <input type="datetime-local" value={start} onChange={e => setStart(e.target.value)} />
          </div>
          <div>
            <label>允許結束時間: </label>
            <input type="datetime-local" value={end} onChange={e => setEnd(e.target.value)} />
          </div>
        </>
      )}
      <button onClick={mode === 'login' ? handleLogin : handleSetup} style={{ fontSize: 18, margin: 8 }}>
        {mode === 'login' ? '登入' : '設置'}
      </button>
      {mode === 'login' && (
        <button onClick={() => setMode('setup')} style={{ fontSize: 14 }}>重設密碼/時段</button>
      )}
      {error && <div style={{ color: 'red' }}>{error}</div>}
    </div>
  )
}