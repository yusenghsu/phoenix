import OpenAI from "openai";

export interface VisualSceneDirection {
  overall_style: string;
  scene_type: string;
  people_scene: string;
  emotional_atmosphere: string;
  motion_background: string;
  camera_movement: string;
  typography_mood: string;
  not_allowed: string[];
}

export interface TopicCandidate {
  topic: string;
  hook: string;
  core_angle: string;
  why_for_yusheng: string;
  why_market_resonates: string;
  yusheng_voice_fit: string;
  first_slide_direction: string;
  comment_prompt: string;
  target_audience: string[];
  content_type: "carousel";
  emotional_trigger: string;
  shareability_score: number;
  saveability_score: number;
  brand_fit_score: number;
  risk_level: "low" | "medium" | "high";
  risk_reason: string;
  visual_scene_direction: VisualSceneDirection;
}

export interface PhoenixSignal {
  signal: string;
  value: string;
}

export interface PhoenixAnalysis {
  content_thesis: string;
  signals_used: PhoenixSignal[];
  why_these_five: string;
}

export interface TopicIntelligenceOutput {
  candidates: TopicCandidate[];
  market_source: "strategy_model";
  analysis_note: string;
  analysis: PhoenixAnalysis;
}

function buildSystemPrompt(): string {
  return `You are Phoenix Topic Intelligence Engine — the part of Phoenix that decides what 小佑 (Yusheng) should post today.

Your job: generate exactly 5 topic candidates for Yusheng's Instagram insurance career carousel.

---

## Who Is Yusheng

小佑 is a working insurance agent + recruiter in Taiwan who builds authority by saying what others in the industry are afraid to say.

He is NOT:
- A motivational speaker ("加油！你可以的！")
- A lifestyle influencer ("工作與生活的平衡很重要")
- A generic educator ("今天教你認識保險商品")

He IS:
- The person who finally names the specific fear his audience has been too embarrassed to say out loud
- The person who tells a new agent the truth their own supervisor won't tell them
- The person who reverses the conventional wisdom with specificity, not with vague positivity

His brand voice: 一針見血 — direct, warm, truthful, no empty encouragement.

---

## Voice Rules — Non-Negotiable

Every topic MUST pass this test:
"Would someone who actually works in Taiwan's insurance industry in their first 2 years feel: 『這說的就是我』?"

The topic title should do ONE of these:
1. Name a specific fear that nobody in the industry dares to say
2. Reverse a common myth with specificity ("不是X，是Y")
3. Reveal a hidden truth from insider perspective
4. Give a concrete reframe of a real situation new agents face

GOOD topic structures (use these patterns, not these exact words):
- 做保險會沒朋友嗎？（the fear question that everyone has but won't ask）
- 新人賺不到錢，真的只是能力問題嗎？（reframe of blame）
- 你不是不適合保險，你只是一直被錯誤方式帶著跑 （insider truth）
- 為什麼很多新人還沒學會，就先想離職？（point to the real problem）
- 主管最危險的不是不教，而是教錯順序（specific inversion）
- 保險新人最痛的，不是被拒絕，是不知道自己每天在累積什麼（name the real pain）

BAD topic structures — REJECT THESE:
- 保險業的真實與誤解（too abstract, could be written by anyone）
- 努力卻沒結果的深層原因（generic, no insurance specificity）
- 成為主管，你該知道的事（corporate training manual energy）
- 保險業的生存法則（vague, motivational poster energy）
- 如何在保險業成功（completely generic）

The test: if this topic could appear in a generic business education account, it fails. It must only make sense coming from someone who has personally worked in Taiwan's insurance industry.

---

## Creator Profile
- Name: 小佑 (Yusheng)
- Industry: Insurance recruiting & career development in Taiwan
- Role: Insurance agent + recruiter + educator (personal brand, Instagram)
- Content goal: Make audience SAVE it AND want to share it with a specific person they know

## Primary Audiences (be specific about which one each topic serves)
- 保險新人: first 1–2 years, fear of no income, fear of losing friends, confused about daily activities
- 準新人: considering joining insurance but afraid of the stigma / being seen as pushy
- 卡關業務: 2–5 years in, working hard but stuck, questioning whether to stay
- 菜鳥主管: newly promoted, unsure how to build a team without being the headcount-driven boss they hated
- 高學歷轉職者: well-educated, analytical, can't find their footing, feel overqualified but underperforming

## Past Winning Themes (proven resonance — draw from these patterns)
- 做保險會沒朋友嗎 → stigma + relationship fear
- 新人賺不到錢 → income anxiety + self-doubt
- 選主管的關鍵 → supervisor quality gap
- 新人三步驟 → method + clarity
- 保險業務不敢說的事 → insider truth
- 亂槍打鳥 → wrong activity = zero results
- 淘汰 → fear of being filtered out
- 努力但沒結果 → effort-result disconnect
- 被誤會的保險業 → identity conflict + stigma
- 主管怎麼帶新人 → leadership quality gap

## Market Resonance Model (source: strategy_model — NOT live web data)
Current dominant tensions in this audience:
1. Relationship stigma: fear that joining insurance means losing friends to "bothering them"
2. Year-1 income cliff: recruiter promises vs reality of $0 months
3. Supervisor roulette: some are real coaches; most just want headcount
4. Identity conflict: am I a salesperson or a professional?
5. Method gap: high activity, zero conversion — don't know why
6. Invisible progress: working hard every day with no visible results, can't tell if they're growing
7. Recruiter gap: what they were promised vs what year-1 actually looks like
8. Quit-before-learning trap: leaving just before the method clicks

---

## Visual Scene Direction Rules

Every candidate needs a cinematic, realistic scene direction.

What works:
- Film still aesthetic — a real person in a real moment
- Specific location + specific emotional state
- Cinematic lighting (dramatic but natural — not studio flash)
- Subtle movement (slow pull-in, shallow depth of field, breath-fogging glass)

Specific examples:
- Newcomer paralysis → late night, phone with prospect list on screen, desk lamp casting a small circle of warm light, rest of room dark, person's thumb hovering — not clicking
- Effort-no-result → desk covered in sticky notes and call records, person's head resting on arms, not crying, just exhausted, desk lamp harsh overhead
- Supervisor quality → two people at a small table, one points at a whiteboard showing a process (not a leaderboard), other person leans forward, camera from the side
- Stigma/identity → person in business casual looking at their own reflection in a shop window on a busy street, they look uncertain, not sad
- Decision moment → person alone in a café at night, laptop open, phone face-down, just looking out the window at rain
- Quit before it clicks → person with packed personal items on a desk, pausing, not yet gone, light from above

What NEVER appears:
- 抽象光粒子 (abstract light particles) — always forbidden
- 科技線條 (generic glowing tech lines)
- 制式圖庫笑臉 (stock photo fake smiles)
- Canva gradient templates
- Motivational poster typography

---

## Output Format

Return a JSON object with EXACTLY this structure (all text in Traditional Chinese except field names):

{
  "analysis": {
    "content_thesis": string (what Phoenix judges Yusheng should attack today and why — 2 sentences max),
    "signals_used": [
      { "signal": "past_yusheng_theme_signal", "value": string (which past themes informed this batch) },
      { "signal": "market_resonance_signal", "value": string (which market tensions are strongest right now) },
      { "signal": "brand_positioning_signal", "value": string (which positioning angle serves Yusheng's brand growth) }
    ],
    "why_these_five": string (2–3 sentences explaining why THIS specific combination of 5 — what they cover together, why they're diverse enough)
  },
  "candidates": [
    {
      "topic": string (Traditional Chinese — sharp, specific, passes the insider test),
      "hook": string (the 1-sentence scroll-stopper that opens the carousel — visceral, specific, makes someone feel seen),
      "core_angle": string (the specific argument or reversal this carousel makes — 1 sentence),
      "why_for_yusheng": string (why this topic builds Yusheng's brand authority specifically — not generic),
      "why_market_resonates": string (which specific market tension this addresses — name the tension directly),
      "yusheng_voice_fit": string (explain WHY this topic sounds like something 小佑 would actually say — is it because of his past themes? his insider position? his truth-telling stance?),
      "first_slide_direction": string (how the first carousel slide should open — typography feel, opening line style, what the viewer sees first),
      "comment_prompt": string (the sentence at the end of the carousel that invites comments — should make people reply with their own experience),
      "target_audience": string[] (2-4 specific audience segments from the list above),
      "content_type": "carousel",
      "emotional_trigger": string (the primary emotion activated — be specific: 被說中了, 委屈被看見, 恍然大悟, 想轉傳給某人, 突然想離職的衝動, 解脫),
      "shareability_score": number (0-100),
      "saveability_score": number (0-100),
      "brand_fit_score": number (0-100),
      "risk_level": "low" | "medium" | "high",
      "risk_reason": string,
      "visual_scene_direction": {
        "overall_style": string,
        "scene_type": string (specific: 夜晚辦公桌, 雨天咖啡廳, 會議室下班後, 街道傍晚, 清晨自習角落),
        "people_scene": string (describe the specific person, their posture, what they are doing or not doing, what their face shows — be cinematic),
        "emotional_atmosphere": string (describe the emotional weight of the frame — not what it depicts, but what it FEELS like),
        "motion_background": string (describe the subtle background movement — slow, cinematic),
        "camera_movement": string (slow push in? static with shallow DOF? slow pull back?),
        "typography_mood": string (how should the text feel on this background — weight, size, contrast, placement),
        "not_allowed": string[] (always include: ["抽象光粒子", "科技線條", "制式圖庫笑臉", "Canva模板感"])
      }
    }
  ],
  "analysis_note": string (1 sentence summary of the overall theme of this batch)
}

Produce exactly 5 candidates. Diversity across the 5: cover different audience segments and different market tensions.`;
}

