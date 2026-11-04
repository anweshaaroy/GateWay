# GateWay – Backend Documentation

## 1. Project Overview

**GateWay** is a web-based Gate Security Management System designed to digitize and simplify visitor entry management within an institute or campus.

The backend provides REST APIs that connect the frontend application with the database. It manages authentication, visitor requests, approval workflows, QR-based visitor passes, email notifications, and gate verification.

The system helps reduce manual paperwork and provides a structured process for managing visitor access.

### Key Features

- Google OAuth-based user authentication.
- JWT-based session management and authorization.
- Role-based access control for different user categories.
- Visitor request creation and management.
- Visitor approval and rejection workflow.
- QR-code-based visitor passes.
- Email notifications containing visitor pass details.
- Guard-side QR verification and gate entry/exit operations.
- Support for accompanying visitors through family headcount.
- Audit logging for tracking important system activities.
- Secure handling of uploaded identity documents.

---

## 2. Backend Responsibilities

The backend acts as the central processing layer of GateWay.

Its major responsibilities include:

1. **Authentication:** Verifies users through Google OAuth and manages authenticated sessions using JWT.
2. **Authorization:** Restricts access to APIs according to user roles.
3. **Visitor Management:** Creates, updates, retrieves, and manages visitor requests.
4. **Approval Management:** Allows authorized users to approve or reject visitor requests.
5. **QR Pass Generation:** Generates QR-based passes for approved visitors.
6. **Email Notifications:** Sends visitor pass information through email.
7. **Gate Management:** Supports QR verification and visitor entry/exit tracking.
8. **Database Management:** Stores and retrieves application data using MongoDB.
9. **Audit Logging:** Maintains records of important actions performed within the system.

---

## 3. Technology Stack

| Component | Technology |
|---|---|
| Runtime Environment | Node.js |
| Backend Framework | Express.js |
| Database | MongoDB |
| ODM | Mongoose |
| Authentication | Google OAuth |
| Authorization | JSON Web Token (JWT) |
| QR Code Generation | QR Code Library |
| Email Service | Nodemailer / SMTP |
| File Uploads | Multer |
| API Architecture | REST API |

---

## 4. Backend Architecture

The backend follows a modular architecture in which different responsibilities are separated into routes, controllers, models, middleware, and utility modules.

### Request Flow

```text
Frontend Application
        |
        v
    HTTP Request
        |
        v
   Express Server
        |
        v
     API Routes
        |
        v
Authentication / Authorization Middleware
        |
        v
    Controllers
        |
        v
  Mongoose Models
        |
        v
      MongoDB
        |
        v
   HTTP Response
        |
        v
Frontend Application
```

### Main Components

- **Routes:** Define API endpoints and connect requests to their corresponding controllers.
- **Middleware:** Handles authentication, authorization, validation, and other request-processing operations.
- **Controllers:** Contain application logic and process incoming requests.
- **Models:** Define MongoDB document structures using Mongoose schemas.
- **Utilities:** Handle reusable operations such as QR generation, email delivery, and other helper functions.

---

## 5. Database Design

GateWay uses MongoDB as its primary database. Mongoose is used to define schemas and interact with database collections.

The major data models include:

### 5.1 User Model

The User model stores information about registered users.

Typical information includes:

- User name
- Email address
- Google authentication details
- User role
- Department or institute-related details
- Other profile information required by the application

The system supports different roles:

- Student
- Faculty
- Official
- Admin
- Guard

These roles determine which application features and APIs a user can access.

### 5.2 Visitor Model

The Visitor model stores information related to visitor requests and their approval status.

Important fields include:

| Field | Description |
|---|---|
| Visitor ID | Unique identifier for a visitor request |
| Name | Name of the visitor |
| Contact Details | Visitor contact information |
| Purpose | Reason for visiting the campus |
| Visit Date | Scheduled date of visit |
| Host Details | Information about the person being visited |
| Status | Current approval status |
| QR Token | Token used for QR-based verification |
| Passcode | Additional visitor pass information, where applicable |
| Accompanying Count | Number of additional people accompanying the primary visitor |
| Total Visitors | Total number of people covered by the request |

### Family Headcount Calculation

The application supports visitors arriving with accompanying family members.

The total visitor count is calculated as:

```javascript
totalVisitors = 1 + accompanyingCount;
```

Here:

- `1` represents the primary visitor.
- `accompanyingCount` represents the additional people.
- `totalVisitors` represents the total number of people included in the request.

The accompanying people are represented through the headcount associated with the primary visitor request, rather than separate visitor requests.

### 5.3 AuditLog Model

The AuditLog model maintains a record of important activities performed within the application.

It helps track system operations and provides accountability.

Audit information may include:

