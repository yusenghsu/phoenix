import type { DecisionEngineInput, DecisionEngineOutput } from "./types";

export function runMockDecisionEngine(
  _input: DecisionEngineInput
): DecisionEngineOutput {
  return {
    selectedTopic: "退休不是 65 歲開始",
    confidenceScore: 92,
    mainJudgment:
      "Phoenix 已於 03:00 完成今日決策，並選擇最適合小佑品牌長期累積的題目。",
    decisionFactors: [
      { label: "Market Signal",    score: 84, text: "退休話題本週搜尋量上升，市場空間未被佔據。" },
      { label: "Creator DNA Fit",  score: 96, text: "主題完全符合品牌核心，避開心靈雞湯陷阱。" },
      { label: "Brand Memory",     score: 91, text: "退休系列連續穩定輸出，今天發出可鞏固系列節奏。" },
      { label: "Share Worthiness", score: 89, text: "反直覺標題具備高分享動機，類似框架歷史收藏率是一般貼文 2.4 倍。" },
    ],
    risk: "如果今天不發，退休系列的品牌記憶會中斷。",
    candidates: [
      { topic: "退休不是 65 歲開始",    marketScore: 84, brandFitScore: 96, shareScore: 89, riskLevel: "low",    rejectedReason: null,                           selected: true  },
      { topic: "AI 會淘汰保險業務嗎？", marketScore: 93, brandFitScore: 64, shareScore: 76, riskLevel: "high",   rejectedReason: "流量可能高，但今天容易變成跟風。", selected: false },
      { topic: "努力沒有結果怎麼辦？",  marketScore: 68, brandFitScore: 58, shareScore: 61, riskLevel: "medium", rejectedReason: "情緒共鳴夠，但容易落入雞湯。",    selected: false },
      { topic: "快速成交的三個技巧",    marketScore: 59, brandFitScore: 42, shareScore: 49, riskLevel: "high",   rejectedReason: "短期有用，但會削弱長期品牌深度。", selected: false },
    ],
    carouselDraft: {
      title: "退休不是 65 歲開始",
      caption:
        "同一個觀念，越早想清楚，越不容易被生活推著走。\n\n很多人都以為退休是 65 歲以後才要想的事。\n但其實，你現在做的每一個選擇，都在決定未來的自由。\n\n如果你覺得退休還很遠，這篇貼文就是為你寫的。",
      hashtags: ["退休規劃", "人生選擇", "保險觀念", "財務自由", "小佑"],
    },
    carouselSlides: [
      { slideNumber: 1, headline: "退休不是 / 65 歲開始",           body: "",                              designNotes: { variant: "cover"       } },
      { slideNumber: 2, headline: "很多人以為退休是年紀問題。",     body: "其實退休是選擇問題。",            designNotes: { variant: "two-thought" } },
      { slideNumber: 3, headline: "你今天怎麼花錢，",               body: "其實已經在決定 20 年後的自由。",  designNotes: { variant: "statement"   } },
      { slideNumber: 4, headline: "真正可怕的不是沒退休金。",       body: "是你一直以為還很早。",            designNotes: { variant: "dramatic"    } },
      { slideNumber: 5, headline: "保險不是答案。",                 body: "規劃才是。",                      designNotes: { variant: "minimal"     } },
      { slideNumber: 6, headline: "如果你不知道自己想過什麼生活，", body: "再多工具都只是工具。",            designNotes: { variant: "statement"   } },
      { slideNumber: 7, headline: "退休不是離開工作。",             body: "是擁有選擇。",                    designNotes: { variant: "quote"       } },
      { slideNumber: 8, headline: "你不是在準備退休。",             body: "你是在準備未來的自由。",          designNotes: { variant: "closing"     } },
    ],
    learningLog:
      "Phoenix 今日選擇延續退休主題，因為它最符合小佑的品牌記憶與分享價值。",
  };
}
