# iServe UI V2

Angular 18 frontend for iServe — Attendance & Community Service Tracking.

- **Dev port:** 4200 (or 4201 if legacy UI is running alongside)
- **Docker port:** 8091
- **API (local dev):** `http://localhost:3000/api`
- **API (Docker):** port 3001 inside compose network

---

## Prerequisites

- Node.js 20+ (use `nvm use 20` if on an older system Node)
- iserveAPIV2 running (see `../iserveAPIV2/README.md`)
- AG Grid Enterprise license key (optional — app works without it but shows a watermark)

---

## Environment Setup

`src/environments/environment.ts` controls the API URL and optional AG Grid key:

```ts
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api',  // match the port your API is running on
  defaultSchoolId: 1,
  agGridLicense: '',                    // paste your AG Grid Enterprise key here
};
```

> **Port note:** The API defaults to port **3001** in Docker (`PORT=3001` in docker-compose).
> Locally it defaults to **3001** as well unless you override with `PORT=3000 npm run start:dev`.
> Update `apiUrl` to match whichever port your API is actually running on.

---

## Running Locally (Development)

```bash
# Ensure you are on Node 20
source ~/.nvm/nvm.sh && nvm use 20

# Install dependencies
npm install

# Start dev server (default port 4200)
npx ng serve

# Or on port 4201 if the legacy UI is already on 4200
npx ng serve --port 4201
```

The app will be available at `http://localhost:4200`.

---

## Building for Production

```bash
source ~/.nvm/nvm.sh && nvm use 20
npm run build
# Output: dist/iserve-uiv2/browser/
```

---

## Running with Docker (Production)

From the **project root** (`iServeZA/`):

```bash
# Build and start only the V2 services
docker-compose up --build iserveUIV2 iserveAPIV2

# Or start all services (including legacy)
docker-compose up --build

# Background mode
docker-compose up -d --build iserveAPIV2 iserveUIV2
```

The UI will be available at `http://<your-server>:8091`.

---

## Application Routes & Test Links

User identity is passed via URL query parameters. All routes require at minimum
`?email=&role=&schoolId=` in the URL.

### Role-based entry points

**Teacher:**
```
http://localhost:4200/?email=paul@royalh.co.za&role=Staff&schoolId=11338
```

**Student:**
```
http://localhost:4200/?email=student@school.co.za&role=Student&schoolId=11338&first=Jane&last=Doe&grade=10&class=10A
```

### Route reference

| Route | Who | Description |
|---|---|---|
| `/` | Anyone | Home — role-based redirect |
| `/teacher/events` | Teacher | Event list (AG Grid) |
| `/teacher/events/create` | Teacher | Create a new event |
| `/teacher/events/:id` | Teacher | Event detail + attendance grid |
| `/teacher/events/:id/qr` | Teacher | QR codes — print / download / email |
| `/student/dashboard` | Student | Hours, progress bars, attendance history |
| `/submit/:eventId` | Student | QR scan landing — sign in or out |

### How to get a real event ID for testing

Event IDs are MongoDB ObjectIDs — 24-character hex strings like `64a1b2c3d4e5f6789012345a`.
**You cannot use a placeholder like `{eventId}` in the URL.**

To test event-specific pages:

1. Open the teacher link above
2. Navigate to **New Event** and create a test event
3. After saving, the browser URL changes to `/teacher/events/<real-id>`
4. Copy that ID and use it in detail/QR/submit links

Example (once you have a real ID):
```
http://localhost:4200/teacher/events/64a1b2c3d4e5f6789012345a?email=paul@royalh.co.za&role=Staff&schoolId=11338
http://localhost:4200/teacher/events/64a1b2c3d4e5f6789012345a/qr?email=paul@royalh.co.za&role=Staff&schoolId=11338
http://localhost:4200/submit/64a1b2c3d4e5f6789012345a?direction=in&email=student@school.co.za&role=Student&schoolId=11338&first=Jane&last=Doe&grade=10&class=10A
```

The QR codes printed/saved from the QR manager page already contain the correct URL with the real event ID — students simply scan those.

---

## Dynamic Theming

On load the app fetches the school's theme colours from `GET /api/schools/id/:schoolId/theme`
and applies them as CSS custom properties:

```css
--color-primary
--color-secondary
--color-accent
--color-surface
--color-background
```

The entire UI re-colours automatically per school. Default `schoolId` is `1` — override via `?schoolId=` in the URL.

---

## Project Structure

```
src/app/
├── core/
│   ├── services/        api, events, attendance, url-context
│   └── theme/           theme service (CSS var injection)
├── features/
│   ├── teacher/         create-event, event-list, event-detail, qr-manager
│   └── student/         submit (QR landing), dashboard
├── shared/
│   ├── components/      header, qr-display, qr-scanner
│   └── pipes/           hours-format
└── app.routes.ts        Lazy-loaded route config
```
