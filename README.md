# Diana's Vacation Journal

A private, client-side vacation photo journal built with React, Vite, TypeScript, and IndexedDB. There is no backend — all uploaded photos stay in the visitor's browser.

## Features

- Warm travel-journal design with destination cards and photo galleries
- Italy seeded as the first destination
- Add, edit, and delete destinations
- Upload, compress, browse, favourite, edit, download, and delete photos
- Full-screen lightbox with keyboard navigation
- Filter, sort, and search the gallery
- Export / import a complete JSON backup
- Client-side passphrase gate for casual privacy
- Ready for Vercel static deployment

## Install

```bash
npm install
```

## Run locally

```bash
npm run dev
```

Open the URL shown in the terminal (usually `http://localhost:5173`).

### Passphrase for local development

Copy the example env file:

```bash
cp .env.example .env.local
```

Set your passphrase:

```env
VITE_JOURNAL_PASSWORD=my-secret-password
```

If `VITE_JOURNAL_PASSWORD` is missing, the app falls back to `diana-journal` for development only.

## Build

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## Deploy to Vercel

1. Push this repository to GitHub.
2. Import the project in [Vercel](https://vercel.com).
3. Framework preset: **Vite**.
4. Build command: `npm run build`
5. Output directory: `dist`
6. Add an environment variable:
   - Name: `VITE_JOURNAL_PASSWORD`
   - Value: your private passphrase
7. Deploy.

`vercel.json` rewrites all routes to `index.html` so React Router paths such as `/destination/italy` work after a refresh.

You can also deploy from the CLI:

```bash
npx vercel
```

## How storage works

| Data | Where it lives |
| --- | --- |
| Default destination metadata (Italy) | Seeded into IndexedDB on first visit from `src/data/initialData.ts` |
| Optional public placeholder images | `public/photos/` |
| Destinations you create | IndexedDB |
| Photos you upload | IndexedDB (as Blobs), on this browser / device only |
| Auth session flag | `localStorage` key `journal_authenticated = true` |

Uploaded photos survive a page refresh on the **same browser and device**. They are **not** synced to other devices, and they are **not** uploaded to GitHub or Vercel.

### Why uploaded photos are not in GitHub

There is no server. The deployable site only contains static frontend files. Browser uploads are written into IndexedDB on the visitor's machine. GitHub only stores the source code and any files you intentionally add under `public/`.

### Adding permanent public photos manually

1. Place image files in `public/photos/` (for example `public/photos/rome.jpg`).
2. Reference them from seed data or destination `coverPublicPath` values, such as `/photos/rome.jpg`.
3. Commit and redeploy.

Those files become part of the static site. They are separate from IndexedDB uploads.

## Export and import

- **Export** (home header): downloads a JSON backup containing destinations and photos (images encoded as data URLs).
- **Import** (home header): replaces the local IndexedDB journal with the contents of a previously exported JSON file.

Use export/import to move memories between browsers or to keep an offline backup.

## Privacy note (important)

The login screen is a **client-side privacy gate**, not true security.

- The passphrase is compared in the browser.
- The built JavaScript can ultimately be inspected.
- Anyone determined enough could bypass the gate.

This is intended only to discourage casual visitors on a publicly hosted URL. Do not store highly sensitive material here.

The passphrase itself is **never** written to Local Storage. Only `journal_authenticated = true` is stored after a successful login. Logout clears that flag and returns to the login screen.

## Project structure

```text
src/
  components/   Reusable UI
  pages/        Home, destination, login
  hooks/        Auth, destinations, photos, object URLs
  services/     IndexedDB + auth helpers
  types/        TypeScript interfaces
  utils/        Image processing and helpers
  styles/       Global design tokens
  data/         Seed / default destination data
public/
  photos/       Placeholder / permanent public images
```

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start Vite development server |
| `npm run build` | Typecheck and build for production |
| `npm run preview` | Preview the production build |

## Browser support

Modern browsers with IndexedDB support are required for uploads and local destinations. If IndexedDB is unavailable, the UI shows an error and will not attempt local photo storage.
