// Canva-ready Motion Pack — derived from FINAL_LAUNCH_PACK at import time.
// This is NOT the final output. It is structured data for the Canva manual prototype workflow.
// Canva is NOT connected. Canva AI video API availability is unknown.
// Final output target: 8 × 4:5 MP4 motion slides.

import { FINAL_LAUNCH_PACK, type LaunchSlide } from "./final-launch-pack";

export interface CanvaSlide {
  slide_id: string;
  role: string;
  main_lines: string[];
  support_lines: string[];
  highlight_words: string[];
  video_prompt_for_canva: string;
  negative_prompt: string;
  template_instruction: string;
  text_safe_area: string;
  subject_position: string;
  duration_seconds: number;
  aspect_ratio: string;
  export_format: string;
}

function buildTemplateInstruction(slide: LaunchSlide): string {
  const t = slide.typography;
  const ma = slide.motion_asset;
  const highlights = slide.highlight_words.map((w) => `「${w}」`).join("、");
  return [
    `Layout template: ${t.template}`,
    `Overlay mask: ${t.overlay_mask}`,
    `Text safe area: ${ma.text_safe_area} side of frame`,
    `Subject position: ${ma.subject_position} side of frame`,
    `Main font size: ${t.main_font_size}`,
    `Support font size: ${t.support_font_size}`,
    `Line height: ${t.line_height}`,
    `Max main lines: ${t.max_line_count}`,
    `Emphasis style: ${t.emphasis_style}`,
    `Highlight words in orange (#F97316): ${highlights || "(none)"}`,
    `Main copy (line-by-line):`,
    ...slide.main_lines.map((l, i) => `  Line ${i + 1}: ${l}`),
    `Support copy (line-by-line):`,
    ...slide.support_lines.map((l, i) => `  Line ${i + 1}: ${l}`),
    `Footer text: 小佑老師｜保險新人真話 (bottom, orange tint, small)`,
    `Design note: ${t.overlay_design_note}`,
  ].join("\n");
}

function buildCanvaSlide(slide: LaunchSlide): CanvaSlide {
  return {
    slide_id: `slide-${slide.slide_number}`,
    role: slide.role_label,
    main_lines: slide.main_lines,
    support_lines: slide.support_lines,
    highlight_words: slide.highlight_words,
    video_prompt_for_canva: slide.motion_asset.video_generation_prompt,
    negative_prompt: slide.motion_asset.negative_prompt,
    template_instruction: buildTemplateInstruction(slide),
    text_safe_area: slide.motion_asset.text_safe_area,
    subject_position: slide.motion_asset.subject_position,
    duration_seconds: slide.motion_asset.duration_seconds,
    aspect_ratio: slide.motion_asset.aspect_ratio,
    export_format: "MP4 · 1080×1350 · 24fps · 5s · no audio · H.264",
  };
}

export const CANVA_MOTION_PACK = {
  slides: FINAL_LAUNCH_PACK.slides.map(buildCanvaSlide),
  topic: FINAL_LAUNCH_PACK.topic,
  status: "canva_not_connected" as const,
  canva_api_status: "unknown" as const,
  final_output_target: "8 × 4:5 MP4 motion carousel slides",
  export_spec: "1080×1350px · 24fps · 5s per slide · no audio · H.264 MP4",
  notes: [
    "Canva is not connected.",
    "User tested Canva AI video — current output is 16:9 only. Not suitable as primary 4:5 motion background generator.",
    "Canva can be used for composition, template layout, text animation, and MP4 export — with external vertical video as input.",
    "Final motion background must come from Runway, Kling, Pika, or another vertical-capable provider.",
    "Still image → Canva animation is a fallback only — not true cinematic motion background.",
    "Final output must be 8 × 4:5 MP4 motion slides. still_preview images are fallback only.",
    "Do not auto-post. No Instagram connection. Manual launch only.",
  ],
} as const;

export type CanvaMotionPack = typeof CANVA_MOTION_PACK;

// Full copy-paste text for all 8 slides (paste into Canva manually)
export function buildAllPromptsText(): string {
  const { slides, topic, final_output_target, export_spec } = CANVA_MOTION_PACK;
  const header = [
    "=== Phoenix Canva Motion Pack ===",
    `Topic: ${topic}`,
    `Final output target: ${final_output_target}`,
    `Export: ${export_spec}`,
    `Total slides: ${slides.length}`,
    "",
    "IMPORTANT:",
    "Canva AI video API availability is unknown.",
    "Use manual prototype workflow: paste each VIDEO PROMPT into Canva Magic Media.",
    "Verify video quality before committing to Canva template automation.",
    "",
  ].join("\n");

  const slideBlocks = slides.flatMap((s, i) => [
    "──────────────────────────────────────",
    `SLIDE ${i + 1} / ${slides.length} — ${s.role}`,
    `Text safe area: ${s.text_safe_area} | Subject: ${s.subject_position}`,
    "",
    "MAIN COPY (paste line by line — do not let Canva auto-break Chinese):",
    ...s.main_lines,
    "",
    "SUPPORT COPY:",
    ...s.support_lines,
    "",
    `HIGHLIGHT WORDS (color orange #F97316): ${s.highlight_words.join(", ") || "(none)"}`,
    "",
    "VIDEO PROMPT FOR CANVA (paste into Magic Media / AI video):",
    s.video_prompt_for_canva,
    "",
    "NEGATIVE PROMPT:",
    s.negative_prompt,
    "",
    "TEMPLATE INSTRUCTION (for Canva layout):",
    s.template_instruction,
    "",
    `EXPORT: ${s.export_format}`,
    "",
  ]);

  return [header, ...slideBlocks, "──────────────────────────────────────", "END OF CANVA MOTION PACK"].join("\n");
}

// Single slide prompt copy
export function buildSlidePromptText(slide: CanvaSlide, slideIndex: number, total: number): string {
  return [
    `SLIDE ${slideIndex + 1} / ${total} — ${slide.role}`,
    `Text safe area: ${slide.text_safe_area} | Subject: ${slide.subject_position}`,
    "",
    "MAIN COPY:",
    ...slide.main_lines,
    "",
    "SUPPORT COPY:",
    ...slide.support_lines,
    "",
    `HIGHLIGHT WORDS (orange #F97316): ${slide.highlight_words.join(", ") || "(none)"}`,
    "",
    "VIDEO PROMPT FOR CANVA:",
    slide.video_prompt_for_canva,
    "",
    "NEGATIVE PROMPT:",
    slide.negative_prompt,
    "",
    `EXPORT: ${slide.export_format}`,
  ].join("\n");
}

// 8-page template spec for Canva brand template setup
export function buildTemplateSpecText(): string {
  const { slides, export_spec } = CANVA_MOTION_PACK;
  return [
    "=== Phoenix 8-Page Brand Template Spec ===",
    `Export: ${export_spec}`,
    "Brand footer: 小佑老師｜保險新人真話",
    "Main text color: #FAFAF9 (white)",
    "Highlight color: #F97316 (orange)",
    "Background: motion video per slide (AI-generated or manually sourced)",
    "",
    ...slides.map(
      (s, i) =>
        `── PAGE ${i + 1}: ${s.role} ──\n${s.template_instruction}\n`
    ),
    "END TEMPLATE SPEC",
  ].join("\n");
}
