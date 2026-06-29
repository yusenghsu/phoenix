// Final Launch Studio — data layer
// No API calls. No production writes. Manual launch only.
// Motion-first: final output is MP4 motion slides. Static still_preview is keyframe only.

// ── Types ─────────────────────────────────────────────────────────────────────

export type AssetStatus = "missing" | "prompt_ready" | "uploaded" | "approved" | "rejected";
export type AssetType = "image" | "video" | "missing";
export type SubjectPosition = "left" | "right" | "center" | "background";
export type TextSafeArea = "top" | "middle" | "bottom" | "left" | "right" | "upper-left" | "upper-right";
export type TypographyTemplate = "left-heavy" | "right-heavy" | "bottom-anchor" | "top-anchor" | "center-statement" | "split-tension";
export type EmphasisStyle = "orange" | "underline" | "boxed" | "none";
export type OverlayMask = "left-gradient" | "right-gradient" | "bottom-glass" | "top-gradient" | "center-vignette";
export type SlideRole = "hook" | "pain" | "truth" | "reframe" | "pov" | "method" | "action" | "cta";

export type MotionAssetStatus =
  | "missing"
  | "prompt_ready"
  | "generating"
  | "video_generated"
  | "composing"
  | "composed"
  | "failed"
  | "approved";

export type MotionProvider = "canva" | "runway" | "kling" | "pika" | "remotion" | "none";

// ── Interfaces ────────────────────────────────────────────────────────────────

// Still preview — keyframe reference only. Not final output.
export interface StillPreview {
  type: AssetType;
  status: AssetStatus;
  image_url?: string;
  video_url?: string;
  image_generation_prompt: string;
  video_generation_prompt: string;
  negative_prompt: string;
  subject_position: SubjectPosition;
  text_safe_area: TextSafeArea;
  mood: string;
  camera_direction: string;
  lighting_direction: string;
  motion_direction: string;
  quality_note: string;
}

// Motion asset — primary final output target (4:5 MP4)
export interface MotionAsset {
  status: MotionAssetStatus;
  provider: MotionProvider;
  keyframe_prompt: string;
  video_generation_prompt: string;
  negative_prompt: string;
  background_video_url?: string;
  final_video_url?: string;
  thumbnail_url?: string;
  duration_seconds: 4 | 5 | 6;
  fps: 24 | 30;
  aspect_ratio: "4:5";
  resolution: "1080x1350";
  text_safe_area: TextSafeArea;
  subject_position: SubjectPosition;
  camera_motion: string;
  subject_motion: string;
  atmosphere_motion: string;
  quality_note?: string;
  error?: string;
}

export interface Typography {
  template: TypographyTemplate;
  text_safe_area: string;
  main_font_size: string;
  support_font_size: string;
  line_height: string;
  max_line_count: number;
  emphasis_words: string[];
  emphasis_style: EmphasisStyle;
  overlay_mask: OverlayMask;
  contrast_rule: string;
  readability_score: number;
  overlay_design_note: string;
}

export interface LaunchSlide {
  slide_number: number;
  role: SlideRole;
  role_label: string;
  main_copy: string;
  support_copy: string;
  main_lines: string[];
  support_lines: string[];
  highlight_words: string[];
  still_preview: StillPreview;   // keyframe reference — not final output
  motion_asset: MotionAsset;     // primary final output target
  typography: Typography;
}

export interface QualityDimension {
  id: string;
  name: string;
  score: number;
  max_score: number;
  reason: string;
  fail_condition: string;
  passed: boolean;
  blocking: boolean;
}

export interface QualityGateResult {
  dimensions: QualityDimension[];
  overall_score: number;
  publish_ready: boolean;
  blocking_reasons: string[];
}

export interface MotionGateResult {
  dimensions: QualityDimension[];
  overall_score: number;
  motion_ready: boolean;
  blocking_reasons: string[];
}

export interface FinalLaunchPack {
  topic: string;
  thesis: string;
  deep_insight: string;
  slides: LaunchSlide[];
  caption: string;
  hashtags: string[];
  motion_gate: MotionGateResult;
  quality_gate: QualityGateResult; // kept for debug / still preview
  launch_checklist: string[];
}

// ── Shared prompts ─────────────────────────────────────────────────────────────

const SHARED_NEGATIVE_PROMPT =
  "abstract particles, glowing dots, lens flares, space background, generic gradient, pure black background, stock photo, fake smile, corporate pose, anime, cartoon, illustration, watermark, logo, visible readable text in background, overcrowded composition, overexposed, flat lighting, extra limbs, distorted hands, extra fingers, floating objects, AI artifact, deepfake aesthetic, exaggerated facial expression, neon glow, fantasy lighting";

const MOTION_NEGATIVE_PROMPT =
  SHARED_NEGATIVE_PROMPT +
  ", fast motion, jump cuts, camera shake, abrupt movement, unnatural acceleration, strobe effect, rapid panning, handheld wobble, fisheye distortion";

// ── Slides ────────────────────────────────────────────────────────────────────

