# GateWay

> **Smart Campus Access & Authentication System**  
> An enterprise-grade, role-based digital verification and access management platform engineered to automate visitor sponsorships, enforce institutional identity policies, and provide real-time optical QR authentication at physical campus checkpoints.

---

##  Executive Overview

Manual gate registers in large university campuses and residential institutions frequently lead to security vulnerabilities, manual record tamperings, long perimeter queues, and an absence of host accountability. 

**GateWay** establishes an end-to-end cryptographic and optical verification workflow connecting three vital operational stakeholders:
1. **Campus Residents (Host Sponsors):** Students and faculty who initiate pre-approved visitor clearance accompanied by digital identity proofs.
2. **Security Desk Officers:** Administrative supervisors who inspect KYC records, evaluate visitor clearance, and enforce perimeter blacklist policies.
3. **Gate Terminal Guards:** Checkpoint personnel armed with hardware-level optical QR recognition to execute instant check-in and check-out logs.

---

##  Key Highlights & Capabilities

-  **Zero-Trust Institutional Access:** Email domain white-listing ensures strictly verified university personnel can request gate entry.
-  **Dual-Party KYC Verification:** Pairs government identification (Aadhaar/Passport) with resident verification credentials before pass issuance.
-  **Live Hardware Optical Scanning:** Native camera-based frame parser powered by `html5-qrcode` to decode visitor QR tokens without auxiliary hardware.
-  **Temporal Stay Boundary Enforcement:** Real-time date interval calculators prevent pass reuse and detect overstay breaches automatically.
-  **Interactive KYC Document Console:** Built-in viewer with multi-level scaling, canvas panning, and $90^\circ$ continuous image rotation for border security checks.
-  **Real-Time Operational Audit:** Immediate export of perimeter event logs to RFC-compliant CSV files.

---

##  System Architecture & Event Pipeline

```
                               ┌────────────────────────────────────────────────────────┐
                               │                    GATEWAY PLATFORM                    │
                               │        [ Institutional Email & Role Dispatcher ]       │
                               └───────────────────────────┬────────────────────────────┘
                                                           │
                                                           ▼
                                      ┌─────────────────────────────────────────┐
                                      │             LoginModal.jsx              │
                                      │    (@iitrpr.ac.in / Institutional SSO)  │
                                      └────────────────────┬────────────────────┘
                                                           │
                     ┌─────────────────────────────────────┼─────────────────────────────────────┐
                     │                                     │                                     │
                     ▼                                     ▼                                     ▼
      ┌─────────────────────────────┐       ┌─────────────────────────────┐       ┌─────────────────────────────┐
      │       RESIDENT PORTAL       │       │      ADMIN SECURITY DESK    │       │     GUARD CHECKPOINT POST   │
      │    (ResidentPortal.jsx)     │       │       (AdminDesk.jsx)       │       │    (GuardTerminal.jsx)      │
      ├─────────────────────────────┤       ├─────────────────────────────┤       ├─────────────────────────────┤
      │ • Visitor Details & Purpose │       │ • Pre-Clearance Queue       │       │ • Optical Hardware Scanner  │
      │ • Aadhaar / Passport Validation     │ • Demographic Metrics       │       │ • Passcode Search Engine    │
      │ • Host Residence Proof      │       │ • Blacklist Security Toggle │       │ • Automated Overstay Alert  │
      │ • Dynamic Pass Preview      │       │ • Document Inspector Trigger│       │ • Gate Check-IN / Check-OUT │
      └──────────────┬──────────────┘       └──────────────┬──────────────┘       └──────────────┬──────────────┘
                     │                                     │                                     │
                     └─────────────────────────────────────┼─────────────────────────────────────┘
                                                           │
                                                           ▼
                                      ┌─────────────────────────────────────────┐
                                      │             SECURITY MODALS             │
                                      │              (Modals.jsx)               │
                                      ├─────────────────────────────────────────┤
                                      │ • LargeDocModal: Zoom & Inspection Tool │
                                      │ • QrGeneratedModal: Vector Token Pass   │
                                      └─────────────────────────────────────────┘
```

---

##  Component Architecture & Responsibilities

### 1. `LoginModal.jsx` — Institutional Identity Gate
- **Domain Whitelisting:** Enforces strict domain ending rules (`@iitrpr.ac.in`, `@campus.edu`), eliminating unauthenticated guest entries.
- **Contextual Role Routing:** Seamlessly branches access between **Resident**, **Security Admin**, and **Gate Guard** personas.
- **Roll Number Binding:** Dynamically reveals and binds academic student roll/entry credentials when in student mode.
- **Google Sign-In + JWT** ID token verified on the server; roles enforced on every API route.