- User who performed the action
- Type of action
- Related record or entity
- Timestamp
- Additional action-related details

---

## 6. Authentication and Authorization

GateWay uses Google OAuth for user authentication and JWT for session management.

### 6.1 Google OAuth Authentication

The authentication process works as follows:

1. The user initiates login through the frontend.
2. Google authentication is performed.
3. The frontend receives a Google ID token.
4. The token is sent to the backend.
5. The backend verifies the token using Google's authentication library.
6. User information is retrieved from the verified token.
7. The backend identifies or creates the corresponding user record.
8. A JWT is generated and returned to the frontend.

### 6.2 JWT Authentication

JSON Web Tokens are used to authenticate subsequent API requests.

The frontend includes the JWT in the authorization header:

```http
Authorization: Bearer <JWT_TOKEN>
```

The authentication middleware verifies the token and makes the authenticated user's information available to protected routes.

### 6.3 Role-Based Authorization

Role-based authorization ensures that users can access only the operations permitted for their roles.

For example:

- Students and other hosts can submit and track visitor requests.
- Authorized officials can review visitor requests.
- Admin users can access administrative operations.
- Guards can perform gate verification and entry/exit operations.

The backend enforces these restrictions through authorization checks on protected routes.

---

## 7. Visitor Request and Approval Workflow

The visitor management workflow covers the complete process from request creation to gate entry.

### 7.1 Visitor Request Creation

1. An authenticated host opens the visitor request section.
2. The host enters the visitor's details.
3. The host provides the visit date and purpose.
4. If applicable, the host enters the number of accompanying people.
5. The frontend sends the request to the backend.
6. The backend validates the request and stores it in MongoDB.
7. The request is made available for the relevant approval process.

### 7.2 Approval and Rejection

1. An authorized user views pending visitor requests.
2. The user reviews the visitor and visit details.
3. The user can approve or reject the request.
4. The backend updates the request status.
5. The system proceeds with the appropriate notification or pass-generation workflow.

### 7.3 QR Pass Generation

After approval, the backend generates the visitor pass information and QR code.

The QR code is associated with the visitor request through its verification token. The generated pass can be shared with the visitor through the configured email workflow.

The QR token is used by the gate verification process to identify and validate the corresponding visitor request.

---

## 8. Email Notification System

GateWay uses an SMTP-based email service, integrated through Nodemailer, to send visitor-related notifications.

The email workflow is used to communicate relevant visitor pass information after approval.

The general process is:

1. The visitor request is approved.
2. The backend prepares the pass information.
3. QR-code information is generated.
4. The email service prepares the notification.
5. The notification is sent using the configured SMTP credentials.

SMTP configuration is maintained through environment variables rather than hardcoded credentials.

---

## 9. Guard Module and Gate Operations

The guard module supports visitor verification at the campus entry and exit points.

### 9.1 QR Code Verification

1. The guard scans the visitor's QR code.
2. The frontend sends the QR token to the backend.
3. The backend verifies the token.
4. The corresponding visitor request is retrieved.
5. The backend checks the request's validity and current gate status.
6. The result is returned to the guard interface.

### 9.2 Entry and Exit Management

The guard interface supports gate operations for recording visitor movement.

The backend validates the requested operation and updates the corresponding gate status.

This helps maintain a record of visitor entry and exit and prevents the frontend from independently deciding whether a QR token is valid.

---

## 10. API Reference

The backend exposes REST API endpoints through Express routes.

The API operations are grouped according to their responsibilities.

| Module | Purpose |
|---|---|
| Authentication | User login and authentication |
| User Management | User profile and role-related operations |
| Visitor Management | Create, retrieve, and manage visitor requests |
| Approval Management | Approve or reject visitor requests |
| QR Verification | Validate visitor QR tokens |
| Gate Management | Record visitor entry and exit |
| File Management | Handle uploaded documents |
| Audit Logs | Track important application activities |

### Common HTTP Methods

| Method | Purpose |
|---|---|
| GET | Retrieve resources |
| POST | Create a resource or perform an operation |
| PUT / PATCH | Update an existing resource |
| DELETE | Delete a resource, where supported |

> **Note:** Refer to the actual route files in the backend for the exact endpoint paths, request parameters, and response structures. This section describes the API modules without assuming route names that may differ in the implementation.

---

## 11. File Upload and Document Handling

The backend supports file uploads for documents required by the application.

Multer is used as the file-upload middleware.

The general upload process is:

1. The frontend sends the file through a multipart/form-data request.
2. Multer processes the incoming file.
3. The backend validates and handles the uploaded document.
4. The relevant file information is associated with the application record.

Identity documents and other sensitive files should be accessible only through authorized application flows.

---

## 12. Audit Logging

