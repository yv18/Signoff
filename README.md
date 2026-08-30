# Signoff

Animated email signatures. MERN stack: MongoDB, Express, React, Node.

The product builds a signature in the browser, renders it server-side into an
animated GIF, and hands back paste-ready HTML for Gmail and Outlook.

---

## Why it works the way it does

Email clients do not run CSS animations or JavaScript. Anything that moves in a
signature has to be a raster image. So:

- The **editor preview** is CSS, for instant feedback while you type.
- The **shipped artefact** is a GIF, rendered on the server from the same field
  values through `sharp`.
- **Frame 1 of every GIF is the finished, resting signature.** Outlook on
  Windows renders only the first frame, so it has to read correctly alone.
- Images in email must be absolute URLs on a public host. Data URIs are stripped
  by Gmail and blocked by Outlook. This is why the render step exists at all.

---

## Getting started

Requires Node 20+ and a running MongoDB.

```bash
# 1. server
cd server
npm install
cp .env.example .env
npm run keys          # prints secrets — paste them into .env
npm run icons         # renders the social icon PNGs the email markup links to
npm run seed          # resets the database and creates the demo account
npm run dev           # http://localhost:5000
npm run smoke         # black-box check of every critical endpoint (server must be running)

# 2. client (second terminal)
cd client
npm install
npm run dev           # http://localhost:5173
```

### With Docker

Runs the client (nginx), the API, and MongoDB as three containers. The client
proxies `/api` and `/static` to the API, so everything is same-origin on
`http://localhost:8080`.

```bash
cp server/.env.example server/.env
cd server && npm run keys   # paste ENCRYPTION_KEY / LOOKUP_KEY / JWT secrets into server/.env
cd ..

docker compose up --build          # http://localhost:8080
docker compose exec server npm run seed   # one-time demo account
```

Uploaded photos and rendered GIFs persist in the `uploads` volume; Mongo data in
`mongo-data`. Compose sets `COOKIE_SECURE=false` so the session cookie works over
plain HTTP — set it back to `true` and terminate TLS in front of the client for a
real deployment.

### Environment variables

- **Server** — see `server/.env.example`. The five under `npm run keys` plus
  `MONGO_URI` are required; the rest have working defaults. `SMTP_*` enable real
  OTP email; `STORAGE_DRIVER=s3` + `S3_*` put the signature images on a CDN (see
  *Image hosting*).
- **Client** — see `client/.env.example`. **None are required.** The frontend
  calls the API at the relative path `/api` (proxied by Vite in dev, by nginx in
  Docker). The only optional var, `VITE_API_BASE_URL`, is for when the client
  and API sit on different origins; it is baked in at build time, so pass it as
  a Docker build arg (`docker compose build --build-arg VITE_API_BASE_URL=…` or
  `VITE_API_BASE_URL=… docker compose up --build`).

### Client on Vercel + API on Railway

The browser must reach the client and the API on the **same origin**, or the
`httpOnly` refresh cookie is a third-party cookie and Chrome / Safari / Firefox
drop it — so every page reload bounces you back to sign-in. Don't point the
client straight at the Railway URL; proxy through Vercel instead.

**Vercel (client).** Set the project's *Root Directory* to `client`.
`client/vercel.json` does two things:

- **rewrites `/api/*` and `/static/*` to the Railway API** — so the browser only
  ever talks to `signoff-green.vercel.app`, the refresh cookie is first-party,
  and there is no CORS in the browser at all. Edit the two `destination` URLs in
  `vercel.json` to your Railway host.
- rewrites every other non-asset path to `index.html`, so a hard refresh or a
  shared link to `/editor`, `/login`, `/privacy` resolves instead of 404-ing.

**Do not set `VITE_API_BASE_URL`.** With it unset the client calls the relative
`/api`, which the rewrite above proxies. Setting it makes the browser call
Railway cross-site and reintroduces the logout-on-refresh bug.

