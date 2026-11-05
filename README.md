# enjz API

REST API for the enjz home-services platform. It supports customer and provider
accounts, service discovery, bookings, reviews, and administrative moderation.

Built with Node.js 22 (ESM), Express 5, Prisma 7, PostgreSQL, Zod validation,
and JWT authentication. All endpoints are served under `/api/v1`.

## Prerequisites

- Node.js 22 or newer
- PostgreSQL 14 or newer
- npm 10 or newer

## Installation

```bash
git clone https://github.com/bish87/enjz-api.git
cd enjz-api
npm install
```

## Configuration

Create a local environment file and set the required values:

```bash
cp .env.example .env
```

Generate a secure JWT secret:

```bash
openssl rand -hex 32
```

### Environment variables

| Variable            | Required | Description                                                                        |
| ------------------- | -------- | ---------------------------------------------------------------------------------- |
| `NODE_ENV`          | No       | `development`, `test`, or `production` (default: `development`).                   |
| `PORT`              | No       | HTTP port (default: `3000`).                                                       |
| `LOG_LEVEL`         | No       | `fatal`, `error`, `warn`, `info`, `debug`, `trace`, or `silent` (default: `info`). |
| `DATABASE_URL`      | Yes      | PostgreSQL connection string.                                                      |
| `JWT_SECRET`        | Yes      | HS256 signing secret, at least 32 characters.                                      |
| `BCRYPT_ROUNDS`     | No       | bcrypt cost factor (default: `10`; tests use `4`).                                 |
| `CORS_ORIGINS`      | No       | Comma-separated list of allowed browser origins. Defaults to local Vite origins.   |
| `FRONTEND_URL`      | No       | Base URL used in password-reset emails (default: `http://localhost:5173`).         |
| `DOCS_ENABLED`      | No       | Serves Swagger UI at `/api/v1/docs` (default: `true`; set to `false` to disable).  |
| `RESEND_API_KEY`    | No       | Resend API key. If omitted, reset email delivery is disabled with a warning.       |
| `FROM_EMAIL`        | No       | Verified sender address for password-reset emails.                                 |
| `ADMIN_PHONE`       | Seed     | Admin phone used by `npm run db:seed`.                                             |
| `ADMIN_PASSWORD`    | Seed     | Admin password (minimum 8 characters) used by `npm run db:seed`.                   |
| `ADMIN_EMAIL`       | No       | Optional admin email address.                                                      |
| `TEST_DATABASE_URL` | No       | Overrides the database used by `npm test`.                                         |

In development, any `localhost`, `127.0.0.1`, or `[::1]` origin is accepted in
addition to `CORS_ORIGINS`. This allows the Vite dev server to switch ports
without breaking API requests. Production accepts only the origins listed in
`CORS_ORIGINS`.

## Usage

Apply migrations and start the development server:

```bash
npm run db:deploy
npm run dev
```

The API is available at `http://localhost:3000`. Verify it is running:

```bash
curl http://localhost:3000/api/v1/health
```

### API documentation

Swagger UI is served from `/api/v1/docs`, and the raw OpenAPI 3.1 description
from `/api/v1/openapi.json`:

- Local: <http://localhost:3000/api/v1/docs>
- Render: `https://<your-service>.onrender.com/api/v1/docs`

Set `DOCS_ENABLED=false` to disable both routes. The documentation is generated
from `docs/openapi.yaml`; validate changes with `npm run docs:lint`.

To seed the category and area catalog plus an admin account:

```bash
npm run db:seed
```

Seeding requires `ADMIN_PHONE` and `ADMIN_PASSWORD`; `ADMIN_EMAIL` is optional.
The seed is idempotent.

### Available scripts

| Script                 | Description                                  |
| ---------------------- | -------------------------------------------- |
| `npm start`            | Start the API in production mode             |
| `npm run dev`          | Start the API with file watching             |
| `npm run db:migrate`   | Create and apply a development migration     |
| `npm run db:deploy`    | Apply pending migrations (use in production) |
| `npm run db:seed`      | Seed catalog data and the admin account      |
| `npm run db:studio`    | Open Prisma Studio                           |
| `npm run db:reset`     | Reset the database (development only)        |
| `npm test`             | Run unit and integration tests               |
| `npm run docs:lint`    | Validate the OpenAPI description             |
| `npm run lint`         | Run ESLint                                   |
| `npm run format`       | Format the codebase with Prettier            |
| `npm run format:check` | Check formatting without modifying files     |

