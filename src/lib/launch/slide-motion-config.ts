// Locked slide configs for the 8-slide motion production pipeline.
// Content (copy, highlights, scene directions) must not be changed here.

export interface TextSegment { text: string; highlight: boolean; }
export interface ComposeTextLine { segments: TextSegment[]; }
export interface SlideComposeText {
  mainLines: ComposeTextLine[];
  supportLines: string[];
  footerText: string;
}

export type SlideId =
  | "slide_01" | "slide_02" | "slide_03" | "slide_04"
  | "slide_05" | "slide_06" | "slide_07" | "slide_08";

export interface SlideMotionConfig {
  id: SlideId;
  slideId: string;          // "slide-01" format — used in route params and filenames
  index: number;            // 1-based
  role: string;
  mainLines: string[];
  supportLines: string[];
  highlightWords: string[];
  keyframePrompt: string;
  keyframeNegative: string;
  motionPrompt: string;
  safeMotionPrompt: string;
  saferKeyframePrompt: string;
  saferKeyframeNegative: string;
  composeText: SlideComposeText;
}

function buildLine(text: string, highlights: string[]): ComposeTextLine {
  if (!highlights.length) return { segments: [{ text, highlight: false }] };
  const positions: { word: string; idx: number }[] = [];
  for (const w of highlights) {
    const i = text.indexOf(w);
    if (i >= 0) positions.push({ word: w, idx: i });
  }
  positions.sort((a, b) => a.idx - b.idx);
  const segments: TextSegment[] = [];
  let cursor = 0;
  for (const { word, idx } of positions) {
    if (idx > cursor) segments.push({ text: text.slice(cursor, idx), highlight: false });
    segments.push({ text: word, highlight: true });
    cursor = idx + word.length;
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor), highlight: false });
  return { segments };
}

const COMMON_NEGATIVE =
  "text, readable signs, logos, watermark, cartoon, anime, orange suit, luxury fashion look, " +
  "influencer style, overbright lighting, distorted hands, extra fingers, fake advertising style, stock photo look";

const COMMON_SAFE_MOTION =
  "Turn this vertical portrait image into a subtle cinematic video. Keep the same composition. " +
  "Use a very slow push-in camera movement. Keep the person stable and natural. " +
  "Add only slight background light movement. Do not change the face, hands, clothing, phone, or body shape. " +
  "No text, no logos, no fast motion, no dramatic acting, no camera shake, no distortion.";