const MOCK_ANALYSIS: PhoenixAnalysis = {
  content_thesis: "今天 Phoenix 判斷小佑最適合打「被困住的新人」族群——他們努力但看不到方向，而且不敢承認這件事。這個族群共鳴度最高，轉傳動機強。",
  signals_used: [
    { signal: "past_yusheng_theme_signal", value: "「努力但沒結果」「新人賺不到錢」這兩個系列歷史共鳴最高，說明受眾對「看不見進展」有強烈情緒積壓" },
    { signal: "market_resonance_signal", value: "市場主要張力：新人不知道每天的努力在累積什麼，活動量高但轉化歸零，對自己的判斷失去信心" },
    { signal: "brand_positioning_signal", value: "小佑的定位是「說業界真話的人」——這批主題必須有他才能說，而不是任何業務培訓帳號都能說" },
  ],
  why_these_five: "這五個候選分別覆蓋：關係恐懼（沒朋友）、方法錯誤（瞎忙）、主管品質（選擇）、正確起步（前三個月）、身份認同（聰明人的盲點）。在一批中同時處理恐懼、方法、制度、起點和認知，讓不同階段的受眾都能找到對自己的那張。",
};

const MOCK_CANDIDATES: TopicCandidate[] = [
  {
    topic: "做保險會沒朋友嗎？大多數人想錯方向了",
    hook: "你怕開口，因為你怕失去他們。但問題不是保險，是你選錯了方式。",
    core_angle: "區分「把朋友當名單」和「以朋友的身份說真話」，讓受眾重新定義自己的角色",
    why_for_yusheng: "小佑說真話的定位：點出大家不敢說的恐懼，再給出具體反轉。這題只有在業界做過、親眼看過兩種結果的人才說得出來",
    why_market_resonates: "關係恐懼是新人最大的隱性壓力——不是業績，是「我的朋友以後還會理我嗎」",
    yusheng_voice_fit: "這題像小佑的風格，因為他不迴避這個問題，而是正面拆解。他的受眾就是在猶豫這一步的人，他一說，他們就覺得被看見",
    first_slide_direction: "大字問句開場：「你做保險之後，有人說再也不接你電話了嗎？」字體重、白字黑底或深底，沒有裝飾，純粹問句壓著整個畫面",
    comment_prompt: "留言告訴我：你做保險後，有沒有朋友開始疏遠你？",
    target_audience: ["保險新人", "準新人", "猶豫要不要加入的年輕人"],
    content_type: "carousel",
    emotional_trigger: "被說中了，委屈被看見",
    shareability_score: 88,
    saveability_score: 82,
    brand_fit_score: 95,
    risk_level: "low",
    risk_reason: "觸及共同恐懼但不攻擊任何人，引發認同而非爭議",
    visual_scene_direction: {
      overall_style: "電影感夜景，深色溫暖光源",
      scene_type: "夜晚咖啡廳或家中書桌",
      people_scene: "年輕人坐著，手機放在桌上螢幕朝下，不是在看，而是在想——手指輕放在桌上，目光放空，表情是糾結而非悲傷",
      emotional_atmosphere: "靜止的猶豫感——那種打了草稿但還沒有勇氣送出的狀態",
      motion_background: "背景焦外虛化，窗外城市燈光微微移動，像是時間暫停的瞬間",
      camera_movement: "鏡頭極緩慢地向前推近，像是靠近某個秘密",
      typography_mood: "字體偏重，白色或淺橙，單句大字置中，沒有裝飾線條",
      not_allowed: ["抽象光粒子", "科技線條", "制式圖庫笑臉", "Canva模板感"],
    },
  },
  {
    topic: "新人賺不到錢，你真的只是「能力問題」嗎？",
    hook: "你每天拜訪，每天被拒絕，每月業績歸零。在你懷疑自己之前，先看這個。",
    core_angle: "拆解新人業績歸零的三個系統性原因：名單沒有篩選、拜訪沒有節奏、跟進缺乏深度——不是個人能力，是方法問題",
    why_for_yusheng: "這題讓小佑站在新人這邊，對抗的不是新人自己，而是「你不夠努力」的錯誤歸因。這是他的老師定位",
    why_market_resonates: "努力與收入脫鉤是第一年最大的精神耗損，會讓人懷疑自己是不是根本不適合，再不說清楚，新人就跑了",
    yusheng_voice_fit: "小佑說過「亂槍打鳥」的主題，這題是同一個脈絡：問題不是你，是你用的方法。他說這種話有說服力，因為他親眼帶過新人",
    first_slide_direction: "第一張用數字感開場：「你的第一年業績是不是每月都在重設為零？」大字，直接，不解釋，讓人停下來",
    comment_prompt: "告訴我：你第一年最長的業績空白期是幾個月？",
    target_audience: ["保險新人", "卡關業務", "準新人"],
    content_type: "carousel",
    emotional_trigger: "恍然大悟，委屈被外部化",
    shareability_score: 85,
    saveability_score: 93,
    brand_fit_score: 92,
    risk_level: "low",
    risk_reason: "為新人辯護而非批評制度，容易引發共鳴而非防禦",
    visual_scene_direction: {
      overall_style: "壓抑的深夜工作情境",
      scene_type: "辦公桌深夜，室內",
      people_scene: "桌上散著拜訪記錄表、便條紙和一個已經冷掉的紙杯，人的雙手平放在桌上，頭微微低著，不是哭，是那種沉默到極點的狀態",
      emotional_atmosphere: "無聲的崩潰感——不是爆發，而是慢慢被耗盡的感覺",
      motion_background: "桌燈光圈穩定，窗外路燈偶爾有車燈掃過，背景近乎靜止",
      camera_movement: "鏡頭靜止，極淺景深，桌上雜物前景模糊，人是中景清晰",
      typography_mood: "字體偏細，白色，小一些，有喘不過氣的感覺",
      not_allowed: ["抽象光粒子", "科技線條", "制式圖庫笑臉", "Canva模板感"],
    },
  },
  {
    topic: "你選主管，不只是選一個人，是選一種命運",
    hook: "有些主管帶你成長。有些主管消耗你兩年，讓你以為是自己不行。你有辦法在加入前看出來嗎？",
    core_angle: "三個可以在加入前辨別主管品質的具體問題：他有沒有系統、他的成功能不能被複製、他願不願意花時間在你身上",
    why_for_yusheng: "小佑自己是主管，說這種話有信用。而且他站在準新人的利益說，不是為主管群體辯護——這是他的真話定位",
    why_market_resonates: "主管品質落差是業界最公開的秘密，但很少人整理成「加入前怎麼看」的具體判斷工具",
    yusheng_voice_fit: "這題像小佑，因為他不說「選主管要謹慎」（廢話），而是給出可以實際操作的判斷框架——這是他「一針見血」品牌的核心",
    first_slide_direction: "第一張：大字問句，「你當初選主管時，問了哪幾個問題？」下方小字，「如果答案是零個，這篇很重要。」",
    comment_prompt: "你現在的主管是什麼型？留言跟我說。",
    target_audience: ["準新人", "保險新人", "正在評估要不要加入的人"],
    content_type: "carousel",
    emotional_trigger: "警覺 + 被賦予工具",
    shareability_score: 90,
    saveability_score: 88,
    brand_fit_score: 93,
    risk_level: "medium",
    risk_reason: "可能讓部分主管感到不舒服，但內容是幫助準新人的，受眾群體比主管群體大",
    visual_scene_direction: {
      overall_style: "對話情境，分析感而非衝突感",
      scene_type: "會議室白天，下班後的小辦公室",
      people_scene: "主管坐在白板前，白板上有流程圖（不是業績數字），新人坐在對面，手裡有筆記本，姿勢是前傾的——想聽懂，不是被訓話",
      emotional_atmosphere: "信任建立中的那種安靜——像是第一次覺得有人真的在教你",
      motion_background: "窗外辦公大樓遠景緩緩移焦，前景人物清晰，有思考的質感",
      camera_movement: "從側後方緩慢推近，像是旁觀一個重要的對話",
      typography_mood: "字體偏中，橙色或白色，有結構感，像在分析而非在催促",
      not_allowed: ["抽象光粒子", "科技線條", "制式圖庫笑臉", "Canva模板感"],
    },
  },
  {
    topic: "保險新人前三個月，你不需要業績，你需要這個",
    hook: "所有人都在逼你業績。但沒有人告訴你，前三個月真正要建立的不是業績，是讓你以後能撐下去的東西。",
    core_angle: "重新定義前三個月的任務：不是硬衝成交，而是建立「可重複的拜訪節奏」、「理解一個真實的客戶需求」、「找到自己說得出口的切入點」",
    why_for_yusheng: "這題完全違反市場上「加油衝業績」的聲音，和小佑的反主流定位完全吻合，而且是他有能力說的話——他帶過新人",
    why_market_resonates: "年一新人最大系統性問題：被期望太高但沒有系統支撐，在沒有方向的情況下努力，然後放棄",
    yusheng_voice_fit: "小佑這種話有說服力，因為他不只說「撐下去」（空洞），他給出前三個月的具體框架——這是他的教練定位",
    first_slide_direction: "第一張：大字，「所有人都說：業績業績業績。但你知道新人前三個月的業績歸零率是多少嗎？」讓數據感震驚受眾",
    comment_prompt: "你的前三個月，有沒有人告訴你真正要做什麼？",
    target_audience: ["保險新人", "準新人", "考慮放棄的業務"],
    content_type: "carousel",
    emotional_trigger: "解脫 + 終於有人說了",
    shareability_score: 87,
    saveability_score: 95,
    brand_fit_score: 96,
    risk_level: "low",
    risk_reason: "逆向觀點但站在新人利益，不會引發誤解，容易被視為真正的業界建議",
    visual_scene_direction: {
      overall_style: "清晨啟動感，靜定而非衝動",
      scene_type: "清晨室內，自習桌或工作角落",
      people_scene: "新人坐著，桌上有一個剛整理好的記錄本和一杯咖啡，手放在本子上，表情平靜，眼神往前——不是焦慮，是準備好了的樣子",
      emotional_atmosphere: "安靜的起點感——不是倉皇的衝刺，而是找到方向後的平靜",
      motion_background: "清晨光線從窗口斜打進來，地板上有柔和的光影，慢慢移動",
      camera_movement: "鏡頭從遠景慢慢向前推近，帶出「開始了」的感覺",
      typography_mood: "字體乾淨，白或淡橙，有開始新頁的清爽感",
      not_allowed: ["抽象光粒子", "科技線條", "制式圖庫笑臉", "Canva模板感"],
    },
  },
  {
    topic: "為什麼越聰明的人，在保險業越難做起來？",
    hook: "你分析能力比別人強，你看事情比別人快。但你的業績不如那個看起來沒你聰明的同事。這不是因為你差，而是因為你的聰明用錯地方了。",
    core_angle: "高分析型人格在保險的三個反效果：過度分析客戶導致遲遲不拜訪、用邏輯取代建立信任、把「我想清楚了」當成行動的替代",
    why_for_yusheng: "小佑喜歡說「反直覺的真相」，這題正是——優勢在某個脈絡裡變成了阻礙。這個角度讓高學歷轉職者覺得「這在說我」",
    why_market_resonates: "高學歷轉職焦慮是增員市場的現實張力：自認有能力、有分析力，但業績不如看起來更「草根」的同事，造成深度身份衝突",
    yusheng_voice_fit: "這題需要有招募高學歷新人、帶過他們、看過他們的盲點的人才說得出來。小佑有這個位置，他不是在批評，是在幫他們看自己",
    first_slide_direction: "第一張：問句，「你是不是公司裡學歷最高的人之一，但業績卻不是最好的那個？」讓特定人群一秒被點到",
    comment_prompt: "如果你是這種類型，留言告訴我：你覺得自己「聰明」卡在哪？",
    target_audience: ["高學歷轉職者", "卡關業務", "準新人"],
    content_type: "carousel",
    emotional_trigger: "被點破 + 想搞清楚",
    shareability_score: 91,
    saveability_score: 89,
    brand_fit_score: 90,
    risk_level: "medium",
    risk_reason: "標題有輕微挑釁感，需要前幾張快速做清楚定調，否則聰明人可能防禦性反彈",
    visual_scene_direction: {
      overall_style: "孤獨思考的都市知識份子場景",
      scene_type: "傍晚辦公大樓外或落地窗咖啡廳",
      people_scene: "穿著整齊的年輕人站在落地玻璃前，玻璃上有城市的倒影和他自己的倒影重疊，他不在看外面，在看自己——表情是若有所思，不是悲傷",
      emotional_atmosphere: "清醒與迷惘並存——知道自己聰明，卻不知道聰明用在哪裡的那種安靜困惑",
      motion_background: "城市燈光在玻璃上緩慢流動，前景人物清晰，背景城市像流動的思緒",
      camera_movement: "鏡頭從他的側面緩慢向前推，最終停在玻璃上的雙重倒影",
      typography_mood: "字體偏細偏輕，白或銀，有分析感而非衝擊感",
      not_allowed: ["抽象光粒子", "科技線條", "制式圖庫笑臉", "Canva模板感"],
    },
  },
];

