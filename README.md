# ADMITTO — Digital Event Access & Token Scanning Platform

[![Tests](https://img.shields.io/badge/tests-95%20passed-emerald)](https://github.com/RahulNag-V/ADMITTO.Scanner)
[![Live Demo](https://img.shields.io/badge/Live%20Demo-Try%20it%20Now-2ea44f?style=flat&logo=googlechrome&logoColor=white)](https://rahulnag-v.github.io/ADMITTO.Scanner/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-cyan)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6-purple)](https://vitejs.dev/)
[![Offline-First](https://img.shields.io/badge/IndexedDB-50k%2B%20Attendees-orange)](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
[![License: Proprietary](https://img.shields.io/badge/License-Proprietary-red)](#-license--copyright)

**ADMITTO** is a high-performance, offline-resilient event access control and credential verification platform. Engineered for large-scale venues, college festivals, conferences, and exhibitions, ADMITTO supports real-time multi-gate check-ins, custom barcode sub-string extraction, cryptographic QR tokens, and zero-latency hardware scanner integration.

> 🎮 **Try a Live Demo**: Test the scanner, attendee management, and barcode extraction engine directly in your browser:  
> 🔗 **[Launch ADMITTO Live Demo →](https://rahulnag-v.github.io/ADMITTO.Scanner/)**


---

## 🌟 Key Highlights & Capabilities

### 1. ⚙️ Smart Attendee Ingestion & Barcode Extraction Engine
- **5-Step Import Wizard**:
  1. **Upload**: Ingest CSV or Excel (`.xlsx`, `.xls`) files with automatic column and encoding detection.
  2. **Primary Key Mapping**: Dynamically select the unique attendee identifier (e.g., USN, Registration ID, Roll Number, or Email).
  3. **Schema Validation**: Automated sanitization, missing field detection, and format verification.
  4. **QR Code & Barcode Setup**:
     - **QR Payload Mode**: Switch between *Privacy-Safe Cryptographic Token* (database-backed) and *Full Attendee Data* (offline JSON embed).
     - **Barcode Data Target**: Select primary scanning key or any arbitrary column.
     - **Barcode Extraction Configuration**:
       - Extract from **Front** (Beginning) or **End** (Trailing characters).
       - Configurable extraction character length with live bounds enforcement.
       - Optional **Fixed Prefix** and **Fixed Suffix** formatting (e.g. `EVENT-`, `-2026`).
       - Full ID mode fallback.
     - **Strict Section 16 Error Surfacing**: Detects empty or undersized records with zero silent truncation.
     - **Real-Time Collision Prevention**: Instant warning and progression lock if multiple attendees map to the same barcode.
     - **Live Visual Preview**: Real-time transformation preview with uploaded sample data.
  5. **Review & Commit**: Summary statistics and preview table before committing directly to the database and offline stores.

### 2. ⚡ Dual-Engine Scanning & Verification
- **High-Speed QR Scanner**: Instant camera visual decoding via native `BarcodeDetector` API and ZXing fallback.
- **Hardware Barcode Wedge Support**: Seamless compatibility with handheld USB and Bluetooth HID laser/CCD barcode guns with keystroke debounce and buffer handling.
- **Sub-String & Exact Barcode Matching**: Rapidly matches scanned barcodes against the configured sub-string or full identifier.
- **Multi-Gate Anti-Passback**: Real-time check-in tracking prevents duplicate entries across distributed access gates.

### 3. 🛡️ High-Capacity Offline-First Architecture
- **IndexedDB Local Roster**: Caches 50,000+ attendees client-side for sub-millisecond lookups even under complete network failure.
- **Cryptographic Offline Queue**: Logs check-ins locally with tamper-evident timestamps and syncs automatically with Supabase upon reconnection.
- **Dual-Engine Drift Prevention**: Ensures local and remote state consistency across multi-admin sessions.

### 4. 📊 Real-Time Analytics & Live Feeds
- **Live Check-In Telemetry**: Real-time counts, capacity percentages, check-in velocity, and gate distribution charts.
- **Audio & Haptic Feedback**: Distinct acoustic signals and vibration cues for success, duplicate, or invalid scans.
- **Audit Logs & Export**: Comprehensive search, filter, and export of attendance records to CSV/Excel.

---

## 🏗️ Architecture & Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend UI** | React 19, TypeScript, Tailwind CSS, Motion, Lucide Icons |
| **Client Storage** | IndexedDB via `idb` for offline high-capacity roster caching |
| **Scanning Engines** | `html5-qrcode`, Native BarcodeDetector API, HID Keyboard Wedge Listener |
| **Data Parsing** | PapaParse (CSV), SheetJS `xlsx` (Excel) |
| **Backend & Sync** | Node.js Express server, Supabase PostgreSQL, Supabase Realtime |
| **Build & Tooling** | Vite 6, `@vitejs/plugin-react`, `vite-plugin-pwa`, `esbuild`, `tsx` |
| **Test Suite** | Vitest with 13 test suites and 95 unit, security, and integration tests |

---

## 📁 Repository Structure

```text
├── src/
│   ├── components/         # Reusable UI components & modals
│   │   ├── AddStudentModal.tsx
│   │   ├── CreateEventModal.tsx
│   │   └── ...
│   ├── lib/                # Core domain logic & validators
│   │   ├── barcodeValidator.ts    # Barcode extraction, rules & collision logic
│   │   ├── offlineDB.ts           # IndexedDB offline store & synchronization
│   │   ├── soundEffects.ts        # Audio cues for scan verification
│   │   ├── supabase.ts            # Supabase client instance
│   │   └── utils.ts               # Formatting and general utilities
│   ├── pages/              # Primary application views
│   │   ├── ScannerPage.tsx        # High-speed QR & Barcode verification terminal
│   │   ├── admin/
│   │   │   ├── DashboardPage.tsx  # Event analytics & overview
│   │   │   ├── StudentsPage.tsx   # Attendee management & 5-step import wizard
│   │   │   ├── ScanLogsPage.tsx   # Access history & audit logs
│   │   │   └── SettingsPage.tsx   # System configuration & event settings
│   │   └── ...
│   ├── types.ts            # Global TypeScript definitions
│   ├── App.tsx             # Root routing and global providers
│   └── main.tsx            # Entry point
├── tests/                  # Vitest test suite (95 tests)
│   ├── unit/               # Barcode extraction, schemas, offline queue
│   ├── security/           # RBAC, security boundaries, offline tamper checks
│   └── integration/        # Concurrency, drift, and 50k attendee scale benchmarks
├── server.ts               # Production Express API & asset server
├── build-server.js         # Server bundling script
├── vite.config.ts          # Vite configuration & PWA service worker settings
└── package.json            # Project manifest & dependencies
```

---

## 🚀 Quick Start Guide

> 💡 **Instant Evaluation**: Want to test ADMITTO without local installation? Launch the **[Live Demo](https://rahulnag-v.github.io/ADMITTO.Scanner/)** directly in your browser.

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher

### 1. Clone the Repository
```bash
git clone https://github.com/RahulNag-V/ADMITTO.Scanner.git
cd ADMITTO.Scanner
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Create a `.env` file in the project root:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
PORT=3000
```

### 4. Run the Development Server
```bash
npm run dev
```
The application will launch with hot module replacement at `http://localhost:5173`.

---

## 🧪 Automated Testing & Verification

The test suite covers unit logic, security constraints, and high-concurrency offline benchmarks:

```bash
# Run all tests
npm test

# Run TypeScript type-checking
npm run lint

# Build client and server bundles for production
npm run build
```

### Test Coverage Highlights:
- **`barcode-extraction-import.test.ts`**: Sub-string extraction (Front 3/5/7, End 3/5/7, Full ID, custom prefix/suffix, Section 16 short-ID rejection, and duplicate collision prevention).
- **`offline-production-readiness.test.ts`**: Sub-millisecond IndexedDB benchmark with 50,000+ cached attendees.
- **`security-and-rbac.test.ts`**: Role permissions, gate scanner restrictions, and tamper resistance.

---

## 📦 Production Deployment

To generate an optimized production bundle:

```bash
# Clean previous builds and compile
npm run build

# Start the production server
npm start
```

---

## 🤝 Contributing

This repository is maintained as proprietary software.

Pull requests, modifications, redistribution, or derivative implementations are not permitted without prior authorization from the copyright holder.

Bug reports and suggestions may be submitted through the project's approved communication channels.

---

## 📜 License & Copyright

**Proprietary Software — All Rights Reserved**

Copyright © 2026 Rahul Nag V. All Rights Reserved.

This project and its source code are proprietary and are provided for portfolio, demonstration, and reference purposes only.

No permission is granted to:

- Copy the source code or substantial portions of it
- Modify or create derivative works from the source code
- Redistribute or republish the source code
- Fork the repository for independent development or distribution
- Use the source code or substantial portions of it in another project
- Sell or sublicense the source code
- Use the source code for commercial purposes
- Rebrand or present the project/code as another person's work
- Remove or alter copyright, attribution, or ownership notices

Any reuse, modification, redistribution, commercial use, or incorporation of substantial portions of this project requires prior written permission from the copyright holder.

The public availability of this repository on GitHub does NOT constitute a grant of a license or permission to reuse the source code.

Viewing the repository and its documentation for personal evaluation, learning, or reference is permitted, provided that the code is not copied, redistributed, modified for redistribution, or represented as the viewer's own work.

For permission requests, contact:

**Rahul Nag V**  
- **GitHub**: [@RahulNag-V](https://github.com/RahulNag-V)  
- **Email**: [rahulnagv888@gmail.com](mailto:rahulnagv888@gmail.com)


