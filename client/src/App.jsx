import { useEffect, useState } from 'react';
import { api, getToken, setToken } from './api.js';
import AuthForm from './components/AuthForm.jsx';
import Dashboard from './components/Dashboard.jsx';

export default function App() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(!!getToken());

  // If a token is saved, confirm it is still valid.
  useEffect(() => {
    if (!getToken()) return;
    api('/auth/me')
      .then((d) => setUser(d.user))
      .catch(() => setToken(null))
      .finally(() => setChecking(false));
  }, []);

  const handleAuth = ({ token, user }) => { setToken(token); setUser(user); };
  const logout = () => { setToken(null); setUser(null); };

  if (checking) return <p className="center muted">Loading…</p>;
  return user ? <Dashboard user={user} onLogout={logout} /> : <AuthForm onAuth={handleAuth} />;
}
