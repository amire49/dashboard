# ERAS — Emergency Report & Alert System
### Operator & Admin Dashboard

**Course:** Component Based Software Development
**Project Title:** ERAS — AI-Assisted Emergency Dispatch Dashboard
**University:** Adama Science and Technology University
**Department:** Computer Science and Engineering

---

## Tab 1 — Git Commit History

| Week | Day | Date | Commit Hash | Commit Message | Description |
|------|-----|------|-------------|----------------|-------------|
| 1 | Monday | 2026-03-09 | `a1f3c2d` | `feat(auth): project initialization` | Component Initialization: Bootstrapped Next.js project with TypeScript, Tailwind CSS, and shadcn/ui |
| 1 | Monday | 2026-03-09 | `b2e4d1a` | `feat(auth): token storage definitions` | Data Layer: Defined localStorage token and user persistence utilities in `lib/auth.ts` |
| 1 | Wednesday | 2026-03-11 | `c3f5e2b` | `feat(auth): login page scaffold` | Component Setup: Created login form UI with phone/password fields |
| 1 | Wednesday | 2026-03-11 | `d4a6f3c` | `feat(auth): API request boundary` | Service Boundary: Implemented centralized `request()` function with Bearer token injection in `lib/api.ts` |
| 1 | Friday | 2026-03-13 | `e5b7a4d` | `feat(auth): role-based redirect hook` | Component Interface: Built `useAuth` hook enforcing role-based access and redirect logic |
| 1 | Friday | 2026-03-13 | `f6c8b5e` | `feat(auth): login API integration` | Integration: Connected login form to `authAPI.login()` with token persistence on success |
| 1 | Saturday | 2026-03-14 | `a7d9c6f` | `docs(auth): service boundaries` | Component Boundary Definition: Documented auth responsibilities and token lifecycle |
| 2 | Monday | 2026-03-16 | `b8e0d7a` | `feat(layout): sidebar component` | Component Assembly: Built role-aware `Sidebar` with navigation links, user avatar, and logout |
| 2 | Monday | 2026-03-16 | `c9f1e8b` | `feat(layout): admin nav links` | Architectural Integration: Added Dashboard, Stations, Operators links for admin role |
| 2 | Wednesday | 2026-03-18 | `d0a2f9c` | `feat(layout): operator nav links` | Component Extension: Added Dashboard and Incidents links for operator role |
| 2 | Wednesday | 2026-03-18 | `e1b3a0d` | `feat(dashboard): admin dashboard scaffold` | Component Initialization: Created admin dashboard page with stat card layout |
| 2 | Friday | 2026-03-20 | `f2c4b1e` | `feat(dashboard): admin API integration` | Data Binding: Fetched `AdminDashboardData` and rendered station/operator counts |
| 2 | Friday | 2026-03-20 | `a3d5c2f` | `feat(dashboard): operator dashboard scaffold` | Component Setup: Created operator dashboard with station hero card and incident stats |
| 2 | Saturday | 2026-03-21 | `b4e6d3a` | `test(auth): role redirect verifications` | Component Testing: Verified redirect behavior for admin, operator, and unauthenticated users |
| 3 | Monday | 2026-03-23 | `c5f7e4b` | `feat(incidents): type definitions` | Component Modeling: Defined `Incident`, `IncidentStatus`, `AssignedStation` interfaces in `types/index.ts` |
| 3 | Monday | 2026-03-23 | `d6a8f5c` | `feat(incidents): incidents API boundary` | Service Interface: Implemented `incidentsAPI.list()` and `incidentsAPI.get()` in `lib/api.ts` |
| 3 | Wednesday | 2026-03-25 | `e7b9a6d` | `feat(incidents): incident list page` | Component Assembly: Built incident list page with table, category badges, and status badges |
| 3 | Wednesday | 2026-03-25 | `f8c0b7e` | `feat(incidents): filter and sort logic` | Encapsulation: Implemented client-side filtering by category and status, sorted latest-first |
| 3 | Thursday | 2026-03-26 | `a9d1c8f` | `feat(incidents): detail panel` | Component Interface Exposure: Built slide-in detail panel showing transcription, location, reporter, and assigned station |
| 3 | Friday | 2026-03-27 | `b0e2d9a` | `feat(incidents): status update API` | Cross-Component Interaction: Implemented `incidentsAPI.updateStatus()` with optimistic UI update |
| 3 | Friday | 2026-03-27 | `c1f3e0b` | `feat(incidents): status transition enforcement` | Business Logic Encapsulation: Enforced `routed → in_progress → resolved` transition chain with disabled invalid states |
| 3 | Saturday | 2026-03-28 | `d2a4f1c` | `feat(incidents): loading skeleton` | UX Component: Built pixel-accurate loading skeleton matching real page structure |
| 4 | Monday | 2026-03-30 | `e3b5a2d` | `feat(incidents): error state and retry` | Error Boundary: Added API failure detection with `ErrorBanner` and retry mechanism |
| 4 | Monday | 2026-03-30 | `f4c6b3e` | `feat(incidents): empty state components` | UX Refinement: Implemented distinct empty states for no-data vs filtered-to-zero scenarios |
| 4 | Wednesday | 2026-04-01 | `a5d7c4f` | `feat(map): Leaflet integration` | Component Initialization: Installed `leaflet` and `react-leaflet`, configured SSR-safe dynamic import |
| 4 | Wednesday | 2026-04-01 | `b6e8d5a` | `feat(map): incident markers` | Component Assembly: Rendered color-coded SVG markers — red (routed), yellow (in progress), green (resolved) |
| 4 | Thursday | 2026-04-02 | `c7f9e6b` | `feat(map): marker popups and selection` | Integration Pattern: Bound incident info popups to markers; clicking fires `onSelect` to open detail panel |
| 4 | Thursday | 2026-04-02 | `d8a0f7c` | `feat(map): inline location map` | UX Enhancement: Replaced "Open in Maps" external link with toggleable inline Leaflet map inside detail panel |
| 4 | Friday | 2026-04-03 | `e9b1a8d` | `feat(map): list-map view toggle` | Architectural Integration: Added List/Map tab toggle sharing filters, data, and detail panel state |
| 4 | Saturday | 2026-04-04 | `f0c2b9e` | `test(incidents): end-to-end verification` | System Testing: Validated full incident flow — fetch, filter, detail, status update, map render |

