// Server-side only — video composition using ffmpeg-static.
// Produces final 1080×1350 4:5 H.264 MP4 from Runway intermediate + Chinese text overlay.
// Dev-only. No secrets. No API calls.

import { spawn } from "child_process";
import fs from "fs/promises";
import path from "path";

// Candidate Chinese-capable fonts on macOS — tried in order
const CHINESE_FONT_CANDIDATES = [
  "/System/Library/Fonts/PingFang.ttc",
  "/System/Library/Fonts/STHeiti Light.ttc",
  "/System/Library/Fonts/STHeiti Medium.ttc",
  "/System/Library/Fonts/Supplemental/NotoSansSC-Regular.otf",
  "/Library/Fonts/Arial Unicode.ttf",
  "/System/Library/Fonts/Helvetica.ttc",    // ASCII fallback
  "/System/Library/Fonts/Apple Symbols.ttf",
];

export async function resolveChinesesFont(): Promise<string> {
  for (const candidate of CHINESE_FONT_CANDIDATES) {
    try {
      await fs.access(candidate);
      console.log("[compose-video] using font:", candidate);
      return candidate;
    } catch {
      // not found — try next
    }
  }
  throw new Error(
    "No suitable Chinese font found on this system. " +
    "Expected one of: " + CHINESE_FONT_CANDIDATES.join(", ")
  );
}

function runFfmpeg(ffmpegBin: string, args: string[]): Promise<{ stderr: string }> {
  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpegBin, args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    proc.stderr?.on("data", (chunk: Buffer) => {
      const text = chunk.toString();
      stderr += text;
      if (stderr.length > 8000) stderr = stderr.slice(-8000);
    });
    proc.on("close", (code) => {
      if (code === 0) resolve({ stderr });
      else reject(new Error(`ffmpeg exited with code ${code}. Last output: ${stderr.slice(-600)}`));
    });
    proc.on("error", reject);
  });
}

// Escape a text string for ffmpeg drawtext filter.
// ffmpeg drawtext escaping: backslash, colon, single-quote, percent need escaping.
function escapeDT(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/:/g, "\\:")
    .replace(/%/g, "\\%");
}

export interface Slide01TextContent {
  mainLine1: string;        // first main line (white)
  mainLine2a: string;       // first part of line 2 (white)
  mainLine2b: string;       // highlighted part of line 2 (orange)
  mainLine2c: string;       // last part of line 2 (white)
  supportLine1: string;
  supportLine2: string;
  footerText: string;
}

// Default Slide 1 text derived from FINAL_LAUNCH_PACK slide 1
export const SLIDE1_TEXT: Slide01TextContent = {
  mainLine1:   "做保險，",
  mainLine2a:  "真的會讓",
  mainLine2b:  "朋友遠離",     // highlight_words
  mainLine2c:  "你嗎？",
  supportLine1: "很多新人還沒開始成交，",
  supportLine2:  "心裡就先害怕被討厭。",
  footerText:   "小佑老師｜保險新人真話",
};