**Railway (API).** Set:

```
NODE_ENV=production                          # refresh cookie is Secure
COOKIE_SAMESITE=lax                          # first-party cookie (client proxies /api)
CLIENT_ORIGIN=https://<your-app>.vercel.app  # exact origin(s), comma-separated; no trailing slash
PUBLIC_URL=https://<your-app>.vercel.app     # /static is proxied through Vercel now
```

`COOKIE_SAMESITE=lax` is the key line: the old cross-site setup needed
`SameSite=None`, which browsers now block as a third-party cookie. `CLIENT_ORIGIN`
must still match for the server-to-server call Vercel makes.

> Prefer real subdomains of one apex (`app.example.com` + `api.example.com`)?
> Skip the proxy, keep `SameSite=Lax`, and set `COOKIE_DOMAIN=.example.com` on
> the API so the session cookie is shared across both.

**Image hosting.** Railway's filesystem is ephemeral — `STORAGE_DRIVER=local`
loses every upload and render on redeploy. Use `STORAGE_DRIVER=s3` (see *Image
hosting* below); then `PUBLIC_URL` only needs to be right for the icons, and the
signature GIF is served from the bucket regardless.

### Demo account

```
Email:    demo@signoff.app
Password: Signoff123
```

Created by `npm run seed` (which resets the database). Type it into the sign-in
form.

---

## How personal data is stored

Everything a person types about themselves is encrypted at rest with
**AES-256-GCM**, a fresh random IV per value, and an authentication tag so
tampering is detected on read. This covers name, email, phone, company,
location, tagline, and every social URL, on both the `User` and `Signature`
collections.

Encryption and decryption happen in Mongoose getters and setters
(`src/lib/encryptedField.js`), so application code reads and writes plain
strings and cannot forget to call the cipher.

Because each value uses a random IV, encrypted fields cannot be queried
directly. For the one field that must be looked up — the login email — there is
also a **blind index**: an HMAC-SHA256 under a separate key, stored as
`emailHash`. It is deterministic enough to find an account and not reversible
back to the address.

**Losing `ENCRYPTION_KEY` makes stored personal data unrecoverable.** Back it
up somewhere other than the database. Rotating it (or `LOOKUP_KEY`) invalidates
every existing row, so `npm run seed` wipes and recreates rather than trying to
migrate.

Passwords are never encrypted — they are hashed with **bcrypt** at cost 12,
which is one-way by design. The `passwordHash` field is `select: false`, so it
is excluded from queries unless explicitly asked for.

Uploaded images are re-encoded through `sharp` before storage, which strips EXIF
metadata including GPS coordinates.

## How sessions work

| | Access token | Refresh token |
|---|---|---|
| Lifetime | 15 minutes | 30 days |
| Stored | in memory in the browser tab | httpOnly cookie |
| Readable by JS | yes | no |
| At rest on server | not stored | SHA-256 hash only |

Refresh tokens **rotate**: each use issues a new token and marks the old one
used. If an already-used token is presented again, the entire token family is
revoked, which is how a stolen token gets caught. Raw tokens are never written
to the database.

The access token deliberately never touches `localStorage`, so an XSS payload
cannot read it back out.

Auth endpoints are rate limited to 20 attempts per 15 minutes per IP. Login
returns the same message for an unknown email and a wrong password, so the
response cannot be used to discover which addresses have accounts.

## Sign-up with email OTP

Registration is two steps: `POST /api/auth/register/start` bcrypt-hashes the
password, stores a `PendingRegistration` (TTL-indexed, auto-deleted after 10
minutes) and emails a 6-digit code; `POST /api/auth/register/verify` checks the
code (5 attempts, then the pending doc is dropped) and creates the account. New
accounts land on the marketing page, already signed in.

Built to shrug off a flood of sign-ups:

- the email is **queued, not awaited** — `start` returns 202 immediately;
- one pooled SMTP transport, capped at 5 connections with nodemailer's own
  per-second limiter, so a burst never opens thousands of sockets;