Audit logging helps maintain traceability of important operations.

The backend records relevant activities so that application actions can be reviewed when required.

Examples of activities that may be logged include:

- Visitor request creation
- Approval or rejection
- Gate verification
- Visitor entry and exit
- Administrative operations

Audit logs help improve accountability and support debugging and monitoring.

---

## 13. Dependencies

The backend uses Node.js packages to implement its server-side functionality.

The main dependency categories include:

| Dependency | Purpose |
|---|---|
| express | HTTP server and REST API routing |
| mongoose | MongoDB object modeling |
| jsonwebtoken | JWT generation and verification |
| google-auth-library | Google ID token verification |
| nodemailer | Email notifications |
| multer | File upload handling |
| dotenv | Environment variable configuration |
| QR code package | QR code generation |
| cors | Cross-origin request handling |

The exact installed package versions are maintained in `package.json` and `package-lock.json`.

---

## 14. Local Setup and Installation

Follow these steps to run the backend locally.

### Prerequisites

Make sure the following are installed:

- Node.js
- npm
- MongoDB or access to a MongoDB database
- Git

### Step 1: Clone the Repository

```bash
git clone https://github.com/anweshaaroy/GateWay.git
```

### Step 2: Navigate to the Backend Directory

```bash
cd GateWay/backend
```

### Step 3: Install Dependencies

```bash
npm install
```

### Step 4: Configure Environment Variables

Create a `.env` file in the backend directory and add the configuration required by the application.

Use the actual variable names referenced in the backend source code.

Example configuration template:

```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
GOOGLE_CLIENT_ID=your_google_client_id
SMTP_HOST=your_smtp_host
SMTP_PORT=your_smtp_port
SMTP_USER=your_smtp_username
SMTP_PASS=your_smtp_password
```

> **Important:** This is a configuration template. Check the backend source code for the exact environment variable names and required values. Do not commit the `.env` file or expose credentials in the repository.

### Step 5: Start the Backend Server

Use the start command defined in `package.json`.

For example:

```bash
npm start
```

If the project defines a development script, it can be started using:

```bash
npm run dev
```

The server will start on the configured port.

---

## 15. Testing Checklist

The following scenarios should be tested to verify the backend functionality.

### Authentication

- [ ] Google login works with valid credentials.
- [ ] Invalid Google tokens are rejected.
- [ ] JWT authentication works for protected routes.
- [ ] Unauthorized requests are rejected.
- [ ] Role-based restrictions are enforced.

### Visitor Management

- [ ] A visitor request can be created.
- [ ] Required fields are validated.
- [ ] Visitor details are stored correctly.
- [ ] Accompanying visitor count is handled correctly.
- [ ] Visitor requests can be retrieved.

### Approval Workflow

- [ ] Authorized users can approve requests.
- [ ] Authorized users can reject requests.
- [ ] Request status is updated correctly.
- [ ] Unauthorized users cannot perform approval operations.

### QR and Gate Operations

- [ ] QR codes are generated for approved requests.
- [ ] Valid QR tokens are accepted.
- [ ] Invalid QR tokens are rejected.
- [ ] Gate status is synchronized after verification.
- [ ] Entry and exit operations update the correct visitor record.

### Email and Documents

- [ ] Email notifications are sent using the configured SMTP service.
- [ ] Uploaded documents are processed correctly.
- [ ] Unauthorized access to protected documents is prevented.

### Audit Logging

- [ ] Important actions are recorded.
- [ ] Audit records contain the relevant action details.
- [ ] Audit information can be retrieved by authorized users.

---

## 16. Security and Deployment Considerations

The following practices are important for maintaining the security and reliability of GateWay.

- Store secrets and credentials in environment variables.
- Never commit `.env` files or sensitive credentials to GitHub.
- Verify Google ID tokens on the backend.
- Validate JWTs before allowing access to protected APIs.
- Apply role-based authorization to sensitive operations.
- Validate and sanitize incoming request data.
- Restrict access to uploaded identity documents.
- Validate QR tokens on the backend rather than trusting frontend results.
- Handle errors without exposing sensitive internal information.
- Use secure SMTP credentials for email notifications.
- Maintain audit logs for important operations.
- Configure CORS and production settings appropriately before deployment.

---

## 17. Contributors

| Name | Contribution |
|---|---|
| Mansi Verma | Backend Development |
| Vishal Huneria | Project Development |

---

## 18. Conclusion

The GateWay backend provides the core functionality required for a digital visitor and gate security management system.

By combining REST APIs, MongoDB, Google OAuth, JWT authentication, QR-based verification, email notifications, and role-based access control, it supports a structured visitor approval and entry-management workflow.

The modular backend architecture also makes the application easier to maintain, test, and extend with additional features in the future.