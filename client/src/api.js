const BASE = `${import.meta.env.VITE_API_URL || ''}/api`;
const TOKEN_KEY = 'sweety_token';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => (t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY));

/** Calls the API and throws an Error with the server's message on failure. */
export async function api(path, { method = 'GET', body } = {}) {
  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(getToken() && { Authorization: `Bearer ${getToken()}` }),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('Cannot reach the server. Check that it is running.');
  }
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || 'Something went wrong. Please try again.');
    err.status = res.status;
    throw err;
  }
  return data;
}

export async function downloadReadingsCsv(from, to) {
  let res;
  try {
    res = await fetch(`${BASE}/readings/export?${new URLSearchParams({ from, to })}`, {
      headers: getToken() ? { Authorization: `Bearer ${getToken()}` } : {},
    });
  } catch {
    throw new Error('Cannot reach the server. Check that it is running.');
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const err = new Error(data.error || 'Could not download readings. Please try again.');
    err.status = res.status;
    throw err;
  }

  const url = URL.createObjectURL(await res.blob());
  const link = document.createElement('a');
  link.href = url;
  link.download = `sweety-readings-${from}-to-${to}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
