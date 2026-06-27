import { GenerateRequest } from "@/types/carousel";

export function buildCarouselPrompt(req: GenerateRequest): string {
  const slideCount = req.slideCount ?? 9;
  const style = req.style ?? "professional";

  const styleGuide = {
    professional: "專業、有權威感、適合商業人士",
    casual: "輕鬆、親切、貼近生活",
    educational: "教育性強、邏輯清晰、條理分明",
  }[style];

  return `你是一位專業的社群媒體內容創作者，專門為保險業務、理財規劃師創作 Instagram 輪播貼文內容。

請根據以下主題，產生一份完整的 Instagram 輪播貼文內容：
主題：${req.topic}
風格：${styleGuide}
頁數：${slideCount} 頁（不含封面）

請以 JSON 格式回應，結構如下：
{
  "coverTitle": "封面主標題（吸引人、簡短有力，8-15字）",
  "coverSubtitle": "封面副標題（補充說明，15-25字）",
  "slides": [
    {
      "pageNumber": 1,
      "title": "該頁標題（簡短，6-12字）",
      "content": "該頁主要文案（2-3句話，重點清楚）",
      "bulletPoints": ["重點1", "重點2", "重點3"]
    }
  ],
  "cta": "行動呼籲文案（30-50字，鼓勵互動或私訊）",
  "caption": "Instagram 貼文說明（150-200字，吸引人、有故事性）",
  "hashtags": ["hashtag1", "hashtag2", "...（共20個相關hashtag，中英文混合）"],
  "canvaContent": "可直接貼到 Canva 的排版內容（每頁用===PAGE===分隔，包含標題和要點）"
}

注意事項：
- 每頁內容要有連貫性，形成完整故事線
- 語言使用繁體中文
- 內容要實用、具體，避免空泛
- Hashtag 要包含中文和英文標籤
- Canva 內容格式要清楚，方便直接複製使用
- 只回傳 JSON，不要有其他文字`;
}