export const SLIDE_MOTION_CONFIGS: SlideMotionConfig[] = [
  {
    id: "slide_01", slideId: "slide-01", index: 1, role: "HOOK",
    mainLines: ["做保險，", "真的會讓朋友遠離你嗎？"],
    supportLines: ["很多新人還沒開始成交，", "心裡就先害怕被討厭。"],
    highlightWords: ["朋友遠離"],
    keyframePrompt:
      "realistic cinematic vertical 4:5 image, Taiwan urban night street, " +
      "a young Taiwanese insurance salesperson standing on the far right side looking down at an unsent phone message, " +
      "hesitant and lonely, warm low-key orange street lighting, shallow depth of field, " +
      "soft city lights and passing car lights in the background, subtle phone glow on the face, " +
      "clean dark negative space on the left side for Chinese text overlay, documentary realism, " +
      "premium dark orange mood, not a fashion ad, not corporate stock photo, " +
      "no readable text, no logos, no cartoon, no anime, no exaggerated facial expression",
    keyframeNegative: COMMON_NEGATIVE,
    motionPrompt:
      "Turn this 4:5 vertical keyframe into a subtle cinematic motion background. Keep the composition. " +
      "The young insurance salesperson stays on the right side looking at the phone. " +
      "Very slow push-in camera movement, soft passing car lights, subtle phone glow on face, " +
      "minimal subject movement, quiet night atmosphere. Keep the left side clean and dark. " +
      "No text, no logo, no fast motion, no distorted hands.",
    safeMotionPrompt: COMMON_SAFE_MOTION,
    saferKeyframePrompt:
      "realistic cinematic vertical 4:5 portrait image, Taiwan quiet city street at night, " +
      "a young Taiwanese insurance salesperson standing on the right third of the frame, " +
      "looking down at a phone held naturally near chest level, calm and hesitant expression, " +
      "dark navy business casual jacket, warm street lights, soft background bokeh, " +
      "enough visible face detail, clean dark negative space on the left half for Chinese text overlay, " +
      "documentary realism, premium dark orange mood, stable natural pose, simple hands, " +
      "no readable text, no logos, no cartoon, no anime, no exaggerated expression, no extreme darkness, no fashion ad",
    saferKeyframeNegative:
      "text, readable signs, logos, watermark, cartoon, anime, orange suit, luxury fashion, " +
      "influencer style, overbright lighting, extreme darkness, distorted hands, extra fingers, " +
      "malformed phone, fake advertising style, stock photo look",
    composeText: {
      mainLines: [
        buildLine("做保險，", []),
        buildLine("真的會讓朋友遠離你嗎？", ["朋友遠離"]),
      ],
      supportLines: ["很多新人還沒開始成交，", "心裡就先害怕被討厭。"],
      footerText: "小佑老師｜保險新人真話",
    },
  },
  {
    id: "slide_02", slideId: "slide-02", index: 2, role: "PAIN",
    mainLines: ["你怕的不是被拒絕，", "是被貼上「變現實」的標籤。"],
    supportLines: ["怕朋友覺得你一開口，", "就是想賣他。"],
    highlightWords: ["變現實", "被貼上"],
    keyframePrompt:
      "realistic cinematic vertical 4:5 image, Taiwan café corner after a friend gathering, " +
      "two Taiwanese young people at a small table with awkward emotional distance, " +
      "one person on the right side looking down at a phone with a withdrawn expression, " +
      "warm dim café lighting, shallow depth of field, bokeh background, " +
      "clean dark negative space on the left side for Chinese text overlay, documentary realism, " +
      "premium dark orange mood, no readable text, no logos, no cartoon, no anime",
    keyframeNegative: COMMON_NEGATIVE,
    motionPrompt:
      "Turn this 4:5 vertical keyframe into a subtle cinematic motion background. " +
      "The person on the right stays still and withdrawn. " +
      "Very slow push-in camera movement, warm café light flicker, minimal motion. " +
      "Keep the left side dark and clean. No text, no logo, no fast motion.",
    safeMotionPrompt: COMMON_SAFE_MOTION,
    saferKeyframePrompt:
      "realistic cinematic vertical 4:5 portrait image, Taiwan quiet café corner, " +
      "a Taiwanese young person sitting on the right side of the frame looking down at their phone " +
      "with a concerned and withdrawn expression, warm dim café lighting, bokeh background, " +
      "simple natural posture, clean dark negative space on the left half for Chinese text overlay, " +
      "documentary realism, premium dark mood",
    saferKeyframeNegative: COMMON_NEGATIVE,
    composeText: {
      mainLines: [
        buildLine("你怕的不是被拒絕，", []),
        buildLine("是被貼上「變現實」的標籤。", ["被貼上", "變現實"]),
      ],
      supportLines: ["怕朋友覺得你一開口，", "就是想賣他。"],
      footerText: "小佑老師｜保險新人真話",
    },
  },
  {
    id: "slide_03", slideId: "slide-03", index: 3, role: "TRUTH",
    mainLines: ["真正讓朋友退開的，", "通常不是保險。"],
    supportLines: ["是你還沒關心，", "就急著把話題推到成交。"],
    highlightWords: ["不是保險", "急著"],
    keyframePrompt:
      "realistic cinematic vertical 4:5 image, Taiwan office desk scene, " +
      "insurance paperwork and phone on desk surface, " +
      "a Taiwanese person visible only from shoulders to waist on the far right side, looking down at papers, " +
      "dark muted office environment, warm low-key orange desk lamp, " +
      "clean dark negative space on the left side for Chinese text overlay, documentary realism, " +
      "premium dark orange mood, no readable text on papers or phone, no logos, no cartoon, no anime",
    keyframeNegative: COMMON_NEGATIVE,
    motionPrompt:
      "Turn this 4:5 vertical keyframe into a subtle cinematic motion background. " +
      "Very slow push-in camera movement, warm desk lamp flicker, minimal motion, stable scene. " +
      "Keep the left side dark and clean. No text, no logo, no fast motion.",
    safeMotionPrompt: COMMON_SAFE_MOTION,
    saferKeyframePrompt:
      "realistic cinematic vertical 4:5 portrait image, Taiwan office desk, " +
      "a Taiwanese business person on the right side of frame looking down at papers on a desk, " +
      "calm and thoughtful expression, warm desk lamp, " +
      "clean dark negative space on the left half for text overlay, " +
      "documentary realism, premium dark mood, no readable text, no logos",
    saferKeyframeNegative: COMMON_NEGATIVE,
    composeText: {
      mainLines: [
        buildLine("真正讓朋友退開的，", []),
        buildLine("通常不是保險。", ["不是保險"]),
      ],
      supportLines: ["是你還沒關心，", "就急著把話題推到成交。"],
      footerText: "小佑老師｜保險新人真話",
    },
  },
  {
    id: "slide_04", slideId: "slide-04", index: 4, role: "REFRAME",
    mainLines: ["你不是失去朋友，", "你是把朋友放錯位置。"],
    supportLines: ["朋友可以是朋友，也可能成為客戶，", "但不該一開始就被你當成名單。"],
    highlightWords: ["放錯位置"],
    keyframePrompt:
      "realistic cinematic vertical 4:5 image, Taiwan indoor scene, " +
      "a Taiwanese young person on the far right side holding a phone with an unanswered message thread, " +
      "withdrawn emotional state, cool dim indoor lighting, subtle ambient glow from phone screen, " +
      "the left side intentionally dark and empty, " +
      "clean dark negative space on the left for Chinese text overlay, documentary realism, " +
      "no readable text on phone, no logos, no cartoon, no anime",
    keyframeNegative: COMMON_NEGATIVE,
    motionPrompt:
      "Turn this 4:5 vertical keyframe into a subtle cinematic motion background. " +
      "The person on the right holds steady. " +
      "Very slow push-in camera movement, cool ambient phone glow. " +
      "Keep the left side dark and clean. No text, no logo, no fast motion.",
    safeMotionPrompt: COMMON_SAFE_MOTION,
    saferKeyframePrompt:
      "realistic cinematic vertical 4:5 portrait image, Taiwan indoor scene, " +
      "a Taiwanese young person on the right side holding a phone with a distant expression, " +
      "cool dim indoor lighting, phone screen glow, " +
      "clean dark negative space on the left half for text overlay, " +
      "documentary realism, premium dark mood, no readable text on phone",
    saferKeyframeNegative: COMMON_NEGATIVE,
    composeText: {
      mainLines: [
        buildLine("你不是失去朋友，", []),
        buildLine("你是把朋友放錯位置。", ["放錯位置"]),
      ],
      supportLines: ["朋友可以是朋友，也可能成為客戶，", "但不該一開始就被你當成名單。"],
      footerText: "小佑老師｜保險新人真話",
    },
  },
  {
    id: "slide_05", slideId: "slide-05", index: 5, role: "小佑 POV",
    mainLines: ["我做這行十年以上，", "看過太多新人卡在這裡。"],
    supportLines: ["不是能力不好，", "是一開始就把關係用錯順序。"],
    highlightWords: ["十年以上", "用錯順序"],
    keyframePrompt:
      "realistic cinematic vertical 4:5 image, Taiwan training room or conference room, " +
      "a senior Taiwanese insurance instructor in business casual standing on the right side near a whiteboard, " +
      "looking thoughtfully at implied new team members with calm authority and experience, " +
      "warm side lighting, minimal background, " +
      "clean dark negative space on the left side for Chinese text overlay, documentary realism, " +
      "premium dark mood, no readable whiteboard text, no logos, no cartoon, no anime",
    keyframeNegative: COMMON_NEGATIVE,
    motionPrompt:
      "Turn this 4:5 vertical keyframe into a subtle cinematic motion background. " +
      "The instructor on the right stands steady. " +
      "Very slow push-in camera movement, warm side lighting, calm authority atmosphere. " +
      "Keep the left side dark and clean. No text, no logo, no fast motion.",
    safeMotionPrompt: COMMON_SAFE_MOTION,
    saferKeyframePrompt:
      "realistic cinematic vertical 4:5 portrait image, Taiwan conference room, " +
      "a senior Taiwanese business professional on the right side of frame standing with calm authority, " +
      "warm side lighting, clean dark negative space on the left half for text overlay, " +
      "documentary realism, premium dark mood, no readable text, no logos",
    saferKeyframeNegative: COMMON_NEGATIVE,
    composeText: {
      mainLines: [
        buildLine("我做這行十年以上，", ["十年以上"]),
        buildLine("看過太多新人卡在這裡。", []),
      ],
      supportLines: ["不是能力不好，", "是一開始就把關係用錯順序。"],
      footerText: "小佑老師｜保險新人真話",
    },
  },
  {
    id: "slide_06", slideId: "slide-06", index: 6, role: "METHOD",
    mainLines: ["先關心，再判斷；", "先聽懂，再開口。"],
    supportLines: ["當你真的知道對方在怕什麼，", "你講的保險才會有位置。"],
    highlightWords: ["先關心", "先聽懂"],
    keyframePrompt:
      "realistic cinematic vertical 4:5 image, Taiwan quiet meeting scene, " +
      "two Taiwanese people sitting at a small table in a one-on-one conversation, " +
      "one person listening attentively to the other, both positioned on the right side of frame, " +
      "warm dim interior lighting, low-key professional atmosphere, " +
      "clean dark negative space on the left side for Chinese text overlay, documentary realism, " +
      "premium dark orange mood, no readable text, no logos, no cartoon, no anime",
    keyframeNegative: COMMON_NEGATIVE,
    motionPrompt:
      "Turn this 4:5 vertical keyframe into a subtle cinematic motion background. " +
      "The two people on the right stay still in quiet conversation. " +
      "Very slow push-in camera movement, warm interior lighting. " +
      "Keep the left side dark and clean. No text, no logo, no fast motion.",
    safeMotionPrompt: COMMON_SAFE_MOTION,
    saferKeyframePrompt:
      "realistic cinematic vertical 4:5 portrait image, Taiwan quiet meeting room, " +
      "two Taiwanese people in a calm face-to-face conversation on the right side of frame, " +
      "warm dim interior lighting, attentive and natural expressions, " +
      "clean dark negative space on the left half for text overlay, documentary realism, premium dark mood, no readable text",
    saferKeyframeNegative: COMMON_NEGATIVE,
    composeText: {
      mainLines: [
        buildLine("先關心，再判斷；", ["先關心"]),
        buildLine("先聽懂，再開口。", ["先聽懂"]),
      ],
      supportLines: ["當你真的知道對方在怕什麼，", "你講的保險才會有位置。"],
      footerText: "小佑老師｜保險新人真話",
    },
  },
  {
    id: "slide_07", slideId: "slide-07", index: 7, role: "ACTION",
    mainLines: ["先讓對方感覺你還是你，", "專業才有機會被聽見。"],
    supportLines: ["不要急著成交，", "先把關係放回正確的位置。"],
    highlightWords: ["你還是你", "才有機會"],
    keyframePrompt:
      "realistic cinematic vertical 4:5 image, Taiwan night urban arcade or office building exterior, " +
      "a Taiwanese insurance salesperson standing on the far right side collecting thoughts, " +
      "looking slightly downward with quiet resolve, warm city ambient lighting, " +
      "quiet and steadfast atmosphere, minimal motion, " +
      "clean dark negative space on the left side for Chinese text overlay, documentary realism, " +
      "premium dark mood, no readable text, no logos, no cartoon, no anime",
    keyframeNegative: COMMON_NEGATIVE,
    motionPrompt:
      "Turn this 4:5 vertical keyframe into a subtle cinematic motion background. " +
      "The person on the right stands steady. " +
      "Very slow push-in camera movement, warm city ambient light, quiet resolute atmosphere. " +
      "Keep the left side dark and clean. No text, no logo, no fast motion.",
    safeMotionPrompt: COMMON_SAFE_MOTION,
    saferKeyframePrompt:
      "realistic cinematic vertical 4:5 portrait image, Taiwan night urban scene, " +
      "a Taiwanese business person standing on the right side of frame with quiet resolve, " +
      "warm ambient city lighting, clean dark negative space on the left half for text overlay, " +
      "documentary realism, premium dark mood, no readable text, no logos",
    saferKeyframeNegative: COMMON_NEGATIVE,
    composeText: {
      mainLines: [
        buildLine("先讓對方感覺你還是你，", ["你還是你"]),
        buildLine("專業才有機會被聽見。", ["才有機會"]),
      ],
      supportLines: ["不要急著成交，", "先把關係放回正確的位置。"],
      footerText: "小佑老師｜保險新人真話",
    },
  },
  {
    id: "slide_08", slideId: "slide-08", index: 8, role: "CTA",
    mainLines: ["你最怕開口的那個人，", "是誰？"],
    supportLines: ["留言告訴我。不是要你硬推，", "而是一起拆解怎麼開口。"],
    highlightWords: ["最怕開口"],
    keyframePrompt:
      "realistic cinematic vertical 4:5 image, Taiwan indoor scene, " +
      "a Taiwanese person on the far right side holding a phone with a thoughtful or slightly nervous expression " +
      "as if about to type an important message, subtle phone screen glow, " +
      "very dark clean negative space on the left side for Chinese text overlay, documentary realism, " +
      "premium dark mood, no readable text on phone or screen, no UI elements, no logos, no cartoon, no anime",
    keyframeNegative: COMMON_NEGATIVE,
    motionPrompt:
      "Turn this 4:5 vertical keyframe into a subtle cinematic motion background. " +
      "The person on the right holds still, slight tension. " +
      "Very slow push-in camera movement, soft phone screen glow. " +
      "Keep the left side very dark and clean. No text, no logo, no fast motion.",
    safeMotionPrompt: COMMON_SAFE_MOTION,
    saferKeyframePrompt:
      "realistic cinematic vertical 4:5 portrait image, Taiwan indoor scene, " +
      "a Taiwanese person on the right side of frame looking at their phone with a thoughtful expression " +
      "about to type something, soft phone glow, clean dark negative space on the left half for text overlay, " +
      "documentary realism, premium dark mood, no readable text on phone",
    saferKeyframeNegative: COMMON_NEGATIVE,
    composeText: {
      mainLines: [
        buildLine("你最怕開口的那個人，", ["最怕開口"]),
        buildLine("是誰？", []),
      ],
      supportLines: ["留言告訴我。不是要你硬推，", "而是一起拆解怎麼開口。"],
      footerText: "小佑老師｜保險新人真話",
    },
  },
];

export function getSlideConfig(slideId: string): SlideMotionConfig | undefined {
  return SLIDE_MOTION_CONFIGS.find((c) => c.slideId === slideId);
}