// Compose Slide 1: scale Runway 832×1104 → 1080×1350, overlay Chinese text, output H.264 MP4.
export async function composeSlide01(
  inputVideoPath: string,
  outputVideoPath: string,
  text: Slide01TextContent = SLIDE1_TEXT
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ffmpegBin: string | null = require("ffmpeg-static");
  if (!ffmpegBin) throw new Error("ffmpeg-static binary not found.");

  const fontFile = await resolveChinesesFont();

  // Text layout — all positions are for 1080×1350 canvas
  // Left-heavy: text in left ~55% (x=60 to ~600)
  // Subject in right third — preserve right side free
  const MAIN_SIZE = 52;
  const MAIN_LINE_HEIGHT = 76;
  const SUPPORT_SIZE = 27;
  const SUPPORT_LINE_HEIGHT = 38;
  const X = 60;
  const MAIN_Y = 200;

  // Inline split on line 2: "真的會讓" (white) + "朋友遠離" (orange) + "你嗎？" (white)
  // CJK char width ≈ fontSize × 1.0 for monospace CJK in PingFang
  const CJK_W = MAIN_SIZE;
  const x2a = X;
  const x2b = x2a + text.mainLine2a.length * CJK_W;  // 4 × 52 = 208 → x = 268
  const x2c = x2b + text.mainLine2b.length * CJK_W;  // 268 + 208 = 476

  const supportY = MAIN_Y + MAIN_LINE_HEIGHT * 2 + 40;  // 200+152+40 = 392
  const footerY = 1302;

  // Escape all text strings
  const e = escapeDT;
  const ff = `fontfile=${fontFile}`;

  const filters = [
    // 1. Scale: fit width to 1080, maintain AR (832×1104 → 1080×1432), crop to 1080×1350
    `scale=1080:-2:flags=lanczos`,
    `crop=1080:1350:0:0`,

    // 2. Dark overlay on left half for text readability
    `drawbox=x=0:y=0:w=600:h=ih:color=black@0.42:t=fill`,

    // 3. Main line 1 — white
    `drawtext=${ff}:text='${e(text.mainLine1)}':x=${X}:y=${MAIN_Y}:fontsize=${MAIN_SIZE}:fontcolor=white:shadowcolor=black@0.7:shadowx=2:shadowy=2`,

    // 4. Main line 2 — three segments: white / orange / white
    `drawtext=${ff}:text='${e(text.mainLine2a)}':x=${x2a}:y=${MAIN_Y + MAIN_LINE_HEIGHT}:fontsize=${MAIN_SIZE}:fontcolor=white:shadowcolor=black@0.7:shadowx=2:shadowy=2`,
    `drawtext=${ff}:text='${e(text.mainLine2b)}':x=${x2b}:y=${MAIN_Y + MAIN_LINE_HEIGHT}:fontsize=${MAIN_SIZE}:fontcolor=#F97316:shadowcolor=black@0.7:shadowx=2:shadowy=2`,
    `drawtext=${ff}:text='${e(text.mainLine2c)}':x=${x2c}:y=${MAIN_Y + MAIN_LINE_HEIGHT}:fontsize=${MAIN_SIZE}:fontcolor=white:shadowcolor=black@0.7:shadowx=2:shadowy=2`,

    // 5. Support lines — white 80% opacity
    `drawtext=${ff}:text='${e(text.supportLine1)}':x=${X}:y=${supportY}:fontsize=${SUPPORT_SIZE}:fontcolor=white@0.82:shadowcolor=black@0.5:shadowx=1:shadowy=1`,
    `drawtext=${ff}:text='${e(text.supportLine2)}':x=${X}:y=${supportY + SUPPORT_LINE_HEIGHT}:fontsize=${SUPPORT_SIZE}:fontcolor=white@0.82:shadowcolor=black@0.5:shadowx=1:shadowy=1`,

    // 6. Footer — orange
    `drawtext=${ff}:text='${e(text.footerText)}':x=${X}:y=${footerY}:fontsize=20:fontcolor=#F97316@0.90:shadowcolor=black@0.5:shadowx=1:shadowy=1`,
  ].join(",");

  const args = [
    "-y",
    "-i", inputVideoPath,
    "-vf", filters,
    "-c:v", "libx264",
    "-crf", "18",
    "-preset", "medium",
    "-an",
    "-r", "24",
    "-pix_fmt", "yuv420p",
    outputVideoPath,
  ];

  console.log("[compose-video] starting ffmpeg composition", {
    input: path.basename(inputVideoPath),
    output: path.basename(outputVideoPath),
    font: path.basename(fontFile),
  });

  await runFfmpeg(ffmpegBin, args);
  console.log("[compose-video] composition complete:", path.basename(outputVideoPath));
}