## API reference

- **Base URL:** `/api/v1`
- **Authentication:** `Authorization: Bearer <token>`
- **Content type:** `application/json`

In the tables below, `Public` means no token is required, and `Auth` means any
active user may access the endpoint. Role restrictions are noted explicitly.

### Health and authentication

| Method | Path                    | Access | Description                                                         |
| ------ | ----------------------- | ------ | ------------------------------------------------------------------- |
| GET    | `/health`               | Public | Returns `{status:"ok",db:"up"}`, or `503` when the database is down |
| POST   | `/auth/register`        | Public | Register a customer or provider                                     |
| POST   | `/auth/login`           | Public | Log in (lockout after 5 failures per phone + IP)                    |
| POST   | `/auth/forgot-password` | Public | Always returns `200`; emails a reset link when possible             |
| POST   | `/auth/reset-password`  | Public | Consume a reset token and set a new password                        |
| GET    | `/auth/me`              | Auth   | Return the current user                                             |
| POST   | `/auth/logout`          | Auth   | Revoke all sessions (increments `tokenVersion`)                     |
| POST   | `/auth/password`        | Auth   | Change the password and revoke all sessions                         |
| GET    | `/users/profile`        | Auth   | Read the current user's profile                                     |
| PATCH  | `/users/profile`        | Auth   | Update name or city                                                 |

### Catalog

| Method | Path              | Access | Description                          |
| ------ | ----------------- | ------ | ------------------------------------ |
| GET    | `/categories`     | Public | List categories                      |
| POST   | `/categories`     | Admin  | Create a category                    |
| POST   | `/categories/new` | Admin  | Legacy alias for creating a category |
| DELETE | `/categories/:id` | Admin  | Delete a category                    |
| GET    | `/areas`          | Public | List areas (`?state=`)               |
| POST   | `/areas`          | Admin  | Create an area                       |
| DELETE | `/areas/:id`      | Admin  | Delete an area                       |

### Providers

| Method | Path                       | Access   | Description                                          |
| ------ | -------------------------- | -------- | ---------------------------------------------------- |
| GET    | `/providers`               | Public   | Discover verified providers (filters and pagination) |
| GET    | `/providers/:id`           | Public   | Public provider profile                              |
| GET    | `/providers/:id/reviews`   | Public   | Paginated reviews; shows customer first name only    |
| GET    | `/providers/me`            | Provider | Own provider profile                                 |
| PUT    | `/providers/me`            | Provider | Update bio, experience, price, and availability      |
| PUT    | `/providers/me/categories` | Provider | Replace offered categories and prices                |
| PUT    | `/providers/me/areas`      | Provider | Replace served areas                                 |

### Bookings and reviews

| Method | Path                     | Access                      | Description                                             |
| ------ | ------------------------ | --------------------------- | ------------------------------------------------------- |
| POST   | `/bookings`              | Customer                    | Create a booking                                        |
| GET    | `/bookings/me`           | Customer / Provider         | List own bookings (`?status=&page=&limit=`)             |
| GET    | `/bookings/:id`          | Participant / Admin         | Booking detail; contact details shared after acceptance |
| PATCH  | `/bookings/:id/accept`   | Provider (assigned)         | Accept, optionally setting `agreedPrice`                |
| PATCH  | `/bookings/:id/decline`  | Provider (assigned)         | Decline with an optional reason                         |
| PATCH  | `/bookings/:id/complete` | Provider (assigned)         | Complete an accepted booking                            |
| PATCH  | `/bookings/:id/cancel`   | Customer / Provider / Admin | Cancel with an optional reason                          |
| POST   | `/bookings/:id/review`   | Customer (booking owner)    | Review a completed booking (one per booking)            |

### Administration

