# ADMITTO — Digital Event Access & Token Scanning Platform

Production-ready digital event access and token validation platform with real-time multi-admin check-in, QR/barcode scanning, and offline synchronization.

## Run Locally

**Prerequisites:** Node.js (v18+)

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment:
   ```bash
   cp .env.example .env
   ```
   Set your Supabase credentials in `.env` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`).

3. Run development server:
   ```bash
   npm run dev
   ```

4. Run automated tests:
   ```bash
   npm test
   ```

5. Build for production:
   ```bash
   npm run build
   npm start
   ```
