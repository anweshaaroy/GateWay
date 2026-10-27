# GateWay Express Backend

Express + MongoDB backend for Kirti's GateWay React interface. This backend uses Google Sign-In for authentication, issues GateWay JWTs after server-side Google ID-token verification, stores visitor requests in MongoDB, enforces Admin/Guard/Resident roles, protects ID document access, records audit events, and sends approved QR pass emails when SMTP is configured.

## Run locally

Requirements: Node.js 22 LTS (or Node.js 20.19+) and MongoDB (local or Atlas).

1. From the project root, copy the environment examples:

   ```powershell
   Copy-Item .env.example .env
   Copy-Item backend\.env.example backend\.env
   ```

   If either `.env` file already exists, update it instead of overwriting it.

2. In the root `.env`, set `VITE_GOOGLE_CLIENT_ID` to your Google OAuth Web Client ID and keep `VITE_BACKEND_URL=http://localhost:5000/api`.

3. In `backend/.env`, configure `GOOGLE_CLIENT_ID` with the same client ID, a reachable `MONGO_URI`, and a secure `JWT_SECRET` containing at least 32 characters. The Google OAuth Client ID must match in both the frontend and backend.

4. In Google Cloud Console, configure `http://localhost:5173` as an authorized JavaScript origin. The application uses Google for identity verification, while GateWay roles are enforced by the Express backend.

5. Install and start the backend in one terminal:

   ```powershell
   cd backend
   npm install
   npm run dev
   ```

6. In another terminal at the project root, install and start the frontend:

   ```powershell
   npm install
   npm run dev
   ```

7. Open `http://localhost:5173` in your browser. Check backend health at `http://localhost:5000/api/health`.

The first successful Google login creates a MongoDB user record. `GOOGLE_ADMIN_EMAIL` and `GOOGLE_GUARD_EMAIL` determine the privileged roles. Other users must have a verified email from an allowed institutional Workspace domain and select Student, Faculty, or Official on the login screen. Selecting a role in the browser cannot independently grant Admin or Guard privileges.

## SMTP setup for approved QR pass emails

Configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, and `MAIL_FROM` in `backend/.env`.

For Gmail SMTP, use an App Password where supported by your account, rather than your regular password or Google OAuth client secret.

The approval remains valid even if email delivery fails. The API returns an email failure status, allowing the resident to retry using the **Send e-Pass** action after SMTP has been configured correctly.

## API overview

Base URL: `http://localhost:5000/api`

Protected endpoints require the following authorization header:

`Authorization: Bearer <GateWay JWT>`

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| POST | `/auth/google-login` | Public | Verifies Google credentials, maps the role, creates or retrieves the account, and issues a JWT. |
| GET | `/auth/me` | Signed in | Returns the current GateWay user. |
| GET | `/visitors` | Signed in | Returns residents' own requests or all requests for Admin/Guard. |
| GET | `/visitors/:id` | Owner/Admin/Guard | Retrieves a specific request. |
| POST | `/passes/create-request` | Student/Faculty/Official | Creates a request with visitor and host document uploads. |
| POST | `/passes/send-email/:id` | Owner/Admin | Sends or retries an approved pass email. |
| PATCH | `/admin/approve/:id` | Admin | Approves a pending pass and initiates QR pass generation and email delivery. |
| PATCH | `/admin/reject/:id` | Admin | Rejects a pending pass with a reason. |
| PATCH | `/admin/blacklist/:id` | Admin | Updates the visitor's blacklist status. |
| GET | `/admin/visitors`, `/admin/stats`, `/admin/audit-logs` | Admin | Provides visitor directory, statistics, and audit logs. |
| POST | `/guard/spot-pass` | Guard/Admin | Creates an approved walk-in pass. |
| GET | `/guard/verify/:value` | Guard/Admin | Verifies a QR token, passcode, or visitor ID and returns the next eligible action. |
| PATCH | `/guard/gate-status/:visitorId` | Guard/Admin | Checks a visitor in or out after server-side validation. |
| GET | `/guard/audit.csv` | Guard/Admin | Exports persisted visitor and gate records. |
| GET | `/documents/:filename` | Owner/Admin/Guard | Provides access to an uploaded ID document after authorization checks. |

## Security notes

- Google ID tokens are verified on the backend against `GOOGLE_CLIENT_ID`; the browser cannot assign itself an Admin or Guard role.
- API mutations require a valid GateWay JWT and appropriate role permissions.
- Visitor ID documents are not served through a public static directory. The `/api/documents/:filename` endpoint checks record ownership or operational role permissions.
- Aadhaar values are redacted before storage. The UI validates the entered value, while the backend does not persist raw Aadhaar digits.
- QR codes contain random, backend-issued 256-bit tokens rather than visitor personal data.
- Gate actions are validated in Express against approval status, blacklist status, visit dates, and valid state transitions.
- Audit events are recorded to support monitoring and accountability.

The current local-disk upload approach is suitable for a local class demonstration. Production deployments require private, persistent file or object storage, an appropriate document-retention policy, backups, and provider-specific security reviews.

## Contributors

- Vishal Huneria
- Mansi Verma
