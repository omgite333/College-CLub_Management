# College Club Management System — Backend

REST API for the College Club Management System MVP.

- **Stack:** Node.js + Express 4 + TypeScript + Prisma + PostgreSQL (Neon)
- **Auth:** JWT (jsonwebtoken) + bcryptjs password hashing
- **Validation:** zod
- All write bodies are validated with zod; all errors return `{ error: "..." }`.
- `passwordHash` is never returned in any response.
- Bookings are **confirmed immediately** on creation — no approval step.
- Overlapping bookings for the same classroom are rejected with `409`.

## Prerequisites

- Node.js 18+
- A free PostgreSQL database. The project is built for **Neon**: sign up at
  https://neon.tech, create a project, and copy the connection string
  (keep `?sslmode=require`).

## Setup

```bash
# 1. Copy env template and fill in your Neon connection string + a JWT secret
cp .env.example .env

# 2. Install dependencies
npm install

# 3. Generate the Prisma client and create the database tables
npx prisma migrate dev --name init

# 4. Seed demo data (users, clubs, classrooms, bookings)
npm run seed

# 5. Run the dev server
npm run dev   # http://localhost:5000
```

Generate a strong JWT secret with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Demo credentials

| Role        | Email                   | Password    |
|-------------|-------------------------|-------------|
| SUPER_ADMIN | superadmin@college.edu  | Super@123   |
| CLUB_ADMIN  | clubadmin@college.edu   | Club@123    |
| STUDENT     | student@college.edu     | Student@123 |

## Endpoints

All routes are under `/api`. Authenticated routes use
`Authorization: Bearer <token>`.

| Method | Path                              | Auth               | Description                                              |
|--------|-----------------------------------|--------------------|----------------------------------------------------------|
| GET    | /api/health                       | —                  | `{ ok: true }`                                           |
| POST   | /api/auth/register                | —                  | Register as STUDENT → 201 `{ token, user }`              |
| POST   | /api/auth/login                   | —                  | Login → 200 `{ token, user }`                            |
| GET    | /api/auth/me                      | user               | Current user + memberships                               |
| GET    | /api/users?search=                | SUPER_ADMIN        | All users with memberships                               |
| PATCH  | /api/users/:id/role               | SUPER_ADMIN        | Grant/revoke CLUB_ADMIN (`{role, clubId?}`)              |
| GET    | /api/clubs                        | user               | Clubs with member counts                                 |
| POST   | /api/clubs                        | SUPER_ADMIN        | Create a club                                            |
| GET    | /api/clubs/:id                    | user               | Club + members + upcoming bookings                       |
| PATCH  | /api/clubs/:id                    | club admin+        | Edit club info (own clubs only)                          |
| POST   | /api/clubs/:id/members            | club admin+        | Add member (`{email\|userId, role}`)                      |
| DELETE | /api/clubs/:id/members/:memberId  | club admin+        | Remove member (club admins can't remove admins)          |
| GET    | /api/classrooms                   | user               | All classrooms ordered by building/floor/name            |
| GET    | /api/classrooms/:id               | user               | Classroom + upcoming bookings                            |
| POST   | /api/classrooms                   | SUPER_ADMIN        | Create a classroom                                       |
| PATCH  | /api/classrooms/:id               | SUPER_ADMIN        | Update a classroom                                       |
| GET    | /api/bookings                     | user               | Filters: `clubId classroomId from to upcoming=true includeCancelled=false` |
| POST   | /api/bookings                     | club admin+        | Create booking (409 on time overlap)                     |
| PATCH  | /api/bookings/:id                 | club admin+        | Edit booking (re-checks overlap)                         |
| DELETE | /api/bookings/:id                 | club admin+        | Cancel booking (sets `CANCELLED`)                        |

"club admin+" means: SUPER_ADMIN, or a CLUB_ADMIN member of the relevant club.
