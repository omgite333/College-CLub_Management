# ClubHub — College Club Management (Frontend)

React 18 + TypeScript + Vite + Tailwind CSS v4 frontend for the College Club Management System MVP.

## Setup

```bash
npm install
cp .env.example .env   # adjust VITE_API_URL to point at the backend
npm run dev            # starts Vite dev server
```

Backend base URL defaults to `http://localhost:5000/api` (see `.env.example`).

## Demo credentials

| Role        | Email                   | Password    |
|-------------|-------------------------|-------------|
| Super Admin | superadmin@college.edu  | Super@123   |
| Club Admin  | clubadmin@college.edu   | Club@123    |
| Student     | student@college.edu     | Student@123 |

## Page map

| Route          | Page                | Who can see it                 |
|----------------|---------------------|--------------------------------|
| `/login`       | Login / Register    | Public                         |
| `/`            | Dashboard           | All roles (role-specific view) |
| `/clubs`       | Clubs grid          | All roles                      |
| `/clubs/:id`   | Club detail         | All roles (edit is gated)      |
| `/bookings`    | Bookings + filters  | All roles (create/edit gated)  |
| `/calendar`    | Weekly booking view | All roles                      |
| `/map`         | Campus map          | All roles                      |
| `/admin/users` | Access management   | SUPER_ADMIN only               |

## Notes

- Auth token is stored in `localStorage` under key `ccm_token` and sent as `Authorization: Bearer <token>`.
- `datetime-local` inputs are converted to ISO strings (`new Date(v).toISOString()`) before POST/PATCH; when editing, server ISO times are converted back to the `datetime-local` format.
- The map auto-refreshes room availability every 60 seconds.
- Club admins can only manage data and bookings for clubs they administer; the UI additionally hides actions, but enforcement lives in the backend.
