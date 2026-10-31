# enjz-api

REST API for the enjz home-services platform. Node.js 22 (ESM), Express 5,
Prisma 7 + PostgreSQL, Zod validation and JWT authentication.

All API routes are mounted under `/api/v1`.

## Requirements

- Node.js 22+
- PostgreSQL 14+
- npm 10+

## Local setup

```bash
cp .env.example .env
# Fill in DATABASE_URL and JWT_SECRET (openssl rand -hex 32)
npm install
npm run db:deploy        # apply migrations
npm run db:seed          # optional: categories, areas and admin user
npm run dev              # http://localhost:3000
```

`npm run db:seed` requires `ADMIN_PHONE` and `ADMIN_PASSWORD`; `ADMIN_EMAIL` is
optional. Seeding is idempotent and also upserts the category/area catalog.

### Tests

```bash
npm test
```

Tests use `TEST_DATABASE_URL` when set, otherwise
`postgresql://bish:0000@localhost:5432/enjz_test`. The `pretest` script creates
the test database when needed and applies migrations with `prisma migrate
deploy`. Rate limiting is disabled when `NODE_ENV=test`; login lockout and all
other business rules remain active.

### Quality checks

```bash
npm run lint
npm run format:check
npm run format
```

## Environment variables

| Variable            | Required | Description                                                                 |
| ------------------- | -------- | --------------------------------------------------------------------------- |
| `NODE_ENV`          | no       | `development`, `test` or `production` (default `development`).              |
| `PORT`              | no       | HTTP port (default `3000`).                                                 |
| `LOG_LEVEL`         | no       | `fatal`…`silent` (default `info`; tests are silent).                        |
| `DATABASE_URL`      | yes      | PostgreSQL connection string.                                               |
| `JWT_SECRET`        | yes      | HS256 signing secret, at least 32 characters.                               |
| `BCRYPT_ROUNDS`     | no       | bcrypt cost factor (default `10`, tests use `4`).                           |
| `CORS_ORIGINS`      | no       | Comma-separated allowed browser origins. Defaults to local Vite origins.    |
| `FRONTEND_URL`      | no       | Base URL used in password-reset emails (default `http://localhost:5173`).   |
| `RESEND_API_KEY`    | no       | Resend API key. Missing value disables reset email delivery with a warning. |
| `FROM_EMAIL`        | no       | Verified sender address for reset emails.                                   |
| `ADMIN_PHONE`       | seed     | Admin phone used by `npm run db:seed`.                                      |
| `ADMIN_PASSWORD`    | seed     | Admin password (min 8 chars) used by `npm run db:seed`.                     |
| `ADMIN_EMAIL`       | no       | Optional admin email.                                                       |
| `TEST_DATABASE_URL` | no       | Overrides the database used by `npm test`.                                  |

## Endpoints

`Public` = no token. `Auth` = any active user. Role names are shown where an
endpoint is restricted.

### Health and auth

| Method | Path                           | Access | Purpose                                           |
| ------ | ------------------------------ | ------ | ------------------------------------------------- |
| GET    | `/api/v1/health`               | Public | `{status:"ok",db:"up"}`, or `503` when DB is down |
| POST   | `/api/v1/auth/register`        | Public | Register customer or provider                     |
| POST   | `/api/v1/auth/login`           | Public | Login (lockout after 5 failures per phone+IP)     |
| POST   | `/api/v1/auth/forgot-password` | Public | Always `200`; emails a reset link when possible   |
| POST   | `/api/v1/auth/reset-password`  | Public | Consume reset token and set a new password        |
| GET    | `/api/v1/auth/me`              | Auth   | Current user                                      |
| POST   | `/api/v1/auth/logout`          | Auth   | Revoke all sessions (bumps `tokenVersion`)        |
| POST   | `/api/v1/auth/password`        | Auth   | Change password and revoke all sessions           |
| GET    | `/api/v1/users/profile`        | Auth   | Read own profile                                  |
| PATCH  | `/api/v1/users/profile`        | Auth   | Update name/city                                  |

### Catalog

| Method | Path                     | Access | Purpose                          |
| ------ | ------------------------ | ------ | -------------------------------- |
| GET    | `/api/v1/categories`     | Public | List categories                  |
| POST   | `/api/v1/categories`     | Admin  | Create category                  |
| POST   | `/api/v1/categories/new` | Admin  | Legacy alias for create category |
| DELETE | `/api/v1/categories/:id` | Admin  | Delete category                  |
| GET    | `/api/v1/areas`          | Public | List areas (`?state=`)           |
| POST   | `/api/v1/areas`          | Admin  | Create area                      |
| DELETE | `/api/v1/areas/:id`      | Admin  | Delete area                      |

### Providers

