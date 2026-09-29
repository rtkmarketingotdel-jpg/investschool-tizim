# School management system

Monorepo: `client/` (React + Vite, Vercel) and `server/` (Express, Railway).

> **No database yet.** The API runs on in-memory mock data (`server/src/data/mockStore.ts`) behind
> repositories (`server/src/repositories`). Data resets on every restart. The Postgres host (Uzbekistan)
> will replace only the repository layer. `server/prisma/schema.prisma` is a reference schema.

## Local run
```bash
cd server && cp .env.example .env && npm install && npm run dev   # :4000
cd client && cp .env.example .env && npm install && npm run dev   # :5173
```
Demo logins (password `demo1234`): Director `+998900000001`, Accountant `…02`, Admin `…03`, Staff `…10`.

## Checks
`npm run build`, `npm run typecheck`, `npm run lint` in both folders.
`grep -ri "gorizont" client/src server/src` must list only `brand.config.ts` files (and locale files).

## Rebranding
1. Replace `client/public/brand/logo.svg` and `favicon.svg`.
2. Update `BRAND_*` (Railway) and `VITE_BRAND_*` (Vercel) env values.
3. Update brand-dependent keys in `client/src/locales/*.json` (`brand.slogan`).
4. Update the contract prefix setting (e.g. `IS`).
5. Clear demo data (clean-reset script arrives with the database stage).
6. Set `DEMO_MODE=false` and `VITE_DEMO_MODE=false`.
7. Attach the new domain.
