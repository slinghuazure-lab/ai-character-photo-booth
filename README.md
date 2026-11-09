# AI Interactive Character Photo Booth — P0-1

A responsive camera foundation for the v1.4 interactive character photo booth. **No face recognition, 3D character, gesture recognition, cloud upload, or Supabase is included yet.** Camera frames stay in the browser.

## Requirements

- Node.js 20.19+ or 22+
- npm
- A camera and browser with `getUserMedia` support
- HTTPS or `localhost` for camera permissions

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:5173` on the same computer. Click **開始展示 / Start exhibit** to request camera access.

For a phone/tablet, deploy to GitHub Pages (HTTPS). Opening a LAN HTTP address from another device may not allow camera access.

## Production build

```bash
npm run build
npm run preview
```

## GitHub Pages

1. Create a GitHub repository and upload all project files, including `.github/workflows/deploy.yml`.
2. Use the `main` branch.
3. In repository **Settings → Pages → Build and deployment**, select **GitHub Actions**.
4. Push to `main` or run the workflow manually.
5. Visit `https://YOUR_USERNAME.github.io/YOUR_REPOSITORY/`.

The workflow sets `GITHUB_PAGES_BASE` to `/<repository>/`, so Vite's asset paths work under project Pages. For custom domains or a user/organization root site, adjust `base` accordingly.

## Features

- Responsive mobile/tablet/desktop layout
- Start/stop camera with browser permission prompt
- Camera device selector (labels may only appear after permission)
- Automatic 720p preference, or manual 640×480 / 1280×720 / 1920×1080 preferences
- Mirror preview switch (display only)
- Chinese (Traditional), English, Japanese
- Debug panel with camera status, selected track settings, viewport and approximate animation FPS
- LocalStorage settings persistence
- Camera disconnection and permission error handling
- Optional fullscreen

**Important:** The FPS shown is `requestAnimationFrame` loop FPS, not a measured camera capture or MediaPipe inference FPS. The camera may choose a different resolution from the requested preference.

## Verification

See [docs/test-plan.md](docs/test-plan.md) for manual acceptance tests and [docs/architecture.md](docs/architecture.md) for architecture boundaries.

## P0-2 handoff

The camera utility is in `src/camera.ts`, UI translations in `src/i18n.ts`, and settings validation in `src/settings.ts`. Future P0 stages can add `src/modules/character`, `src/modules/face-tracking`, and `src/contracts` without cloud dependencies.

## Build verification status

The project files have been generated, but dependencies could not be downloaded in the current environment. The production build and browser-camera tests have **not** been executed here. Run `npm install` and `npm run build` on your machine or GitHub Actions to verify.