const SLIDES: LaunchSlide[] = [
  {
    slide_number: 1,
    role: "hook",
    role_label: "HOOK",
    main_copy: "做保險，真的會讓朋友遠離你嗎？",
    support_copy: "很多新人還沒開始成交，心裡就先害怕被討厭。",
    main_lines: ["做保險，", "真的會讓朋友遠離你嗎？"],
    support_lines: ["很多新人還沒開始成交，", "心裡就先害怕被討厭。"],
    highlight_words: ["朋友遠離"],
    still_preview: {
      type: "image",
      status: "prompt_ready",
      image_generation_prompt:
        "Cinematic vertical 4:5 portrait. A young Taiwanese professional in their mid-20s stands alone on a quiet urban sidewalk at night, occupying the right third of frame. They hold a smartphone at waist level — the soft screen light illuminates their face from below. Expression: quiet hesitation, not sadness. Left two-thirds of frame: dark urban negative space with distant amber streetlight bokeh. Warm amber practical street lights in deep background. Shallow depth of field, 85mm equivalent. Premium dark cinematic grade. Real human emotion, no exaggerated expression. Dark clothing blends into background. Enough negative space on the left for Chinese text overlay.",
      video_generation_prompt:
        "4:5 vertical, 5-second subtle cinematic motion. The young professional barely shifts their weight — a micro lean forward of 1–2cm. The distant bokeh streetlights drift very slightly rightward as if from an imperceptibly slow camera push. The phone screen dims by 10% as if a notification clears. Camera: static, no movement. Preserve left two-thirds negative space throughout. No fast motion. No cuts. No text generated in video. No particle effects.",
      negative_prompt: SHARED_NEGATIVE_PROMPT,
      subject_position: "right",
      text_safe_area: "left",
      mood: "孤單猶豫、夜晚壓力、未送出訊息的不安",
      camera_direction: "靜止，極淺景深，主體右側，左側深度虛化",
      lighting_direction: "街燈暖橘從後方側照，手機螢幕補光面部，整體低調暗部",
      motion_direction: "主體極微小重心轉移，背景燈光極緩漂移，手機螢幕亮度輕微脈動",
      quality_note: "必須有足夠左側負空間供中文大字，背景不可讀字，手指不可變形",
    },
    motion_asset: {
      status: "prompt_ready",
      provider: "none",
      keyframe_prompt:
        "Cinematic vertical 4:5 portrait. Young Taiwanese insurance professional on quiet urban sidewalk at night, right third of frame. Smartphone in hand, screen light on face. Expression: quiet hesitation. Left two-thirds: dark urban negative space, amber streetlight bokeh. Warm low-key amber lighting. Shallow depth of field.",
      video_generation_prompt:
        "4:5 vertical, 5-second cinematic motion. Young professional on night sidewalk, right side of frame. Very slow 1% camera push-in over 5 seconds. Streetlights and car lights in background drift softly. Phone screen light pulses gently on face. Subject shifts weight by 1–2cm imperceptibly. Left two-thirds negative space preserved for Chinese text overlay. Mood: hesitation, loneliness, fear of being disliked. No fast motion. No generated text. No logo. Premium dark warm cinematic grade.",
      negative_prompt: MOTION_NEGATIVE_PROMPT,
      background_video_url: undefined,
      final_video_url: undefined,
      thumbnail_url: undefined,
      duration_seconds: 5,
      fps: 24,
      aspect_ratio: "4:5",
      resolution: "1080x1350",
      text_safe_area: "left",
      subject_position: "right",
      camera_motion: "鏡頭非常緩慢推近（5秒推進約1%）",
      subject_motion: "業務看手機猶豫是否傳出訊息，手機光映在臉上，重心極微小轉移",
      atmosphere_motion: "路燈和車燈在背景柔和晃動，手機螢幕亮度輕微脈動",
      quality_note: "左側負空間必須保留給中文大字，手指不可變形，無可讀文字",
    },
    typography: {
      template: "left-heavy",
      text_safe_area: "左側 60% 畫面",
      main_font_size: "clamp(22px, 5.5vw, 32px)",
      support_font_size: "clamp(12px, 2.8vw, 15px)",
      line_height: "1.3",
      max_line_count: 2,
      emphasis_words: ["朋友遠離"],
      emphasis_style: "orange",
      overlay_mask: "right-gradient",
      contrast_rule: "橘色 emphasis 在暗背景下最低對比度 4.5:1，白字在暗底最低 7:1",
      readability_score: 9,
      overlay_design_note:
        "人物在右側，左側為城市夜景虛化負空間。使用 right-gradient 遮罩：從右側透明漸變到左側 rgba(0,0,0,0.45)，確保左側文字可讀但不切斷右側人物感受。大字問句置左上方，橘色強調「朋友遠離」三字。不蓋住人物臉部。Support copy 置於主文下方，字號縮小至主文 55%。",
    },
  },
  {
    slide_number: 2,
    role: "pain",
    role_label: "PAIN",
    main_copy: "你怕的不是被拒絕，是被貼上「變現實」的標籤。",
    support_copy: "怕朋友覺得你一開口，就是想賣他。",
    main_lines: ["你怕的不是被拒絕，", "是被貼上「變現實」的標籤。"],
    support_lines: ["怕朋友覺得你一開口，", "就是想賣他。"],
    highlight_words: ["變現實", "被貼上"],
    still_preview: {
      type: "image",
      status: "prompt_ready",
      image_generation_prompt:
        "Cinematic vertical 4:5 portrait. Interior of a small modern Taiwanese café, warm amber low-key lighting. Two young adults sit at a small round table in the right-lower quarter of frame. One person leans slightly forward, mouth barely parted — the moment just before saying something. The other sits with shoulders subtly angled inward, eyes looking slightly down at a coffee cup. Upper-left two-thirds: negative space with warm bokeh pendant lights and blurred café background. Shallow depth of field. Authentic emotional tension — not theatrical, just real pre-awkwardness. No stock smile. No corporate pose. No readable menus or signs in background.",
      video_generation_prompt:
        "4:5 vertical, 5-second. Steam rises very slowly from a coffee cup in the lower frame — thin, unhurried. The person about to speak draws a micro-breath, chest barely expanding. Background café patrons in extreme slow-motion blur, almost static. Camera: completely static. Preserve upper-left two-thirds negative space throughout. No fast motion. No text generated.",
      negative_prompt: SHARED_NEGATIVE_PROMPT,
      subject_position: "right",
      text_safe_area: "upper-left",
      mood: "尷尬前一秒、話說到一半停住、朋友之間的距離感",
      camera_direction: "靜止，淺景深，兩人在右下四分之一，左上大面積虛化",
      lighting_direction: "暖橘吊燈由上方下照，桌面反光，臉部半影",
      motion_direction: "咖啡熱氣極緩上升，前景人物幾乎靜止，背景極慢漂移",
      quality_note: "表情不可過於誇張，要是那種真實的「停下來的瞬間」感",
    },
    motion_asset: {
      status: "prompt_ready",
      provider: "none",
      keyframe_prompt:
        "Cinematic vertical 4:5. Taiwanese café interior, warm amber low-key lighting. Two young adults at small table, right-lower quarter. One about to speak, one looking down at coffee. Upper-left: negative space with bokeh pendant lights. Shallow DOF.",
      video_generation_prompt:
        "4:5 vertical, 5-second cinematic motion. Taiwan café interior. Two people facing each other, one stops mid-breath before speaking. Coffee steam rises very slowly — thin and unhurried. Background patrons nearly frozen in extreme slow blur. Person about to speak draws micro-breath, chest barely expands. Other person's shoulders tighten slightly. Camera: completely static. Upper-left two-thirds preserved for text. No fast motion. No generated text. Premium warm amber cinematic grade.",
      negative_prompt: MOTION_NEGATIVE_PROMPT,
      background_video_url: undefined,
      final_video_url: undefined,
      thumbnail_url: undefined,
      duration_seconds: 5,
      fps: 24,
      aspect_ratio: "4:5",
      resolution: "1080x1350",
      text_safe_area: "upper-left",
      subject_position: "right",
      camera_motion: "靜止",
      subject_motion: "一方想開口但停住，氣氛卡在尷尬前一秒，動作幅度極小",
      atmosphere_motion: "咖啡熱氣極緩上升，窗外光影極慢移動",
      quality_note: "表情不可誇張，要是真實「停下來的瞬間」感，上左保留文字區",
    },
    typography: {
      template: "left-heavy",
      text_safe_area: "左上 55% 畫面",
      main_font_size: "clamp(18px, 4.5vw, 26px)",
      support_font_size: "clamp(11px, 2.5vw, 13px)",
      line_height: "1.4",
      max_line_count: 3,
      emphasis_words: ["變現實", "被貼上"],
      emphasis_style: "orange",
      overlay_mask: "right-gradient",
      contrast_rule: "左上文字區背景需透過遮罩確保暗度，白字對比度 ≥ 7:1",
      readability_score: 9,
      overlay_design_note:
        "咖啡廳場景，兩人在右下方。左上方為虛化背景光暈，是理想文字區。Right-gradient 遮罩從右側（人物側）往左漸變，左上保留遮蓋層加深讀字背景。「被貼上」和「變現實」用橘色強調——這兩詞是整張 slide 情緒轉折點。主文最多 3 行，不可蓋到右側人物臉部。Support copy 在主文下方，字號縮小，保持輕盈。",
    },
  },
  {
    slide_number: 3,
    role: "truth",
    role_label: "TRUTH",
    main_copy: "真正讓朋友退開的，通常不是保險。",
    support_copy: "是你還沒關心，就急著把話題推到成交。",
    main_lines: ["真正讓朋友退開的，", "通常不是保險。"],
    support_lines: ["是你還沒關心，", "就急著把話題推到成交。"],
    highlight_words: ["不是保險", "急著"],
    still_preview: {
      type: "image",
      status: "prompt_ready",
      image_generation_prompt:
        "Cinematic vertical 4:5 portrait. Top-down or low-angle shot of a dark wooden desk surface occupying the lower 60% of frame. Scattered across it: an open insurance brochure with unreadable blurred text, a smartphone face-up showing a blurred contacts list, a handwritten note with circled names (all unreadable). A hand partially visible at the edge, not distorted. Upper 40%: dark ambient ceiling and wall, clear negative space for text. Warm amber desk lamp creates dramatic low-key shadows on documents. Premium dark mood. No readable text on any document. No logos. No extra fingers.",
      video_generation_prompt:
        "4:5 vertical, 5-second. A hand shifts a brochure very slowly across the desk by 3–4cm. A pen rolls subtly from the movement's edge impact. Desk lamp glows with a barely perceptible 5% brightness oscillation. Upper 40% of frame preserved and clear. No camera movement. No fast motion. No generated text.",
      negative_prompt: SHARED_NEGATIVE_PROMPT,
      subject_position: "background",
      text_safe_area: "top",
      mood: "急著說服、壓力感、銷售焦慮",
      camera_direction: "俯角或低角，桌面物件在下方，上方留出文字空間",
      lighting_direction: "桌燈暖光側照，文件有戲劇性陰影，對比強",
      motion_direction: "手部極緩移動文件，桌燈微微脈動，整體緩慢",
      quality_note: "手部必須自然，不可有多餘手指或變形。文件文字必須不可讀。",
    },
    motion_asset: {
      status: "prompt_ready",
      provider: "none",
      keyframe_prompt:
        "Cinematic vertical 4:5. Dark wooden desk surface, lower 60% of frame. Insurance brochure, smartphone with blurred contacts, handwritten note with circled names — all unreadable. Upper 40%: dark ceiling, negative space. Warm amber desk lamp with dramatic shadows.",
      video_generation_prompt:
        "4:5 vertical, 5-second cinematic motion. Camera slowly slides across dark wooden desk surface — very gradual lateral drift. Insurance brochure, blurred documents, pen scattered. A hand enters frame very slowly, shifts a brochure by 3cm. Desk lamp brightness oscillates 5% as if breathing. Upper 40% of frame clear and preserved for Chinese text. Atmosphere: sales pressure, urgency. No readable text on any document. No fast motion. No generated text.",
      negative_prompt: MOTION_NEGATIVE_PROMPT,
      background_video_url: undefined,
      final_video_url: undefined,
      thumbnail_url: undefined,
      duration_seconds: 5,
      fps: 24,
      aspect_ratio: "4:5",
      resolution: "1080x1350",
      text_safe_area: "top",
      subject_position: "background",
      camera_motion: "鏡頭慢慢滑過桌面（極緩橫移）",
      subject_motion: "手部極緩移動文件約3cm，代表急著推銷的壓力",
      atmosphere_motion: "桌燈亮度微微脈動5%，紙張陰影輕微晃動",
      quality_note: "手不可變形，文件文字不可讀，上方保留40%文字空間",
    },
    typography: {
      template: "top-anchor",
      text_safe_area: "上方 40% 畫面",
      main_font_size: "clamp(18px, 4.5vw, 26px)",
      support_font_size: "clamp(11px, 2.5vw, 13px)",
      line_height: "1.35",
      max_line_count: 2,
      emphasis_words: ["不是保險", "急著"],
      emphasis_style: "orange",
      overlay_mask: "top-gradient",
      contrast_rule: "上方文字區需 top-gradient 確保暗底，白字對比度 ≥ 7:1",
      readability_score: 9,
      overlay_design_note:
        "桌面文件在下方，為場景主體。上方天花板背景深暗，是最佳文字安全區。使用 top-gradient 從頂部深化上方 40% 的背景，保證白字可讀。「不是保險」四字用橘色——這是整張的核心逆轉。「急著」橘色二次強調急促感。主文 1-2 行，support copy 在主文正下方。整體版型乾淨不花俏。",
    },
  },
  {
    slide_number: 4,
    role: "reframe",
    role_label: "REFRAME",
    main_copy: "你不是失去朋友，你是把朋友放錯位置。",
    support_copy: "朋友可以是朋友，也可能成為客戶，但不該一開始就被你當成名單。",
    main_lines: ["你不是失去朋友，", "你是把朋友放錯位置。"],
    support_lines: ["朋友可以是朋友，也可能成為客戶，", "但不該一開始就被你當成名單。"],
    highlight_words: ["放錯位置"],
    still_preview: {
      type: "image",
      status: "prompt_ready",
      image_generation_prompt:
        "Cinematic vertical 4:5 portrait. Dual-atmosphere split composition with clear tonal contrast. Left half: warm amber tones, two blurred human silhouettes in relaxed natural conversation — soft golden bokeh, intimate warmth, organic forms. Right half: cooler blue-grey tones, geometric rigid grid lines suggesting a ledger or spreadsheet — clinical, impersonal, structured. A visual metaphor for relationship versus utility. Upper-center area clear for text overlay. No readable text anywhere. No logos. Cinematic color grading. No graphic design flatness — this should feel like a real photograph with dual color temperature sources.",
      video_generation_prompt:
        "4:5 vertical, 5-second. Left half: warm silhouettes shift position slightly as if in genuine laughter — organic, slow, 2cm movement. Right half: one new grid line appears every 1.5 seconds, drawn mechanically from top to bottom. The contrast between organic left and mechanical right deepens over the 5-second duration. No camera movement. No text generated. Upper-center space preserved.",
      negative_prompt: SHARED_NEGATIVE_PROMPT,
      subject_position: "background",
      text_safe_area: "top",
      mood: "關係被錯置、溫暖與冰冷的對比、錯位的重量感",
      camera_direction: "靜止，左右對稱構圖，上方保留文字空間",
      lighting_direction: "左側暖橘光源，右側冷藍光源，中間自然過渡",
      motion_direction: "左有機動、右機械浮現，形成動靜對比",
      quality_note: "左側剪影不可太清晰，要是模糊的人形輪廓感，右側格線要像真實冷光的感覺",
    },
    motion_asset: {
      status: "prompt_ready",
      provider: "none",
      keyframe_prompt:
        "Cinematic vertical 4:5. Dual-atmosphere split. Left half: warm amber, blurred human silhouettes in natural conversation, golden bokeh. Right half: cool blue-grey, geometric grid lines suggesting ledger. Upper-center: clear negative space for text.",
      video_generation_prompt:
        "4:5 vertical, 5-second cinematic motion. Dual-atmosphere split composition. Left half: warm amber silhouettes of two friends shift organically by 2cm as if laughing naturally — slow, human, warm. Right half: one cold grid line appears every 1.5 seconds, drawn mechanically from top to bottom — clinical, rigid. The contrast between organic left and mechanical right deepens progressively over 5 seconds. Camera: completely static. Upper-center preserved for text. No fast motion. No readable text generated.",
      negative_prompt: MOTION_NEGATIVE_PROMPT,
      background_video_url: undefined,
      final_video_url: undefined,
      thumbnail_url: undefined,
      duration_seconds: 5,
      fps: 24,
      aspect_ratio: "4:5",
      resolution: "1080x1350",
      text_safe_area: "top",
      subject_position: "background",
      camera_motion: "靜止",
      subject_motion: "左側溫暖剪影有機移動2cm（如自然笑聲），右側機械格線每1.5秒浮現一條",
      atmosphere_motion: "左右對比在5秒內緩慢加深，溫暖vs冷調的張力逐漸強化",
      quality_note: "左側剪影保持模糊，右側格線有冷光質感，上方文字區保留",
    },
    typography: {
      template: "split-tension",
      text_safe_area: "上方 35% 及中央",
      main_font_size: "clamp(19px, 4.8vw, 28px)",
      support_font_size: "clamp(11px, 2.5vw, 13px)",
      line_height: "1.35",
      max_line_count: 2,
      emphasis_words: ["放錯位置"],
      emphasis_style: "orange",
      overlay_mask: "center-vignette",
      contrast_rule: "中央文字區透過 vignette 加深，確保白字可讀",
      readability_score: 9,
      overlay_design_note:
        "左右分割畫面，左暖右冷。文字放在上方中央，橫跨兩側氛圍之間——這個位置強化「朋友 vs 名單」的主題張力。center-vignette 遮罩加深四周，中央文字區保持高對比。「放錯位置」四字橘色強調——這是整篇的核心觀點翻轉。Support copy 字數較多，須精確控制行距與字號，最多 2 行。",
    },
  },
  {
    slide_number: 5,
    role: "pov",
    role_label: "小佑 POV",
    main_copy: "我做這行十年以上，看過太多新人卡在這裡。",
    support_copy: "不是能力不好，是一開始就把關係用錯順序。",
    main_lines: ["我做這行十年以上，", "看過太多新人卡在這裡。"],
    support_lines: ["不是能力不好，", "是一開始就把關係用錯順序。"],
    highlight_words: ["十年以上", "用錯順序"],
    still_preview: {
      type: "image",
      status: "prompt_ready",
      image_generation_prompt:
        "Cinematic vertical 4:5 portrait. A small conference room or office corner, dim warm practical lighting. Right third of frame: a confident Taiwanese professional in their mid-30s to 40s, seated and leaning forward across a desk edge, one hand resting on a document — expression is focused, analytical, carrying genuine credibility. Not stern, not smiling — the look of someone who knows what they are talking about. Left two-thirds: negative space with out-of-focus dark warm background wall. Desk surface visible at bottom edge: notebook, pen marks, scattered paper. Shallow depth of field. Warm amber desk lamp. No extra fingers. No distorted hands. No stock photo energy.",
      video_generation_prompt:
        "4:5 vertical, 5-second. The professional's hand moves slightly across the document — pointing to a different section, a deliberate and slow gesture. Their eyes track with the hand movement. Background wall: completely static. Desk lamp flickers once very subtly at second 3. Left two-thirds negative space preserved throughout. No camera movement. No fast motion.",
      negative_prompt: SHARED_NEGATIVE_PROMPT,
      subject_position: "right",
      text_safe_area: "left",
      mood: "被點醒、不是責備、十年見過太多的從容",
      camera_direction: "靜止，主體在右三分之一，左側大面積虛化",
      lighting_direction: "桌燈暖光打亮右側主體臉部，左側漸暗",
      motion_direction: "手部極緩翻閱文件，其餘靜止",
      quality_note: "主體氣質要是從容不迫的主管感，不是表演感。手不變形。",
    },
    motion_asset: {
      status: "prompt_ready",
      provider: "none",
      keyframe_prompt:
        "Cinematic vertical 4:5. Small conference room, dim warm lighting. Right third: confident Taiwanese professional mid-30s to 40s, leaning forward, hand on document, focused analytical expression. Left two-thirds: dark warm negative space. Desk lamp amber.",
      video_generation_prompt:
        "4:5 vertical, 5-second cinematic motion. Confident professional, right third of frame. Hand moves slowly across document by 3cm — a deliberate, authoritative pointing gesture. Eyes track with hand movement. Second 3: desk lamp flickers once very subtly (2% dimming then returns). Background wall: completely static. Left two-thirds negative space preserved for text. Camera: completely static. No fast motion. Expression: calm authority, not stern. No generated text.",
      negative_prompt: MOTION_NEGATIVE_PROMPT,
      background_video_url: undefined,
      final_video_url: undefined,
      thumbnail_url: undefined,
      duration_seconds: 5,
      fps: 24,
      aspect_ratio: "4:5",
      resolution: "1080x1350",
      text_safe_area: "left",
      subject_position: "right",
      camera_motion: "靜止",
      subject_motion: "主管手部極緩在文件上移動3cm（權威指示），眼神追隨手勢",
      atmosphere_motion: "第3秒桌燈輕微閃動一次（2%），整體靜謐",
      quality_note: "主體氣質從容不迫，手部不可變形，左側保留文字區",
    },
    typography: {
      template: "left-heavy",
      text_safe_area: "左側 60% 畫面",
      main_font_size: "clamp(17px, 4.2vw, 24px)",
      support_font_size: "clamp(11px, 2.5vw, 13px)",
      line_height: "1.4",
      max_line_count: 3,
      emphasis_words: ["十年以上", "用錯順序"],
      emphasis_style: "orange",
      overlay_mask: "right-gradient",
      contrast_rule: "左側文字區透過 right-gradient 遮罩加深，白字 ≥ 7:1",
      readability_score: 9,
      overlay_design_note:
        "主管人物在右側，左側為虛化深色背景。Right-gradient 從右側（主體側）往左漸淡，左側加深確保白字可讀，同時保留右側人物的溫暖光感。「十年以上」橘色強調主體的份量與權威；「用錯順序」橘色強調這張的核心答案。主文可以到 3 行，因為是第一人稱的訴說語氣，行數多反而增加份量感。",
    },
  },
  {
    slide_number: 6,
    role: "method",
    role_label: "METHOD",
    main_copy: "先關心，再判斷；先聽懂，再開口。",
    support_copy: "當你真的知道對方在怕什麼，你講的保險才會有位置。",
    main_lines: ["先關心，再判斷；", "先聽懂，再開口。"],
    support_lines: ["當你真的知道對方在怕什麼，", "你講的保險才會有位置。"],
    highlight_words: ["先關心", "先聽懂"],
    still_preview: {
      type: "image",
      status: "prompt_ready",
      image_generation_prompt:
        "Cinematic vertical 4:5 portrait. A modern meeting space or café corner, soft warm-neutral ambient lighting. Left third of frame: a young Taiwanese professional, late 20s, seated and leaning slightly forward, hands open and relaxed on the table — no brochures, no phones, no documents. Expression: genuinely engaged, focused listening — not performed attentiveness. Right two-thirds of frame: negative space, the out-of-focus background with soft warm bokeh. Shallow depth of field. The composition radiates calm, presence, and trust. No stock smile. No corporate energy. No logos.",
      video_generation_prompt:
        "4:5 vertical, 5-second. The listener nods once — a single slow, small nod at second 2. Their expression shifts by 5% — a barely perceptible softening from neutral attention to warm understanding. Camera: completely static. Right two-thirds of frame preserved and clear. No fast motion. No generated text.",
      negative_prompt: SHARED_NEGATIVE_PROMPT,
      subject_position: "left",
      text_safe_area: "right",
      mood: "信任正在形成、主動傾聽、沒有成交壓力",
      camera_direction: "靜止，主體在左三分之一，右側大面積虛化",
      lighting_direction: "中性暖光均勻照，無強烈陰影，專注感",
      motion_direction: "主體極小點頭，表情輕微轉變，其餘靜止",
      quality_note: "這張需要傳遞「在聽」而不是「在等說」，表情很重要。不要誇張",
    },
    motion_asset: {
      status: "prompt_ready",
      provider: "none",
      keyframe_prompt:
        "Cinematic vertical 4:5. Modern café corner, soft warm-neutral lighting. Left third: young professional late 20s, leaning forward, hands open on table, no documents. Genuine listening expression. Right two-thirds: soft warm bokeh negative space.",
      video_generation_prompt:
        "4:5 vertical, 5-second cinematic motion. Young professional actively listening, left third of frame. At second 2: a single slow, small nod — barely perceptible, 1cm movement. Expression shifts 5% from neutral attention to warm understanding. Hands remain completely still on table. Background bokeh: steady. Camera: completely static. Right two-thirds preserved for text overlay. No fast motion. Mood: trust forming, genuine presence. No generated text.",
      negative_prompt: MOTION_NEGATIVE_PROMPT,
      background_video_url: undefined,
      final_video_url: undefined,
      thumbnail_url: undefined,
      duration_seconds: 5,
      fps: 24,
      aspect_ratio: "4:5",
      resolution: "1080x1350",
      text_safe_area: "right",
      subject_position: "left",
      camera_motion: "靜止",
      subject_motion: "第2秒極緩慢點頭一次（1cm），表情從中性專注輕微柔化至溫暖理解",
      atmosphere_motion: "右側背景虛化光暈穩定，整體靜謐信任感",
      quality_note: "傳遞「在聽」而非「在等說」，表情細微變化很重要，右側保留文字區",
    },
    typography: {
      template: "right-heavy",
      text_safe_area: "右側 60% 畫面",
      main_font_size: "clamp(18px, 4.5vw, 26px)",
      support_font_size: "clamp(11px, 2.5vw, 13px)",
      line_height: "1.35",
      max_line_count: 2,
      emphasis_words: ["先關心", "先聽懂"],
      emphasis_style: "orange",
      overlay_mask: "left-gradient",
      contrast_rule: "右側文字區透過 left-gradient 遮罩確保深度，白字 ≥ 7:1",
      readability_score: 9,
      overlay_design_note:
        "傾聽者在左側，右側為虛化背景，是文字安全區。Left-gradient 從左側主體往右漸深，確保右側文字有暗底可讀。「先關心」和「先聽懂」各自橘色強調——這兩個詞就是這張 slide 的全部方法論。主文用分號隔開兩個動作，排版可以每半句一行，形成方法論的節奏感。Support copy 放在主文下方，字號適當縮小。",
    },
  },
  {
    slide_number: 7,
    role: "action",
    role_label: "ACTION",
    main_copy: "先讓對方感覺你還是你，專業才有機會被聽見。",
    support_copy: "不要急著成交，先把關係放回正確的位置。",
    main_lines: ["先讓對方感覺你還是你，", "專業才有機會被聽見。"],
    support_lines: ["不要急著成交，", "先把關係放回正確的位置。"],
    highlight_words: ["你還是你", "才有機會"],
    still_preview: {
      type: "image",
      status: "prompt_ready",
      image_generation_prompt:
        "Cinematic vertical 4:5 portrait. Interior scene, a large window visible on the right side of the frame. Two Taiwanese people — one standing, one sitting or perched — positioned in the right half of frame near the window. Late afternoon or early evening light streams through, creating warm rim lighting on their profiles. Their posture is relaxed and natural, engaged in easy conversation without any visible documents, phones, or business materials. Left half of frame: dark warm interior, open negative space. Shallow depth of field. Warm amber-gold ambient light through window glass. No sales context. No visible stress. Genuine casual ease.",
      video_generation_prompt:
        "4:5 vertical, 5-second. The window light dims very gradually — 8% over 5 seconds — as if a cloud passing. Both subjects shift weight subtly in natural conversational rhythm, a 2–3cm transfer. The dark interior on the left deepens slightly as the window dims. Camera: completely static. Left half of frame preserved. No fast motion. No text generated.",
      negative_prompt: SHARED_NEGATIVE_PROMPT,
      subject_position: "right",
      text_safe_area: "left",
      mood: "關係放回正確位置、緊張感下降、自然信任",
      camera_direction: "靜止，主體右側，左側深色內部空間為文字區",
      lighting_direction: "窗外暖金逆光打亮側臉輪廓，室內暗部對比",
      motion_direction: "窗光極緩減弱，主體輕微重心轉移，極緩",
      quality_note: "不能有任何銷售感，兩個人的肢體語言必須是完全放鬆的自然對話",
    },
    motion_asset: {
      status: "prompt_ready",
      provider: "none",
      keyframe_prompt:
        "Cinematic vertical 4:5. Interior, large window right side. Two Taiwanese people in right half, near window. Late afternoon rim lighting on profiles. Left half: dark warm interior negative space. Relaxed natural conversation, no documents.",
      video_generation_prompt:
        "4:5 vertical, 5-second cinematic motion. Two people in casual conversation by window, right side of frame. Window light dims gradually by 8% over 5 seconds — as if a cloud passes. Both subjects shift weight 2–3cm in natural conversational rhythm — organic, unhurried. Left interior darkens slightly as window dims. Camera: completely static. Left half preserved for text. No sales energy. No fast motion. Mood: relationship returning to natural position, tension dissolving. No generated text.",
      negative_prompt: MOTION_NEGATIVE_PROMPT,
      background_video_url: undefined,
      final_video_url: undefined,
      thumbnail_url: undefined,
      duration_seconds: 5,
      fps: 24,
      aspect_ratio: "4:5",
      resolution: "1080x1350",
      text_safe_area: "left",
      subject_position: "right",
      camera_motion: "靜止",
      subject_motion: "兩人自然對話中輕微重心轉移2-3cm，有機自然節奏",
      atmosphere_motion: "窗光在5秒內極緩減弱8%（如雲過），左側室內暗部隨之加深",
      quality_note: "無銷售感，肢體語言完全放鬆，左側保留文字區",
    },
    typography: {
      template: "left-heavy",
      text_safe_area: "左側 55% 畫面",
      main_font_size: "clamp(18px, 4.5vw, 26px)",
      support_font_size: "clamp(11px, 2.5vw, 13px)",
      line_height: "1.4",
      max_line_count: 3,
      emphasis_words: ["你還是你", "才有機會"],
      emphasis_style: "orange",
      overlay_mask: "right-gradient",
      contrast_rule: "左側文字區透過 right-gradient 遮罩加深，白字 ≥ 7:1",
      readability_score: 9,
      overlay_design_note:
        "兩人在右側窗邊，窗光為主要光源。左側室內偏暗，是自然的文字安全區。Right-gradient 從右側往左漸深加強左側暗度，確保文字可讀，同時保留右側的窗光溫度感。「你還是你」橘色強調——這是這張 slide 最重要的一句，對讀者的直接叩問。「才有機會」橘色強調結果的條件感。主文可排為 2-3 行，語氣緩慢有份量。",
    },
  },
  {
    slide_number: 8,
    role: "cta",
    role_label: "CTA",
    main_copy: "你最怕開口的那個人，是誰？",
    support_copy: "留言告訴我。不是要你硬推，而是一起拆解怎麼開口。",
    main_lines: ["你最怕開口的那個人，", "是誰？"],
    support_lines: ["留言告訴我。不是要你硬推，", "而是一起拆解怎麼開口。"],
    highlight_words: ["最怕開口"],
    still_preview: {
      type: "image",
      status: "prompt_ready",
      image_generation_prompt:
        "Cinematic vertical 4:5 portrait. Close-medium composition. A smartphone lies face-up on a minimal dark wooden desk in the lower third of frame. The phone screen shows a blurred, unreadable social media interface — dark background with what appears to be a comment input field, deliberately soft-focused so no real content is legible. Upper two-thirds of frame: dark ambient space with the soft warm glow of a desk lamp creating a subtle warm pool on the desk surface. The overall feeling is quiet and contemplative — an invitation to type something honest. No logos on the phone. No extra fingers. No readable interface text.",
      video_generation_prompt:
        "4:5 vertical, 5-second. The phone screen's ambient glow oscillates very gently — 5% brightness amplitude over 5 seconds, like a heartbeat. A text cursor appears to blink in the blurred lower portion of the screen — imperceptible detail, just a rhythm. The desk lamp warm pool expands 3% over 5 seconds. Camera: completely static. Upper two-thirds preserved and clear throughout. No fast motion. No readable text generated.",
      negative_prompt: SHARED_NEGATIVE_PROMPT,
      subject_position: "background",
      text_safe_area: "top",
      mood: "邀請、開放、準備說出真實問題",
      camera_direction: "靜止，手機在下方，上方保留文字空間",
      lighting_direction: "桌燈暖光從側上方照，手機螢幕輕微自發光",
      motion_direction: "螢幕光脈動、游標閃爍、桌燈暖光緩擴",
      quality_note: "手機螢幕必須模糊，不可有任何可讀文字或真實 UI。手指不得出現。",
    },
    motion_asset: {
      status: "prompt_ready",
      provider: "none",
      keyframe_prompt:
        "Cinematic vertical 4:5. Smartphone face-up on minimal dark wooden desk, lower third of frame. Phone screen blurred, unreadable. Upper two-thirds: dark ambient space, soft warm desk lamp glow. Contemplative, quiet.",
      video_generation_prompt:
        "4:5 vertical, 5-second cinematic motion. Smartphone on dark desk, lower third. Camera: very slow push-in — imperceptible approach over 5 seconds. Phone screen glow oscillates gently at 5% amplitude like a heartbeat. Text cursor blinks in blurred screen area — subtle rhythm only. Desk lamp warm pool expands 3% over 5 seconds as if the room gets warmer. Upper two-thirds preserved for text. No readable text on screen. No hands or fingers. No fast motion. Mood: invitation, openness, invitation to comment. No generated text.",
      negative_prompt: MOTION_NEGATIVE_PROMPT,
      background_video_url: undefined,
      final_video_url: undefined,
      thumbnail_url: undefined,
      duration_seconds: 5,
      fps: 24,
      aspect_ratio: "4:5",
      resolution: "1080x1350",
      text_safe_area: "top",
      subject_position: "background",
      camera_motion: "靜止，極緩慢推近手機（5秒內幾乎察覺不到）",
      subject_motion: "無人物，手機螢幕光以5%振幅脈動（如心跳節律）",
      atmosphere_motion: "桌燈暖光緩慢擴散3%，游標在模糊螢幕中閃動",
      quality_note: "螢幕完全模糊，無可讀文字，無手指，上方保留文字區",
    },
    typography: {
      template: "center-statement",
      text_safe_area: "上方 55% 畫面",
      main_font_size: "clamp(20px, 5vw, 30px)",
      support_font_size: "clamp(12px, 2.8vw, 14px)",
      line_height: "1.3",
      max_line_count: 2,
      emphasis_words: ["最怕開口"],
      emphasis_style: "orange",
      overlay_mask: "top-gradient",
      contrast_rule: "上方文字區透過 top-gradient 深化背景，大字問句白色 ≥ 7:1",
      readability_score: 9,
      overlay_design_note:
        "手機在下方三分之一作為場景主體，喚起留言的行動情緒。上方天花板深暗，是最佳文字安全區。top-gradient 遮罩強化上方 55% 的暗度，讓問句大字清晰。「最怕開口」橘色強調——這是整篇最後的叩問，也是整本輪播最重要的動作邀請。Support copy 在主文下方，用稍小字號，直接邀請留言，語氣柔和但明確。手機留在下方，形成 CTA 情緒但不被文字蓋住。",
    },
  },
];

