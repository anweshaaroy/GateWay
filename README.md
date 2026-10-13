<div align="center">

#  GateWay
### Smart Campus Access & Authentication System

[![React](https://img.shields.io/badge/React-18.x-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5.x-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.x-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)](LICENSE)
[![Status](https://img.shields.io/badge/System_Status-Active_Development-brightgreen?style=for-the-badge)]()

<p align="center">
  <b>A zero-friction, cryptographic digital clearance platform engineered to modernize campus gates, secure multi-tenant facilities, and replace physical paper logbooks.</b>
</p>

[Key Features](#-core-capabilities) •
[System Architecture](#-system-architecture) •
[Component Deep-Dive](#-component-architecture--engineering) •
[Mobile Camera & HTTPS Testing](#-mobile-camera-testing--tunneling-setup) •
[Getting Started](#-local-deployment--installation) •
[Roadmap](#-system-roadmap)

---

</div>

##  Executive Overview

Traditional campus checkposts and residential guard stations rely on paper logbooks, manual phone calls, and physical visitor badges. These legacy practices cause long entry queues, compromise resident privacy, and result in unverified, illegible visitor records.

**GateWay** modernizes campus security operations through a unified, responsive client-side web application. It transitions visitor clearance from reactive gatekeeper phone calls to proactive resident authorization. Verified residents generate digital access passes directly from their personal mobile devices, and gate security verifies those passes using optical QR code recognition in real time.

---

##  Core Capabilities

-  **Multi-Tier Role Governance:** Dedicated authentication flows tailored for **Residents**, **Campus Security Personnel**, and **System Administrators**.
-  **Instant Visitor Token Generation:** Pre-clearance pass construction with integrated resident attribution, contact validation, and automated validity expiration.
-  **Client-Side Cryptographic QR Synthesis:** Generates lightweight, scannable JSON tokens rendered directly as vector graphics without latency or server dependencies.
-  **Zero-Config Mobile Camera Integration:** Cross-network hardware camera access via secure HTTPS tunnels, supporting native hardware video scanning on mobile devices.
-  **Ultra-Responsive Native UI:** Touch-optimized, accessible interfaces designed using Tailwind CSS primitives for performance on mobile browsers and desktop monitors.

---

##  System Architecture

GateWay operates through an asynchronous clearance pipeline that decouples token creation from security gate verification:

```
                      +---------------------------------------+
                      |         Unified Auth Station          |
                      |          (LoginModal.jsx)             |
                      +-------------------+-------------------+
                                          |
                      [ Verified Credentials & Role Session ]
                                          |
                                          v
                      +---------------------------------------+
                      |       Resident Clearance Portal       |
                      |         (ResidentPortal.jsx)          |
                      +-------------------+-------------------+
                                          |
                        • Visitor Identity Validation
                        • Unit / Flat Number Attribution
                        • Expiration Window Specification
                                          |
                                          v
                      +---------------------------------------+
                      |      Cryptographic JSON Payload       |
                      |       (Client Vector Synthesis)       |
                      +-------------------+-------------------+
                                          |
                               [ Digital QR Gate Pass ]
                                          |
                                          v
                      +---------------------------------------+
                      |        Security Checkpoint Feed       |
                      |         (WebRTC Optical Stream)       |
                      +---------------------------------------+
```

---

##  Component Architecture & Engineering

### 1. Unified Authentication Gate (`src/components/LoginModal.jsx`)

The authentication layer handles credential intake and context hydration without triggering destructive full-page browser updates.

- **Dynamic Role Adaptation:** Switches interface states, security disclaimers, and credential constraints dynamically between **Resident**, **Gate Officer**, and **Admin Console** modes.
- **Strict Client-Side Validation:** Enforces credential formatting and institutional email regex matching before session creation.
- **Accessibility & Focus Containment:** Includes keyboard hotkey bindings (`Esc` to dismiss), click-outside backdrop isolation, and trapped focus states for accessibility compliance.

### 2. Resident Clearance & Token Engine (`src/components/ResidentPortal.jsx`)

The resident dashboard acts as the primary pass-authoring station, providing residents with complete governance over guest invitations.

- **Pre-Approval Form Controls:** Captures visitor metadata (Full Name, Phone Number, Host Unit ID, Purpose of Visit, and Expected Time Window).
- **In-Memory Token Synthesis:** Compiles visitor clearance data into a standardized JSON payload, encoding it directly into high-contrast QR matrices.
- **Dynamic Pass Lifecycles:** Tracks pass states through distinct stages: `Active`, `Validated`, and `Revoked`.
- **Revocation Safety Trigger:** Enables residents to cancel access permissions instantly, invalidating passes if visit details change.

---

##  Mobile Camera Testing & Tunneling Setup

Modern smartphone browsers (iOS Safari, Android Chrome) enforce the **W3C WebRTC Secure Context Specification**: optical camera APIs (`navigator.mediaDevices.getUserMedia`) are strictly blocked over plain `http://` connections outside `localhost`.

To test the full physical clearance flow using real mobile cameras across Wi-Fi or mobile data connections:

### Step 1: Configure Vite for Remote Proxies

Ensure your `vite.config.js` accepts forwarded host headers:

```javascript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    allowedHosts: true // Permits secure proxy tunneling
  }
});
```

### Step 2: Launch the Local Server

```bash
npm run dev
```

### Step 3: Expose Secure HTTPS Tunnel

In a separate terminal window, launch a Cloudflare tunnel to generate an authenticated public HTTPS endpoint:

```bash
npx cloudflared tunnel --url http://localhost:5173
```

Copy the generated URL (e.g., `https://secure-tunnel-id.trycloudflare.com`) and open it on your mobile device to test optical QR scanning with native camera permissions.

---

##  Technology Stack

| Layer | Technology | Purpose & Responsibility |
| :--- | :--- | :--- |
| **Runtime Environment** | Node.js (v18+ / v20+) | Execution environment for local tools and dependencies |
| **Core Framework** | React 18 | Declarative component UI and state workflows |
| **Build Tooling** | Vite 5 | Fast Hot Module Replacement (HMR) and production builds |
| **Styling Framework** | Tailwind CSS 3 | Modular CSS design system and responsive grid layouts |
| **Icon Library** | Lucide React | High-clarity iconography for controls and dashboards |
| **Edge Tunneling** | Cloudflare Tunnels | Encrypted HTTPS endpoints for hardware camera testing |

---

##  Local Deployment & Installation

### Prerequisites

Ensure you have the following installed locally:
- **Node.js**: `v18.0.0` or higher
- **npm**: `v9.0.0` or higher
- **Git**: Installed and configured

### Installation Steps

1. **Clone the repository:**
   ```bash
   git clone https://github.com/anweshaaroy/GateWay.git
   cd GateWay
   ```

2. **Install project dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

4. **Open in browser:**
   Navigate to `http://localhost:5173` to test the application locally.

---

## 🗺️ System Roadmap

- [x] **Core Identity Gate (`LoginModal.jsx`):** Multi-role credential modal with state isolation.
- [x] **Resident Clearance Station (`ResidentPortal.jsx`):** Token authoring, pass generator, and vector QR engine.
- [ ] **Gatekeeper Optical Terminal (`GuardTerminal.jsx`):** WebRTC camera stream scanner with instant token verification.
- [ ] **Campus Administration Console (`AdminDesk.jsx`):** Occupancy registers, active visitor telemetry, and security audit logs.

---

##  Author & Lead Architect

**Anwesha Roy**  
GitHub: [@anweshaaroy](https://github.com/anweshaaroy)  
*Architecture, system design, authentication interfaces, and resident access systems.*

---

<div align="center">
  <sub>Built for reliable campus and residential gate security.</sub>
</div>