# NekSathi — Mobile Companion App (PRD)

## Current session — 2026-09-16 startup / vehicle / permission repairs (available verification completed)
- Final handoff: `/app/memory/FIX_REPORT.md` lists evidence, changed files, contracts, blockers and device checklist. QA `/app/test_reports/iteration_15.json`; fixes/retest `/app/test_reports/iteration_15_retest.json`; screenshots `/app/test_reports/artifacts_main_retest/`.
- QA found bootstrap error visibility and nested tag Modal issues. Fixed atomic bootstrap/global gate, made public scan routes persistent during restore, inline searchable tag selector. Main self-tests passed 500/null/offline recovery, authenticated 401 login redirect, retry without login, tag search/selection, invalid/direct public QR, QR network retry, real verified QR at 360px, untrusted URL rejection. Fault cases were test-only simulations.
- Installed already-declared Expo54.0.37/Constants18.0.14. tsc + Android JS export pass. Native APK/device verification remains explicitly unavailable, not complete. Test-only UI record cleaned (200 delete/404 readback). Website/backend code/schema unchanged.
- User: inspect complete mobile app, fix immediate Android startup exit, registration uppercase/validation, website vehicle fields (make/model/colour/speed), QR lifecycle, permissions, website tags, car/bike icons, API null handling. Preserve existing website/login/API/database/UI. No hardcoded catalogs. Deliver source/change list/root causes/test evidence; Android fresh-install/APK requested.
- Source of truth is **LIVE** `EXPO_PUBLIC_API_URL` (api.neksathi.in), not the in-workspace backend. Website bundle main.41562b12.js and live OpenAPI compared read-only. Both use bearer JWT, `/api/vehicles`, `make_model` (single FREE TEXT field), `color`, numeric `speed_limit_kmh`, server enum `vehicle_type`. There are NO make/model catalog endpoints or IDs. `/api/tags` exposes guardian tags, NOT vehicle tag color/status/mapping. These requested capabilities require an upstream contract and remain blocked; do not fabricate data or repurpose unrelated tags.
- Implemented: Constants-based API/web configuration preserving existing env names; retryable bootstrap without deleting valid sessions on network errors; expired authenticated 401 only; safe malformed user/token handling; bundled local icon fonts; caught native setup promises; guarded navigation before notification taps; user-initiated permissions with settings recheck; lazy WebRTC initialization.
- Actual native JS bundle blocker found: `react-native-webrtc@124.0.6` imports `event-target-shim/index` that v6 exports do not expose. Fixed by scoped Babel transformation to the package root, only within WebRTC. `metro.config.js` unchanged, New Architecture unchanged (Reanimated4 requires it). Android JS export `--no-bytecode` passes. Hermes binary is x86 on this aarch64 container, no adb/Java/Android SDK/device; no APK or Logcat verification possible here. Untested architecture warnings are NOT proof of process-crash root cause.
- Vehicle add/edit/detail uses the existing fields unchanged; type options and speed default/min/max fetched from live OpenAPI, no hardcoded catalog. Uppercase editing with spaces, canonicalized registration on save, whole-number speed validation, persistent field display and reload. Server creates/links QR; client never writes qr_id. Public resolver verifies QR identity, guards invalid/deleted/unassigned, scanner opens owned vehicle or finder report. Share/copy QR LINK (no image download), no media/storage permission needed.
- Security list: focus/resume/pull/manual refresh, visible API errors rather than false empty list, dynamic bike icons, tags from /tags, chips only for explicit mappings. New searchable dropdown for server vehicle/tag TYPE enums; make/model deliberately preserves website free-text contract.
- No website source, production backend or DB schema edits. In-workspace backend unchanged. Pending end-to-end test report.
- P0: real device Logcat/fresh install/restart/offline/permanent-denial and signed APK verification unavailable here; separate calling TURN/backend fan-out remains blocked.
- P1: production make/model catalog + vehicle-tag mapping/status/colour contract required for true dependent dropdowns/mapped chips.
- P2: QR image export; existing escrow/native anti-theft backlog unchanged.

## Original problem statement
Build a native mobile app "NekSathi" (Expo + expo-router, TypeScript) that talks to the EXISTING backend at `https://neksathi-deploy.preview.emergentagent.com` (all endpoints prefixed `/api`). JWT bearer auth stored in secure storage, attached via an axios interceptor; 401 clears token and returns to Login. Deliverable is a sideloadable app across Phases 1–5 + 7.