### 2. `ResidentPortal.jsx` — Visitor Sponsorship Console
- **KYC Formatting Rules:** Validates 12-digit numeric Aadhaar cards and international alphanumeric Passport formats.
- **Binary Proof Attachments:** Handles local blob generation for `.jpg`, `.jpeg`, and `.pdf` verification documents.
- **Dynamic Stay Evaluation:** Automatically computes length-of-stay parameters (`exitDate - arrivalDate + 1`) and restricts date inversions.
- **Live Pass Ticket:** Delivers an instant visual representation of the clearance pass with real-time state badges.

### 3. `AdminDesk.jsx` — Security Clearance & Control
- **Authorization Queue:** Centralizes pending visitor applications requiring officer review.
- **Perimeter Blacklist Engine:** Enables one-click blacklisting/flagging of suspicious entities to block campus entry.
- **Live Demographic Meters:** Real-time progress bars analyzing Purpose ratios (Academic vs. Personal) and Premises distribution (Faculty vs. Hostels).
- **Inspection Dispatch:** Mounts high-resolution verification modal components for credential proof auditing.

### 4. `GuardTerminal.jsx` — Physical Checkpoint Station
- **Hardware Optical Scanning:** Mounts a high-frame camera stream via `html5-qrcode` to decode visitor QR matrices directly.
- **Multi-Vector Directory Search:** Enables rapid filtering across 4-digit passcodes, visitor names, host apartments, and email addresses.
- **Overstay Sentinel:** Detects visitors who exceed allowed visit durations while remaining inside the premises.
- **E-Pass & Spot Pass** Approved QR pass emailed over SMTP; guards can issue walk-in passes.
- **CSV Data Log:** Instant local export of time-stamped perimeter log data for security archives.

### 5. `Modals.jsx` — High-Resolution Inspection & Token Engines
- **`LargeDocModal`:** Equips officers with Zoom In/Out, Canvas Reset, and continuous $90^\circ$ rotation to scrutinize uploaded proofs.
- **`QrGeneratedModal`:** Emits SVG-based QR code matrices with Level-H error correction for rapid scanning under varying lighting conditions.

---

##  Tech Stack & Dependencies

| Layer | Technology | Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Runtime & Core** | React | `^18.x` | Component-based state architecture & unidirectional data flow |
| **Build Toolchain** | Vite | `^5.x` | High-speed Hot Module Replacement (HMR) and production bundling |
| **CSS Architecture** | Tailwind CSS | `^3.x` | Responsive layout utility system with custom design tokens |
| **Iconography** | Lucide React | Latest | Crisp, accessible interface iconography |
| **Camera Scanner** | HTML5-QRCode | `^2.3.8`| Client-side camera feed handling & optical matrix decoding |
| **Matrix Generator** | QRCode.React | `^4.x` | Error-tolerant SVG QR vector rendering |

---

##  Source Code Structure

```
GateWay/
├── public/                     # Static icons & manifest files
├── src/
│   ├── assets/                 # Vector icons & imagery
│   ├── components/
│   │   ├── LoginModal.jsx      # Role-based identity & domain validation
│   │   ├── ResidentPortal.jsx  # Visitor pre-registration & pass creation
│   │   ├── AdminDesk.jsx       # Security officer approval & analytics
│   │   ├── GuardTerminal.jsx   # Hardware QR scanning & checkpoint logs
│   │   └── Modals.jsx          # Interactive doc viewer & QR token modal
│   ├── App.jsx                 # Global state controller & mock data pipeline
│   ├── main.jsx                # React root mount point
│   └── index.css               # Global Tailwind CSS directives
├── index.html                  # HTML entry point
├── package.json                # Project dependencies and script declarations
├── tailwind.config.js          # Tailwind styling rules and breakpoints
└── vite.config.js              # Vite configuration
```

---

##  Local Development Setup

### 1. Prerequisites
- **Node.js**: `v18.0.0` or higher
- **npm**: `v9.0.0` or higher

### 2. Installation
Clone the repository and install the project dependencies:
```bash
git clone https://github.com/anweshaaroy/GateWay.git
cd GateWay
npm install
```

### 3. Launch Development Server
```bash
npm run dev
```
Open your browser and navigate to `http://localhost:5173`.

---

##  Security & Privacy Standards

- **ID Redaction:** Sensitive national identification numbers (such as Aadhaar) are masked upon pass persistence.
- **Strict Client-Side Validation:** Form inputs are sanitized and restricted to certified MIME types (`.jpg`, `.jpeg`, `.pdf`) before processing.
- **Local Cryptographic Passcodes:** 4-digit unique token codes are generated randomly with zero third-party tracking scripts.

---

##  Contributors

- **Anwesha Roy** ([@anweshaaroy](https://github.com/anweshaaroy)) — *Project Architecture, Authentication System & Resident Portal*
- **Kirti Kumari** ([@kirtikumari2004](https://github.com/kirtikumari2004)) — *Guard Checkpoint Terminal & Verification Modals*
