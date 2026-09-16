# NekSathi — startup and website-data parity repair report

## Outcome
The available mobile source has been updated and tested against the existing live API. This is **not** confirmation that every requested Android issue is solved: no device/Logcat or APK toolchain was available, and two requested data contracts do not exist in the live API. No website code, production API implementation, login protocol, or database schema was changed.

## Findings and changes

| Request | Evidence/root cause | Change / current status |
|---|---|---|
| Installed app exits at startup | No native crash logs supplied. One concrete Android **bundling** failure reproduced: WebRTC 124 imports `event-target-shim/index`, an unexported path in its dependency. This is not proof of the installed process crash. Eager native effects, early notification routing, web-shim differences and missing/null values were additional risks. | Scoped Babel rewrite to the dependency's exported root, only within WebRTC. No Metro or architecture edits. Native call modules now load on acceptance; optional setup failures are caught. Android JS export passes. **Actual process-crash root cause still needs Logcat.** |
| Session/offline initialization | Existing bootstrap deleted the saved token for all API errors, not just expiry; token storage success was ignored; private routes/effects could start before restore finished. | Atomic loading/error state, global loading/retry gate, configuration validation through Constants, token/user validation, serialized secure writes, stale-response protection, authenticated-401 invalidation only. Offline/500 retain session. Retry/null/401 tested. |
| Registration uppercase | Prior uppercase conversion lacked full input cleanup and form validation. | Uppercase ASCII letters/numbers/spaces while editing; unsupported punctuation removed; edge spaces trimmed; internal spaces removed only on save. Indian normal/Delhi/BH pattern validation, not on each keystroke. |
| Make/model missing | Mobile POST only sent plate/type; website actually uses **one free-text `make_model`** field. Live schema has no make/model IDs or catalogs. | Combined field added to add/edit/detail/list, matching website exactly. **Separate dependent make/model dropdowns cannot be truthfully implemented without production catalog APIs.** No invented lists. |
| Colour/speed missing | Fields existed in VehicleIn/Out but were omitted from mobile form and payload. | Free-text `color`, whole-number `speed_limit_kmh`, km/h labels, existing-value hydration and persistence. Speed default/min/max and vehicle/tag types come from live schema, not constants. |
| View/edit missing | Original garage only opened QR, no full vehicle read/update screen. | Dedicated add/edit and detail screens; existing PUT contract; preserve existing photo and QR when editing; focus/resume/pull/manual refresh; duplicate-registration precheck and submit locks. |
| QR association/scan | Previously trusted route-provided QR/title; scanned arbitrary URL tails; tried several entity APIs even after a network failure. | Verified `/public/resolve/{id}` then matching entity; owned vehicle ID and plate/QR consistency check; detect multiple visible mappings; server alone creates QR ID. Scanner opens own vehicle or public finder record. Invalid/deleted/unassigned errors separated from connection retry. Allow only configured app/API hosts and supported scan paths. |
| QR sharing | Earlier screen generated a code without verifying it. | Verified QR on vehicle detail and full QR screen, copy/share **link**. Image download/export is not supplied; no media/storage permission is requested. Server-level global uniqueness still requires database constraints and cannot be certified from client code. |
| Permissions | Push/location could be requested as part of initialization; settings return and denial were incomplete; background reconciliation could request permissions repeatedly. | Feature-triggered rationale; dedicated permission status screen; camera fallback/paste link and settings recheck; guarded notification setup; no scheduled/silent permission prompts; location timeout/services checks and non-blocking SOS without location. Native OS behaviors remain device-test pending. |
| Tags missing | Guardian tags use `/tags`; previous failed fetch silently became an empty list. No vehicle-tag mapping/status/colour fields appear in production TagOut/VehicleOut. | Read actual `/tags`, dynamic type options, refresh and visible fetch errors. Render supplied mappings/chips only, never attach unrelated tags. Inline picker replaces nested modal. **Vehicle-tag mapping/status/colour parity blocked by missing upstream fields.** |
| Bike icons | Original vehicle list used a generic icon for every vehicle. | Shared icon component maps actual backend enum/code to car, motorcycle/scooter/two-wheeler, truck/tractor, or neutral fallback. List/detail/scanner share the mapping. |
| Notification detail safety | Earlier maps workaround referenced undefined incident location styles and trusted coordinate/photo types. | Missing styles restored, numeric coordinate bounds and photo type checked, external Maps open failure caught. Device map-crash diagnosis from prior work remains unverified without logs. |
| Data/null/error behavior | Multiple list endpoints propagated null or malformed values; UI frequently hid errors as empty states. | Defensive row/user/vehicle/public-QR normalization, list deduplication, visible load/error/retry/empty states, sanitized category/status-only diagnostics. |

## Verified API contract (unchanged)
- Auth: `POST /api/auth/login`, `GET /api/auth/me`, existing JWT bearer header. No auth backend or database change.
- Vehicles: `GET/POST /api/vehicles`; `GET/PUT /api/vehicles/{id}`.
- Payload: `number_plate`, `vehicle_type`, `make_model`, `color`, `speed_limit_kmh`; existing `photo_base64` retained when editing. No new image upload or QR reassignment feature.
- Tags/cards: existing `/api/tags` and `/api/cards`.
- QR: `GET /api/public/resolve/{qr_id}`, followed by existing vehicle/tag/card public resolver.
- Read-only metadata: existing `/openapi.json` for enums and numeric rules. No new metadata endpoints added. If unavailable, the form shows Retry instead of hardcoded options.
- Existing production `EXPO_PUBLIC_API_URL` and website URL are preserved through `app.config.ts`/Constants. Protected Expo variables unchanged. Local backend is not substituted for production.
- Website public JS `main.41562b12.js` and production OpenAPI compared read-only. Website uses the same combined `make_model`/colour/speed fields. Full website UI regression was not performed; unchanged source/contract plus live API regression provides limited non-regression evidence, not a blanket guarantee.

