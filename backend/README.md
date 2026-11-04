\# GateWay Backend Documentation\
\
GateWay is a campus visitor pre-approval and gate-management system. The React application provides the Resident, Admin and Guard interfaces; this folder contains the \*\*Node.js + Express REST API\*\* that authenticates users, validates requests, stores records in MongoDB, controls access to visitor documents, manages approvals and gate events, and sends approved QR passes by email.\
\
This document describes the backend implementation in this repository. It is intended as both a developer setup guide and a technical explanation of how the server works.\
\
\## Contents\
\
1\. [Backend responsibilities]\(#1-backend-responsibilities)\
2\. [Architecture and request flow]\(#2-architecture-and-request-flow)\
3\. [Folder structure]\(#3-folder-structure)\
4\. [MongoDB models]\(#4-mongodb-models)\
5\. [Google authentication and JWT access control]\(#5-google-authentication-and-jwt-access-control)\
6\. [Visitor request and group headcount flow]\(#6-visitor-request-and-group-headcount-flow)\
7\. [Admin approval and QR email workflow]\(#7-admin-approval-and-qr-email-workflow)\
8\. [Guard verification and gate operations]\(#8-guard-verification-and-gate-operations)\
9\. [API reference]\(#9-api-reference)\
10\. [File uploads and protected document access]\(#10-file-uploads-and-protected-document-access)\
11\. [Audit logging]\(#11-audit-logging)\
12\. [Dependencies]\(#12-dependencies)\
13\. [Local setup]\(#13-local-setup)\
14\. [Configuration reference]\(#14-configuration-reference)\
15\. [Testing checklist]\(#15-testing-checklist)\
16\. [Security and deployment notes]\(#16-security-and-deployment-notes)\
\
\---\
\
\## 1. Backend responsibilities\
\
The backend is responsible for the operations that must not be trusted to the browser alone:\
\
\- Verify Google ID tokens and establish a GateWay application session.\
\- Assign application roles and enforce role permissions on protected routes.\
\- Validate visitor and host information, visit dates and uploaded documents.\
\- Create visitor IDs, passcodes and random QR verification tokens.\
\- Persist users, visitor requests, approval state, gate state and audit records in MongoDB.\
\- Allow Admin users to approve/reject requests and manage the blacklist.\
\- Allow Guard/Admin users to verify passes and record check-in/check-out.\
\- Generate a QR image and send an approved visitor pass through SMTP.\
\- Serve identity documents only after authorization checks.\
\
The frontend calls the backend over HTTP. The frontend does not connect directly to MongoDB.\
\
\## 2. Architecture and request flow\
\
\`\`\`text\
React / Vite frontend\
&#x20;       |\
&#x20;       \| HTTP requests (JSON or multipart/form-data)\
&#x20;       \| Authorization: Bearer \<GateWay JWT>\
&#x20;       v\
Express application (src/app.js)\
&#x20;       |\
&#x20;       +--> CORS / Helmet / request parsing / Morgan\
&#x20;       |\
&#x20;       +--> Routes (auth, visitors, passes, admin, guard, documents)\
&#x20;                 |\
&#x20;                 v\
&#x20;            Middleware\
&#x20;            \- protect: verify GateWay JWT and load User\
&#x20;            \- authorize: check the user's role\
&#x20;            \- visitorUpload: validate and store uploaded files\
&#x20;                 |\
&#x20;                 v\
&#x20;            Controllers\
&#x20;            \- validate input and permissions\
&#x20;            \- run the visitor / approval / gate business logic\
&#x20;                 |\
&#x20;         +-------+-------------------+\
&#x20;         \|                           |\
&#x20;         v                           v\
&#x20;    Mongoose models              Services / utilities\
&#x20;         \|                       - QR image generation\
&#x20;         v                       - SMTP email delivery\
&#x20;      MongoDB                    - ID/passcode generation\
&#x20;                                 \- audit logging\
\`\`\`\
\
A typical protected request follows this sequence:\
\
1\. React sends an API request with the GateWay JWT in the \`Authorization\` header.\
2\. \`protect\` verifies the JWT and loads the current user from MongoDB.\
3\. \`authorize(...)\` checks whether that user's stored role is allowed to use the route.\
4\. The controller validates the request and performs the operation.\
5\. Mongoose reads or updates MongoDB; supporting services handle QR/email work where required.\
6\. Express returns a JSON response or a CSV/document response.\
\
\## 3. Folder structure\
\
\`\`\`text\
backend/\
├── src/\
│   ├── server.js                  # Loads environment, validates JWT config, connects DB, starts API\
│   ├── app.js                     # Express setup, middleware, route mounting and health endpoints\
│   ├── config/\
│   │   └── db.js                  # Mongoose connection\
│   ├── routes/\
│   │   ├── authRoutes.js          # Google login and current-user endpoints\
│   │   ├── visitorRoutes.js       # Visitor list and individual request retrieval\
│   │   ├── passRoutes.js          # Resident request submission and pass email retry\
│   │   ├── adminRoutes.js         # Admin statistics, review, blacklist and audit APIs\
│   │   ├── guardRoutes.js         # Pass verification, gate actions, walk-in and CSV APIs\
│   │   └── documentRoutes.js      # Protected identity-document download/view\
│   ├── controllers/\
│   │   ├── authController.js      # Google token verification, account lookup and JWT issue\
│   │   ├── visitorController.js   # Resident request creation and visitor retrieval\
│   │   ├── adminController.js     # Approval, rejection, blacklist, stats and audit queries\
│   │   ├── guardController.js     # QR/pass verification and gate operations\
│   │   ├── passController.js      # Send/retry approved pass email\
│   │   └── documentController.js  # Authorized document file response\
│   ├── models/\
│   │   ├── User.js                # User identity, role and account state\
│   │   ├── Visitor.js             # Visitor request, pass, approval and gate state\
│   │   └── AuditLog.js             # Security and portal activity events\
│   ├── middleware/\
│   │   ├── auth.js                # JWT authentication and role authorization\
│   │   ├── upload.js              # Multer storage, file type and size limits\
│   │   └── errorHandler.js        # 404, validation, upload and general API errors\
│   ├── services/\
│   │   └── passEmail.js           # QR image generation and Nodemailer SMTP delivery\
│   └── utils/\
│       ├── asyncHandler.js        # Forwards async controller errors to Express\
│       ├── audit.js               # Writes an AuditLog document\
│       ├── createCodes.js         # Creates unique visitor IDs/passcodes and QR tokens\
│       ├── httpError.js           # Creates HTTP errors with status codes\
│       └── visitorLookup.js       # Pass lookup, date eligibility and time formatting\
├── uploads/                       # Runtime identity-document storage (created as needed)\
├── .env.example                   # Backend configuration template\
└── package.json                   # Backend scripts and dependencies\
\`\`\`\
\
\### Main application files\
\
\- \*\*\`server.js\`\*\* loads dotenv, checks that \`JWT_SECRET\` is sufficiently long, connects to MongoDB and then starts listening on \`PORT\`.\
\- \*\*\`app.js\`\*\* configures Express, CORS, Helmet, JSON/form parsing and Morgan. It mounts all API routers under \`/api\` and installs 404/error handlers.\
\- \*\*Routes\*\* define HTTP methods, URL paths and middleware.\
\- \*\*Controllers\*\* contain request validation and application logic.\
\- \*\*Models\*\* define the MongoDB document structure and indexes.\
\- \*\*Middleware\*\* handles authentication, role checks and file uploads before a controller runs.\
\- \*\*Services/utilities\*\* hold reusable QR, email, audit, ID-generation and date-lookup behavior.\
\
\## 4. MongoDB models\
\
The backend uses Mongoose schemas. All three main models use timestamps, so MongoDB documents include \`createdAt\` and \`updatedAt\`.\
\
\### \`User\`\
\
Represents a person who can sign in to GateWay.\
\
\| Field          | Purpose                                                    |\
\| -------------- | ---------------------------------------------------------- |\
\| \`name\`         | Display name from Google identity information              |\
\| \`email\`        | Normalized, unique email address                           |\
\| \`googleId\`     | Google account subject (\`sub\`) linked to this GateWay user |\
\| \`role\`         | \`student\`, \`faculty\`, \`official\`, \`admin\` or \`guard\`       |\
\| \`residentType\` | Resident category for Student/Faculty/Official users       |\
\| \`entryNumber\`  | Student roll/entry number, when applicable                 |\
\| \`isActive\`     | Allows an account to be disabled without deleting it       |\
\| \`lastLoginAt\`  | Last successful login timestamp                            |\
\
The model's \`toSafeObject()\` method returns a limited profile for the frontend rather than exposing the full database document.\
\
\### \`Visitor\`\
\
Represents one visitor pass/request. Important fields include:\
\
\| Field                                        | Purpose                                                           |\
\| -------------------------------------------- | ----------------------------------------------------------------- |\
\| \`id\`                                         | Human-readable GateWay visitor ID, for example \`VIS-123456\`       |\
\| \`passcode\`                                   | Unique short passcode used for lookup                             |\
\| \`qrToken\`                                    | Random 32-byte (256-bit) token encoded in the QR code             |\
\| \`requester\`                                  | Reference to the GateWay \`User\` who submitted/created the record  |\
\| \`name\`, \`email\`, \`phone\`                     | Visitor contact details                                           |\
\| \`idType\`, \`idNumber\`                         | Visitor identity type and stored identity value                   |\
\| \`idDocName\`, \`idDocUrl\`                      | Visitor ID proof filename and protected document URL              |\
\| \`hostName\`, \`hostEmail\`, \`hostAddress\`       | Host/resident information                                         |\
\| \`hostIdDocType\`, \`hostDocName\`, \`hostDocUrl\` | Host ID type and host proof file details                          |\
\| \`purpose\`                                    | Reason for the visit                                              |\
\| \`arrivalDate\`, \`exitDate\`, \`durationDays\`    | Approved visit window and calculated duration                     |\
\| \`approvalStatus\`                             | \`Pending Approval\`, \`Approved\` or \`Rejected\`                      |\
\| \`status\`                                     | Gate state: \`Pending\`, \`Inside Campus\`, \`Completed\` or \`Rejected\` |\
\| \`blacklisted\`                                | Whether entry is blocked by Admin policy                          |\
\| \`rejectionReason\`                            | Reason recorded when an Admin rejects a request                   |\
\| \`emailDeliveryStatus\`                        | \`not_sent\`, \`pending\`, \`sent\` or \`failed\`                         |\
\| \`emailSentAt\`, \`emailError\`                  | Email outcome details                                             |\
\| \`visitHistory\`                               | Per-visitor timeline of request, approval and gate events         |\
\| \`accompanyingCount\`, \`totalVisitors\`         | Group headcount recorded with the lead visitor request            |\
\
\*\*Group headcount behavior in this source version:\*\* the request stores one lead visitor record and a count of accompanying people (\`accompanyingCount\`; \`totalVisitors = 1 + accompanyingCount\`). It does not create a separate Visitor document, identity proof, pass or QR token for each accompanying person. The headcount is a count only.\
\
The current resident request endpoint requires both a visitor proof file and a host proof file. The accepted form-data field names are described in [Visitor request API]\(#visitor-request-creation).\
\
\### \`AuditLog\`\
\
Stores a separate, queryable activity record.\
\
\| Field             | Purpose                                                                |\
\| ----------------- | ---------------------------------------------------------------------- |\
\| \`action\`          | Machine-readable event name, such as \`VISITOR_CHECK_IN\`                |\
\| \`actor\`           | User who performed the action, when authenticated                      |\
\| \`visitor\`         | Related Visitor document, when applicable                              |\
\| \`message\`         | Human-readable event description                                       |\
\| \`metadata\`        | Additional event details, such as rejection reason or email error code |\
\| \`ip\`, \`userAgent\` | Request source details captured by the API                             |\
\| \`createdAt\`       | Event timestamp                                                        |\
\
\`Visitor.visitHistory\` is the event timeline embedded in an individual visitor record. \`AuditLog\` is the separate activity collection used by the Admin audit endpoint.\
\
\## 5. Google authentication and JWT access control\
\
GateWay uses Google Sign-In for identity verification. It does not use the email/password login flow in this backend.\
\
\### Login sequence\
\
1\. The user selects a Google account in the React frontend.\
2\. Google Identity Services returns an ID token to the frontend.\
3\. React sends the ID token to \`POST /api/auth/google-login\` as \`credential\` (the controller also accepts \`token\`).\
4\. \`google-auth-library\` verifies the token against the server's \`GOOGLE_CLIENT_ID\` audience.\
5\. The backend checks the Google subject, verified email, and institutional hosted-domain claim when configured.\
6\. The backend maps the email to a privileged Admin/Guard role if it matches the server-side mapping. Otherwise, the user must be an allowed institutional identity and the requested resident type must be Student, Faculty or Official.\
7\. GateWay creates the User document on first login, or updates the existing login details. It rejects disabled users and a Google subject that conflicts with an already-linked account.\
8\. The backend writes a login audit event and issues a GateWay JWT.\
\
\### Role assignment\
\
\| Role                         | Assignment rule in this backend                                                              |\
\| ---------------------------- | -------------------------------------------------------------------------------------------- |\
\| Admin                        | Exact email match from \`GOOGLE_ADMIN_EMAIL\`                                                  |\
\| Guard                        | Exact email match from \`GOOGLE_GUARD_EMAIL\`                                                  |\
\| Student / Faculty / Official | Verified allowed institutional email plus the selected resident category at account creation |\
\
In normal operation, selecting \`admin\` or \`guard\` in the browser does not grant that role. The email must be mapped on the server. \*\*Keep \`DEMO_MODE=false\` outside an isolated demo\*\*, because demo mode permits an allowed institutional user to select a privileged role.\
\
\### GateWay JWT\
\
After Google verification and role assignment, \`jsonwebtoken\` signs a GateWay token containing the user's MongoDB ID (\`sub\`) and role. The token expiry is controlled by \`JWT_EXPIRES_IN\` (default: \`1d\`).\
\
Protected requests send:\
\
\`\`\`http\
Authorization: Bearer \<GateWay JWT>\
\`\`\`\
\
The \`protect\` middleware verifies the JWT, loads the current User from MongoDB and checks \`isActive\`. The \`authorize(...)\` middleware then compares the stored user role against the roles allowed by that route. The backend does not trust a role value supplied by the frontend for protected operations.\
\
\## 6. Visitor request and group headcount flow\
\
The Resident/Faculty/Official frontend sends \`POST /api/passes/create-request\` as \`multipart/form-data\`.\
\
The backend:\
\
1\. Authenticates the resident and checks the resident role.\
2\. Reads visitor, host, purpose and visit-date fields.\
3\. Validates email, identity type/number and date format/order.\
4\. Checks both uploaded proof files through Multer.\
5\. Redacts the Aadhaar value before database persistence. Passport values are normalized to uppercase.\
6\. Calculates inclusive stay duration (\`exitDate - arrivalDate + 1\`).\
7\. Generates a visitor ID, unique passcode and random QR token.\
8\. Creates a \`Visitor\` record with \`approvalStatus: Pending Approval\` and \`status: Pending\`.\
9\. Appends a \`REQUEST_CREATED\` visit-history item and writes \`VISITOR_REQUEST_CREATED\` to \`AuditLog\`.\
10\. Returns the created visitor/pass object to React.\
\
\### Request fields\
\
Text fields accepted by the controller include:\
\
\- \`name\`, \`email\`, \`idType\`, \`idNumber\`\
\- \`hostName\`, \`hostAddress\`, \`hostIdDocType\`\
\- \`purpose\`, \`arrivalDate\`, \`exitDate\`\
\- \`accompanyingCount\` (optional; clamped to 0–100)\
\
Upload fields:\
\
\- \`visitorFile\` — visitor identity proof (\*\*required by the current controller\*\*)\
\- \`hostFile\` — host identity proof (\*\*required by the current controller\*\*)\
\
Files must be JPG/JPEG or PDF and must respect \`MAX_UPLOAD_MB\` (default 5 MB). Use \`multipart/form-data\`; let the HTTP client generate the multipart boundary.\
\
\## 7. Admin approval and QR email workflow\
\
Admin routes are protected by \`protect\` and \`authorize("admin")\`.\
\
\### Approve sequence\
\
1\. Admin sends an approval request for a visitor ID.\
2\. The controller finds the visitor and allows approval only when its current state is \`Pending Approval\`.\
3\. It changes \`approvalStatus\` to \`Approved\`, keeps the gate state at \`Pending\`, clears any rejection reason, records visit history and writes an audit event.\
4\. After the database approval is saved, \`sendApprovedPassEmail()\` runs.\
5\. The email service generates a QR PNG from the visitor's random \`qrToken\` using the \`qrcode\` package (high error-correction setting).\
6\. Nodemailer sends an HTML/text email to the visitor. The QR is embedded inline and attached as a PNG.\
7\. The Visitor document is updated with \`emailDeliveryStatus\`, \`emailSentAt\` or \`emailError\`; email success/failure is also recorded in the audit log.\
\
The QR contains the random QR token, not the visitor's name, email, phone or identity number. Guard verification looks up the token in MongoDB and checks the current pass state.\
\
\### Email retry\
\
\`POST /api/passes/send-email/:id\` retries delivery for an already-approved visitor pass. It does not approve the request again. The resident who owns the request or an Admin can use this route through the current route permissions.\
\
\### SMTP behavior in development\
\
If SMTP is not configured, \`passEmail.js\` simulates a successful delivery in non-production mode (or when \`DEMO_MODE=true\`) and records the email status as \`sent\` with a simulated message. \*\*That is not a real email delivery.\*\* For a genuine delivery test, configure valid SMTP credentials and confirm the message arrives in the recipient mailbox. In production without SMTP configuration, the email status is marked failed.\
\
Approval is persisted before email delivery. Therefore, an SMTP failure does not undo the Admin's approval; the email can be retried after configuration is corrected.\
\
\## 8. Guard verification and gate operations\
\
Guard routes allow \`guard\` and \`admin\` roles.\
\
\### Pass verification\
\
\`GET /api/guard/verify/:value\` looks up the supplied value as a visitor ID, passcode or QR token. It then checks:\
\
\- The visitor request has been approved.\
\- The visitor is not already completed.\
\- A visitor who is already inside can proceed to check-out.\
\- A visitor outside campus is not blacklisted.\
\- The current date falls within the approved arrival/exit dates (date comparison uses the \`Asia/Kolkata\` time zone).\
\
The response includes \`eligible\`, \`action\` (\`CHECK_IN\`, \`CHECK_OUT\` or \`null\`) and a reason.\
\
\### Check-in and check-out\
\
\- Check-in changes \`status\` to \`Inside Campus\`, records a check-in time and adds a \`CHECK_IN\` history/audit event.\
\- Check-out is allowed only when the visitor is currently \`Inside Campus\`. It changes \`status\` to \`Completed\`, records a check-out time and adds a \`CHECK_OUT\` history/audit event.\
\- Repeated check-ins and invalid state transitions are rejected by the backend.\
\
The API supports both \`PATCH /gate-status/:visitorId\` with a \`status\` value and the explicit \`POST /check-in/:id\` / \`POST /check-out/:id\` routes.\
\
\### Walk-in pass\
\
\`POST /api/guard/spot-pass\` creates a pass at the gate. It uses JSON input fields such as \`visitorName\`, \`phone\`, \`visitorEmail\`, \`hostName\`, \`purpose\`, \`fromDate\`, \`toDate\`, \`idType\` and optional \`accompanyingCount\`. Walk-in passes are created as \`Approved\` because they are issued by the Guard/Admin workflow; a QR email is attempted only when a visitor email is provided.\
\
\### Search and export\
\
\- \`GET /api/guard/search?q=\<term>\` searches by ID, passcode, name, email, host name or host address.\
\- \`GET /api/guard/audit.csv\` exports visitor and gate-status rows from the \`Visitor\` collection as CSV. This is a visitor/gate report; it is not the same as the Admin \`AuditLog\` collection endpoint.\
\
\## 9. API reference\
\
Base URL:\
\
\`\`\`text\
http\://localhost:5000/api\
\`\`\`\
\
Unless marked \*\*Public\*\*, endpoints require:\
\
\`\`\`http\
Authorization: Bearer \<GateWay JWT>\
\`\`\`\
\
\### Health\
\
\| Method | Endpoint  | Access | Purpose                                                                |\
\| ------ | --------- | ------ | ---------------------------------------------------------------------- |\
\| \`GET\`  | \`/\`       | Public | Basic API running response (root is \`http\://localhost:5000/\`)          |\
\| \`GET\`  | \`/health\` | Public | API and MongoDB connection status (\`http\://localhost:5000/api/health\`) |\
\
\### Authentication\
\
\| Method | Endpoint             | Access                 | Purpose                                                                                   |\
\| ------ | -------------------- | ---------------------- | ----------------------------------------------------------------------------------------- |\
\| \`POST\` | \`/auth/google-login\` | Public, rate-limited   | Verify a Google ID token, create/find the user, write login audit and issue a GateWay JWT |\
\| \`GET\`  | \`/auth/me\`           | Any authenticated user | Return the current GateWay user profile                                                   |\
\
Example login JSON (use a real, fresh Google ID token in your local test):\
\
\`\`\`json\
{\
&#x20; "credential": "\<Google ID token>",\
&#x20; "selectedRole": "resident",\
&#x20; "residentType": "student",\
&#x20; "entryNumber": "2026AIM1024"\
}\
\`\`\`\
\
The controller accepts \`token\` as an alternative to \`credential\`. \`entryNumber\` is required when creating a Student account.\
\
\### Resident / visitor requests\
\
\| Method | Endpoint                 | Access                               | Purpose                                                                       |\
\| ------ | ------------------------ | ------------------------------------ | ----------------------------------------------------------------------------- |\
\| \`GET\`  | \`/visitors\`              | Student/Faculty/Official/Admin/Guard | Residents receive their own requests; Admin/Guard receive all visitor records |\
\| \`GET\`  | \`/visitors/:id\`          | Owner, Admin or Guard                | Retrieve one visitor request by its GateWay visitor ID                        |\
\| \`POST\` | \`/passes/create-request\` | Student/Faculty/Official             | Create a pending visitor request with visitor and host proof uploads          |\
\| \`POST\` | \`/passes/send-email/:id\` | Request owner or Admin               | Send/retry the QR pass email for an approved request                          |\
\
\### Admin\
\
All Admin endpoints require the \`admin\` role.\
\
\| Method  | Endpoint                      | Purpose                                                                                 |\
\| ------- | ----------------------------- | --------------------------------------------------------------------------------------- |\
\| \`GET\`   | \`/admin/stats\`                | Counts total, pending, approved, rejected, inside-campus and blacklisted visitors       |\
\| \`GET\`   | \`/admin/visitors\`             | List/filter visitor requests (\`approvalStatus\`, \`status\`, \`blacklisted\`, \`q\`)           |\
\| \`GET\`   | \`/admin/audit-logs?limit=100\` | Retrieve newest AuditLog records; limit is bounded at 500                               |\
\| \`PATCH\` | \`/admin/approve/:id\`          | Approve a pending visitor and trigger QR email delivery                                 |\
\| \`PATCH\` | \`/admin/reject/:id\`           | Reject a pending visitor; optional JSON body \`{ "reason": "..." }\`                      |\
\| \`PATCH\` | \`/admin/blacklist/:id\`        | Set blacklist state with \`{ "blacklisted": true }\` or \`false\`; omitted value toggles it |\
\
REST-style aliases are also registered:\
\
\- \`PATCH /admin/visitors/:id/approve\`\
\- \`PATCH /admin/visitors/:id/reject\`\
\- \`PATCH /admin/visitors/:id/blacklist\`\
\
\### Guard\
\
All Guard endpoints below also permit Admin users.\
\
\| Method  | Endpoint                        | Purpose                                                                    |\
\| ------- | ------------------------------- | -------------------------------------------------------------------------- |\
\| \`GET\`   | \`/guard/search?q=\<term>\`        | Search visitor records                                                     |\
\| \`GET\`   | \`/guard/verify/:value\`          | Verify visitor ID, passcode or QR token and return eligibility/next action |\
\| \`POST\`  | \`/guard/spot-pass\`              | Create an approved walk-in pass                                            |\
\| \`PATCH\` | \`/guard/gate-status/:visitorId\` | Set status to \`Inside Campus\` or \`Completed\`                               |\
\| \`POST\`  | \`/guard/check-in/:id\`           | Convenience route for check-in                                             |\
\| \`POST\`  | \`/guard/check-out/:id\`          | Convenience route for check-out                                            |\
\| \`GET\`   | \`/guard/audit.csv\`              | Download visitor/gate-state CSV export                                     |\
\
\### Documents\
\
\| Method | Endpoint               | Access                                      | Purpose                                  |\
\| ------ | ---------------------- | ------------------------------------------- | ---------------------------------------- |\
\| \`GET\`  | \`/documents/:filename\` | Authenticated user; owner/Admin/Guard check | View/download an uploaded identity proof |\
\
The application mounts the document router at both \`/api/documents\` and \`/documents\`; the frontend stores document URLs in the \`/documents/:filename\` form. Both paths use the same authentication and ownership checks.\
\
\## 10. File uploads and protected document access\
\
Multer stores uploaded files in the backend upload directory (\`backend/uploads\` by default). The current filter accepts only \`.jpg\`, \`.jpeg\` and \`.pdf\` extensions with corresponding JPEG/PDF MIME types. The default maximum file size is 5 MB per file and the current visitor request middleware accepts at most two files.\
\
The app deliberately does \*\*not\*\* expose the upload folder as a public static directory. Document access goes through the document controller, which:\
\
1\. Sanitizes the requested filename with \`path.basename\`.\
2\. Checks whether the requester owns the visitor record or is an Admin/Guard.\
3\. Resolves the file path within the configured upload directory.\
4\. Sends the file with \`Cache-Control: private, no-store\`.\
\
For a production deployment, local disk is not automatically persistent on many hosting platforms. Use private persistent storage or private object storage, backups, malware scanning and a documented retention/deletion policy before storing real identity documents.\
\
\## 11. Audit logging\
\
\`writeAudit()\` creates \`AuditLog\` documents with the action, actor, visitor, message, metadata, IP address and user-agent. Important events recorded by the current controllers include:\
\
\- \`GOOGLE_USER_CREATED\`, \`GOOGLE_LOGIN\`, \`GOOGLE_LOGIN_REJECTED\`\
\- \`VISITOR_REQUEST_CREATED\`\
\- \`VISITOR_REQUEST_APPROVED\`, \`VISITOR_REQUEST_REJECTED\`\
\- \`VISITOR_BLACKLISTED\`, \`VISITOR_UNBLACKLISTED\`\
\- \`VISITOR_CHECK_IN\`, \`VISITOR_CHECK_OUT\`\
\- \`WALK_IN_PASS_CREATED\`\
\- \`VISITOR_PASS_EMAIL_SENT\`, \`VISITOR_PASS_EMAIL_FAILED\`\
\
The Admin endpoint \`GET /api/admin/audit-logs\` reads this collection. A separate \`visitHistory\` array is also stored inside each Visitor document to show that visitor's lifecycle.\
\
\## 12. Dependencies\
\
The exact versions are maintained in \`backend/package.json\` and \`backend/package-lock.json\`.\
\
\| Package               | Purpose in GateWay                                      |\
\| --------------------- | ------------------------------------------------------- |\
\| \`express\`             | HTTP server and REST routing                            |\
\| \`mongoose\`            | MongoDB schemas, models, queries and persistence        |\
\| \`mongodb\`             | MongoDB Node.js driver dependency                       |\
\| \`google-auth-library\` | Server-side Google ID-token verification                |\
\| \`jsonwebtoken\`        | Sign and verify GateWay JWTs                            |\
\| \`cors\`                | Allow the configured frontend origin(s) to call the API |\
\| \`helmet\`              | Set common HTTP security headers                        |\
\| \`express-rate-limit\`  | Limit repeated Google login attempts                    |\
\| \`multer\`              | Parse and store multipart identity-document uploads     |\
\| \`qrcode\`              | Generate PNG QR images for email attachments            |\
\| \`nodemailer\`          | Send pass emails through SMTP                           |\
\| \`dotenv\`              | Load environment variables from \`backend/.env\`          |\
\| \`morgan\`              | HTTP request logging during development                 |\
\
This backend uses Google Sign-In and does not currently implement password login. There is no \`bcryptjs\` dependency in this backend package.\
\
\## 13. Local setup\
\
\### Requirements\
\
\- Node.js 20 or newer (Node.js 22 LTS is recommended).\
\- npm.\
\- MongoDB running locally or a reachable MongoDB Atlas database.\
\- A Google OAuth \*\*Web application\*\* Client ID.\
\- SMTP credentials only if real pass emails are required.\
\
\### Step 1: Create environment files\
\
Run these commands from the repository root (the folder containing the frontend \`package.json\`):\
\
\`\`\`powershell\
Copy-Item .env.example .env\
Copy-Item backend\\.env.example backend\\.env\
\`\`\`\
\
If a local \`.env\` already exists, update it instead of overwriting it.\
\
\### Step 2: Configure Google OAuth\
\
Use the same Google OAuth Web Client ID in both files:\
\
\- Root \`.env\`: \`VITE_GOOGLE_CLIENT_ID\`\
\- \`backend/.env\`: \`GOOGLE_CLIENT_ID\`\
\
In Google Cloud Console, add the frontend origin \`http\://localhost:5173\` under \*\*Authorized JavaScript origins\*\*. The backend verifies the ID token; it does not use the Google client secret for this flow.\
\
\### Step 3: Configure MongoDB and JWT\
\
In \`backend/.env\`, set a reachable \`MONGO_URI\` and a random \`JWT_SECRET\` of at least 32 characters. Generate a secret with:\
\
\`\`\`powershell\
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"\
\`\`\`\
\
Set the server-side Admin and Guard email mappings and keep \`DEMO_MODE=false\` for normal role enforcement.\
\
\### Step 4: Install and run the backend\
\
\`\`\`powershell\
cd backend\
npm install\
npm run dev\
\`\`\`\
\
For a normal start without watch mode:\
\
\`\`\`powershell\
npm start\
\`\`\`\
\
The API listens on \`http\://localhost:5000\` unless \`PORT\` is changed. The server connects to MongoDB before it begins listening.\
\
\### Step 5: Install and run the frontend\
\
Open a second terminal at the repository root:\
\
\`\`\`powershell\
npm install\
npm run dev\
\`\`\`\
\
Vite normally serves the frontend at \`http\://localhost:5173\`.\
\
\### Step 6: Verify the backend\
\
Open or call:\
\
\`\`\`text\
GET http\://localhost:5000/api/health\
\`\`\`\
\
A successful response reports the API status and whether Mongoose is connected to MongoDB.\
\
\## 14. Configuration reference\
\
\### Root \`.env\` (Vite frontend)\
\
\| Variable                | Example                                           | Purpose                            |\
\| ----------------------- | ------------------------------------------------- | ---------------------------------- |\
\| \`VITE_BACKEND_URL\`      | \`http\://localhost:5000/api\`                       | Backend API base URL used by React |\
\| \`VITE_GOOGLE_CLIENT_ID\` | \`\<your-web-client-id>.apps.googleusercontent.com\` | Google Identity Services client ID |\
\
\### \`backend/.env\`\
\
\| Variable                          | Example                             | Purpose                                                              |\
\| --------------------------------- | ----------------------------------- | -------------------------------------------------------------------- |\
\| \`PORT\`                            | \`5000\`                              | Express port                                                         |\
\| \`NODE_ENV\`                        | \`development\`                       | Runtime environment                                                  |\
\| \`MONGO_URI\`                       | \`mongodb://127.0.0.1:27017/gateway\` | MongoDB connection string                                            |\
\| \`JWT_SECRET\`                      | Random string, 32+ characters       | Signs GateWay JWTs                                                   |\
\| \`JWT_EXPIRES_IN\`                  | \`1d\`                                | GateWay JWT lifetime                                                 |\
\| \`GOOGLE_CLIENT_ID\`                | Same as frontend                    | Verifies Google ID-token audience                                    |\
\| \`CLIENT_URL\`                      | \`http\://localhost:5173\`             | Allowed CORS origin(s); comma-separated values are supported         |\
\| \`GOOGLE_ADMIN_EMAIL\`              | Admin mailbox                       | Comma-separated exact email mapping for Admin role                   |\
\| \`GOOGLE_GUARD_EMAIL\`              | Guard mailbox                       | Comma-separated exact email mapping for Guard role                   |\
\| \`ALLOWED_INSTITUTIONAL_DOMAINS\`   | \`iitrpr.ac.in\`                      | Allowed resident email domains                                       |\
\| \`REQUIRE_WORKSPACE_HOSTED_DOMAIN\` | \`true\`                              | Also require Google's hosted-domain claim to match                   |\
\| \`DEMO_MODE\`                       | \`false\`                             | Demo-only role-selection behavior; keep false outside isolated demos |\
\| \`UPLOAD_DIR\`                      | \`uploads\`                           | Identity-document storage directory, relative to backend             |\
\| \`MAX_UPLOAD_MB\`                   | \`5\`                                 | Per-file upload size limit                                           |\
\| \`SMTP_HOST\`                       | \`smtp.gmail.com\`                    | SMTP server hostname                                                 |\
\| \`SMTP_PORT\`                       | \`587\`                               | SMTP server port                                                     |\
\| \`SMTP_SECURE\`                     | \`false\`                             | Whether SMTP uses implicit TLS (commonly true for port 465)          |\
\| \`SMTP_USER\`                       | Sender mailbox                      | SMTP username                                                        |\
\| \`SMTP_PASS\`                       | App password/provider credential    | SMTP password/credential                                             |\
\| \`MAIL_FROM\`                       | \`GateWay \<sender@example.com>\`      | Display sender address                                               |\
\
Do not commit \`.env\` files, Google client secrets, MongoDB credentials, SMTP credentials or GateWay JWT secrets. The browser only needs the public OAuth Client ID; never put private server credentials in a \`VITE\_\` variable.\
\
\## 15. Testing checklist\
\
Use Postman or another API client. Obtain a GateWay JWT by signing in through Google first. For protected calls, set \`Authorization: Bearer \<GateWay JWT>\`.\
\
Suggested end-to-end order:\
\
1\. \`GET /api/health\` — API and MongoDB health.\
2\. \`POST /api/auth/google-login\` — Google ID token verification and GateWay JWT issuance.\
3\. \`GET /api/auth/me\` — JWT authentication and current profile.\
4\. \`POST /api/passes/create-request\` — create a request with both \`visitorFile\` and \`hostFile\`.\
5\. \`GET /api/visitors\` — confirm the resident can see their own request.\
6\. \`GET /api/admin/visitors\` — confirm Admin can see pending requests.\
7\. \`PATCH /api/admin/approve/:id\` — approve and inspect email delivery result.\
8\. \`GET /api/guard/verify/:value\` — verify pass eligibility.\
9\. \`POST /api/guard/check-in/:id\` and \`POST /api/guard/check-out/:id\` — record gate transitions.\
10\. \`GET /api/admin/audit-logs\` and \`GET /api/guard/audit.csv\` — inspect activity logs and export.\
\
Also test negative cases: no JWT (\`401\`), wrong role (\`403\`), unknown visitor (\`404\`), invalid request data (\`400\`), and an invalid state transition (\`409\`). Confirm real SMTP delivery using a mailbox you control; a simulated development email is not a delivered email.\
\
\## 16. Security and deployment notes\
\
\- Google ID tokens are verified by the backend using the configured OAuth Client ID; the browser cannot grant itself an Admin or Guard role in normal mode.\
\- \`DEMO_MODE=true\` intentionally relaxes privileged role selection for demonstrations. Do not enable it in a public or production deployment.\
\- Protected APIs use GateWay JWT verification plus database-backed active-user and role checks.\
\- The app stores a random QR token in the visitor record. The QR payload does not contain the visitor's personal information; the Guard API performs the authoritative database check.\
\- Aadhaar input is redacted before it is stored. Passport values are retained in normalized uppercase form. Handle all identity data as sensitive.\
\- Identity documents are not publicly statically served. The document route checks ownership or an operational Admin/Guard role.\
\- Gate actions are validated server-side against approval state, blacklist state, visit dates and current gate state.\
\- The SMTP development fallback can mark a simulated email as sent. Do not interpret that as real delivery.\
\- Local-disk uploads may be lost on redeploy or instance replacement. Production requires private persistent storage, backups, retention/deletion controls and suitable access monitoring.\
\- Add HTTPS, production CORS origins, secrets management, database access controls and operational monitoring before real campus use.\
\
\---\
\
\## Contributors\
\
\- Mansi Verma\
\- Vishal Huneria\