function isValidCandidate(obj: unknown): obj is TopicCandidate {
  if (typeof obj !== "object" || obj === null) return false;
  const o = obj as Record<string, unknown>;
  return (
    typeof o.topic === "string" &&
    typeof o.hook === "string" &&
    typeof o.core_angle === "string" &&
    typeof o.why_for_yusheng === "string" &&
    typeof o.why_market_resonates === "string" &&
    typeof o.yusheng_voice_fit === "string" &&
    typeof o.first_slide_direction === "string" &&
    typeof o.comment_prompt === "string" &&
    Array.isArray(o.target_audience) &&
    o.content_type === "carousel" &&
    typeof o.emotional_trigger === "string" &&
    typeof o.shareability_score === "number" &&
    typeof o.saveability_score === "number" &&
    typeof o.brand_fit_score === "number" &&
    (o.risk_level === "low" || o.risk_level === "medium" || o.risk_level === "high") &&
    typeof o.risk_reason === "string" &&
    typeof o.visual_scene_direction === "object" && o.visual_scene_direction !== null
  );
}

function isValidAnalysis(obj: unknown): obj is PhoenixAnalysis {
  if (typeof obj !== "object" || obj === null) return false;
  const o = obj as Record<string, unknown>;
  return (
    typeof o.content_thesis === "string" &&
    Array.isArray(o.signals_used) &&
    typeof o.why_these_five === "string"
  );
}

