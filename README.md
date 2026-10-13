# GateWay

> **Intelligent Campus Access & Verification Platform**  
> A unified, role-governed client portal engineered to streamline institutional visitor pre-clearance, mandate dual-proof verification, and phase out paper visitor logs.

---

##  Executive Summary

Modern campus gates face common bottlenecks: physical ledger registers, lack of advance host accountability, and manual credentials checking. **GateWay** provides a zero-friction, browser-first access workflow connecting campus residents directly to digital security verification.

The current implementation establishes the client-side onboarding and authorization foundation across two primary core modules:
1. **Institutional Authentication Gate (`LoginModal.jsx`)**
2. **Resident Pre-Clearance Console (`ResidentPortal.jsx`)**

---

##  Architecture & Component Topology

```
                  ┌──────────────────────────────────────────────┐
                  │          Institutional User / Host           │
                  └──────────────────────┬───────────────────────┘
                                         │
                                         ▼
                  ┌──────────────────────────────────────────────┐
                  │                 GateWay Core                 │
                  ├──────────────────────────────────────────────┤
                  │                                              │
                  │   [1] Role & Domain Auth (LoginModal.jsx)    │
                  │       ├── @iitrpr.ac.in / @campus.edu        │
                  │       └── Persona Switch (Student / Faculty) │
                  │                                              │
                  │   [2] Pass Request Desk (ResidentPortal.jsx) │
                  │       ├── Visitor KYC (Aadhaar / Passport)   │
                  │       ├── Host Endorsement Document          │
                  │       ├── Window & Duration Calculation      │
                  │       └── Dynamic Pass Ticket (Locked QR)    │
                  │                                              │
                  └──────────────────────────────────────────────┘
```

---

##  Implemented Feature Breakdown

### 1. Institutional Authentication Engine (`LoginModal.jsx`)

The front-facing gatekeeper ensuring system access is strictly restricted to valid institutional members.

* **Domain Whitelisting:** Enforces client-side validation against designated academic top-level domains (`@iitrpr.ac.in`, `@campus.edu`).
* **Persona Partitioning:**
  * **Resident Category:** Sub-categorizes users into **Student** or **Faculty**.
  * **Student ID Ingestion:** Demands valid academic Roll / Entry Number when student context is active.
* **Controlled Access Handover:** Yields sanitized session states (`activeUser`) with validation flags consumed by downstream UI containers.
* **Non-Obtrusive Backdrop:** Integrates glassmorphism (`backdrop-blur-md`) to keep campus background context visible during authentication.

---

### 2. Resident Pre-Clearance Console (`ResidentPortal.jsx`)

The operational center where campus members sponsor guests, upload verification artifacts, and inspect passes.

#### A. Guest Intake & Verification Rules
* **Identification Enforcement:** Accepts Aadhaar Card (strictly formatted to 12 digits) or Passport (1 alphabet + 7 digits).
* **Document Upload Pipeline:** Restricts digital ID attachments strictly to `.jpg`, `.jpeg`, and `.pdf` files, dynamically generating object URLs for preview inspection.

#### B. Resident Host Sponsorship
* **Identity Synchronization:** Automatically prepends host titles (`Prof.` or `Student`) and assigns premises locations (Faculty Residential Enclave or Campus Student Hostel) based on authenticated session data.
* **Host Accountability:** Mandates upload of Host Institutional Proof (Student College ID, Faculty Official ID, or Staff Employee Card) alongside the visitor’s credentials.

#### C. Temporal Visit Window & Math
* **Date Range Computation:** Dynamically computes total stay window duration in calendar days (`exitDate - arrivalDate + 1`).
* **Chronological Safeguards:** Rejects past departure dates or negative time spans before pass issuance.

#### D. Live Digital Pass Generation
* **4-Digit Cryptographic Code:** Generates a randomized numeric passcode alongside a high-error-correction (`Level H`) SVG QR matrix.
* **Conditional Lock State:** Displays passes in a "Pending Approval / QR Locked" state until security review occurs.
* **Operational Actions:** Equipped with simulated notification dispatches and client-side browser print formatting (`window.print()`).

---

##  Technology Profile

| Dimension | Tooling | Purpose |
| :--- | :--- | :--- |
| **Runtime / Library** | React 18 | Declarative state management & modular component architecture |
| **Build Pipeline** | Vite 5 | Fast compilation, Hot Module Replacement (HMR), and optimized bundle production |
| **Utility Styling** | Tailwind CSS 3 | Atomic, responsive layout design & status palettes |
| **Visual Language** | Lucide React | Contextual icons across auth forms, document uploads, and ticket cards |
| **Matrix Generation** | `qrcode.react` | Scalable Vector Graphic (SVG) QR rendering with high error resilience |

---

##  Repository Directory Structure

```text
GateWay/
├── public/                 # Static web assets & icons
├── src/
│   ├── assets/             # Brand graphics & styles
│   ├── components/
│   │   ├── LoginModal.jsx      # Institutional domain & role auth
│   │   └── ResidentPortal.jsx  # Visitor clearance & pass rendering
│   ├── App.jsx             # Root layout & active module orchestrator
│   ├── main.jsx            # Application mount point
│   └── index.css           # Global Tailwind directives
├── index.html              # HTML5 application shell
├── package.json            # Node project configuration & dependencies
├── tailwind.config.js      # Utility theme extensions
└── vite.config.js          # Vite configuration
```

---

##  Quick Start

### 1. Clone the repository
```bash
git clone https://github.com/anweshaaroy/GateWay.git
cd GateWay
```

### 2. Install dependencies
```bash
npm install
```

### 3. Run development server
```bash
npm run dev
```

Navigate to `http://localhost:5173` in your browser to interact with the portal.

---

##  Author & Repository

- **Author:** Anwesha Roy ([@anweshaaroy](https://github.com/anweshaaroy))
- **Project Repository:** [GateWay](https://github.com/anweshaaroy/GateWay)