const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const app = require('../src/app');

async function startServer(t) {
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(() => new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  }));
  return `http://127.0.0.1:${server.address().port}`;
}

test('GET / returns API status and client guidance', async (t) => {
  const response = await fetch(`${await startServer(t)}/`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    name: 'Sweety API',
    status: 'ok',
    message: 'The API is running. Open the client at http://localhost:5173.',
    health: '/api/health',
  });
});

test('protected API routes reject unauthenticated requests', async (t) => {
  const baseUrl = await startServer(t);

  for (const path of ['/api/auth/me', '/api/readings', '/api/readings/export', '/api/reports']) {
    const response = await fetch(`${baseUrl}${path}`);
    assert.equal(response.status, 401, `${path} should require authentication`);
    assert.deepEqual(await response.json(), { error: 'Please log in.' });
  }
});

test('reading export validates the custom date range', async (t) => {
  const baseUrl = await startServer(t);
  const previousSecret = process.env.JWT_SECRET;
  const secret = 'test-secret-for-reading-export';
  process.env.JWT_SECRET = secret;
  t.after(() => {
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  });
  const headers = { Authorization: `Bearer ${jwt.sign({ sub: 1 }, secret)}` };
  const cases = [
    ['/api/readings/export?from=bad&to=2026-10-15', 'Choose a valid start and end date for the export.'],
    ['/api/readings/export?from=2026-10-16&to=2026-10-15', 'Start date must be on or before end date.'],
  ];

  for (const [path, error] of cases) {
    const response = await fetch(`${baseUrl}${path}`, { headers });
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { error });
  }
});

test('registration validates input before accessing the database', async (t) => {
  const baseUrl = await startServer(t);
  const cases = [
    [{}, 'Please enter your name.'],
    [{ name: 'Test', email: 'not-an-email', password: 'long-enough' }, 'Please enter a valid email.'],
    [{ name: 'Test', email: 'test@example.com', password: 'short' }, 'Password must be at least 8 characters.'],
  ];

  for (const [body, error] of cases) {
    const response = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    assert.equal(response.status, 422);
    assert.deepEqual(await response.json(), { error });
  }
});
