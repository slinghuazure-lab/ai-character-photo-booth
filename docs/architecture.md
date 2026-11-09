# P0-1 architecture and boundaries

- `src/App.tsx`: responsive exhibit UI and camera lifecycle orchestration.
- `src/camera.ts`: browser camera acquisition, enumeration, resolution preference, track information and stop.
- `src/settings.ts`: validated local settings, default values, LocalStorage persistence.
- `src/i18n.ts`: all three UI language dictionaries.
- `src/styles.css`: responsive layouts, dark exhibit theme.
- `.github/workflows/deploy.yml`: GitHub Pages build/deploy workflow.

## Future interfaces (planned; not implemented in P0-1)

- `CameraFrame`: source, timestamp, width, height.
- `TrackedPerson`: temporary track ID, bounding box, confidence.
- `GestureResult`: hand landmarks, category, confidence, tentative person association.
- `ConsentState`: temporary person ID, state, evidence confidence and timestamp.
- `CharacterController`: load, set gaze, play idle/photo animation, pose, reset, transparent render.
- `PhotoComposition`: camera still, segmentation mask, character render, background and output size.

Future stages should keep the video stream in the browser, use one stream for multiple vision tasks, and avoid relying on person track IDs as persistent identities.

## Known P0-1 limits

- Resolution is a preference (`ideal` constraints); actual track settings may differ.
- Video element can be mirrored for preview, without changing captured data.
- `devicechange` and fullscreen APIs vary by browser.
- No face/gesture/segmentation inference in this stage.
- No cloud upload or photo retention.
- Camera tracks stop on explicit Stop or page unmount; background behavior is browser-dependent.
