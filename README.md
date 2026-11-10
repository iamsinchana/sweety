# Sweety – Blood Glucose Tracker

A small web app where a person with diabetes records up to 4 blood glucose readings a day
and sees daily, month-to-date and previous-month reports.

**Stack:** PERN (PostgreSQL · Express · React · Node.js) · JWT auth · bcrypt (bcryptjs)

## Features

- Sign up / log in. Passwords are hashed with bcrypt. Every query is filtered by the logged-in user, so users only see their own data.
- Add, edit, delete readings (date, time slot, value in mg/dl).
- Validation on both client and server, with the exact messages from the brief.
- Reports: highest, lowest, average (1 decimal) and count, with a friendly empty state. The daily report lists each reading with its slot.
- Download readings as CSV for a custom inclusive date range.
- Bonus included: pagination on `GET /api/readings`, and a `docker-compose.yml` for PostgreSQL.

## Prerequisites

Node.js 18+ and PostgreSQL 14+ (or Docker Desktop). The Docker Compose setup maps PostgreSQL to port `5433` so it can run alongside a local PostgreSQL server already using `5432`.

## Setup

Open PowerShell in the project folder.

1. Start PostgreSQL:

   ```powershell
   docker compose up -d db
   ```

   If you use your own PostgreSQL server instead, create a database and update `DATABASE_URL` below.

2. Create and configure the server environment file:

   ```powershell
   Copy-Item server\.env.example server\.env
   notepad server\.env
   ```

   In `server\.env`, replace `JWT_SECRET` with a long random value. Generate one with:

   ```powershell
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

   Set `DATABASE_URL` to `postgres://sweety:sweety@localhost:5433/sweety` for the supplied Docker setup. Keep the generated secret private; do not commit `.env`.

   If a real secret was ever committed, rotate it wherever it is used. Replacing it in `.env.example` does not remove it from Git history.

3. Install and start the API:

   ```powershell
   Set-Location server
   npm install
   npm run db:migrate
   npm run db:seed
   npm run dev
   ```

   Keep this terminal open. The API listens at `http://localhost:4000`.

4. In a second PowerShell window, open the project folder and start the client:

   ```powershell
   Set-Location client
   npm install
   npm run dev
   ```

   Open `http://localhost:5173`.

**Demo login:** `demo@sweety.test` / `Demo@1234`

## Tests

```powershell
Set-Location server
npm test
```

The tests use Node's built-in test runner (no extra dependencies). They cover every
validation rule, the report date ranges (including January and leap-year February),
the statistics and the timezone handling.

## Environment variables

| File | Variable | Purpose |
|---|---|---|
| `server/.env` | `PORT` | API port (default 4000) |
| | `DATABASE_URL` | PostgreSQL connection string |
| | `JWT_SECRET` | Secret used to sign login tokens (required) |
| | `JWT_EXPIRES_IN` | Token lifetime, e.g. `7d` |
| | `APP_TIMEZONE` | Timezone that decides what "today" is (default `Asia/Kolkata`) |
| | `CLIENT_ORIGIN` | Allowed CORS origin |
| `client/.env` | `VITE_API_URL` | Optional. Empty in development (Vite proxies `/api`) |

## API

| Method | Path | Notes |
|---|---|---|
| POST | `/api/auth/register` | `{ name, email, password }` (password ≥ 8 chars) |
| POST | `/api/auth/login` | `{ email, password }` → `{ token, user }` |
| GET | `/api/auth/me` | Current user |
| GET | `/api/readings` | `?date=`, `?from=&to=`, `?page=1&limit=20` → `{ data, page, limit, total }` |
| GET | `/api/readings/export` | `?from=YYYY-MM-DD&to=YYYY-MM-DD` → CSV download for the logged-in user |
| POST | `/api/readings` | `{ reading_date, slot, value }` |
| PUT | `/api/readings/:id` | Same body |
| DELETE | `/api/readings/:id` | |
| GET | `/api/reports?date=YYYY-MM-DD` | Daily, month-to-date and previous-month reports |

Slots: `morning`, `after_breakfast`, `after_lunch`, `after_dinner`.
Validation errors return `422`, rule conflicts (duplicate slot, 4 per day) return `409`, both as `{ "error": "message" }`.

## Project layout

```
server/
  db/schema.sql          tables and constraints
  src/lib/               pure, tested logic: validation, dates, stats
  src/routes/            auth, readings, reports
  src/seed.js            demo data
  tests/
client/src/
  components/            AuthForm, Dashboard, ReadingForm, Reports
```

## Screenshots

These screenshots show the sign-up and sign-in forms and the dashboard populated by the demo seed data.

### Sign up

![Sweety sign-up screen](docs/screenshots/01-sign-up.png)

### Sign in

![Sweety sign-in screen](docs/screenshots/02-sign-in.png)

### Dashboard, reports, and CSV export

![Sweety dashboard with glucose reports and custom-range CSV export](docs/screenshots/03-dashboard-reports-export.png)

## Notes

**Assumptions**
- "Today" is calculated in `APP_TIMEZONE` (default India) so a reading at 1 a.m. is not rejected as "future" because of UTC. The client uses the browser's local date for the date picker.
- Reports can't be run for a future date (same message as the form).
- The previous-month report is the whole calendar month before the selected date's month, regardless of which day is selected.
- Average is rounded to 1 decimal; ranges are inclusive.
- "Whole number" means an integer; `99.5` is rejected.
- Email is lower-cased; login errors don't reveal whether the email exists.
- Editing may change a reading's slot or date; the duplicate-slot rule is re-checked excluding the reading itself.
- With four fixed slots and one reading per slot, the "maximum 4 per day" rule can only trigger after the duplicate-slot rule would. It is still enforced explicitly in `assertNoConflicts`, in case slots are added later.
- The duplicate and max-4 checks run in a transaction with a per-user advisory lock, and a `UNIQUE (user_id, reading_date, slot)` constraint is the final safety net against double clicks / concurrent requests.

**What I would improve with more time**
- API integration tests (supertest against a test database) and React Testing Library tests for the reading form.
- Store the token in an httpOnly cookie instead of `localStorage`; add rate limiting on login and refresh tokens.
- A line chart of the month's readings, and highlighting of out-of-range values.
- Proper migrations tool (e.g. node-pg-migrate) instead of one `schema.sql`.
- Dockerfiles for the API and client so `docker compose up` runs everything.
- Accessibility pass (focus management after save, announcing errors) and a nicer delete confirmation than `window.confirm`.