- the in-process queue has a hard length cap — past it, `enqueueMail` throws a
  503 so the caller backs off instead of the process growing until OOM;
- pending sign-ups live in Mongo with a TTL index, so abandoned flows can't pile
  up in memory;
- `otpLimiter` holds `register/start` to 6 per hour per IP
  (`OTP_MAX_PER_HOUR` to tune).

For multiple instances, swap the in-process queue in `src/lib/mailer.js` for
BullMQ on Redis — `enqueueMail` keeps the same signature.

**SMTP config** (`server/.env`): set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`,
`SMTP_PASS`, `SMTP_SECURE`, `MAIL_FROM`. Leave `SMTP_HOST` blank in local dev —
the code is then logged to the server console and returned in the `start`
response so sign-up still works end to end. Gmail/Outlook only send **as the
authenticated mailbox**, so `env.js` falls back `MAIL_FROM` to `SMTP_USER` for
those hosts (with a warning) if you point it at another domain.

## Image hosting

A signature is HTML plus images. Gmail and Outlook fetch those images through
their own servers, so every `src` has to be a public HTTPS URL — `localhost`,
a LAN address, or a private deploy all show broken images even though the
editor preview looks fine.

Two ways to satisfy that:

| `STORAGE_DRIVER` | Where images live | Works when |
|---|---|---|
| `local` (default) | disk under `UPLOAD_DIR`, served at `PUBLIC_URL/static/…` | the API itself is on a public HTTPS host with persistent disk |
| `s3` | S3-compatible object storage, served from `S3_PUBLIC_BASE_URL` | always — the URL is independent of where the API runs |

If the client is on static hosting (Vercel, Netlify, GitHub Pages) and the API
is elsewhere or not deployed at all, use `s3`.

### Cloudflare R2 (recommended — no egress fees)

1. **Create a bucket** in the Cloudflare dashboard → R2.
2. **Make it public:** bucket → Settings → *Public access* → enable the
   **`r2.dev`** subdomain (or attach a custom domain).
3. **Create an API token:** R2 → *Manage API Tokens* → *Create* →
   permission **Object Read & Write**, scoped to the bucket. Copy the
   **Access Key ID** and **Secret Access Key**.
4. Fill in `server/.env`:
   ```
   STORAGE_DRIVER=s3
   S3_ENDPOINT=https://<accountid>.r2.cloudflarestorage.com
   S3_REGION=auto
   S3_BUCKET=<bucket-name>
   S3_ACCESS_KEY_ID=<access-key-id>
   S3_SECRET_ACCESS_KEY=<secret-access-key>
   S3_PUBLIC_BASE_URL=https://<hash>.r2.dev        # or your custom domain
   S3_FORCE_PATH_STYLE=true
   ```
5. **Upload the icons** to the new bucket: `npm run icons` (in `server/`).
6. **Re-render** any existing signatures — open each in the editor and hit
   *Copy for email* again so the markup picks up the new URLs.

AWS S3, Backblaze B2, Supabase Storage and MinIO use the same variables — for
AWS leave `S3_ENDPOINT` blank, set a real `S3_REGION`, and
`S3_FORCE_PATH_STYLE=false`. The server refuses to start with
`STORAGE_DRIVER=s3` and any of `S3_BUCKET` / `S3_ACCESS_KEY_ID` /
`S3_SECRET_ACCESS_KEY` / `S3_PUBLIC_BASE_URL` missing.

## Fonts on the render host

The GIF renderer draws text through `sharp` → librsvg → **fontconfig**, which
needs a config file *and* real font files. Minimal Linux images (including
`node:20-slim` and the Nixpacks base) ship neither, so the first render logs:

```
Fontconfig error: Cannot load default config file: No such file: (null)
```

…and the text in the GIF comes out blank. Fixes are already in the repo:

- **Docker** — `server/Dockerfile` installs `fontconfig fonts-liberation
  fonts-dejavu-core` and sets `FONTCONFIG_PATH`.
- **Railway / Nixpacks** — `server/nixpacks.toml` adds the same packages via
  `aptPkgs`. (If Railway is building this service from the Dockerfile instead,
  that path is covered too.)
- **Any other Linux host** — install `fontconfig` and a font package
  (`fonts-liberation` recommended — it is metric-compatible with the
  Arial/Helvetica the templates request). `env.js` then auto-points
  `FONTCONFIG_PATH` at `/etc/fonts`.

Windows and macOS use the OS font system, not fontconfig, so local dev is
unaffected. After deploying the fix, re-render existing signatures.

## Legal pages

`/privacy`, `/terms`, and `/cookies` are served by `client/src/pages/Legal.jsx`.
The content is a **starting template** — have it reviewed against the law that
applies to you and replace the placeholder contact address before launch. The
cookie banner (`CookieBanner.jsx`) is a disclosure, not a consent gate, because
the app sets only the strictly-necessary `sg_rt` session cookie and runs no
analytics or ad trackers.

---

## Layout

```
server/
  scripts/          smoke test
  src/
    config/         env validation, mongo connection
    lib/            crypto, encrypted field helper, token rotation, mailer + queue
    models/         User, Signature, RefreshToken, PendingRegistration
    middleware/     auth, validation, rate limits, error handling
    controllers/    auth (login + OTP sign-up), signature, upload
    routes/         route tables
    services/       GIF rendering, storage adapter
    templates/      catalog, SVG frame builder, email HTML builder, OTP email
    scripts/        key generation, seeding, icon rendering

