# Kart Chaos

**Small karts. Big rivalries.** A local 3D arcade racer with body or keyboard controls, an AI opponent, two-player split screen, free practice, and a hands-on driving school.

The Racing Club UI includes original vector kart illustrations, a three-circuit selector on the title screen, track briefings, named paint finishes, illustrated power-ups and compact race instruments. The garage shows the actual keyboard bindings or body gestures. Results lead with a podium and race times, with lap comparisons and statistics in an expandable report. The cream, dark teal, coral and lime palette carries through setup, pause, controls and results. Artwork is local; no remote fonts or image services are required. The covered 3D world stops rendering in the title screen and garage.

## Run

Use Node.js 22.12+ (tested with Node 24).

```sh
npm install
npm run dev
```

Open the printed localhost URL in desktop Chrome. No account, backend, or paid API is needed. The checked-in MediaPipe WASM runtime and pose model are served locally; webcam video stays on your computer. The first npm install requires internet access.

```sh
npm test         # simulation and synthetic-pose regression tests
npm run build   # TypeScript check + production dist/
npm run preview # serve production build locally
```

Choose **Let's Race**, select a mode and circuit, enter names, choose one of six kart colors, and select keyboard or camera for each racer. Camera setup is hands-free after clicking **Calibrate Camera**: step back, hold still, then lean both ways. Each step advances automatically. Once all camera racers are calibrated and visible, a three-second ready countdown leads into the race countdown. Lost tracking or leaving the active tab resets the ready countdown, preserving calibration. The first player to finish three laps wins; the other racer can finish and record their time. Race Again resets the simulation without a page refresh.

## Modes and circuits

- **Solo race:** Circuit Bot follows the same kart physics, with easy, normal and hard decision-making. It steers, drifts, uses items and avoids hazards.
- **Two players:** Local horizontal split screen with independent keyboard or body controls.
- **Practice:** Empty track, unlimited laps and refilling items. Select any power-up and end the session when ready.
- **Driving school:** Four interactive lessons teach steering, drift boosts, jumping and item use.
- **Sunset Circuit:** Wide coastal bends; **Copper Canyon:** tight red-rock switchbacks; **Aurora Run:** longer straights beneath a violet sky.

Settings include saved keyboard remapping, volume, body sensitivity, camera preview, reduced motion and a high-contrast HUD. Results include lap comparisons, speed, drift/boost time, road accuracy, collisions, pickups and item statistics. Names, colours and settings are stored in the current browser.

## Controls

| Action | Player 1 | Player 2 | Webcam |
|---|---|---|---|
| Steer | A / D | Left / Right | Lean torso left / right |
| Drift | S + steering | Down + steering | Squat while leaning |
| Jump boost | W | Up | Small physical hop |
| Item | Space | Enter | Deliberately extend an arm with a throwing motion |
| Pause | Escape | Escape | Pause button |

Acceleration is automatic. This is an **assisted arcade racer**: heading follows the road, while the player controls lateral movement, drifting, boost timing, pickups and attacks. It deliberately avoids free-heading driving so beginners can immediately race using their bodies. Road shoulders slow the kart and outer barriers keep it on the island. Three ordered quarter-lap checkpoints must be reached before each finish-line crossing counts.

Drift for at least 0.55 seconds, then release to gain a boost. Longer drifts charge stronger boosts (up to three seconds). Jump boosts have a 2.2-second cooldown. Keyboard boost and item inputs activate on a fresh press; release before pressing again.

## Items

- **Rocket:** Forward-moving projectile that steers toward the opponent's lane; must physically catch them.
- **Banana:** Drops a curved obstacle behind you for the opponent to hit.
- **Shield:** Blocks one attack or expires after nine seconds.
- **Turbo:** Four seconds of extra speed.
- **Lightning:** Slows the opponent for 2.5 seconds unless shielded.

Pickups respawn after seven seconds. Trailing racers receive better odds of recovery items; leading racers get more defensive options. Item cooldowns and brief protection after a hit prevent rapid repeated attacks. Chaos Mode increases speed and pickup frequency. Normal mode takes roughly two minutes per race. Sound effects and engine audio are synthesized with Web Audio; volume and mute are in Settings. There is no background music.

## Computer vision

`@mediapipe/tasks-vision` Pose Landmarker 0.10.32 uses the official lite float16 model with `runningMode: 'VIDEO'` and **`numPoses: 2`**, not the single-person default. Multi-pose support is documented at https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker/web_js.

Inference runs in a dedicated worker on transferred ImageBitmaps, throttled to at most 25 requests/second with only one frame in flight. CPU inference keeps it separate from the rendering GPU. The actual rate depends on the machine. The UI displays measured tracking FPS.

