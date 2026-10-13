# Vocational school management system

Management system for a vocational training centre (kasb-hunar markazi): professional courses, groups with schedules,
adult trainees, one-off course billing with instalments, staff attendance and payroll.

Monorepo: `client/` (React + Vite, Vercel) and `server/` (Express, Railway).

> **Storage:** Postgres via `DATABASE_URL` (Railway Postgres). At start-up the server loads all records into memory and
> writes every change back (one JSONB row per record in the `records` table, see `server/src/db/store.ts`). An empty
> database is seeded with one demo example of each record. Without `DATABASE_URL` the server runs on that demo data in
> memory (reset on every restart). Uploaded files (staff photos/documents) still live on the server disk.

## Deploy
Push to `main` on GitHub (`rtkmarketingotdel-jpg/investschool-tizim`): Vercel builds `client/` and Railway builds `server/` automatically.
Environment variables live in the Vercel / Railway dashboards (see `.env.example` files).

## Local run
```bash
cd server && cp .env.example .env && npm install && npm run dev   # :4000
cd client && cp .env.example .env && npm install && npm run dev   # :5173
```
Demo logins (password `demo1234`): Director `+998900000001`, Teacher `+998900000002`. The demo data holds one example of each record (branch, course, group, trainee, bill, payment, contract, attendance, payroll, SMS template).

## Modules (all on mock data)
Dashboard, trainees (tinglovchilar: own phone, passport, JSHSHIR; statuses studying / graduated / left), courses (name, length in months,
full price), groups (course, start/end dates, lesson days and time, room, teacher, branch; status PLANNED / ACTIVE / FINISHED follows the dates),
staff attendance (selfie + geolocation check-in/out, monitoring log, monthly matrix), payments + A6 receipt PDF (shows the debt left),
debtors, payroll (auto fines from attendance, approve/pay), e-contracts (vocational training contract, PDF via pdfmake/Roboto,
public signing page where the trainee confirms with an OTP), settings, notifications (bell, 60 s polling), Telegram notices, cron jobs
(12:00 absentees, 09:00 daily report).

**Course billing:** when a trainee is ACTIVE in a group, one bill for the course price (minus the discount) is opened; it is paid at once or
in parts. Its due date is the group start (or a later enrolment) plus *Settings → Payments → due days*. Changing the price or discount
updates the bill; for a drop-out lower the price to what is actually owed. A course price change applies to new enrolments only.

- **OTP in demo mode:** `SMS_PROVIDER=demo` — the code is shown to staff in the contracts table (while valid), in the bell
  panel and in the Telegram group. With `SMS_PROVIDER=eskiz` + `ESKIZ_EMAIL`/`ESKIZ_PASSWORD` it is sent by SMS (untested against the live API).
- **Branches:** Settings → Branches (create/edit/delete, attach employees and classes, pick location on a map). An employee checks in within their own branch radius (any branch when none is assigned). The radius is recorded always and enforced only when enabled there.
- **Live map:** Attendance → Map (Leaflet + OpenStreetMap, no API key). A dot appears on check-in and disappears on check-out.
- Telegram uses the Bot HTTP API directly (`TELEGRAM_BOT_TOKEN` + chat id in Settings); it is a no-op when not configured.

## Attendance selfies (Telegram)
The selfie is **not stored** anywhere (no disk, no database). On every check-in/out the server sends it straight to the director's
Telegram chat with name, position, time, branch, distance and status; Telegram is the archive. If delivery fails the check-in is still
accepted and the record is flagged "Rasm yuborilmagan". Configure with `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` on the server
(Railway); Settings → Telegram can also find the chat id ("Chatni aniqlash", after pressing Start in the bot).
`TELEGRAM_API_URL` overrides the API base (used to test against a local mock).

## SMS (Eskiz)
The SMS section (`/sms`) sends debtor reminders, holiday greetings and notices to trainees/staff: templates with variables,
audiences (all trainees, optionally graduates, groups, branch, debtors, staff, typed numbers), scheduling, history with per-message status,
retry of failed messages and an optional daily automatic debtor reminder (10:00, Tashkent).
Until Eskiz is connected it runs in **demo mode** (messages are only recorded, never sent). To go live set on the server (Railway):
`SMS_PROVIDER=eskiz`, `ESKIZ_EMAIL`, `ESKIZ_PASSWORD`, optionally `ESKIZ_FROM` (sender, default `4546`), then send a test SMS
from SMS → “Avtomatik va sinov”. Eskiz usually requires templates to be approved first, so keep the approved text in the templates.
Uzbek text is normalised to plain ASCII apostrophes so it stays GSM-7 (160 chars per part instead of 70).

## Integration API (Nazorat AI)
Settings → API (director): create an API key (shown once), link external course labels (e.g. "Samarqand santexnika") to groups.
Requests send `X-API-Key: rtk_…` to `<server>/api/v1`:
- `POST /students` — a trainee arrived: `externalId`, `firstName`, `lastName`, `phone` required; `course` (label) or `groupId`.
  The same `externalId` updates instead of duplicating. A linked label places the trainee in the group at the course price
  (course bill opened); an unknown label is listed in Settings and its waiting trainees are placed as soon as it is linked.
  Response field `placement`: `placed | unlinked | group_full | group_finished | already_in_group | no_course | group_missing`.
- `GET /students`, `/students/:id`, `/courses`, `/groups`, `/payments`, `/debtors`, `/staff` (no salaries), `/attendance`.

## Install as an app (PWA)
The client is an installable web app: `manifest.webmanifest` is generated at build time from `VITE_BRAND_NAME` / `VITE_BRAND_SHORT`
(icons in `client/public/brand/`: `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `apple-touch-icon.png` — replace them when rebranding).
`client/public/sw.js` caches only the app shell; API calls and uploads are never cached, and check-in needs a connection by design.
Android/Chrome shows a real install prompt; iOS Safari has none, so the app shows "Share → Add to Home Screen" steps.

## Checks
`npm run build`, `npm run typecheck`, `npm run lint` in both folders; `npm test` in `server` (money words, debt incl. instalments, payroll, SMS text).
`grep -ri "rtk maktab" client/src server/src` must list only `brand.config.ts` files (and locale files).

## Rebranding
1. The brand is text only (no logo image): replace `client/public/brand/favicon.svg` and the `icon-*.png` / `apple-touch-icon.png` app icons.
2. Update `BRAND_*` (Railway) and `VITE_BRAND_*` (Vercel) env values.
3. Update brand-dependent keys in `client/src/locales/*.json` (`brand.slogan`).
4. Update the contract prefix setting (e.g. `IS`).
5. Clear demo data (clean-reset script arrives with the database stage).
6. Set `DEMO_MODE=false` and `VITE_DEMO_MODE=false`.
7. Attach the new domain.
