# Third-party assets

Kart bodywork, circuit layouts, terrain, sky/water shaders, circuit furniture, spectators, UI artwork and synthesized audio are original work for this project. The scenery also uses the openly licensed models below. No Mario Kart, Sonic Racing or Crash Team Racing assets are used.

## Quaternius — Stylized Nature MegaKit, Standard edition

Source: https://quaternius.com/packs/stylizednaturemegakit.html
Download: https://quaternius.itch.io/stylized-nature-megakit
License: CC0 1.0 Universal. Original license included at `public/art/woodland/License.txt`.

Twelve selected trees, bushes, ground plants and rock models are included in `public/art/woodland/`. Geometry was repackaged as GLB; shared textures were resized and opaque textures compressed for web delivery. Source vertex colors and normal maps are preserved. `scripts/prepare-art.mjs` documents reproducible preparation from the free Standard archive. Runtime foliage wind is original shader code.

## Kenney — Pirate Kit, City Kit Suburban and Nature Kit

- https://kenney.nl/assets/pirate-kit — palms, coastal rocks, boats, tower, fence and barrels in `public/art/coastal/`.
- https://kenney.nl/assets/city-kit-suburban — detailed buildings in `public/art/village/`.
- https://kenney.nl/assets/nature-kit — cactus and flowers in `public/art/nature/`.

License: Creative Commons CC0. Each folder contains the original `License.txt`. GLBs and their palette textures are served locally; the game does not contact asset providers during play.

## MediaPipe Tasks Vision

Copyright Google LLC. Package `@mediapipe/tasks-vision` 0.10.32, Apache License 2.0.
Runtime files under `public/wasm/` are copied from that package. License: https://github.com/google-ai-edge/mediapipe/blob/master/LICENSE

## Pose Landmarker lite model

Official Google MediaPipe pose_landmarker_lite float16, revision 1:
https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task

Model documentation and license information: https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker

All npm dependency licenses remain available in node_modules after installation.
