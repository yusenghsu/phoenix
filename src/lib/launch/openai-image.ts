import fs from "fs/promises";
import path from "path";
import { openai } from "@/lib/openai";

export interface GenerateImageResult {
  image_url: string;
  generated_at: string;
  model_used: string;
}

export async function generateImageBackground({
  slideId,
  prompt,
}: {
  slideId: string;
  prompt: string;
}): Promise<GenerateImageResult> {
  const imageModel = process.env.OPENAI_IMAGE_MODEL || "gpt-image-2";

  // Whitelist payload — no response_format, no extra keys
  const imagePayload = {
    model: imageModel,
    prompt,
    size: "1024x1536",
    quality: "low",
    n: 1,
  };

  console.log("[image.generate payload keys]", Object.keys(imagePayload));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await openai.images.generate(imagePayload as any);

  const imageBase64 = result.data?.[0]?.b64_json;
  if (!imageBase64) {
    throw new Error("No b64_json returned from OpenAI image generation");
  }

  let imageUrl: string;
  try {
    const outputDir = path.join(process.cwd(), "public", "generated", "final-launch-pack");
    await fs.mkdir(outputDir, { recursive: true });
    const filename = `${slideId}-background.png`;
    await fs.writeFile(path.join(outputDir, filename), Buffer.from(imageBase64, "base64"));
    imageUrl = `/generated/final-launch-pack/${filename}`;
  } catch {
    imageUrl = `data:image/png;base64,${imageBase64}`;
  }

  return {
    image_url: imageUrl,
    generated_at: new Date().toISOString(),
    model_used: imageModel,
  };
}
