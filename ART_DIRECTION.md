# Kart Chaos — environment art

The visual theme is an independent grand tour: warm ivory circuit furniture, coral club branding, restrained mint lighting, and tangible painted/metal/rubber kart surfaces. Asset scale, placement, lighting and vegetation are controlled by the same scene layer on all three circuits.

## Routes

- Sunset: a palm-lined coastal village, leafy woodland and a warm rocky ridge. Boats belong only to the coastal circuit.
- Canyon: weathered rock, dry vegetation and stone outposts, followed by planted oasis verges and quartz formations.
- Aurora: moonlit pines and lodges, a woodland section and a cool crystal valley, against a continuous snowy mountain skyline.

## Runtime

- `src/art-assets.ts`: local GLB loading, geometry normalization, foliage wind and spatially grouped instances. Source material maps and vertex colors are preserved. Only downloaded model bytes are cached across scene lifetimes; GPU resources are scene-owned.
- `src/landscape.ts`: terrain height follows the existing road. Conservative road clearance prevents terrain from covering tight bends. Far mountains use a continuous ridged mesh.
- `src/world.ts`: biome-aware, deterministic scenery placement, with footprint clearance from every road segment and neighboring large props.
- `src/art-materials.ts`: asphalt/ground grain, sky, drifting clouds, moon/aurora, water ripples and sign artwork.
- `src/track-dressing.ts`: modeled furniture, branded flags, curved lamps, shelters and spectators.
- `src/kart-art.ts`: lofted bodywork and detailed tires, rims, cooling fins and tubing. Stationary details are merged while wheels, paint and driver photos remain independently controllable.

The race countdown waits for model textures and shader compilation. A missing model or texture produces a retry screen. Reduced motion freezes world wind, sky and water movement along with flags and spectators. Scenery does not modify physics or collision geometry. Camera and track centerlines remain unchanged.

## Assets and verification

Selected assets are bundled under `public/art/`; see `THIRD_PARTY_NOTICES.md` and each pack's included license. The large source downloads are not shipped. `scripts/prepare-art.mjs` converts the free Quaternius Standard glTF pack to local GLB with shared textures. Runtime needs no Blender, asset service or API key.

Run `npm test` and `npm run build`. Graphics tests check asset dependencies, terrain clearance and kart panel bounds. For a visual pass, race all three tracks, switch to local split-screen, toggle reduced motion, restart, and return to the menu. Test frame rate on the presentation laptop at its actual resolution; screenshots and unit tests do not establish performance on other hardware.
