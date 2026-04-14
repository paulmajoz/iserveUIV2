# iServe UI V2

Angular 18 frontend for iServe — Attendance & Community Service Tracking.

- **Dev port:** 4201 (run alongside the legacy UI on 4200)
- **Docker port:** 8091
- **Requires:** iserveAPIV2 running on port 3001

---

## Prerequisites

- Node.js 20+
- iserveAPIV2 running (see `../iserveAPIV2/README.md`)
- AG Grid Enterprise license key (optional — app works without it but will show a watermark)

---

## Environment Setup

Set the AG Grid Enterprise license key before running (if you have one):

```
src/environments/environment.ts       ← development
src/environments/environment.production.ts  ← production
```

```ts
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3001/api',
  defaultSchoolId: 1,
  agGridLicense: 'YOUR_LICENSE_KEY_HERE',
};
```

---

## Running Locally (Development)

```bash
# 1. Install dependencies
npm install

# 2. Start dev server on port 4201
npx ng serve --port 4201
```

The app will be available at `http://localhost:4201`.

> The API URL defaults to `http://localhost:3001/api`. Update `src/environments/environment.ts` if your API runs on a different port.

---

## Building for Production

```bash
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
```

To run in the background:

```bash
docker-compose up -d --build iserveUIV2 iserveAPIV2
```

The UI will be available at `http://<your-server>:8091`.

---

## Application Routes

User identity is passed via URL query parameters — the school system sends users to the app via deep links.

### Teacher deep-link format
```
http://localhost:4201/?email=teacher@school.co.za&role=Staff&schoolId=1
```

### Student deep-link format
```
http://localhost:4201/?email=student@school.co.za&role=Student&schoolId=1&first=Jane&last=Doe&grade=10&class=10A
```

### QR scan landing (printed on QR codes)
```
http://localhost:4201/submit/{eventId}?direction=in
http://localhost:4201/submit/{eventId}?direction=out
```

### All routes

| Route | Who | Description |
|---|---|---|
| `/` | Anyone | Home — redirects based on role |
| `/teacher/events` | Teacher | Event list (AG Grid Enterprise) |
| `/teacher/events/create` | Teacher | Unified event creation form |
| `/teacher/events/:id` | Teacher | Event detail + attendance grid |
| `/teacher/events/:id/qr` | Teacher | QR codes — print / download PDF / email |
| `/student/dashboard` | Student | Hours progress, points, attendance history |
| `/submit/:eventId` | Student | QR scan landing — sign in or out |

---

## Dynamic Theming

On load the app fetches the school's theme colours from the API (`GET /api/schools/id/:schoolId/theme`) and applies them as CSS custom properties:

```css
--color-primary
--color-secondary
--color-accent
--color-surface
--color-background
```

All Tailwind utility classes and components use these variables, so the entire app recolours automatically per school. The default `schoolId` is `1` — override via `?schoolId=` in the URL.

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
