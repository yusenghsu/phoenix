# Canva Motion Workflow — Corrected After 16:9 Limitation

**Status:** Canva is NOT connected. Role corrected based on user testing.

---

## User Test Result

> User tested Canva AI video (Magic Media).
> Current output: **16:9 only**.
> Phoenix final output requirement: **1080×1350 · 4:5 · MP4**.
>
> **Decision: Canva AI video is not suitable as the primary final motion background generator.**
> Cropping 16:9 to 4:5 is not a quality solution and is not an acceptable main workflow.

---

## Canva's Corrected Role

Canva is **not** a motion background generation provider.
Canva **can** serve as:

| Role | Status |
|------|--------|
| Typography / text layout engine | Viable |
| Text animation engine | Viable |
| Video composition (background + text) | Viable, with external video input |
| MP4 export engine | Viable |
| Still-to-motion fallback (pan/zoom/animate) | Viable fallback, not true cinematic motion |
| AI video background generator (4:5) | ❌ Not suitable — 16:9 only |

---

## Final Output Target (Unchanged)

```
8 × 4:5 MP4 motion slides
Resolution: 1080×1350px
Duration: 5 seconds each
FPS: 24
Format: H.264 MP4, no audio
Aspect ratio: 4:5 (not 9:16, not 16:9, not 1:1)
```

---

## True Motion Background Providers Required

Final motion background generation must use a provider that supports **vertical / portrait / 4:5 video**:

| Provider | Vertical Support | Status |
|----------|-----------------|--------|
| Runway Gen-3 Alpha | 9:16 (768×1280) | Not configured — needs RUNWAY_API_KEY |
| Kling | Vertical supported | Not integrated |
| Pika | Vertical supported | Not integrated |

Note: Runway generates 9:16. Phoenix displays in a 4:5 container with `objectFit: cover`.
This is acceptable for the spike phase — true 1:1 4:5 generation to be validated.

---

## Three Workflow Paths (Revised)

### Path A — Canva Composition / Export ✅ Available (with external video input)

**Purpose:** Canva handles typography, overlay, and MP4 export.
Motion background comes from an external provider (Runway/Kling/Pika).

**Flow:**
1. External provider (e.g. Runway) generates 9:16 or 4:5 background video
2. User imports background video into Canva
3. User applies Phoenix brand template over video
4. User adds text layers following `main_lines` / `support_lines` (no CSS auto-break)
5. User highlights `highlight_words` in orange (#F97316)
6. User adds footer: 小佑老師｜保險新人真話
7. User exports as MP4 (1080×1350 custom size)
8. Manual download and post

**What Phoenix provides:**
- Per-slide `video_prompt_for_canva` (for external provider)
- `template_instruction` — layout spec, overlay mask, font sizes
- `main_lines` / `support_lines` — pre-split Chinese text
- `highlight_words` — exact words to color orange
- Caption + hashtags

**This is the current viable path.**

---

### Path B — Still-to-Motion Fallback (Canva Pan/Zoom/Animate)

**Purpose:** Use OpenAI-generated 4:5 still image + Canva's animation tools.
**Label: Fallback only — not true cinematic motion background.**

**Flow:**
1. Phoenix generates 4:5 still background image via OpenAI (already implemented)
2. User imports still image into Canva
3. User applies Canva's built-in animation (pan / zoom / breathe)
4. User adds text layers and exports as MP4

**Limitation:**
- Canva's pan/zoom animation is simpler than a true AI-generated motion background
- Still image → animated video is a fallback, not the target quality
- Must be labeled clearly in Phoenix as "still-to-motion fallback"
- This path does NOT satisfy the motion gate requirements for final publish

---

### Path C — Canva AI Video Direct Generation ❌ Not Suitable (16:9 only)

**User test result:** Canva AI video currently generates 16:9 only.
This does not meet the 4:5 requirement.
Cropping 16:9 to 4:5 is not a quality solution.

**Decision: Do not pursue Canva AI video as primary motion background generator.**

If Canva adds 4:5 or 9:16 vertical support in a future release, re-evaluate at that time.

---

## Motion Provider Architecture (Corrected)

```
Primary motion background providers (must support vertical / 4:5 / 9:16):
  - Runway Gen-3 Alpha    (spike built — needs RUNWAY_API_KEY)
  - Kling                 (not yet integrated)
  - Pika                  (not yet integrated)

Composition / export providers:
  - Canva                 (planned — not connected)
  - Remotion              (planned — not connected)

Fallback only (not final output):
  - OpenAI still image (4:5) + Canva animation
```

---

## Motion Gate Rules (Unchanged)

- Without 8 real motion background videos → MOTION NOT READY
- Canva 16:9 AI video does NOT raise Motion Asset Readiness score
- Still-to-motion fallback does NOT trigger "APPROVED FOR MANUAL POST"
- Only 8 × real 4:5 / 9:16 portrait motion videos satisfy the motion gate

---

## Canva Integration Checklist (Updated)

- [ ] Confirm Canva supports importing external video as background layer
- [ ] Confirm Canva can export at custom 1080×1350 resolution as MP4
- [ ] Confirm Canva's text animation tools are suitable for Chinese typography
- [ ] Create Canva Developer account at developers.canva.com (for API path)
- [ ] Confirm Canva Connect OAuth is available for your account type
- [ ] Confirm Brand Template API and Autofill API access
- [ ] Confirm MP4 video export API access
- [ ] If Canva AI video adds vertical / 4:5 support: re-evaluate Path C
- [ ] Set CANVA_CLIENT_ID and CANVA_CLIENT_SECRET in .env.local (server-side only)

---

## Security Rules (Non-negotiable)

- No Instagram connection
- No automatic posting
- No production writes
- `CANVA_CLIENT_SECRET` server-side only — never in NEXT_PUBLIC
- No Canva credentials exposed to client code
- All video assets are local object URLs or CDN URLs — not auto-published
- Approval is local state only in Phoenix
