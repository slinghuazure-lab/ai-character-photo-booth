# P0-1 acceptance test plan

Record device, OS, browser version, test date, and pass/fail for each test. These are **manual tests**, not claims of completed verification.

| ID | Test | Expected |
|---|---|---|
| P01 | Open site before clicking Start | Camera not requested; placeholder shown |
| P02 | Click Start and allow access | Live preview appears; status Active |
| P03 | Click Stop | Track stops and preview clears |
| P04 | Deny permission | Localized error and Retry button; no crash |
| P05 | Select another available camera | Stream switches, old tracks stop |
| P06 | Change resolution while active | Stream restarts and Debug shows actual dimensions |
| P07 | Switch mirror | Preview flips; source stream unchanged |
| P08 | Switch zh-TW/en/ja | All labels update without stopping stream |
| P09 | Toggle Debug | Debug panel hides/shows |
| P10 | Refresh page | Settings persist; camera does not automatically start |
| P11 | Reset settings | Default language, resolution, mirror and debug restored; camera stops |
| P12 | Resize/rotate screen | No horizontal overflow; camera controls accessible |
| P13 | Camera unplug while running | Error state shown; retry possible |
| P14 | Open deployed Pages URL on phone | HTTPS permission prompt and preview work |
| P15 | Build with `npm run build` | Typecheck and production build succeed |

## Devices

- iPhone Safari (portrait/landscape)
- Android Chrome
- iPad Safari
- Windows/macOS Chrome with USB camera
- Large display attached to host computer

## Future gates

P0-2: GLB/placeholder eyes follow face; P0-3: 1–5 person gesture consent; P0-4: segmentation and 1920×1080 PNG. None are included in P0-1.
