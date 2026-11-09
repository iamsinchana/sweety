import { useState } from 'react';
import { api } from '../api.js';

export default function AuthForm({ onAuth }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
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
          <input type="password" value={form.password} onChange={set('password')}
            autoComplete={isRegister ? 'new-password' : 'current-password'} />
        </label>
        {error && <p className="error" role="alert">{error}</p>}
        <button className="primary" disabled={busy}>{isRegister ? 'Sign up' : 'Log in'}</button>
        <button type="button" className="link" onClick={() => { setMode(isRegister ? 'login' : 'register'); setError(''); }}>
          {isRegister ? 'I already have an account' : 'Create an account'}
        </button>
      </form>
    </main>
  );
}