In two-player mode, the mirrored preview assigns Player 1 to the left zone and Player 2 to the right. Single-player modes use a centered full-body view. Position history and zone gating maintain identity across reordered detections. Players should **not cross zones**; ambiguity causes lost tracking rather than swapping identities. Visible shoulders, hips, knees, and ankles are required. Calibration averages 50 standing frames, then measures comfortable lean in both directions. Steering uses shoulder/hip torso angle, a dead zone, sensitivity adjustment and exponential smoothing. Squats use leg compression and hip drop. Jumps require both shoulders and hips to rise with upward velocity, not merely raised hands. Throws use shoulder-relative wrist velocity, elbow extension and a cooldown. Missing or stale detections neutralize steering/gestures and reduce speed safely.

## Tracking diagnostic

Open `/diagnostics.html` on the running local server and click **Test tracking engine**. This loads the bundled model in a classic worker and runs inference on a blank image without camera access. The production diagnostic passed in the in-app Chromium browser: local model loaded, two-pose configuration active, inference completed with zero detections as expected. This validates integration, not human tracking accuracy.

## Camera verification procedure

Real two-person camera tracking requires manual validation; automated synthetic-landmark tests are not a substitute.

1. Use Chrome on localhost, enable camera access, and position two players with their entire bodies visible in even lighting. Leave room to lean and hop.
2. Choose camera for both players. Player 1 stands in the left half of the mirrored preview; Player 2 stands in the right.
3. Hold still until both standing calibrations reach 100%; the lean test opens automatically. Lean left and right separately, then return to a comfortable stance. Verify that the ready countdown starts without touching the computer. Step out of frame during that countdown and confirm it restarts from three when both players return. Verify colors, labels and confidence in the skeleton overlay.
4. Lean one person at a time: only their meter and kart should respond, in the same direction as the mirrored preview.
5. Squat while leaning, stand to release a drift boost, hop once, and throw after collecting a box. Check cooldowns and that casual arm raises do not jump.
6. Leave the frame: the correct player should get a warning and slow safely. Return to the same zone and verify identity is retained.
7. Finish all three laps, inspect results, and restart. Test mixed camera/keyboard modes as well.
8. Deny camera permission or disconnect it: confirm an actionable error/lost-tracking warning; use Change Controls or the pause menu keyboard fallback.

## Architecture

- `src/game.ts`: fixed-step shared simulation, race state, checkpoints, items and collision reactions.
- `src/scene.ts`: Three.js procedural island, batched static geometry, kart models, follow cameras, split-screen scissor rendering.
- `src/pose.ts`: identity assignment, confidence gates, calibration and gesture extraction.
- `src/vision.worker.ts`, `src/camera.ts`: local MediaPipe inference, camera lifecycle and skeleton preview. `scripts/prepare-worker.mjs` bundles a classic worker before dev/build for the MediaPipe WASM loader.
- `src/App.tsx`: React menus, player setup, HUD, pause/results and keyboard input.
- `src/audio.ts`, `src/effects.ts`: layered synthesized audio and pooled particle effects.
- `src/Art.tsx`, `src/game-ui.css`: original vector artwork and Racing Club visual design.
- `src/RacePresentation.tsx`, `src/race-club.css`: circuit selection, track notes, control legends and finish podium.
- `src/tracks.ts`: three circuit layouts and palettes.
- `src/preferences.ts`, `src/Settings.tsx`, `src/Results.tsx`: saved controls, accessibility and session statistics.
- `src/game.test.ts`: deterministic simulation and synthetic-landmark tests.

## Verification completed

- 44 automated tests passed, including hands-free calibration and countdown resets, mixed keyboard/camera slots, AI completion on all three circuits at all three difficulties, practice refills, tutorial progression, item balance, key remapping and race lifecycle, ordered checkpoints, full race completion, pickups/items, drift boosts, collisions, lost tracking, synthetic pose assignment and gestures, camera-relative left/right projection, and tied-finish ranking.
- TypeScript check and Vite production build passed.
- Browser check completed a three-lap race in approximately 2:05, showed results with lap times, and restarted without refresh. Pause/resume preserved progress.
- Final-build keyboard jump boost and Lightning activation were observed in the HUD; Lightning consumed the item and slowed the opponent.
- Production MediaPipe diagnostic loaded the local model and completed blank-image inference in the worker.
- Real two-person webcam gestures and performance targets remain unverified.

## Scope and remaining limitations

- Live two-person camera accuracy and 60 FPS rendering / 20–30 FPS inference targets must be measured on real hardware; these are targets, not certified benchmarks.
- Camera calibration and gestures depend on lighting, full-body framing and clothing. Occluded/crossing players are intentionally treated as tracking loss.
- Driving uses track-relative arcade assistance, not a general rigid-body vehicle simulation. Decorative trees and rocks sit outside the playable corridor.
- No online multiplayer, gamepad integration, saved race history or background music. All geometry and synthesized audio are original procedural assets.
- Desktop landscape screens are recommended. Mobile devices are not the performance target.

See `THIRD_PARTY_NOTICES.md` for the bundled inference runtime and model attribution.