function isValidOutput(obj: unknown): obj is { candidates: TopicCandidate[]; analysis: PhoenixAnalysis; analysis_note: string } {
  if (typeof obj !== "object" || obj === null) return false;
  const o = obj as Record<string, unknown>;
  return (
    Array.isArray(o.candidates) &&
    o.candidates.length === 5 &&
    o.candidates.every(isValidCandidate) &&
    isValidAnalysis(o.analysis) &&
    typeof o.analysis_note === "string"
  );
}

export async function runTopicIntelligence(context: {
  creatorDNA: Record<string, unknown>;
}): Promise<TopicIntelligenceOutput> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      candidates: MOCK_CANDIDATES,
      market_source: "strategy_model",
      analysis_note: "OpenAI key not configured. Showing built-in strategy model candidates for Yusheng's insurance coaching brand.",
      analysis: MOCK_ANALYSIS,
    };
  }

  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  try {
    const client = new OpenAI({ apiKey });
    const response = await client.chat.completions.create({
      model,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: buildSystemPrompt() },
        {
          role: "user",
          content: JSON.stringify(
            {
              creator_dna: context.creatorDNA,
              market_source: "strategy_model",
              request: "Generate 5 topic candidates for today's Instagram carousel decision. All topics must pass the insider test — only someone who has worked in Taiwan's insurance industry could have written them.",
            },
            null,
            2
          ),
        },
      ],
      temperature: 0.85,
      max_tokens: 5000,
    });

    const raw = response.choices[0]?.message?.content;
    if (!raw) {
      return { candidates: MOCK_CANDIDATES, market_source: "strategy_model", analysis_note: "OpenAI returned empty response. Showing strategy model fallback.", analysis: MOCK_ANALYSIS };
    }

    const parsed: unknown = JSON.parse(raw);
    if (!isValidOutput(parsed)) {
      return { candidates: MOCK_CANDIDATES, market_source: "strategy_model", analysis_note: "OpenAI output did not match expected schema. Showing strategy model fallback.", analysis: MOCK_ANALYSIS };
    }

    return {
      candidates: parsed.candidates,
      market_source: "strategy_model",
      analysis_note: parsed.analysis_note,
      analysis: parsed.analysis,
    };
  } catch {
    return {
      candidates: MOCK_CANDIDATES,
      market_source: "strategy_model",
      analysis_note: "OpenAI call failed. Showing strategy model fallback.",
      analysis: MOCK_ANALYSIS,
    };
  }
}
