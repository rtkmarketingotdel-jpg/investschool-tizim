# School management system (brand-independent)

- Work stage by stage (see original spec); stop after each stage and report.
- Never hardcode the brand name in code: only `brand.config.ts`, locale files and `.env`.
  Check: `grep -ri "gorizont" client/src server/src` → only config/locale files.
- Code/identifiers in English; UI text only via i18n keys (uz / ru). Communicate with the owner in Uzbek (Latin).
- **No database yet (owner decision):** the server runs on in-memory mock data behind the
  repository layer (`server/src/repositories`). Do not add Prisma client/Neon. `server/prisma/schema.prisma`
  is only the reference schema for the future Postgres (hosted in Uzbekistan).
- Timezone Asia/Tashkent; money is Int so'm.
