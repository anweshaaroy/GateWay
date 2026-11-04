# GateWay

> **Smart Campus Access & Authentication System**  
> An enterprise-grade, role-based digital verification and access management platform engineered to automate visitor sponsorships, enforce institutional identity policies, and provide real-time optical QR authentication at physical campus checkpoints.
>
> **Now available as an installable Progressive Web App (PWA) across PC, Android, and iOS devices.**

---

## 🏛 Executive Overview

Manual gate registers in large university campuses and residential institutions frequently lead to security vulnerabilities, manual record tamperings, long perimeter queues, and an absence of host accountability. 

**GateWay** establishes an end-to-end cryptographic and optical verification workflow connecting three vital operational stakeholders:
1. **Campus Residents (Host Sponsors):** Students and faculty who initiate pre-approved visitor clearance accompanied by digital identity proofs and family headcount.
2. **Security Desk Officers:** Administrative supervisors who inspect KYC records, evaluate visitor clearance, and enforce perimeter blacklist policies.
3. **Gate Terminal Guards:** Checkpoint personnel armed with hardware-level optical QR recognition to execute instant check-in, check-out, and group headcount verification.

---

## ⚡ Key Highlights & Capabilities

- **Zero-Trust Institutional Access:** Email domain white-listing ensures strictly verified university personnel (`@iitrpr.ac.in`) can request gate entry.
- **Dual-Party KYC Verification:** Pairs government identification (Aadhaar/Passport) with resident verification credentials before pass issuance.
- **Progressive Web App (PWA):** Installable on any Android phone, Windows PC, macOS, or iOS device directly from the browser with offline caching and background auto-updates.
- **Family & Group Headcount Management:** Allows single-lead pre-registration for visiting families and groups (up to 30 members) without filling repetitive individual forms.
- **Official IIT Ropar Hostels Integration:** Structured hostel selector for Satluj, Beas, Chenab, Raavi, Brahmaputra South/North, T6, Chintpurni, and Faculty residences with room binding.
- **Live Hardware Optical Scanning 2.0:** Multi-camera auto-detection (`Html5Qrcode.getCameras()`), dynamic aspect ratio scaling, lens switcher, and an "Upload QR Image" fallback option.
- **Real-Time Database Verification:** Instant gate validation querying passcodes, visitor IDs, and 64-character encrypted `qrToken` hashes directly against MongoDB.
- **Temporal Stay Boundary Enforcement:** Real-time date interval calculators prevent pass reuse and detect overstay breaches automatically.
- **Interactive KYC Document Console:** Built-in viewer with multi-level scaling, canvas panning, and $90^\circ$ continuous image rotation for border security checks.
- **Real-Time Operational Audit:** Immediate export of perimeter event logs to RFC-compliant CSV files.

---

## 🔄 System Architecture & Event Pipeline

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
      │ • Aadhaar / Passport Valid. │       │ • Demographic Metrics       │       │ • Passcode Search Engine    │
      │ • Family Headcount Counter  │       │ • Blacklist Security Toggle │       │ • Headcount Gate Validation │
      │ • Official Hostels Dropdown │       │ • Document Inspector Trigger│       │ • Automated Overstay Alert  │
      │ • Dynamic Pass Preview      │       │ • Group Pass Size Badge     │       │ • Gate Check-IN / Check-OUT │
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
                                      │ • InstallPrompt: Cross-Device Download  │
                                      └─────────────────────────────────────────┘