// ── Motion Quality Gate ───────────────────────────────────────────────────────

function buildMotionGate(): MotionGateResult {
  const allMotionReady = SLIDES.every(
    (s) => s.motion_asset.status === "video_generated" ||
           s.motion_asset.status === "composing" ||
           s.motion_asset.status === "composed" ||
           s.motion_asset.status === "approved"
  );
  const allPromptsReady = SLIDES.every((s) => s.motion_asset.video_generation_prompt.length > 0);
  const allTypographyPass = SLIDES.every((s) => s.typography.readability_score >= 9);

  const dimensions: QualityDimension[] = [
    {
      id: "motion_asset_readiness",
      name: "Motion Asset Readiness",
      score: allMotionReady ? 10 : 0,
      max_score: 10,
      reason: allMotionReady
        ? "全部 8 段背景影片已生成。"
        : "全部 8 張 slide 的 motion_asset.status 為 prompt_ready — 影片尚未生成。靜態圖片 ready 不影響此分數。CSS/SVG fallback 不算 motion ready。需連接 motion provider（Runway、Kling 等）後生成。",
      fail_condition: "任一張缺少 background_video_url，此項為 0。靜態圖片不可提高此分數。",
      passed: allMotionReady,
      blocking: true,
    },
    {
      id: "video_scene_quality",
      name: "Video Scene Quality",
      score: allMotionReady ? 9 : (allPromptsReady ? 2 : 0),
      max_score: 10,
      reason: allMotionReady
        ? "影片場景品質可人工驗收。"
        : allPromptsReady
        ? "8 張 slide 已有完整 video_generation_prompt，但尚無生成影片，無法驗收場景品質，給 2 分。"
        : "缺少 motion prompt，無法評估。",
      fail_condition: "無生成影片，無法驗收，最高 2 分。",
      passed: allMotionReady,
      blocking: false,
    },
    {
      id: "motion_text_integration",
      name: "Motion-Text Integration",
      score: allMotionReady ? 9 : 2,
      max_score: 10,
      reason: allMotionReady
        ? "影片背景與文字 overlay 可整合驗收。"
        : "文字 overlay 系統已備妥（main_lines / support_lines / typography），但無影片背景可整合測試，給 2 分。",
      fail_condition: "無 background_video，文字背景整合無法驗收，最高 2 分。",
      passed: allMotionReady,
      blocking: true,
    },
    {
      id: "typography_readiness",
      name: "Typography Readiness",
      score: allTypographyPass ? 8 : 6,
      max_score: 10,
      reason: allTypographyPass
        ? "排版系統完整定義：template、text_safe_area、emphasis style、overlay mask。無真實影片背景，對比度為理論值，故給 8 分。"
        : "部分 slide readability_score < 9。",
      fail_condition: "readability_score < 9 最高 6；無真實影片背景最高 8。",
      passed: allTypographyPass,
      blocking: false,
    },
    {
      id: "narrative_arc",
      name: "Narrative Arc",
      score: 9,
      max_score: 10,
      reason: "8 張按 HOOK → PAIN → TRUTH → REFRAME → POV → METHOD → ACTION → CTA 完整遞進，無跳題，無重複。從恐懼到原因到方法，邏輯閉合。",
      fail_condition: "任一張跳題、重複或邏輯缺口，最高 7。",
      passed: true,
      blocking: false,
    },
    {
      id: "yusheng_voice",
      name: "Yusheng Voice",
      score: 9,
      max_score: 10,
      reason: "短句、現場感、主管視角、具體逆轉。無禁用詞。「我做這行十年以上」是業界真人語氣，不是 AI 顧問腔。",
      fail_condition: "AI 顧問語氣、雞湯、泛用激勵文，最高 7。",
      passed: true,
      blocking: false,
    },
    {
      id: "manual_post_readiness",
      name: "Manual Post Readiness",
      score: allMotionReady ? 8 : 4,
      max_score: 10,
      reason: allMotionReady
        ? "8 段影片就位，caption 與 hashtags 已備妥，可進入人工確認流程。"
        : "Caption 真人可發、hashtags 完整、文案 8 張完成，但無 final MP4，Manual Post Readiness 不可超過 6，給 4 分。",
      fail_condition: "無 final_video_url，Manual Post Readiness 不可超過 6。",
      passed: allMotionReady,
      blocking: true,
    },
  ];

  const blockingFailed = dimensions.filter((d) => d.blocking && !d.passed);
  const overallScore = Math.round(dimensions.reduce((sum, d) => sum + d.score, 0) / dimensions.length);
  const motionReady = blockingFailed.length === 0 && overallScore >= 8;
  const blockingReasons = blockingFailed.map((d) => `${d.name}: ${d.reason}`);

  return { dimensions, overall_score: overallScore, motion_ready: motionReady, blocking_reasons: blockingReasons };
}