client/
  public/templates/ template preview artwork (generated)
  scripts/          preview generator
  src/
    api/            axios instance with refresh-on-401
    context/        AuthContext
    theme/          MUI theme and the glass mixin
    components/     Nav, Footer, CookieBanner, galleries, preview
    pages/          Landing, Auth (login + OTP sign-up), Editor, Legal
    data/           template and animation catalog
```

`server/src/templates/catalog.js` and `client/src/data/catalog.js` describe the
same templates and animations. Change one, change the other.

Template previews are committed as SVG so the gallery has real artwork with no
API call. Regenerate with `npm run previews` in `client/`.

---

## Before you launch

- **Everything is free.** There is no billing, plan, or paywall — all templates
  and animations are available to every account.
- **Image hosting.** With the default `STORAGE_DRIVER=local`, the rendered GIF
  and social icons are served from `PUBLIC_URL`, so a pasted signature only
  loads in Gmail / Outlook if the API is on a public HTTPS host. For a signature
  that works regardless of where the API runs, set `STORAGE_DRIVER=s3` — see
  *Image hosting* below.
- **Email:** set `SMTP_*` for real OTP delivery (see *Sign-up with email OTP*).
  For horizontal scale, move the in-process mail queue and `publish`'s
  synchronous sharp render onto a BullMQ / Redis worker, and consider native
  `bcrypt` (threadpool) over `bcryptjs` for the sign-up hash under heavy load.
- **Email deliverability.** Test the signature output in Gmail web, Gmail iOS,
  Outlook Windows desktop, Outlook web, and Apple Mail. Outlook desktop is the
  one that will surprise you.
- **Legal pages** (`/privacy`, `/terms`, `/cookies`) are a starting template —
  have them reviewed and fill in the real contact / company details.
- **GIF size.** Templates with a full-bleed background (e.g. `minecraft`,
  `aurora`) render 300–550 KB GIFs. Fine to paste, but larger than ideal for a
  per-message signature; `RENDER_LIMITS.MAX_BYTES` is defined if you want to
  enforce a cap.
- **Smoke test.** `npm run smoke` (in `server/`, against a running instance)
  exercises catalog, auth, the OTP flow, and signature CRUD + publish.