```

---

## 📦 Component Architecture & Responsibilities

### 1. `LoginModal.jsx` — Institutional Identity Gate
- **Domain Whitelisting:** Enforces strict domain ending rules (`@iitrpr.ac.in`), eliminating unauthenticated guest entries.
- **Contextual Role Routing:** Seamlessly branches access between **Resident**, **Security Admin**, and **Gate Guard** personas.
- **Roll Number Binding:** Dynamically reveals and binds academic student roll/entry credentials (e.g. `2026CSM1042`).
- **Google Sign-In + JWT:** ID token verified on the server; roles enforced on every API route.

### 2. `ResidentPortal.jsx` — Visitor Sponsorship & Headcount
- **KYC Formatting Rules:** Validates 12-digit numeric Aadhaar cards and international alphanumeric Passport formats.
- **Family & Group Headcount Counter:** Enables students/residents to specify accompanying member headcounts (e.g. `+4` creates a total group of 5) under a single lead sponsor pass.
- **IIT Ropar Accommodation Selector:** Direct selector with all 8 official hostels (*Satluj, Beas, Chenab, Raavi, Brahmaputra South, Brahmaputra North, T6, Chintpurni, Faculty Enclave, Guest House*) and optional room number binding.
- **Binary Proof Attachments:** Handles local blob generation for `.jpg`, `.jpeg`, and `.pdf` verification documents.
- **Dynamic Stay Evaluation:** Automatically computes length-of-stay parameters (`exitDate - arrivalDate + 1`) and restricts date inversions.
- **Live Pass Ticket:** Delivers an instant visual representation of the clearance pass with real-time state badges, headcount indicators, and email dispatch.

### 3. `AdminDesk.jsx` — Security Clearance & Control
- **Authorization Queue:** Centralizes pending visitor applications requiring officer review.
- **Group Awareness:** Highlights family and group size badges (`👥 X Persons`) on incoming clearance applications.
- **Perimeter Blacklist Engine:** Enables one-click blacklisting/flagging of suspicious entities to block campus entry.
- **Live Demographic Meters:** Real-time progress bars analyzing Purpose ratios (Academic vs. Personal) and Premises distribution (Faculty vs. Hostels).
- **Inspection Dispatch:** Mounts high-resolution verification modal components for credential proof auditing.

### 4. `GuardTerminal.jsx` — Physical Checkpoint Station
- **Hardware Optical Scanning 2.0:** Mounts a high-frame camera stream via `html5-qrcode` with multi-camera selection, rear camera priority on mobile, dynamic bounding boxes, and an **"Upload QR Image"** file alternative.
- **Real-Time Verification API:** Directly queries `GET /api/guard/verify/:code` to authenticate passcodes, visitor IDs, and encrypted 64-character `qrToken` strings.
- **Headcount Entry Gate Alert:** Displays total authorized headcount in the verification alert (e.g. `👥 Total Headcount: 5 Persons (1 Lead + 4 Accompanying)`) so guards can admit the entire family under one pass.
- **Multi-Vector Directory Search:** Enables rapid filtering across 4-digit passcodes, visitor names, host apartments, and email addresses.
- **Overstay Sentinel:** Detects visitors who exceed allowed visit durations while remaining inside the premises.
- **Spot Walk-In Passes:** Permits guards to issue instant passes with custom group headcount for unexpected visitors.
- **CSV Data Log:** Instant local export of time-stamped perimeter log data for security archives.

### 5. `InstallPrompt.jsx` — Cross-Platform PWA Installer
- **Native Install Trigger:** Captures the browser's `beforeinstallprompt` event to enable 1-click installation on PC, Android, and iOS.
- **Header & Mobile Banner:** Presents a non-intrusive "Install App" button in the navigation bar and a floating bottom prompt.
- **Auto-Dismiss:** Automatically hides when running inside an installed standalone window.

### 6. `Modals.jsx` — High-Resolution Inspection & Token Engines
- **`LargeDocModal`:** Equips officers with Zoom In/Out, Canvas Reset, and continuous $90^\circ$ rotation to scrutinize uploaded proofs.
- **`QrGeneratedModal`:** Emits SVG-based QR code matrices with Level-H error correction for rapid scanning under varying lighting conditions.

---

## 🛠 Tech Stack & Dependencies

| Layer | Technology | Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Runtime & Core** | React | `^19.x` | Component-based state architecture & unidirectional data flow |
| **Build Toolchain** | Vite | `^8.x` | High-speed Hot Module Replacement (HMR) and production bundling |
| **PWA Engine** | Vite Plugin PWA | `^2.x` | Service worker generation, asset precaching, and Web App Manifest |
| **CSS Architecture** | Tailwind CSS | `^3.x` | Responsive layout utility system with custom design tokens |
| **Iconography** | Lucide React | Latest | Crisp, accessible interface iconography |
| **Camera Scanner** | HTML5-QRCode | `^2.3.8`| Client-side camera feed handling & optical matrix decoding |
| **Matrix Generator** | QRCode.React | `^4.x` | Error-tolerant SVG QR vector rendering |
| **Authentication** | @react-oauth/google | `^0.13.x` | Google Identity Services OAuth 2.0 integration |
| **HTTP Client** | Axios | `^1.x` | Promise-based backend API communication |

---

## 📁 Source Code Structure

```
GateWay/
├── public/
│   ├── favicon.svg                   # Brand vector icon
│   ├── apple-touch-icon.png          # iOS home screen icon (180x180)
│   ├── pwa-192x192.png               # Android home screen icon (192x192)
│   ├── pwa-512x512.png               # Splash screen & desktop icon (512x512)
│   ├── pwa-maskable-192x192.png      # Android adaptive maskable icon (192x192)
│   └── pwa-maskable-512x512.png      # Android adaptive maskable icon (512x512)
├── src/
│   ├── assets/                       # Vector icons & imagery
│   ├── components/
│   │   ├── LoginModal.jsx            # Role-based identity & domain validation
│   │   ├── ResidentPortal.jsx        # Visitor pre-registration, headcount & hostels
│   │   ├── AdminDesk.jsx             # Security officer approval & analytics
│   │   ├── GuardTerminal.jsx         # Hardware QR scanning & checkpoint logs
│   │   ├── InstallPrompt.jsx         # Cross-device PWA install trigger & banner
│   │   └── Modals.jsx                # Interactive doc viewer & QR token modal
│   ├── App.jsx                       # Global state controller & session pipeline
│   ├── main.jsx                      # React root mount point & OAuth provider
│   └── index.css                     # Global Tailwind CSS directives
├── .env                              # Frontend environment config (VITE_BACKEND_URL)
├── index.html                        # HTML entry point with PWA meta tags
├── package.json                      # Project dependencies and script declarations
├── tailwind.config.js                # Tailwind styling rules and breakpoints
└── vite.config.js                    # Vite configuration with VitePWA plugin
```

---

## 💻 Local Development Setup

### 1. Prerequisites
- **Node.js**: `v20.0.0` or higher
- **npm**: `v10.0.0` or higher

### 2. Installation
Clone the repository and install the project dependencies:
```bash
git clone https://github.com/anweshaaroy/GateWay.git
cd GateWay
npm install
```

### 3. Environment Setup
Create a `.env` file in the root directory:
```env
VITE_BACKEND_URL=https://your-backend-api.onrender.com/api
VITE_GOOGLE_CLIENT_ID=your_google_client_id_here.apps.googleusercontent.com
```

### 4. Launch Development Server
```bash
npm run dev
```
Open your browser and navigate to `http://localhost:5173`.

