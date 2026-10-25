# GateWay Express Backend

Express + MongoDB backend for Kirti's GateWay React interface. This backend uses Google Sign-In only, issues GateWay JWTs after server-side Google ID-token verification, stores visitor requests in MongoDB, enforces Admin/Guard/Resident roles, protects ID document access, records audit events, and sends an approved QR pass email when SMTP is configured.

## Run locally

Requirements: Node.js 22 LTS (or Node.js 20.19+) and MongoDB (local or Atlas).

1. From the project root, copy the environment examples:

   ```powershell
   Copy-Item .env.example .env
   Copy-Item backend\.env.example backend\.env
   ```

   If either `.env` already exists, edit it instead of overwriting it.

2. In the root `.env`, set `VITE_GOOGLE_CLIENT_ID` to your Google OAuth Web Client ID and keep `VITE_BACKEND_URL=http://localhost:5000/api`.
3. In `backend/.env`, set the same `GOOGLE_CLIENT_ID`, a reachable `MONGO_URI`, and `JWT_SECRET` (random, at least 32 characters). The Google OAuth Client ID must be exactly the same in the frontend and backend.
4. In Google Cloud Console, configure `http://localhost:5173` as an authorized JavaScript origin. This app requests basic Google identity only; actual GateWay roles are enforced by the Express backend.
5. Install and run the backend in one terminal:

   ```powershell
   cd backend
   npm install
   npm run dev
   ```

6. In another terminal at the project root:

   ```powershell
   npm install
   npm run dev
   ```

7. Open `http://localhost:5173`. Check backend health at `http://localhost:5000/api/health`.

The first successful Google login creates a MongoDB user record. `GOOGLE_ADMIN_EMAIL` and `GOOGLE_GUARD_EMAIL` determine the privileged roles. Other users must have a verified email from an allowed institutional Workspace domain and select Student, Faculty, or Official in the login screen. The role selected in the browser can never grant Admin or Guard by itself.

## SMTP setup for approved QR pass emails

Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, and `MAIL_FROM` in `backend/.env`. For Gmail SMTP, use an App Password where allowed by your account—not your normal password or Google OAuth client secret. The approval transaction remains approved even if email delivery fails; the API returns an email failure status and the resident can retry with the “Send e-Pass” action after SMTP is fixed.

## API overview

Base URL: `http://localhost:5000/api`. Protected endpoints require `Authorization: Bearer <GateWay JWT>`.

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| POST | `/auth/google-login` | Public | Verify Google credential, map role, create/find account, issue JWT |
| GET | `/auth/me` | Signed in | Return current GateWay user |
| GET | `/visitors` | Signed in | Return own requests to residents; all requests to Admin/Guard |
| GET | `/visitors/:id` | Owner/Admin/Guard | Read one request |
| POST | `/passes/create-request` | Student/Faculty/Official | Create request with visitorFile and hostFile uploads |
| POST | `/passes/send-email/:id` | Owner/Admin | Send/retry approved pass email |
| PATCH | `/admin/approve/:id` | Admin | Approve pending pass, then generate/email QR pass |
| PATCH | `/admin/reject/:id` | Admin | Reject pending pass with reason |
| PATCH | `/admin/blacklist/:id` | Admin | Set blacklist state |
| GET | `/admin/visitors`, `/admin/stats`, `/admin/audit-logs` | Admin | Admin directory and reporting |
| POST | `/guard/spot-pass` | Guard/Admin | Create an approved walk-in pass |
| GET | `/guard/verify/:value` | Guard/Admin | Verify QR token, passcode, or visitor ID and return the next eligible action |
| PATCH | `/guard/gate-status/:visitorId` | Guard/Admin | Check in or check out, subject to server-side validation |
| GET | `/guard/audit.csv` | Guard/Admin | Export persisted visitor/gate records |
| GET | `/documents/:filename` | Owner/Admin/Guard | Read an uploaded ID document after authorization checks |

## Security notes

- Google ID tokens are verified on the backend against `GOOGLE_CLIENT_ID`; the browser cannot choose its own Admin/Guard role.
- API mutations require a GateWay JWT and role checks.
- Visitor ID documents are not served as a public static directory; `/api/documents/:filename` checks record ownership or operations role.
- Aadhaar values are redacted before storage. The UI validates the entered value; the backend never persists the raw Aadhaar digits.
- QR codes contain random backend-issued 256-bit tokens, not visitor personal data. Gate actions are revalidated in Express against approval, blacklist, date, and valid state transition rules.
- This local-disk upload approach is suitable for a local class demo; production deployments need private persistent file/object storage, document retention policy, backups, and provider-specific security review.
