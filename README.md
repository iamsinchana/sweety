# Sweety – Blood Glucose Tracker

A small web app where a person with diabetes records up to 4 blood glucose readings a day
and sees daily, month-to-date and previous-month reports.

**Stack:** Node.js + Express API · PostgreSQL · React (Vite) · JWT auth · bcrypt (bcryptjs)

## Features

- Sign up / log in. Passwords are hashed with bcrypt. Every query is filtered by the logged-in user, so users only see their own data.
- Add, edit, delete readings (date, time slot, value in mg/dl).
- Validation on both client and server, with the exact messages from the brief.
- Reports: highest, lowest, average (1 decimal) and count, with a friendly empty state. The daily report lists each reading with its slot.
- Bonus included: pagination on `GET /api/readings`, and a `docker-compose.yml` for PostgreSQL.

## Prerequisites

Node.js 18+ and PostgreSQL 14+ (or Docker).

## Setup

```bash
# 1. Database (pick one)
docker compose up -d db          # easiest; matches .env.example
# or create your own database and edit DATABASE_URL below

# 2. Server
cd server
cp .env.example .env             # then set JWT_SECRET to a long random string
npm install
npm run db:migrate               # creates the tables
npm run db:seed                  # demo user + ~75 days of sample readings
npm run dev                      # API on http://localhost:4000

# 3. Client (new terminal)
cd client
npm install
npm run dev                      # app on http://localhost:5173
```

**Demo login:** `demo@sweety.test` / `Demo@1234`

## Tests

```bash
cd server && npm test
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
