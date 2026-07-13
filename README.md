# Diana's Vacation Journal

Private vacation photo journal powered by React, Vite, TypeScript, Supabase, and Vercel serverless API routes.

## Architecture

- **Frontend** talks only to `/api/*` with `credentials: "include"`.
- **Login** is verified on the server against `app_settings` using bcrypt.
- **Session** is an HTTP-only signed cookie (`dj_session`). No password is stored in the browser.
- **Destinations / photos** are read and written through protected API routes.
- **Files** live in a private Supabase Storage bucket (`vacation-photos`).
- The browser receives short-lived signed upload/download URLs only.
- `SUPABASE_SERVICE_ROLE_KEY` is used only inside `api/` and must never be prefixed with `VITE_`.

## Database schema

Existing tables (do not rename):

- `destinations(id, name, flag, description, created_at)`
- `photos(id, destination_id, image_path, caption, date_taken, created_at)`
- `app_settings(id, username, password, created_at)`

### Required SQL migration

Run:

```sql
ALTER TABLE public.photos
DROP CONSTRAINT IF EXISTS photos_destination_id_fkey;

ALTER TABLE public.photos
ADD CONSTRAINT photos_destination_id_fkey
FOREIGN KEY (destination_id)
REFERENCES public.destinations(id)
ON DELETE CASCADE;
```

File: `supabase/migrations/001_photos_on_delete_cascade.sql`

### Storage bucket

Create a **private** bucket named:

```text
vacation-photos
```

Photo paths look like:

```text
1/uuid-photo.jpg
2/uuid-photo.webp
```

Filtering always uses `destination_id` in the database, never folder names alone.

## Environment variables

Set these in the Vercel project settings for **Production** and **Preview**:

### Frontend

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

### Server (required for `/api/*`)

```env
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SESSION_SECRET=
```

`SESSION_SECRET` must be a long random string.

**Never** expose `SUPABASE_SERVICE_ROLE_KEY` through any `VITE_` variable.

If `SUPABASE_SERVICE_ROLE_KEY` or `SESSION_SECRET` is missing on Vercel, API routes return a configuration error (or crash before this fix). After deploying, open **Vercel → Project → Settings → Environment Variables** and confirm all three server variables are present, then redeploy.

## Hash the journal password

The login API rejects plaintext passwords. Convert the current `app_settings.password` value to bcrypt:

```bash
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run hash-password
```

To set a new password while hashing:

```bash
NEW_PASSWORD='your-new-password' SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run hash-password
```

The script never prints the plaintext password.

### Changing the password later

1. Run the hash script with `NEW_PASSWORD=...`
2. Or generate a bcrypt hash yourself and update `app_settings.password` in Supabase
3. Keep the username in `app_settings.username`

## Local development

1. Install dependencies:

```bash
npm install
```

2. Copy env files and fill secrets:

```bash
cp .env.example .env.local
```

3. Run password hashing once.
4. Start the full app (frontend + API):

```bash
npm run dev:app
```

`vercel dev` serves Vite and `/api/*` together. Plain `npm run dev` only runs the Vite frontend and will not authenticate against the API.

## Build

```bash
npm run build
```

## Deploy to Vercel

1. Push the repo to GitHub.
2. Import the project in Vercel.
3. Set environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SESSION_SECRET`
4. Deploy.

`vercel.json` rewrites SPA routes to `index.html` while leaving `/api/*` alone.

## How login works

1. Browser posts username/password to `POST /api/login`.
2. Server loads `app_settings` with the service-role client.
3. Server compares password with `bcrypt.compare`.
4. On success, server sets an HTTP-only cookie.
5. Frontend calls `GET /api/session` on startup to decide login vs journal.

Logout calls `POST /api/logout` and clears the cookie.

## Destination / photo relationship

- Each photo row has `destination_id`.
- `GET /api/destinations/:destinationId/photos` always filters with `.eq('destination_id', destinationId)`.
- Italy photos cannot appear on Ireland because the query is scoped by destination id.

## Testing checklist

### Login

1. Ensure password is bcrypt-hashed.
2. Open the app and confirm the session loading screen appears.
3. Sign in with the `app_settings` username/password.
4. Refresh — you should stay signed in.
5. Logout — cookie clears and login returns.

### Destination separation

1. Create Italy and Ireland destinations.
2. Upload different photos to each.
3. Open Italy — only Italy photos appear.
4. Open Ireland — only Ireland photos appear.

### Upload and delete

1. Upload JPG/PNG/WebP photos.
2. Confirm files appear under `vacation-photos/{destinationId}/...`.
3. Edit caption / date.
4. Delete a photo — Storage object and DB row are removed.
5. Delete a destination — its photos are removed as well.

## Important security warning

Never put the service-role key in frontend code, Vite env vars (`VITE_*`), client bundles, or GitHub issues/logs. Anyone with that key has full database and storage access.
