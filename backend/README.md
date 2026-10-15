# GateWay Backend (Express + MongoDB)

Backend API matching the current GateWay React UI: visitor pre-registration, administrator approval/rejection and blacklist controls, and guard-side pass verification, check-in/check-out, and CSV audit export.

## Folder structure

```text
backend/
├── src/
│   ├── config/db.js
│   ├── controllers/       # Auth, visitor, admin, guard workflows
│   ├── middleware/        # JWT/RBAC, document upload, error handling
│   ├── models/            # User, Visitor, AuditLog (Mongoose)
│   ├── routes/            # REST API endpoints
│   ├── utils/             # ID/passcode generation, audit helpers
│   ├── app.js
│   └── server.js
├── scripts/seedUsers.js
├── uploads/
├── .env.example
├── package.json
└── README.md
```

## Run locally

1. Install **Node.js 20+** and start MongoDB locally, or use your MongoDB Atlas connection string.
2. Open a terminal inside this `backend` directory.
3. Run `npm install`.
4. Copy `.env.example` to `.env`; set `MONGO_URI`, `JWT_SECRET` (at least 32 random characters), `CLIENT_URL`, and seed-account passwords.
5. Run `npm run seed:users` to create the configured **Admin** and **Guard** accounts. Public registration cannot create those roles.
6. Run `npm run dev` for development or `npm start` to start the API.
7. Open `http://localhost:5000/` or `http://localhost:5000/api/health`; a JSON status response should appear.

Never commit `.env` or use the example passwords on a public deployment.

## Roles and access control

- **Student / Faculty:** can register and log in, create visitor requests, and see their own requests.
- **Admin:** reviews all requests, approves or rejects with a reason, manages the blacklist, sees dashboard counts, and inspects audit logs.
- **Guard:** searches/validates passes, records check-in/check-out, and exports the audit CSV. Admins also have guard operations access.
- Passwords are hashed with bcrypt. Protected routes require `Authorization: Bearer <JWT>`.
- Public registration only accepts the Student and Faculty roles. Admin and Guard accounts are created by the seed script or another controlled administrative process.

## API reference

Base URL: `http://localhost:5000/api`

### Authentication

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| POST | `/auth/register` | Public | Register Student/Faculty (`name`, `email`, `password`, `role`, optional/required `entryNumber`) |
| POST | `/auth/login` | Public | Authenticate using `email` + `password`; returns JWT and user |
| GET | `/auth/me` | Signed-in user | Return the current account |

Institutional email domains match the current login UI: `@iitrpr.ac.in` and `@campus.edu`.

### Resident portal

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| POST | `/visitors` | Student/Faculty | Create a visitor request (`multipart/form-data`) |
| GET | `/visitors/mine` | Student/Faculty | List current user's requests |
| GET | `/visitors/:id` | Owner/Admin/Guard | Fetch one request by its `VIS-...` ID |

For `POST /visitors`, send these text fields: `name`, `email`, `idType` (`Aadhaar Card` or `Passport`), `idNumber`, `hostName`, `hostAddress`, `hostIdDocType`, `purpose`, `arrivalDate`, and `exitDate`. Optional files: `visitorDocument` and `hostDocument` (JPG/JPEG/PDF, each max size from `MAX_UPLOAD_MB`). The signed-in user's email becomes `hostEmail`. Dates use `YYYY-MM-DD`. The raw Aadhaar value is validated but never persisted; the stored value is `[Aadhaar Redacted]` to match the current React UI.

### Admin desk

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/admin/stats` | Dashboard counts |
| GET | `/admin/visitors` | List/filter visitor requests (`q`, `approvalStatus`, `status`, `blacklisted`) |
| PATCH | `/admin/visitors/:id/approve` | Approve a pending request |
| PATCH | `/admin/visitors/:id/reject` | Reject pending request; JSON body `{ "reason": "..." }` |
| PATCH | `/admin/visitors/:id/blacklist` | Toggle blacklist state |
| GET | `/admin/audit-logs?limit=100` | Recent audit records (max 500) |

### Guard terminal

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/guard/search?q=...` | Search by passcode, visitor, email, host, or visitor ID |
| GET | `/guard/verify/:passcode` | Check the pass/QR value and eligibility |
| POST | `/guard/check-in/:id` | Record entry for an approved, non-blacklisted visitor during valid dates |
| POST | `/guard/check-out/:id` | Record exit for someone currently inside campus |
| GET | `/guard/audit.csv` | Download CSV export |

The QR should contain the visitor's backend-issued `passcode`. Check-in enforces approval, blacklist state, visit dates, and valid state transitions. Each operational action is recorded in the audit log.

## Connecting the existing React app

The supplied React ZIP currently stores visitors in local React state and generates IDs/passcodes in the browser. To use this API, update the front end to:

1. Set `VITE_API_URL=http://localhost:5000/api` in the React app's `.env`.
2. Add password fields and call `/auth/login`; store the returned token appropriately and attach `Authorization: Bearer <token>` to protected API calls.
3. Replace `handlePassCreated`, `handleApprove`, `handleReject`, `handleToggleBlacklist`, and `handleStatusChange` local-state-only handlers with the matching API calls, then refresh the visitor list.
4. Submit visitor forms as `FormData` so the two document files are uploaded under `visitorDocument` and `hostDocument`.
5. Render backend records from `GET /visitors/mine`, `GET /admin/visitors`, and `GET /guard/search` instead of relying on the hard-coded in-memory records.

**Current integration status:** this package provides the separate backend folder and API implementation; it does not modify the submitted React source or automatically connect the UI to the API. Also, the supplied ZIP's `src/App.jsx` imports `src/components/AdminDesk.jsx`, but that file is not present in the ZIP, so the frontend needs that missing component before it can build successfully.

## Demo / deployment notes

- Uploaded documents are stored in the backend's local `uploads/` directory and exposed through `/uploads/...`. This is fine for local demonstration; many cloud hosts use ephemeral filesystems unless persistent storage is configured.
- Set `CLIENT_URL` to the exact Vercel origin when deploying the frontend. Set `MONGO_URI` to a database the backend host can reach and add the environment values in the host's dashboard. Do not put secrets in the React/Vite environment.
- For production, add stricter institutional account provisioning, document retention/access policies, backups, and persistent private object storage before using real visitor ID documents.
