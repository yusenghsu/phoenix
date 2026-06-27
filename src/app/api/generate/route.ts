import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/lib/openai";
import { buildCarouselPrompt } from "@/lib/prompt";
import { GenerateRequest, GenerateResponse } from "@/types/carousel";

export async function POST(req: NextRequest) {
  try {
    const body: GenerateRequest = await req.json();

    if (!body.topic || body.topic.trim().length === 0) {
      return NextResponse.json<GenerateResponse>(
        { success: false, error: "請輸入主題" },
        { status: 400 }
      );
    }

    const prompt = buildCarouselPrompt(body);

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "你是專業的社群媒體內容創作者，擅長為保險業、理財業創作高互動率的 Instagram 輪播貼文。請只回傳有效的 JSON 格式。",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.8,
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0].message.content ?? "{}";
    const data = JSON.parse(raw);

    return NextResponse.json<GenerateResponse>({ success: true, data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "產生失敗，請稍後再試";
    return NextResponse.json<GenerateResponse>(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
