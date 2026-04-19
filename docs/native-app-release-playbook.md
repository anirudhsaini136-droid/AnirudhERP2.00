# Native App Release Playbook

## Delivered in this implementation pass
- Shared core extraction baseline:
  - `src/shared-core` for web consumption
  - `shared-core/src` package for native reuse
- Android app project scaffold:
  - `apps/android-app` (Expo + drawer module navigation + WebView module host)
- Windows desktop app project scaffold:
  - `apps/windows-app` (Electron shell + module menu + PDF export + auto-update hooks)
- Backend app support endpoints:
  - `GET /api/app/health`
  - `GET /api/app/sync/observability`
  - `POST /api/app/contracts/validate`

## QA matrix

### Core login/session
- Login from Android shell.
- Login from Windows shell.
- Verify session survives app restart.
- Verify unauthorized flow redirects to login.

### Finance + offline
- Open invoices list from Android.
- Create invoice online and verify visibility in web + app.
- Toggle offline and verify cached data remains visible.
- Reconnect and verify pending queue sync status.

### GST parity
- Compare GST summary values between web and app for same date range.
- Verify offline-pending invoice inclusion badge and totals.

### Inventory parity
- Create invoice and verify stock deduction.
- Delete invoice and verify stock restore.

### Desktop native actions
- Print current module page.
- Export current view as PDF.
- Run update check action.

## Build commands

### Android
1. `cd apps/android-app`
2. `npm install`
3. `npx expo prebuild`
4. `npx expo run:android --variant release`
5. Sign APK/AAB using production keystore.

### Windows
1. `cd apps/windows-app`
2. `npm install`
3. `npm run dist`
4. Sign generated installer with code-signing certificate.

## Deployment notes
- Set app origins:
  - Android: `EXPO_PUBLIC_WEB_ORIGIN`
  - Windows: `ERP_WEB_ORIGIN`
- Keep backend and frontend on same release tag for parity validation.
- Run DB migrations before app rollout.

