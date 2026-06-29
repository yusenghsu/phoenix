# Canva Motion Output Plan

## Overview

Phoenix's final carousel output is 8 × 4:5 MP4 motion slides.
Canva is the planned provider for initial motion asset generation and final video composition.

This document is an integration roadmap — Canva is **not yet connected**.

---

## Why Canva

- Canva's AI video generation can produce short looping background video from text prompts
- Canva's template engine can handle Chinese typography layout with precise safe-area constraints
- Canva's MP4 export can produce 4:5 (1080×1350) vertical video — the exact format Instagram Carousel requires
- No self-hosted rendering infrastructure needed for MVP

---

## Architecture

```
Phoenix Final Launch Pack (per slide)
  └─ motion_asset.video_generation_prompt  ──►  Canva AI Video Generation
                                                  └─ background_video_url (MP4, 4:5)
                                                       │
                                                       ▼
                                             Canva Template Composer
                                               ├─ text overlay (main_lines / support_lines)
                                               ├─ highlight_words → orange span
                                               ├─ typography template applied
                                               └─ footer: "小佑老師｜保險新人真話"
                                                       │
                                                       ▼
                                             Export → final_video_url (MP4, 1080×1350, 5s, 24fps)
```

---

## Phase 1 — Manual Canva (current)

**Status: Available now**

1. Open Canva, create a 1080×1350 video template
2. Paste `motion_asset.video_generation_prompt` into Canva AI video generator
3. Download the background video clip
4. Upload as background layer in the Canva composition
5. Add text layers following `main_lines` / `support_lines` arrays
6. Apply `highlight_words` as orange text spans
7. Export as MP4
8. Upload MP4 to Phoenix via the still-preview Upload panel (debug fallback) to preview typography

**Per-slide prompt source:** `FINAL_LAUNCH_PACK.slides[n].motion_asset.video_generation_prompt`

**Per-slide text safe area:** `motion_asset.text_safe_area` (left / right / center / bottom)

---

## Phase 2 — Canva API Integration (planned)

**Status: Not yet implemented — API availability gated on Canva Connect launch**

### Required credentials

```
CANVA_CLIENT_ID=...
CANVA_CLIENT_SECRET=...
CANVA_BRAND_TEMPLATE_ID=...  # Phoenix 4:5 motion template
```

### Integration steps

1. OAuth 2.0 flow: Phoenix backend exchanges CANVA_CLIENT_ID/SECRET for access token
2. `POST /v1/assets` — upload any base assets (brand fonts, logo)
3. `POST /v1/designs` — create design from CANVA_BRAND_TEMPLATE_ID
4. `PUT /v1/designs/{id}/autofill` — inject per-slide fields:
   - `main_text`: `main_lines.join("\n")`
   - `support_text`: `support_lines.join("\n")`
   - `slide_number`: `String(slide_number).padStart(2, "0")`
5. Canva AI video generation prompt → background video (polling job status)
6. `POST /v1/exports` — export as MP4 at 1080×1350 / 24fps / 5s
7. Phoenix downloads the MP4, stores as `motion_asset.final_video_url`
8. Motion Gate re-evaluates — `Motion Asset Readiness` dimension scores 10/10

### Provider adapter

`src/lib/launch/motion-provider.ts` — `CanvaProvider.generateMotionBackground()` will:

1. Check `CANVA_CLIENT_ID` && `CANVA_CLIENT_SECRET` → `isConfigured()`
2. Call Canva API sequence above
3. Return `{ status: "completed", video_url, thumbnail_url }`
4. Phoenix writes `video_url` to `slide.motion_asset.final_video_url`

---

## Phase 3 — Remotion Composition Layer (optional)

**Status: Not yet implemented**

If Canva API text overlay is insufficient for pixel-perfect Chinese typography,
Remotion can act as the final composition layer:

1. Canva generates background video only (no text)
2. Remotion receives: background video URL + text data
3. Remotion renders: video background + React-based text overlay
4. Remotion exports: MP4 with frame-accurate text timing

This separates concerns: Canva = video generation, Remotion = typography compositing.

---

## Constraints

- No Instagram API connection — manual upload only
- No production writes from Phoenix backend
- No automatic posting
- All `final_video_url` values are local object URLs or CDN-hosted files — not published to IG
- Approval is local state only (`humanApproved` in `page.tsx`)
- `CANVA_CLIENT_SECRET` must only be used server-side — never in NEXT_PUBLIC env vars

---

## Acceptance Criteria for Canva Integration

- [ ] `CanvaProvider.isConfigured()` returns true when env vars present
- [ ] `CanvaProvider.generateMotionBackground()` returns `status: "completed"` with valid MP4 URL
- [ ] Motion Gate `Motion Asset Readiness` scores 10/10 when all 8 slides have `final_video_url`
- [ ] `MotionSlidePreview` plays the Canva-exported MP4 in the browser via `<video>` tag
- [ ] All 8 slides loop correctly in the motion preview panel
- [ ] No Canva credentials exposed to client-side code
- [ ] No automatic Instagram post triggered
- [ ] `npm run build` passes with 0 errors after integration
