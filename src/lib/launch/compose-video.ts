// Server-side only — video composition using ffmpeg-static.
// Produces final 1080×1350 4:5 H.264 MP4 from Runway intermediate + Chinese text overlay.
// Dev-only. No secrets. No API calls.

import { spawn } from "child_process";
import fs from "fs/promises";
import path from "path";
import type { SlideComposeText } from "./slide-motion-config";

// Candidate Chinese-capable fonts on macOS — tried in order
const CHINESE_FONT_CANDIDATES = [
  "/System/Library/Fonts/PingFang.ttc",
  "/System/Library/Fonts/STHeiti Light.ttc",
  "/System/Library/Fonts/STHeiti Medium.ttc",
  "/System/Library/Fonts/Supplemental/NotoSansSC-Regular.otf",
  "/Library/Fonts/Arial Unicode.ttf",
  "/System/Library/Fonts/Helvetica.ttc",
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
function escapeDT(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/:/g, "\\:")
    .replace(/%/g, "\\%");
}

// Text layout constants for 1080×1350 canvas
const MAIN_SIZE = 52;
const MAIN_LINE_HEIGHT = 76;
const SUPPORT_SIZE = 27;
const SUPPORT_LINE_HEIGHT = 38;
const X = 60;
const MAIN_Y = 200;
const FOOTER_Y = 1302;

// Generic compose: works for any slide given a SlideComposeText descriptor.
export async function composeSlide(
  inputVideoPath: string,
  outputVideoPath: string,
  text: SlideComposeText
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ffmpegBin: string | null = require("ffmpeg-static");
  if (!ffmpegBin) throw new Error("ffmpeg-static binary not found.");

  const fontFile = await resolveChinesesFont();
  const ff = `fontfile=${fontFile}`;
  const e = escapeDT;
  const CJK_W = MAIN_SIZE; // approximate CJK char width

  const filters: string[] = [
    `scale=1080:-2:flags=lanczos`,
    `crop=1080:1350:0:0`,
    `drawbox=x=0:y=0:w=600:h=ih:color=black@0.42:t=fill`,
  ];

  // Main lines — each line's segments accumulate x
  text.mainLines.forEach((line, lineIdx) => {
    const y = MAIN_Y + lineIdx * MAIN_LINE_HEIGHT;
    let x = X;
    for (const seg of line.segments) {
      const color = seg.highlight ? "#F97316" : "white";
      filters.push(
        `drawtext=${ff}:text='${e(seg.text)}':x=${x}:y=${y}:fontsize=${MAIN_SIZE}:fontcolor=${color}:shadowcolor=black@0.7:shadowx=2:shadowy=2`
      );
      x += seg.text.length * CJK_W;
    }
  });

  // Support lines
  const supportY = MAIN_Y + MAIN_LINE_HEIGHT * text.mainLines.length + 40;
  text.supportLines.forEach((line, idx) => {
    filters.push(
      `drawtext=${ff}:text='${e(line)}':x=${X}:y=${supportY + idx * SUPPORT_LINE_HEIGHT}:fontsize=${SUPPORT_SIZE}:fontcolor=white@0.82:shadowcolor=black@0.5:shadowx=1:shadowy=1`
    );
  });

  // Footer
  filters.push(
    `drawtext=${ff}:text='${e(text.footerText)}':x=${X}:y=${FOOTER_Y}:fontsize=20:fontcolor=#F97316@0.90:shadowcolor=black@0.5:shadowx=1:shadowy=1`
  );

  const args = [
    "-y",
    "-i", inputVideoPath,
    "-vf", filters.join(","),
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

// ── Backward-compat Slide 1 API ───────────────────────────────────────────────

export interface Slide01TextContent {
  mainLine1: string;
  mainLine2a: string;
  mainLine2b: string;
  mainLine2c: string;
  supportLine1: string;
  supportLine2: string;
  footerText: string;
}

export const SLIDE1_TEXT: Slide01TextContent = {
  mainLine1:    "做保險，",
  mainLine2a:   "真的會讓",
  mainLine2b:   "朋友遠離",
  mainLine2c:   "你嗎？",
  supportLine1: "很多新人還沒開始成交，",
  supportLine2: "心裡就先害怕被討厭。",
  footerText:   "小佑老師｜保險新人真話",
};

export async function composeSlide01(
  inputVideoPath: string,
  outputVideoPath: string,
  text: Slide01TextContent = SLIDE1_TEXT
): Promise<void> {
  // Convert legacy format to generic SlideComposeText
  const composeText: SlideComposeText = {
    mainLines: [
      { segments: [{ text: text.mainLine1, highlight: false }] },
      {
        segments: [
          { text: text.mainLine2a, highlight: false },
          { text: text.mainLine2b, highlight: true },
          { text: text.mainLine2c, highlight: false },
        ],
      },
    ],
    supportLines: [text.supportLine1, text.supportLine2],
    footerText: text.footerText,
  };
  await composeSlide(inputVideoPath, outputVideoPath, composeText);
}