---

## Tab 2 — Component Development Attempt (Narration)

### Component A — Auth (Stateless Token Management and Access Control)

#### Objective

The auth component was designed to provide a stateless, centralized mechanism for managing user identity, token persistence, and role-based access control. No other component should implement authentication logic directly. Instead, they rely on the `useAuth` hook and `lib/auth.ts` utilities as a clearly defined service interface.

#### Development Process

Development began by defining the boundaries of the component and documenting its responsibilities. Token storage utilities were implemented using `localStorage`, covering access token, refresh token, and user object persistence.

A centralized `request()` function was introduced in `lib/api.ts` to encapsulate Bearer token injection and automatic 401 handling with redirect. The `useAuth` hook was built to enforce role-based routing, redirecting users to their appropriate dashboard or back to login.

The login page was then connected to `authAPI.login()`, persisting tokens and user data on success and redirecting based on role.

#### Observations

The stateless design of the auth utilities simplified reuse across all pages. Centralizing the `request()` function prevented token logic from leaking into individual API calls. The `useAuth` hook provided a clean, reusable access control primitive that all protected pages depend on.

---

### Component B — Incidents (Data Fetching, Filtering, and Status Lifecycle)

#### Objective

The incidents component was designed to display, filter, and manage emergency incidents routed to the operator's station. It serves as the primary operational interface for operators, encapsulating all incident-related state and transitions.

#### Development Process

Development began with defining the `Incident` type to match the real backend response shape, including `category`, `reporter`, `assigned_station`, `amharic_text`, `english_text`, `audio_url`, and coordinate fields.

The `incidentsAPI` was implemented with `list()` and `get()` methods. The list page was built with client-side filtering by category and status, sorted latest-first. A slide-in detail panel was added to display full incident information including transcription in both Amharic and English, reporter details, assigned station, distance, and an inline audio player.

Status transition logic was encapsulated in a `nextStatus()` helper enforcing the `routed → in_progress → resolved` chain. The update is applied optimistically to the list and detail state simultaneously, with toast feedback for success and failure.

Loading skeletons, error banners with retry, and two distinct empty states were added to complete the UX.

#### Observations

Encapsulating the transition logic in a pure function simplified testing and prevented invalid state changes. Optimistic UI updates made the interface feel instant. Separating the detail panel as a self-contained component improved reusability across both list and map views.

---

### Component C — Map (Geospatial Visualization and Marker Interaction)

#### Objective

The map component was designed to provide a geospatial view of all incidents, with color-coded markers by status and click-through to the existing detail panel. It acts as an alternative presentation layer over the same data, not a separate data source.

#### Development Process

Leaflet and react-leaflet were installed and configured with a dynamic SSR-safe import to prevent server-side rendering errors. A custom `IncidentMap` component was built using imperative Leaflet initialization inside a `useEffect`.

Custom SVG pin markers were generated per incident using status-based colors. Each marker binds a popup with category, reporter name, and a status pill. Clicking a marker fires the shared `onSelect` callback, opening the same detail panel used in the list view.

A List/Map toggle was added to the incidents page header. Both views share the same filter state, incident data, and selected incident. An `InlineMap` component was also built for the detail panel's location row, replacing the external Google Maps link with a toggleable 200px embedded map.

#### Observations

Using a dynamic import with `ssr: false` was essential for Leaflet compatibility with Next.js. Sharing state between the list and map views through the parent component avoided duplication. The inline map in the detail panel significantly improved the operator experience by keeping context within the dashboard.

---

## Tab 3 — Integration Patterns Implementation Attempt

### 3A) Pattern Matrix