## Architecture
- Frontend-only companion app; consumes the external NekSathi API.
- Base URL in `EXPO_PUBLIC_API_URL` (`/app/frontend/.env`).
- `src/api/client.ts` — axios instance + request/response interceptors (token attach, 401 logout).
- `src/api/endpoints.ts` + `src/api/types.ts` — typed API layer.
- `src/context/AuthContext.tsx` — session bootstrap (`GET /auth/me`), route guard, login/register/otp/logout.
- `src/context/ToastContext.tsx` — global toast.
- Theme in `src/theme` (dark neon glassmorphic; Chakra Petch display + Outfit body).
- Reusable UI: GlassCard, NeonButton, Chip, Field, EmptyState, ScreenHeader, SOSButton, TabBar, OverlayForm, AuthShell, FamilyMap (native) + FamilyMap.web (fallback).

## User personas
- Individual wanting one-tap SOS + live location.
- Family guardian tracking a circle of up to 5 members.
- Owner protecting phone/vehicle/bag/pet via anti-theft + Smart QR.

## Core requirements (static)
- Auth: email login, register, phone OTP (WhatsApp code).
- Personal safety: SOS with GPS, SOS history, emergency contacts CRUD, live share, safe zones.
- Family: create/join, live map + members (battery/last-seen), auto-refresh 30s.
- Smart QR: Vehicles / Tags / ICE Cards, each with scannable QR.
- Alerts & incidents; profile edit + notification prefs; logout.
- Anti-theft: register device, lock/siren state, intruder & SIM-swap reports.

## Implemented (2026-06 / initial build)
- [x] Auth (login + demo autofill, register, phone OTP) with secure-store JWT + route guard.
- [x] Bottom tabs: Home / Family / Safety / Security / Profile (custom glass tab bar).
- [x] Home: pulsing SOS button (GPS → POST /me/sos), live share, stat cards, quick actions.
- [x] Safety hub: contacts CRUD, safe zones (GPS-centered) CRUD, SOS history, alerts.
- [x] Family: create/join via invite code, native map with member/zone pins, bottom-sheet member list, invite-code copy, 30s auto-refresh.
- [x] Security: Anti-theft device register + intruder/SIM-swap reports + lock/siren badges; Smart QR for Vehicles/Tags/Cards with QR-detail modal.
- [x] Profile: edit name/phone, notification-preference switches, logout.
- [x] Full permission handling for location (contextual request + Open Settings on block).
- Verified: 13/13 backend integration tests + all critical frontend flows (testing agent, iteration_1).

## Known native-only limitations (need a real build, not Expo Go)
- Real GPS + background 60s location foreground-service ping.
- Anti-theft remote lock/siren/intruder-selfie (Device Admin).
- Family live map (react-native-maps) — web shows a fallback panel.

## Implemented (2026-06 / feature update)
- [x] **Panic Countdown**: SOS now shows a cancelable 3-2-1 countdown (haptic ticks) before firing — prevents accidental alerts. (`src/components/SosCountdown.tsx`, Home)
- [x] **Lost Mode Toggle**: Vehicles & Tags can be flipped to Lost Mode (`POST /{tags|vehicles}/{id}/lost_mode`); tags support a reward note (`PUT /tags/{id}`) shown to whoever scans. Red LOST badge + reward on the row. (Security → Smart QR)
- [x] **Background Guardian**: Safety toggle starts a 60s foreground-service location ping (`POST /me/location` with battery) via expo-task-manager + expo-location background updates — keeps family's live trail even when app is closed. Native-build only (not Expo Go/web). (`src/services/backgroundLocation.ts`, Safety)

## Implemented (2026-06 / feature update 2)
- [x] **In-App QR Scanner**: `expo-camera` scanner (`app/scan.tsx`) with full permission handling → resolves the QR (`GET /public/qr/{id}`, fallback `GET /public/card/{id}`) and opens a finder report screen (`app/scan-report.tsx`). Vehicles → incident report (`POST /public/qr/{id}/incident` wrong_parking/accident/theft/other), Tags → found/theft alert (`POST /public/tag/{id}/alert`), Cards → private message (`POST /public/card/{id}/message`). Attaches finder geo; owner's number stays private. Entry points: Home header + Safety tool.
- [x] **Guardian Schedule**: `app/guardian-schedule.tsx` + `src/services/guardianSchedule.ts` — daily on/off window (time pickers + day chips), persisted; reconciled on app-active/Safety focus so Guardian auto-starts/stops within the window.
- [x] **Reward Payout (promise)**: Lost Mode form now captures a reward amount + UPI ID + note, composed into the tag's `reward_text`, shown to whoever scans. (Actual escrow/auto-release requires a payment gateway on the backend — see backlog.)

