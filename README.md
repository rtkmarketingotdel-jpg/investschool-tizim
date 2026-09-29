# School management system

Monorepo: `client/` (React + Vite, Vercel) and `server/` (Express, Railway).

> **No database yet.** The API runs on in-memory mock data (`server/src/data/mockStore.ts`) behind
> repositories (`server/src/repositories`). Data resets on every restart. The Postgres host (Uzbekistan)
> will replace only the repository layer. `server/prisma/schema.prisma` is a reference schema.

## Deploy
Push to `main` on GitHub (`rtkmarketingotdel-jpg/investschool-tizim`): Vercel builds `client/` and Railway builds `server/` automatically.
Environment variables live in the Vercel / Railway dashboards (see `.env.example` files).

## Local run
```bash
cd server && cp .env.example .env && npm install && npm run dev   # :4000
cd client && cp .env.example .env && npm install && npm run dev   # :5173
```
Demo logins (password `demo1234`): Director `+998900000001`, Accountant `…02`, Admin `…03`, Staff `…10`.

## Modules (all on mock data)
Dashboard, students, classes, staff, attendance (selfie + geolocation check-in/out, monitoring log, monthly matrix),
payments + A6 receipt PDF, debtors, payroll (auto fines from attendance, approve/pay), e-contracts (PDF via pdfmake/Roboto,
public signing page with OTP), settings, notifications (bell, 60 s polling), Telegram notices, cron jobs
(12:00 absentees, 09:00 daily report, monthly charges on the 1st).

- **OTP in demo mode:** `SMS_PROVIDER=demo` — the code is shown to staff in the contracts table (while valid), in the bell
  panel and in the Telegram group. With `SMS_PROVIDER=eskiz` + `ESKIZ_EMAIL`/`ESKIZ_PASSWORD` it is sent by SMS (untested against the live API).
- **Branches:** Settings → Branches (create/edit/delete, attach employees and classes, pick location on a map). An employee checks in within their own branch radius (any branch when none is assigned). The radius is recorded always and enforced only when enabled there.
- **Live map:** Attendance → Map (Leaflet + OpenStreetMap, no API key). A dot appears on check-in and disappears on check-out.
- Telegram uses the Bot HTTP API directly (`TELEGRAM_BOT_TOKEN` + chat id in Settings); it is a no-op when not configured.

## Checks
`npm run build`, `npm run typecheck`, `npm run lint` in both folders; `npm test` in `server` (money words, debt, payroll).
`grep -ri "gorizont" client/src server/src` must list only `brand.config.ts` files (and locale files).

## Rebranding
1. Replace `client/public/brand/logo.svg` and `favicon.svg`.
2. Update `BRAND_*` (Railway) and `VITE_BRAND_*` (Vercel) env values.
3. Update brand-dependent keys in `client/src/locales/*.json` (`brand.slogan`).
4. Update the contract prefix setting (e.g. `IS`).
5. Clear demo data (clean-reset script arrives with the database stage).
6. Set `DEMO_MODE=false` and `VITE_DEMO_MODE=false`.
7. Attach the new domain.