---

## 🚀 Production Deployment

### Frontend (Cloudflare Pages)
- **Live URL:** `https://gateway-iitrpr.anwesharoy0177.workers.dev`
- **Auto-Deployment:** Connected to GitHub on branch `main`. Any `git push origin main` triggers an automatic build and live update in ~1 minute.
- **Manual CLI Deploy:**
  ```powershell
  npm run build
  npx wrangler pages deploy dist --project-name gateway-iitrpr
  ```

### Backend (Render Web Service)
- **Live API:** `https://gateway-eyqt.onrender.com/api`
- **Auto-Deployment:** Connected to GitHub on branch `main`. Pushing commits to `main` automatically redeploys the Express backend.

---

## 🔒 Security & Privacy Standards

- **ID Redaction:** Sensitive national identification numbers (such as Aadhaar) are masked upon pass persistence.
- **Strict Client-Side Validation:** Form inputs are sanitized and restricted to certified MIME types (`.jpg`, `.jpeg`, `.pdf`) before processing.
- **Cryptographic Token Passcodes:** QR codes embed 64-character hexadecimal security tokens with zero third-party tracking scripts.

---

## 👥 Contributors

- **Anwesha Roy** ([@anweshaaroy](https://github.com/anweshaaroy)) — *Project Architecture, Authentication System & Institutional SSO (`LoginModal.jsx`), Resident Sponsorship Portal & Family Headcount (`ResidentPortal.jsx`), Security Admin Clearance Desk (`AdminDesk.jsx`), Cloudflare CI/CD Deployment*
- **Kirti Kumari** ([@kirtikumari2004](https://github.com/kirtikumari2004)) — *Guard Checkpoint Terminal (`GuardTerminal.jsx`), Hardware Optical QR Scanner 2.0, Document Inspection & Pass QR Engines (`Modals.jsx`), Cross-Device PWA Installer (`InstallPrompt.jsx`)*