## Files changed or added
All paths below are relative to `/app`.

### Startup, configuration, session, native compatibility
```
frontend/app.config.ts                         NEW
frontend/babel.config.js                       NEW
frontend/scripts/babel-webrtc-imports.js        NEW
frontend/yarn.lock                             NEW (installer output)
frontend/app/_layout.tsx
frontend/app/index.tsx
frontend/app/(tabs)/_layout.tsx
frontend/src/api/config.ts                     NEW
frontend/src/api/client.ts
frontend/src/api/normalizers.ts                NEW
frontend/src/context/AuthContext.tsx
frontend/src/hooks/use-icon-fonts.ts
frontend/src/components/AppErrorBoundary.tsx   NEW
frontend/src/components/StartupState.tsx       NEW
frontend/src/components/NotificationBridge.tsx NEW
frontend/src/components/LiveOverlays.tsx
frontend/src/utils/diagnostics.ts              NEW
frontend/src/utils/storage/storage-base.ts
```
The already-declared Expo/Constants versions were installed (54.0.37/18.0.14). No package entry-point or Expo project ID change. `metro.config.js`, EAS configuration and protected environment values were not edited.

### Vehicles, tags, QR, shared UI
```
frontend/app/vehicle-form.tsx                  NEW
frontend/app/vehicle-detail.tsx                NEW
frontend/app/(tabs)/security.tsx
frontend/app/qr-detail.tsx
frontend/app/scan.tsx
frontend/app/scan-report.tsx
frontend/src/api/endpoints.ts
frontend/src/api/types.ts
frontend/src/api/vehicleMetadata.ts            NEW
frontend/src/utils/vehicles.ts                 NEW
frontend/src/components/SearchSelect.tsx       NEW
frontend/src/components/VehicleIcon.tsx        NEW
frontend/src/components/TagChips.tsx           NEW
frontend/src/components/VerifiedQr.tsx         NEW
frontend/src/components/Chip.tsx
frontend/src/components/Field.tsx
frontend/src/components/NeonButton.tsx
frontend/src/components/OverlayForm.tsx
```

### Permissions and safety guards
```
frontend/app/permissions.tsx                    NEW
frontend/app/(tabs)/profile.tsx
frontend/app/(tabs)/family.tsx
frontend/app/(tabs)/index.tsx
frontend/app/check-in.tsx
frontend/app/incident-detail.tsx
frontend/src/components/PermissionRationale.tsx NEW
frontend/src/services/permissions.ts           NEW
frontend/src/services/push.ts
frontend/src/services/backgroundLocation.ts
frontend/src/services/guardianControl.ts
frontend/src/services/guardianSchedule.ts
frontend/src/utils/location.ts
```
`alert-detail.tsx` retains the previous fork's external-Maps safety workaround; no new native MapView was added.

### Test evidence / documentation
```
backend/tests/test_live_api_parity_iteration15.py
test_reports/iteration_15.json
test_reports/iteration_15_retest.json
test_reports/pytest/iteration15_live.xml
test_reports/artifacts_main_retest/*.jpeg
memory/FIX_REPORT.md
memory/PRD.md
test_result.md
```

## Test results and limits
- TypeScript: `npx tsc --noEmit` passes.
- JS lint: no errors; existing hook/dependency warnings remain elsewhere.
- Android JS bundling: `npx expo export --platform android --no-bytecode` passes (2259 modules). Diagnostic output is **not an APK** and is not an instruction to disable bytecode in release builds.
- Live API pytest: 5/5 pass (auth, published schema, create/read/update vehicle and QR preservation, cleanup).
- Mobile-web: login/session restore, field entry/uppercase/invalid input, vehicle save/edit/reopen, real QR verification/copy/share controls, own QR navigation, permissions fallback and tab navigation tested.
- Main retest: real saved login + **SIMULATED** 500/null/offline -> friendly Retry; Retry restores without login; **SIMULATED** 401 -> login. These simulations change browser test responses only, not production APIs.
- Main retest: actual server tag enum searched/selected; signed-out direct QR route survives bootstrap; real invalid QR rejected; network resolver simulation gives Retry rather than false unregistered state; unrelated URL rejected.
- Real owned QR and share controls verified at 360×800; other checks at 390×844. Screenshots in `test_reports/artifacts_main_retest/`.
- The test-only UI vehicle created during iteration15 was deleted and readback returned 404. No unrelated vehicle/tag/account was modified or removed.
- **Not run:** real Android installation, cold native boot, physical camera scan, OS permission allow/deny/permanent-denial, return from native Settings, device reboot, native notification tap/FCM, native share sheet. No device/adb/Java/Android SDK exists here. Hermes compiler supplied for Linux is x86, host is aarch64. **No updated APK was produced.**

## Next required work
1. Obtain real-device Logcat from a failing installation and run the native checklist against a signed build in an Android-capable environment. Do not treat web tests or JS export as device validation.
2. Add/identify production make/model catalogs (stable IDs and dependencies) and vehicle-tag mapping/status/colour contract before implementing the remaining requested parity. Do not change the shared schema without coordinating website compatibility.
3. Existing TURN connectivity, QR family call fan-out and active OTP-provider credentials remain blocked from the prior session and were not changed here.