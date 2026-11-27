# Kháng Chiến performance and stability upgrade plan

Target source: this folder, confirmed as the code served on `127.0.0.1:8765` by the running `node server.js` process. `C:\Users\SK\Documents\Codex\2026-11-27\m\outputs\khang-chien-web` is a separate, newer working copy with its own uncommitted edits; it is not the live server root. The target scratch folder has no Git metadata, so existing files are preserved and changes are made in place.

## Work items

- [x] Establish the served source and record existing behavior/constraints.
- [x] Capture repeatable dense-battle simulation baseline (100, 180, 240 units; 500 fixed updates, warmup, median/p95). Browser render FPS is a separate measurement.
- [x] Reduce dense-unit target, splash, wave, ally, and foe queries using the existing spatial grid; avoid per-hit full-array filter/sort allocations.
- [x] Reduce update-loop garbage from particles, waves, shots, deaths, bubbles, and camera aggregation while retaining visual/effect limits.
- [x] Add a small configurable runtime quality and profiling interface without changing default visual style or game rules.
- [x] Benchmark updated simulation and record before/after values; record runtime and methodology.
- [x] Convert 34 runtime image references to lossless WebP; retain PNGs for rollback and verify visible pixels.
- [x] Cull off-camera units, labels, bubbles, and death animations in the render pass.
- [x] Deduplicate TikTok LIVE retries, add bounded backoff/jitter, and show reconnect wait status.
- [ ] Measure real browser frame-time/FPS on a representative common machine and tune only from evidence.
- [x] Review runtime encoding and reduce transfer cost while preserving sprites/art; decoded dimensions and long-session memory still need device profiling.
- [x] Preserve event toasts/feed and report reconnect wait state with retry timing.
- [ ] Exercise real LIVE integration in a controlled test and review failure behavior end to end.
- [ ] Longer soak, high-density effects, and accessibility/UI responsiveness checks.

## Guardrails

Keep Vietnamese visual style, both factions, latest-faction heart routing, distinct units per same-price gift, gacha, completed-match win analysis, and default-off automatic spawning. Do not alter balance without measurements. Do not commit or push.

## Results (2026-11-27)

The reproducible harness is in `bench/performance.cjs`. It uses Node v24.22.1, a deterministic seed, a headless DOM/canvas stub, dense opposing units on a short battle line, 12 warmup ticks, then 500 updates; five fresh runs per density. `--baseline` approximately restores the former full-scan splash and allocating cleanup paths in the same current source; this is a targeted comparison, not the exact old full build. Values are the median of run medians and median of run p95s:

| Units requested | Median update baseline → current | p95 baseline → current | Units remaining |
| ---: | ---: | ---: | ---: |
| 100 | 0.470 → 0.483 ms | 1.323 → 1.363 ms | 41 |
| 180 | 1.088 → 1.063 ms | 2.839 → 2.680 ms | 90 |
| 240 | 1.409 → 1.382 ms | 4.871 → 4.331 ms | 100 |

At 240 units, the targeted changes reduced simulation median by about 2% and p95 by about 11%. The 100-unit result is effectively flat/noisy. Render work, browser scheduling, image decode, and GPU are not measured by this stub; these figures do not establish 60 FPS. Re-run with `node bench/performance.cjs <units> 5 --baseline` and without `--baseline`.

`node bench/verify-assets.cjs` confirms all 34 loaded WebP images have identical visible decoded RGBA pixels to their PNG sources. Their combined transfer payload fell from 61,869,525 to 41,200,432 bytes (33.4%). Hidden RGB values at alpha 0 are normalized in the comparison and may differ.

## Remaining checks

- [ ] Measure browser frame time/FPS on a representative common machine and tune canvas, effects, and image decode from that evidence.
- [ ] Profile image dimensions/decode memory and check UI response under load.
- [ ] Exercise TikTok LIVE integration in a controlled test account/session.
- [ ] Review further image decode/memory costs; original PNGs remain alongside WebP for rollback.

## Original benchmark scope

The workload packs the requested unit count into an eight-lane opposing battle near the field midpoint and mixes unit definitions; casualties naturally reduce the live count during the 500 measured updates. The baseline implementation in the harness is intentionally approximate and limited to selected hot paths.
