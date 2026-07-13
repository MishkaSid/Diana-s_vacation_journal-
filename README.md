# Diana's Vacation Journal

A private vacation photo journal built with React, Vite, TypeScript, and Supabase.

## Features

- Warm travel-journal design with destination cards and photo galleries
- Destinations and photos stored in Supabase Postgres
- Photo files stored in Supabase Storage (`photos` bucket)
- Italy seeded automatically when the destinations table is empty
- Login against `app_settings` (username + password)
- Upload, compress, browse, edit, download, and delete photos
- Full-screen lightbox with keyboard navigation
- Sort and search the gallery
- Export journal metadata as JSON
- Ready for Vercel static deployment

## Database schema

The app expects these tables:

- `destinations` — `id`, `name`, `flag`, `description`, `created_at`
- `photos` — `id`, `destination_id`, `image_path`, `caption`, `date_taken`, `created_at`
- `app_settings` — single row (`id = 1`) with `username` and `password`

Also create a **public** Storage bucket named `photos`.

### Seed login credentials

```sql
INSERT INTO public.app_settings (id, username, password)
VALUES (1, 'diana', 'your-password')
ON CONFLICT (id) DO UPDATE
SET username = EXCLUDED.username,
    password = EXCLUDED.password;
```

### Storage policies

Allow the publishable key to read/write objects in the `photos` bucket (adjust for your security needs). Example permissive policies for a private journal:

```sql
-- Allow public read of journal images
CREATE POLICY "Public read photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'photos');

-- Allow uploads/updates/deletes with the publishable key
CREATE POLICY "Public write photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'photos');

CREATE POLICY "Public update photos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'photos');

CREATE POLICY "Public delete photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'photos');
```

Table RLS policies should similarly allow select/insert/update/delete for `destinations`, `photos`, and select for `app_settings` if you enable RLS.

## Install

```bash
npm install
```

## Configure environment

```bash
cp .env.example .env.local
```

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

## Run locally

```bash
npm run dev
```

Open the URL shown in the terminal (usually `http://localhost:5173`).

Sign in with the username/password stored in `app_settings`.

## Build

```bash
npm run build
```

Preview:

```bash
npm run preview
```

## Deploy to Vercel

1. Push this repository to GitHub.
2. Import the project in [Vercel](https://vercel.com).
3. Framework preset: **Vite**.
4. Build command: `npm run build`
5. Output directory: `dist`
6. Add environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
7. Deploy.

`vercel.json` rewrites all routes to `index.html` so React Router paths such as `/destination/1` work after a refresh.

## How storage works

| Data | Where it lives |
| --- | --- |
| Destinations | Supabase `destinations` table |
| Photo metadata | Supabase `photos` table |
| Photo files | Supabase Storage bucket `photos` (`image_path`) |
| Login credentials | Supabase `app_settings` |
| Auth session flag | `localStorage` key `journal_authenticated = true` |

Cover images use the destination’s earliest uploaded photo, or a local placeholder when none exist.

## Privacy note

The login screen is a **client-side privacy gate**, not true security.

- Username/password are compared in the browser against `app_settings`
- The publishable key and client code can be inspected
- Use this only to discourage casual visitors

The password itself is never written to Local Storage. Only `journal_authenticated = true` is stored after a successful login.

## Project structure

```text
src/
  components/   Reusable UI
  pages/        Home, destination, login
  hooks/        Auth, destinations, photos
  services/     Supabase data + auth helpers
  types/        TypeScript interfaces matching the DB
  utils/        Image processing + Supabase client
  styles/       Global design tokens
  data/         Seed / constants
```

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start Vite development server |
| `npm run build` | Typecheck and build for production |
| `npm run preview` | Preview the production build |