// ── Still Preview Quality Gate (debug) ───────────────────────────────────────

function buildQualityGate(): QualityGateResult {
  const allAssetsApproved = SLIDES.every((s) => s.still_preview.status === "approved");
  const allReadabilityPass = SLIDES.every((s) => s.typography.readability_score >= 9);
  const allTypographyNotesPresent = SLIDES.every((s) => s.typography.overlay_design_note.length > 0);

  const dimensions: QualityDimension[] = [
    {
      id: "topic_direction",
      name: "Topic Direction",
      score: 9,
      max_score: 10,
      reason: "主題精準命中保險新人最真實的隱性恐懼——「做保險會失去朋友」。保險業界專屬，非泛用。有具體逆轉：問題不是保險，是溝通順序。",
      fail_condition: "主題模糊、不夠保險業專屬，或任何行業皆可適用，最高 7。",
      passed: true,
      blocking: false,
    },
    {
      id: "narrative_arc",
      name: "Narrative Arc",
      score: 9,
      max_score: 10,
      reason: "8 張按 HOOK → PAIN → TRUTH → REFRAME → POV → METHOD → ACTION → CTA 完整遞進，無跳題，無重複。",
      fail_condition: "任一張跳題、重複或邏輯缺口，最高 7。",
      passed: true,
      blocking: false,
    },
    {
      id: "yusheng_voice",
      name: "Yusheng Voice",
      score: 9,
      max_score: 10,
      reason: "短句、現場感、主管視角、具體逆轉。無禁用詞。「我做這行十年以上」是業界真人語氣，不是 AI 顧問腔。",
      fail_condition: "AI 顧問語氣、雞湯、泛用激勵文，最高 7。",
      passed: true,
      blocking: false,
    },
    {
      id: "pain_precision",
      name: "Pain Precision",
      score: 9,
      max_score: 10,
      reason: "命名兩層恐懼：表層（朋友遠離）與深層（被貼「變現實」標籤）。",
      fail_condition: "痛點模糊、無第二層、非業界語言，最高 8。",
      passed: true,
      blocking: false,
    },
    {
      id: "visual_asset_readiness",
      name: "Still Preview Readiness",
      score: allAssetsApproved ? 9 : 0,
      max_score: 10,
      reason: allAssetsApproved
        ? "全部 8 張靜態預覽素材已 approved。注意：still_preview 不是 final output。"
        : "全部 8 張 still_preview 狀態為 prompt_ready — 尚未生成。靜態圖片 ≠ final output。",
      fail_condition: "still_preview approved 不代表 motion ready。",
      passed: allAssetsApproved,
      blocking: true,
    },
    {
      id: "typography_readiness",
      name: "Typography Readiness",
      score: allReadabilityPass ? 8 : 6,
      max_score: 10,
      reason: allReadabilityPass
        ? "排版系統已完整定義。但在無 real video background 的情況下，對比度驗證為理論值，故給 8 分。"
        : "部分 slide readability_score < 9。",
      fail_condition: "readability_score < 9，Typography Readiness 不可超過 8。",
      passed: allReadabilityPass,
      blocking: true,
    },
    {
      id: "visual_text_integration",
      name: "Still Preview-Text Integration",
      score: allAssetsApproved && allTypographyNotesPresent ? 9 : 7,
      max_score: 10,
      reason: allAssetsApproved
        ? "靜態預覽素材已 approved，排版遮罩設計已完成。"
        : "每張 slide 有詳細 overlay_design_note，但無 real visual asset，給 7 分。",
      fail_condition: "無 overlay_design_note，最高 7；無 real asset，最高 7。",
      passed: allTypographyNotesPresent && allAssetsApproved,
      blocking: true,
    },
    {
      id: "publish_readiness",
      name: "Still Preview Publish Readiness",
      score: allAssetsApproved ? 7 : 5,
      max_score: 10,
      reason: "靜態圖片即使全部 approved，仍非 final output。Final output 必須是 MP4 motion slides。此分數僅評估靜態預覽流程完整度。",
      fail_condition: "still_preview 不可視為 final publish output。",
      passed: false,
      blocking: true,
    },
  ];

  const blockingFailed = dimensions.filter((d) => d.blocking && !d.passed);
  const overallScore = Math.round(dimensions.reduce((sum, d) => sum + d.score, 0) / dimensions.length);
  const publishReady = blockingFailed.length === 0 && overallScore >= 9;
  const blockingReasons = blockingFailed.map((d) => `${d.name}: ${d.reason}`);

  return { dimensions, overall_score: overallScore, publish_ready: publishReady, blocking_reasons: blockingReasons };
}

