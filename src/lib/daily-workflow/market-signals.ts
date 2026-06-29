// Market signals for daily topic generation.
// This version returns a structured skeleton. Wire real sources (news API, Perplexity, etc.) later.
import "server-only";

export interface MarketSignal {
  category: string;
  summary: string;
  relevance: string;
}

export interface DailyMarketSignals {
  source: string;
  date: string;
  signals: MarketSignal[];
}

export async function getDailyMarketSignals(runDate: string): Promise<DailyMarketSignals> {
  return {
    source: "manual_skeleton",
    date: runDate,
    signals: [
      {
        category: "insurance_recruiting",
        summary: "保險新人對陌生開口、被拒絕、朋友名單壓力仍是主要痛點",
        relevance: "可轉成招募教育內容",
      },
      {
        category: "young_adult_career",
        summary: "18-35 歲轉職族群重視自由、收入成長、但害怕不穩定",
        relevance: "可轉成保險業職涯內容",
      },
      {
        category: "sales_psychology",
        summary: "銷售新手常把成交焦慮投射成關係壓力",
        relevance: "可轉成小佑老師的主管視角",
      },
      {
        category: "manager_mindset",
        summary: "基層主管在帶領新人時，常犯的是「替他解決」而非「讓他看見」",
        relevance: "可轉成帶人技術與管理哲學內容",
      },
      {
        category: "insurance_truth",
        summary: "很多人誤以為保險業只靠人情，但頂尖業務靠的是說清楚、讓人懂",
        relevance: "可轉成打破產業迷思的直球內容",
      },
    ],
  };
}
