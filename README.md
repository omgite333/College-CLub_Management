# College Club Management System — MVP

Full-stack MVP for managing college clubs, classrooms, and room bookings.

- **Backend** — Node.js + Express + TypeScript + Prisma + Neon PostgreSQL (`backend/`)
- **Frontend** — React 18 + TypeScript + Vite + Tailwind CSS v4 (`frontend/`)

## Features

- **Roles:** `STUDENT`, `CLUB_ADMIN`, `SUPER_ADMIN` (JWT login)
- **Students:** view clubs, classrooms, bookings, week calendar, interactive college map with live FREE/OCCUPIED room status
- **Club Admins:** edit their club info, manage members, create/edit/cancel bookings — bookings confirm **immediately**, no approval needed; can only touch clubs they administer (403 otherwise)
- **Super Admin:** access-management page to grant/revoke `CLUB_ADMIN` to students
- **Booking safety:** the API rejects overlapping bookings for the same classroom (409 with conflict details)
- **Map:** click a room to see the club using it, event, time, purpose, and when it becomes free

## Setup

### 1. Database (Neon)

1. Create a free project at [neon.tech](https://neon.tech) and copy the connection string.
2. `cd backend && cp .env.example .env` and set `DATABASE_URL` to your Neon string.

### 2. Backend

```bash
cd backend
npm install
npx prisma migrate dev --name init   # creates tables in Neon
npm run seed                         # demo users, clubs, rooms, bookings
npm run dev                          # http://localhost:5000
```

### 3. Frontend

```bash
cd frontend
npm install
cp .env.example .env   # VITE_API_URL defaults to http://localhost:5000/api
npm run dev            # http://localhost:5173
```

## Demo logins (created by `npm run seed`)

| Role        | Email                    | Password   |
|-------------|--------------------------|------------|
| SUPER_ADMIN | superadmin@college.edu   | Super@123  |
| CLUB_ADMIN  | clubadmin@college.edu    | Club@123   |
| STUDENT     | student@college.edu      | Student@123 |

The seed also creates 5 clubs, 7 classrooms (with map coordinates), and sample bookings —
including one happening *right now* so the map shows an OCCUPIED room immediately.

## Project structure

```
college-club-mgmt/
├── backend/
│   ├── prisma/schema.prisma   # User, Club, Membership, Classroom, Booking
│   ├── prisma/seed.ts
│   └── src/
│       ├── routes/            # auth, users, clubs, classrooms, bookings, health
│       ├── middleware/        # requireAuth, requireRole, error handler
│       └── utils/             # JWT/bcrypt, isClubAdmin permission helper
└── frontend/
    └── src/
        ├── pages/             # Login, Dashboard, Clubs, ClubDetail, Bookings,
        │                      # Calendar, Map, AdminUsers
        ├── components/        # Layout, ProtectedRoute, ui kit
        ├── auth/AuthContext.tsx
        └── lib/api.ts         # typed API client
```

See `backend/README.md` and `frontend/README.md` for more detail on each side.

## Run with Docker Compose

Docker Compose builds and runs the frontend and backend. The backend uses the configured PostgreSQL database (for example, Neon); it runs `prisma migrate deploy` at startup.

1. Create a root `.env` file and set `DATABASE_URL` to your PostgreSQL connection string and `JWT_SECRET` to a long random value.
2. Start both services:

```bash
docker compose up --build
```

Open the frontend at `http://localhost:8080`. The API is available at `http://localhost:5000/api`. To seed demo data, run `docker compose exec backend npx prisma db seed`.