// ── Caption & Hashtags ────────────────────────────────────────────────────────

const CAPTION = `做保險真的會讓朋友遠離你嗎？

我做這行十年以上，看過很多新人不是輸在能力，也不是輸在產品。
是還沒開始講保險，就先把自己放到一個很尷尬的位置。

你怕朋友覺得你變現實。
你怕一開口，關係就變味。
你怕對方心裡想：「你是不是想賣我？」

但真正的問題不是保險。
是你把「關心」和「成交」的順序搞反了。

朋友不會因為你做保險離開你。
他們抗拒的，是突然被你當成名單。

先關心，再判斷。
先聽懂，再開口。
先讓對方感覺你還是你，專業才有機會被聽見。

你最怕開口的那個人，是誰？
留言給我，我們一起拆。`;

const HASHTAGS = ["#小佑老師", "#保險新人", "#保險業務", "#保險增員", "#業務成長"];

const CHECKLIST = [
  "連接 motion provider（Runway / Kling / Pika）",
  "使用每張的 video_generation_prompt 生成 4:5 背景影片",
  "驗收 8 段影片場景品質（無可讀文字、無變形、符合負空間要求）",
  "合成文字 overlay 到影片上（MotionSlidePreview）",
  "人工確認 8 段 final MP4 品質",
  "Approve 全部 8 段影片（motion_asset.status → approved）",
  "複製 caption 備用",
  "複製 hashtags 備用",
  "手動上傳到 Instagram（8 段輪播影片、按順序）",
  "選擇今日 20:00 台灣時間排程或立即發布",
];

// ── Export ────────────────────────────────────────────────────────────────────

export const FINAL_LAUNCH_PACK: FinalLaunchPack = {
  topic: "保險新人做業務真的會沒朋友嗎？",
  thesis: "做保險不會讓你失去朋友，錯誤的溝通順序才會。",
  deep_insight: "你不是失去朋友，你是把朋友放錯位置。",
  slides: SLIDES,
  caption: CAPTION,
  hashtags: HASHTAGS,
  motion_gate: buildMotionGate(),
  quality_gate: buildQualityGate(),
  launch_checklist: CHECKLIST,
};