## Implemented (2026-06 / feature update 3)
- [x] **Scan History**: `app/scan-history.tsx` merges `GET /api/incidents` + `GET /api/alerts` into a chronological "who scanned my QR" timeline with type, note, relative time and location. Entry points: Safety tool + Security header clock icon. Defensive field mapping.
- [x] **Guardian Auto-Arm**: `src/services/guardianControl.ts` — auto-arm toggle on the Guardian schedule screen; on app-active/Safety focus it checks GPS vs safe zones (haversine) and starts Guardian when you're outside every safe zone, stops when back inside. Combined cleanly with the daily Schedule.

## Not built (hard limits — explained to user)
- **Native Anti-Theft Build (Device Admin)**: needs a bare/native Android module compiled into a real build — cannot be authored/compiled/tested in this managed preview. App-side controls (register device, report intruder/sim-swap, lock/siren polling) are already wired; OS enforcement is a dedicated native build.
- **Real Reward Escrow (Razorpay)**: escrow + payout must live server-side on a backend I control. This app is a frontend for the user's EXTERNAL backend, so I can't add order/payout endpoints; also needs a Razorpay merchant account, KYC and keys. The reward *promise* (amount + UPI shown to finder) is implemented.

## Implemented (2026-06 / feature update 4)
- [x] **Scan Map View**: Scan History has a List/Map toggle (header icon); map plots each located scan (`src/components/ScanMap.tsx` + `.web.tsx` fallback), incident pins red, alert pins teal.
- [x] **Reward on Return**: Lost tags show a "Recovered — pay the finder" action → enter finder's UPI + amount → opens the owner's UPI app via a `upi://pay` deep link to send the reward, then turns off lost mode. No gateway/backend needed (uses the device's UPI app).

## Platform guidance (from support)
- Emergent Mobile supports managed Expo + FastAPI + Mongo only — no bare/native workflow or custom native modules. Native Device-Admin anti-theft is out of scope here.
- Server-side features (e.g. Razorpay escrow/payout) require the backend to be built inside an Emergent workspace; the agent can't modify the user's separate external backend.

## Implemented (2026-06 / feature update 5)
- [x] **Scan Alert Badge**: `src/services/scanBadge.ts` + TabBar — polls incidents+alerts count every 30s and shows a red dot on the Security tab when new scans arrive since last viewed; cleared when the Security tab is opened.
- [x] **Recovery Receipt**: `src/services/receipts.ts` + `app/receipts.tsx` — every reward paid on recovery is logged on-device (item, finder UPI, amount, date, paid/logged status). Entry: Safety → Recovery receipts.

## MAJOR: Backend migrated in-workspace (2026-06 / update 6)
- [x] **Rebuilt the NekSathi API inside this workspace** — `/app/backend/server.py` (FastAPI + MongoDB + JWT/bcrypt), all /api endpoints the app uses: auth (login/register/OTP-with-dev-code/me/update), personal safety (SOS+history, contacts, live-share, location, safe-zones), family (create/join/members), Smart QR (vehicles/tags/cards CRUD + PUT + lost_mode + public resolvers), public scan/report (incident/tag-alert/card-message → owner alerts/incidents), devices (lock/siren/intruder/sim-swap). Demo user seeded on startup (demo@neksathi.app / demo1234). App now points `EXPO_PUBLIC_API_URL` at this workspace — no external dependency.
- [x] Verified: **21/21 backend tests + all frontend flows pass** (testing agent iteration_2), full FE↔BE data flow confirmed.
- [x] **Badge Everywhere**: new-scan red dot now also on the Home bell (mirrors Security tab).
- [x] **Export Receipts**: share button on Recovery receipts exports the list + total via the OS share sheet.
- Note: OTP returns `dev_code` in the response (no WhatsApp provider wired) — remove before production.

## Implemented (2026-06 / feature update 7)
- [x] **Seed Demo Data**: backend startup now idempotently seeds the demo account with a family ("Sharma Family") + 2 members (Aarav, Meera) with live positions & battery, emergency contacts, a Home safe zone, a vehicle, a tag and a device — so the app feels alive on first login.
- [x] **Guardian Live Trail**: `/me/location` + `/me/sos` append to a `trails` collection; `GET /family` returns each member's last ~12 points as `trail`; `FamilyMap` draws a dashed Polyline per member (cyan = you, purple = others) in addition to the current pin. (Renders on device; web shows the fallback.)
- [x] **Reward on Return+**: the Recovered flow now also takes the finder's phone and auto-opens an SMS thank-you (with reward confirmation) after paying via UPI and logging the receipt.

## Implemented (2026-06 / feature update 8)
- [x] **SOS Auto-Escalate**: SOS events start unacknowledged; `run_escalation()` (lazy, no cron — runs on GET /me/sos-events, GET /alerts, /me/location) alerts the next emergency contact every `SOS_ESCALATE_SECONDS` (default 120s) while unacknowledged, capped at the contact count, creating `sos_escalation` alerts naming each contact. New `POST /me/sos/{id}/ack` stops escalation; SOS history screen shows escalation status + an "I'm safe — stop escalation" button. Verified via API (level increments, named alerts, ack stops it, 404 on bad id).

## Implemented (2026-06 / feature update 9)
- [x] **Guardian Acknowledge**: `GET /family/sos` (active unacked SOS across family) + `POST /family/sos/{id}/ack` (any family member can acknowledge; notifies the owner). Family screen shows a red SOS banner per active alert with an "Acknowledge" button.
- [x] **Escalation Timing**: per-user `escalate_seconds` (via `PUT /auth/me`); `run_escalation` respects it. Profile has a 1/3/5-minute selector.
- [x] **Live SOS Banner**: Home shows a persistent red "SOS active" banner (with "I'm safe" ack button) whenever the user has an unacknowledged SOS. Verified on-screen.

## Backlog
- P1: Native Device-Admin anti-theft module (remote lock/siren/intruder-selfie + shutdown-resistant tracking).
- P1: Real reward payout — integrate a payment gateway (e.g. Razorpay) with escrow + release-on-return (needs backend support).
- Note: external backend at neksathi-deploy was returning 404 during this build session; live scan/report verification is pending its recovery (all calls match the confirmed contract).
- P2: Richer QR item editing (photos, lost-mode toggle, ICE medical fields).
- P2: Map clustering + tap-to-focus a member; safe-zone drawing on map.
- P2: In-app scan flow (camera) to report a found item.

## Guardian Push Alert (done, pending native build)
- SOS triggers push to family/guardians via Emergent managed relay (backend send_push in create_sos, non-blocking).
- Endpoints: POST /api/register-push, send_push helper. EMERGENT_PUSH_KEY=placeholder (set at deploy).
- Frontend: registerForPush on login (AuthContext), tap handlers + Android channel + handler in app/_layout.tsx, weekly denied-permission nudge.
- app.json: expo-notifications plugin added; POST_NOTIFICATIONS permission added.
- PENDING: user to add frontend/google-services.json + set expo.android.googleServicesFile, then Publish + build. Works only on native build.

## Safety Check-In + Fake-Off Decoy (done, tested)
- check-in.tsx timer -> auto-SOS reconcile on Home focus. decoy.tsx fake shutdown keeps Guardian tracking.

## Session (fork) — Incident reply, Family-on-vehicle, TezSandesh OTP, Deploy fix
- INCIDENT REPLY (done, tested): app/incident-detail.tsx + incidents-inbox.tsx. Owner sees scan incidents and replies "I'm coming"/"Can't come" via POST /api/incidents/{id}/respond {response:'coming'|'cant'}. Security bell -> /incidents-inbox with needs-reply badge. Notification tap routing in _layout.tsx routes to /incident-detail (data.incident_id or URL regex) else /incidents-inbox.
- VEHICLE FAMILY CONTACTS (done): app/vehicle-contacts.tsx via /api/vehicles/{id}/contacts (name/phone/relation + emergency/speed/parking). Linked from vehicle cards in security.tsx.
- WEBRTC WEB SHIM (done): src/lib/webrtc.ts|.web.ts + incall.ts|.web.ts so react-native-webrtc doesn't break the web bundle; native unchanged. RTC_CONFIG in src/lib/rtc.ts still uses DEAD free openrelay TURN -> real call drops on mobile data (NEEDS a working TURN server).
- TEZSANDESH WHATSAPP OTP (backend done+tested, 12/12): services/phone.py, tezsandesh_otp.py, otp_service.py. server.py endpoints /auth/otp/request, /verify, /resend, /status. Managed provider (send returns request_id, verify checks). Rate limits + E.164 + one-time. backend/.env has TEZSANDESH_* (KEY IS REVOKED - need new active key + active OTP subscription). NOTE: this is the WORKSPACE backend; the live app uses api.neksathi.in whose source is NOT here.
- OTP mobile: app/(auth)/otp.tsx resend countdown + otpResend endpoint (falls back to request).
- DEPLOY FIX (done): removed committed frontend/eas.json + stale extra.eas.projectId from app.json (conflicted with pipeline persisted id 885d8c5b) -> fixes EAS 'expo config --json' project:init crash. eas_json_absent now true.
- OPEN: (1) "Ring ALL family members on QR-scan call" needs BACKEND fan-out on api.neksathi.in (tested: sharing works via /vehicles/{id}/invites+/shares, but call/start rings ONLY owner). (2) TURN server for reliable calls. (3) New active TezSandesh key + OTP subscription. (4) Deploy: user chose Option A - set EXPO_PUBLIC_API_URL secret in Deployment Panel + redeploy (app keeps external backend).
