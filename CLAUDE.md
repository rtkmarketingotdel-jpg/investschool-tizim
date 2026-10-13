# Vocational school (kasb-hunar markazi) management system (brand-independent)

- Work stage by stage (see original spec); stop after each stage and report.
- Never hardcode the brand name in code: only `brand.config.ts`, locale files and `.env`.
  Check: `grep -ri "rtk maktab" client/src server/src` → only config/locale files.
- Code/identifiers in English; UI text only via i18n keys (uz / ru). Communicate with the owner in Uzbek (Latin).
- **Storage:** Postgres (`DATABASE_URL`) through `server/src/db/store.ts`: data is loaded into the in-memory arrays
  (`server/src/data/*`) at start-up and every change is written back as JSONB rows (`records` table). Repositories and
  services keep working on the arrays. Without `DATABASE_URL` the server runs on the demo data in memory.
  Record ids come from `lib/id.ts` (never per-process counters). `server/prisma/schema.prisma` is an old reference only.
- **Integration API** (`/api/v1`, API key from Settings → API): Nazorat AI reads data and sends arrived trainees.
- Timezone Asia/Tashkent; money is Int so'm.
- Domain: courses → groups → trainees (`Student` in code, adults, no parent fields). One course bill per trainee
  (`services/finance.ts` `syncCourseCharge`), paid in instalments; no monthly charges.
