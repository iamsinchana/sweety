import { useState } from 'react';
import { api } from '../api.js';

export default function AuthForm({ onAuth }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const isRegister = mode === 'register';
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      onAuth(await api(`/auth/${mode}`, { method: 'POST', body: form }));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth">
      <h1 className="brand">Sweety</h1>
      <p className="muted">Keep track of your blood glucose, one reading at a time.</p>
      <form className="panel" onSubmit={submit} noValidate>
        <h2>{isRegister ? 'Create your account' : 'Log in'}</h2>
        {isRegister && (
          <label>Name<input value={form.name} onChange={set('name')} autoComplete="name" /></label>
        )}
        <label>Email<input type="email" value={form.email} onChange={set('email')} autoComplete="email" /></label>
        <label>Password
          <span className="password-field">
            <input type={passwordVisible ? 'text' : 'password'} value={form.password} onChange={set('password')}
              autoComplete={isRegister ? 'new-password' : 'current-password'} />
            <button type="button" className="password-toggle"
              aria-label={passwordVisible ? 'Hide password' : 'Show password'}
              aria-pressed={passwordVisible}
              onClick={() => setPasswordVisible(!passwordVisible)}>
              {passwordVisible ? (
                <svg aria-hidden="true" viewBox="0 0 24 24">
                  <path d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8" />
                  <path d="M9.9 5.2A10.8 10.8 0 0112 5c5 0 8.5 4 9.5 7-.4 1.2-1.3 2.5-2.6 3.6M6.2 6.2C4.2 7.4 3 9.3 2.5 12c.5 1.4 1.8 3.3 4.2 4.6A10.7 10.7 0 0012 19c1.4 0 2.7-.3 3.8-.8" />
                </svg>
              ) : (
                <svg aria-hidden="true" viewBox="0 0 24 24">
                  <path d="M2.5 12C3.5 9 7 5 12 5s8.5 4 9.5 7c-1 3-4.5 7-9.5 7s-8.5-4-9.5-7z" />
                  <circle cx="12" cy="12" r="2.5" />
                </svg>
              )}
            </button>
          </span>
        </label>
        {error && <p className="error" role="alert">{error}</p>}
        <button className="primary" disabled={busy}>{isRegister ? 'Sign up' : 'Log in'}</button>
        <button type="button" className="link" onClick={() => { setMode(isRegister ? 'login' : 'register'); setError(''); setPasswordVisible(false); }}>
          {isRegister ? 'I already have an account' : 'Create an account'}
        </button>
      </form>
    </main>
  );
}