| Method | Path                                | Description                                 |
| ------ | ----------------------------------- | ------------------------------------------- |
| GET    | `/admin/providers?status=`          | List providers by verification status       |
| PATCH  | `/admin/providers/:id/verification` | Verify or reject a provider                 |
| GET    | `/admin/bookings`                   | List all bookings with contact details      |
| DELETE | `/admin/reviews/:id`                | Delete a review and recompute the rating    |
| POST   | `/admin/users/:id/reset-password`   | Reset a password for accounts without email |

## Authentication

- Authentication uses a phone number and password. Email is optional.
- Tokens are HS256 JWTs with a 7-day expiry. The payload includes the user ID,
  role, and `tokenVersion`.
- Every authenticated request compares the token version with the stored value.
  Logout, password changes, password resets, and admin resets increment the
  version and revoke all existing sessions.
- Five failed logins for the same phone and IP within 15 minutes return `429`
  for the remainder of that window. A successful login clears the counter.
- Password-reset tokens are random, stored as SHA-256 hashes, single-use, and
  expire after 30 minutes. `forgot-password` always returns `200` to prevent
  account enumeration.
- Refresh tokens are intentionally omitted. A short-lived access token plus
  refresh-token flow can be added later without changing the existing API.

## Testing

```bash
npm test
```

Set `TEST_DATABASE_URL` to use a specific test database. Otherwise, the
`pretest` script creates a local `enjz_test` database when necessary and applies
migrations with `prisma migrate deploy`.

```bash
TEST_DATABASE_URL=postgresql://user:password@localhost:5432/enjz_test npm test
```

Rate limiting is disabled when `NODE_ENV=test`; login lockout and all other
business rules remain active.

## Code quality

```bash
npm run lint
npm run format:check
npm run format
```

## Deployment

- Set `NODE_ENV=production`, a unique 32+ character `JWT_SECRET`, and a managed
  PostgreSQL `DATABASE_URL` with `sslmode=require`.
- Restrict `CORS_ORIGINS` to the real frontend origin(s), and set
  `FRONTEND_URL` to the public frontend URL.
- Set `RESEND_API_KEY` and a verified `FROM_EMAIL`. Otherwise, password-reset
  emails are skipped with a warning and only admin-assisted resets work.
- **Never run `npm run db:reset` or `npm run db:migrate` against production.**
  Apply schema changes with `npm run db:deploy` (`prisma migrate deploy`) from
  CI or a release step.
- Seed the admin account with `ADMIN_PHONE`, `ADMIN_PASSWORD`, and
  `ADMIN_EMAIL` (`npm run db:seed`), then rotate the password after first login.
- Build and run the Docker image:

  ```bash
  docker build -t enjz-api .
  docker run --env-file .env -p 3000:3000 enjz-api
  ```

  For migrations, build the migrate target and run it with `DATABASE_URL` set:

  ```bash
  docker build --target migrate -t enjz-api-migrate .
  docker run --env-file .env enjz-api-migrate
  ```

- The API trusts one reverse proxy (`trust proxy = 1`). Account for this if the
  deployment topology adds another proxy.
- Point a monitor at `/api/v1/health` and keep `LOG_LEVEL=info`. The
  authorization header and cookies are redacted, and the error middleware logs
  only 5xx responses.
- Interactive API documentation is available at `/api/v1/docs` after deploy.
  Keep `DOCS_ENABLED=true` unless you want to hide the docs in production.
- Expect `SIGTERM` and `SIGINT` to close the HTTP server and disconnect Prisma
  within 10 seconds.

## Project structure

```text
app.js                  Express app, middleware, and graceful shutdown
src/config/            Environment validation, Prisma, logger, Passport, CORS
src/routes/            Route definitions and role guards
src/controllers/       HTTP request and response handling
src/services/          Business rules, transactions, email, and lockout
src/repositories/      Prisma data access
src/validation/        Zod request schemas
src/middleware/        Authentication, validation, rate limits, and errors
docs/                  OpenAPI 3.1 description served by Swagger UI
prisma/                Schema, migrations, and seed
tests/                 Unit tests with the Node.js test runner and Supertest integration tests
```

## Contributing

1. Create a feature branch from `main`.
2. Make your changes and add or update tests where appropriate.
3. Run `npm test` and `npm run lint`.
4. Commit your changes and open a pull request.

## License

This project is licensed under the ISC License.
