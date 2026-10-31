# Agent guidance

## Project

This repository contains `enjz-api`, a Node.js ES module REST API built with Express 5, Zod, and Prisma against PostgreSQL. The application entry point is `app.js`; API routes are mounted under `/api/v1`.

## Code organization

- Keep HTTP routing in `src/routes/`, request handling in `src/controllers/`, business rules in `src/services/`, and database access in `src/repositories/`.
- Define and update request schemas in `src/validation/`; use the validation middleware rather than duplicating input checks in route handlers.
- Put shared authentication, error handling, configuration, and utilities in their existing `src/middleware/`, `src/config/`, and `src/utils/` locations.
- Follow the existing JavaScript ES module style and naming conventions (`*.routes.js`, `*.controller.js`, `*.services.js`, `*.repository.js`).

## API and data changes

- Preserve the `/api/v1` route prefix and the current JSON response conventions when adding endpoints.
- Enforce authorization and role checks for protected operations. Do not trust client-supplied user or provider IDs when identity can be derived from the authenticated request.
- Keep database access in repositories and business decisions in services. Handle expected failures with the shared error utilities and middleware.
- For database model changes, update `prisma/schema.prisma` and create a migration using the project's Prisma workflow. Keep seed data in `prisma/seed.js` aligned when needed.
- Validate untrusted request data with Zod and avoid returning password hashes, secrets, or other sensitive fields.

## Configuration and commands

- Environment variables are validated in `src/config/env.js`. Local configuration should follow `.env.example` when present; never commit real credentials.
- Useful scripts from `package.json`:
  - `npm run dev` starts the API with Node watch mode.
  - `npm start` starts the API.
  - `npm test` runs Node's built-in test runner.
  - `npm run db:migrate`, `npm run db:deploy`, and `npm run db:seed` manage Prisma migrations and seed data.
- Run the checks relevant to a change when asked to verify it, and report any checks that could not run because required services or environment variables are unavailable.

## Working style

- Make focused changes that match nearby patterns; avoid unrelated refactors.
- Do not add dependencies unless the task needs them.
- Update documentation when an API contract, setup requirement, or developer workflow changes.
