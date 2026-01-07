# Instagram Lead Engine – Pehchaan Media

Internal tool to **discover, qualify, score, and manage Instagram leads** for the **7-Day Website Revenue Sprint**.

## Stack

- Next.js (App Router, TypeScript)
- Tailwind CSS
- React Query
- Supabase (Postgres + Auth)
- Vercel Cron jobs for discovery & enrichment

---

## 1. Setup Supabase

1. Create a new Supabase project.
2. Run the migration SQL:

   - Go to **SQL Editor**.
   - Paste and run `supabase/migrations/01_init_instagram_lead_engine.sql`.

3. Create an **admin auth user**:

   - In **Authentication → Users**, create a user with email/password.
   - Copy its `id` and insert into `admin_users`:

   ```sql
   insert into public.admin_users (id, role)
   values ('<USER_ID>', 'admin');