| Method | Path                              | Access   | Purpose                                       |
| ------ | --------------------------------- | -------- | --------------------------------------------- |
| GET    | `/api/v1/providers`               | Public   | Discover verified providers (filters + pages) |
| GET    | `/api/v1/providers/:id`           | Public   | Public provider profile                       |
| GET    | `/api/v1/providers/:id/reviews`   | Public   | Paginated reviews, customer first name only   |
| GET    | `/api/v1/providers/me`            | Provider | Own provider profile                          |
| PUT    | `/api/v1/providers/me`            | Provider | Update bio/experience/price/availability      |
| PUT    | `/api/v1/providers/me/categories` | Provider | Replace offered categories and prices         |
| PUT    | `/api/v1/providers/me/areas`      | Provider | Replace served areas                          |

### Bookings and reviews

| Method | Path                            | Access                   | Purpose                                      |
| ------ | ------------------------------- | ------------------------ | -------------------------------------------- |
| POST   | `/api/v1/bookings`              | Customer                 | Create booking                               |
| GET    | `/api/v1/bookings/me`           | Customer/Provider        | List own bookings (`?status=&page=&limit=`)  |
| GET    | `/api/v1/bookings/:id`          | Participant/Admin        | Booking detail; contacts after acceptance    |
| PATCH  | `/api/v1/bookings/:id/accept`   | Provider (assigned)      | Accept, optionally set `agreedPrice`         |
| PATCH  | `/api/v1/bookings/:id/decline`  | Provider (assigned)      | Decline with optional reason                 |
| PATCH  | `/api/v1/bookings/:id/complete` | Provider (assigned)      | Complete an accepted booking                 |
| PATCH  | `/api/v1/bookings/:id/cancel`   | Customer/Provider/Admin  | Cancel with optional reason                  |
| POST   | `/api/v1/bookings/:id/review`   | Customer (booking owner) | Review a completed booking (one per booking) |

### Admin

| Method | Path                                       | Purpose                                   |
| ------ | ------------------------------------------ | ----------------------------------------- |
| GET    | `/api/v1/admin/providers?status=`          | List providers by verification status     |
| PATCH  | `/api/v1/admin/providers/:id/verification` | Verify/reject a provider                  |
| GET    | `/api/v1/admin/bookings`                   | List all bookings with contact details    |
| DELETE | `/api/v1/admin/reviews/:id`                | Delete a review and recompute the rating  |
| POST   | `/api/v1/admin/users/:id/reset-password`   | Reset a password (accounts without email) |

## Auth model (v1)

- Phone + password only. Email is optional.
- HS256 JWT, 7-day expiry, payload includes the user id, role and `tokenVersion`.
- Every authenticated request compares the token version with the stored value.
  Logout, password change, password reset and admin reset all bump the version,
  revoking every existing session.
- Five failed logins for the same phone + IP within 15 minutes return `429` for
  the remainder of that window. Successful login clears the counter.
- Password reset tokens are random, stored as SHA-256 hashes, single-use and
  expire after 30 minutes. `forgot-password` always returns `200` to avoid
  account enumeration.
- No refresh tokens: simplicity and zero infrastructure cost. A short-lived
  access + refresh-token design can be added later without changing the API
  surface.

## Production checklist

- [ ] Set `NODE_ENV=production`, a unique 32+ character `JWT_SECRET`, and a
      Neon `DATABASE_URL` with `sslmode=require`.
- [ ] Restrict `CORS_ORIGINS` to the real frontend origin(s), and set
      `FRONTEND_URL` to the public frontend URL.
- [ ] Set `RESEND_API_KEY` and a verified `FROM_EMAIL`; otherwise password-reset
      emails are skipped (with a warning) and only admin-assisted resets work.
- [ ] **Never run `npm run db:reset` or `npm run db:migrate` against
      production.** Apply schema changes with `npm run db:deploy`
      (`prisma migrate deploy`) from CI or a release/pre-deploy step.
- [ ] Seed the admin account with `ADMIN_PHONE`, `ADMIN_PASSWORD` and
      `ADMIN_EMAIL` (`npm run db:seed`); rotate the password after first login.
- [ ] Render free tier: build `npm ci`, release `npm run db:deploy`, start
      `npm start`, health check path `/api/v1/health`.
- [ ] Docker: `docker build -t enjz-api .` for the app image. For migrations,
      `docker build --target migrate -t enjz-api-migrate .` then run it with
      `DATABASE_URL` set.
- [ ] The API trusts one reverse proxy (`trust proxy = 1`). Keep that in mind if
      the deployment topology adds another proxy.
- [ ] Point UptimeRobot (or another free monitor) at `/api/v1/health`.
- [ ] Keep `LOG_LEVEL=info`; the authorization header and cookies are redacted.
      Error middleware logs only 5xx responses.
- [ ] Expect `SIGTERM`/`SIGINT` to close the HTTP server and disconnect Prisma
      within 10 seconds (Render sends `SIGTERM` on deploy/restart).

## Project layout

```
app.js                     Express app, middleware, graceful shutdown
src/config/                env validation, Prisma, logger, passport
src/routes/                route definitions and role guards
src/controllers/           HTTP request/response handling
src/services/              business rules, transactions, email, lockout
src/repositories/          Prisma data access
src/validation/            Zod request schemas
src/middleware/            auth, validation, rate limits, errors
prisma/                    schema, migrations, seed
tests/                     node:test unit + supertest integration tests
```