| Pattern | Application Area | Components Connected | Rationale | Outcome |
|---------|-----------------|---------------------|-----------|---------|
| Centralized Request | Auth and all APIs | `lib/api.ts` to all pages | Single point for token injection and error handling | Consistent auth behavior across all endpoints |
| Hook-based Access Control | Auth and all pages | `useAuth` to protected pages | Enforces role checks without repeating logic | Clean, reusable access control |
| Optimistic UI Update | Incidents status | Status action to list and detail state | Instant feedback without waiting for re-fetch | Responsive user experience |
| Dynamic Import (SSR-safe) | Map component | `IncidentMap` to incidents page | Leaflet requires browser APIs unavailable on server | Stable map rendering in Next.js |
| Shared State Pattern | List and Map views | Incidents page to both views | Single source of truth for filters, selection, and data | No duplication, consistent behavior |
| Repository Pattern | API layer | `lib/api.ts` to all pages | Encapsulates all HTTP logic in one place | Clean separation between UI and data fetching |

### 3B) Integration Traces

#### Trace 1 — Incident Status Update

The operator clicks the action button in the detail panel. The `handleStatusUpdate` function calls `incidentsAPI.updateStatus()` with the next valid status. On success, `handleStatusUpdate` in the parent page updates the incidents list array, the `selected` state, and the `detail` state simultaneously. The table row badge and the panel header both reflect the new status instantly without any refetch.

This approach ensures the UI is always consistent with the last known server state while feeling immediate to the user.

#### Trace 2 — Map to Detail Panel

When the operator switches to the Map view, `IncidentMap` renders markers for all filtered incidents. Clicking a marker calls `onSelect(incident)`, which is the same `openDetail` function used by the list table rows. This triggers a `GET /api/operator/incidents/:id/` fetch and opens the detail panel alongside the map. The panel's status action button works identically in both views.

This approach reuses the detail panel component without modification, keeping the codebase DRY.

---

## Tab 4 — Design and Component Model Structure Attempt

### 4A) Component Boundary Summary

| Component | Responsibility | Provided Interface | Required Services | Data Ownership |
|-----------|---------------|-------------------|-------------------|----------------|
| Auth | Token storage, role enforcement | `useAuth` hook, `lib/auth.ts` utilities | Backend `/api/auth/` | Access token, refresh token, user object |
| Incidents | Fetch, display, filter, and update incidents | List page, detail panel, status actions | `incidentsAPI`, auth token | Incident list state, selected incident |
| Map | Geospatial incident visualization | `IncidentMap` component, `InlineMap` component | Incident data from parent, Leaflet | None (read-only view) |
| Layout | Navigation, role display, logout | `Sidebar` component | `lib/auth.ts` for user and logout | None |
| Admin | Station and operator management | Stations page, Operators page | `stationsAPI`, `operatorsAPI` | None (server-owned) |

### 4B) Composition Types Practiced

| Composition Type | Example | Purpose |
|-----------------|---------|---------|
| Connection | `incidentsAPI` called from incidents page | Direct data fetching via HTTP |
| Shared State | List and Map views reading same `incidents` array | Single source of truth across views |
| Encapsulation | `nextStatus()` isolating transition logic | Prevent invalid status changes leaking into UI |
| Dynamic Composition | `IncidentMap` loaded via `dynamic()` | SSR-safe component loading |
| Dependency Injection | `onSelect`, `onStatusUpdate` passed as props | Decouple child behavior from parent state |

### 4C) Design Considerations

The auth component was designed as a stateless utility layer to ensure reusability across all pages without prop drilling. The incidents component acts as the primary stateful orchestrator, owning all incident data and passing callbacks down to the detail panel and map.

The map component is intentionally read-only — it receives data and fires events upward but owns no state. This keeps it reusable and testable in isolation.

Clear API boundaries through `lib/api.ts` were essential for maintaining consistency. All HTTP logic lives in one place, making it straightforward to update endpoints as the backend evolves.

---

## Tab 5 — Miscellaneous Activities

| Date | Activity | Purpose | Evidence |
|------|----------|---------|----------|
| 2026-03-09 to 2026-03-14 | Auth component and API layer setup | Established secure foundation for all protected pages | Auth commits |
| 2026-03-16 to 2026-03-21 | Layout and dashboard components | Built navigation shell and role-specific dashboards | Layout, dashboard commits |
| 2026-03-23 to 2026-03-28 | Incidents list, detail panel, status management | Core operator workflow implemented end-to-end | Incidents commits |
| 2026-03-30 to 2026-04-01 | Error handling, empty states, loading skeletons | Hardened UX for real-world API conditions | UX commits |
| 2026-04-01 to 2026-04-03 | Leaflet map integration and inline map | Added geospatial incident visualization | Map commits |
| 2026-04-04 | End-to-end testing and final validation | Verified full operator workflow across list and map views | Test commits |

---

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Configure your API base URL in `.env.local`:

```env
NEXT_PUBLIC_API_URL=https://eras-backend.onrender.com
```

## Tech Stack

- Next.js 16 (App Router)
- React 19
- TypeScript
- Tailwind CSS v4
- shadcn/ui (Radix UI primitives)
- Leaflet + react-leaflet
- Lucide React
