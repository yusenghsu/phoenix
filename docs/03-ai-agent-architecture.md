# AI Agent Architecture
## Phoenix — 智能代理系統設計

---

### 核心概念

Phoenix 不是單一的 AI 呼叫，而是由多個專職 Agent 組成的協作系統。
每個 Agent 有明確的角色、輸入、輸出，並透過共享的 Brand Memory 溝通。

```
                    ┌─────────────────────┐
                    │   Brand Memory DB   │ ← 所有 Agent 共用
                    └──────────┬──────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
        ▼                      ▼                      ▼
┌──────────────┐    ┌──────────────────┐    ┌──────────────────┐
│  Trend Agent │    │  Strategy Agent  │    │  Content Agent   │
│              │    │                  │    │                  │
│ 掃描外部趨勢  │    │ 推薦今日主題      │    │ 產生完整貼文內容  │
└──────┬───────┘    └────────┬─────────┘    └────────┬─────────┘
       │                     │                       │
       └─────────────────────┼───────────────────────┘
                             │
                    ┌────────▼────────┐
                    │  Output Layer   │
                    │  (Next.js UI)   │
                    └─────────────────┘
```

---

### Agent 詳細說明

#### 1. Trend Agent（趨勢偵測）

**職責**：每日掃描外部資訊，找出與使用者品牌相關的熱門話題。

**輸入**：
- 使用者的產業標籤（保險、理財、增員...）
- 受眾特徵（年齡、關注議題）

**資料來源**（依整合難度排序）：
- Google Trends API（台灣地區搜尋趨勢）
- PTT 理財版 / 保險版熱門討論（爬蟲或 RSS）
- Instagram Hashtag 熱門度（非官方 API 或模擬分析）
- 金管會、壽險公會最新公告（爬蟲）

**輸出**：
```typescript
interface TrendSignal {
  topic: string;           // "勞保年金改革"
  category: string;        // "退休規劃"
  urgency: "high" | "medium" | "low";
  reason: string;          // "PTT 本週討論量增加 3 倍"
  relevanceScore: number;  // 0-100，對使用者品牌的相關程度
  sourceUrl?: string;
}
```

**運行頻率**：每日凌晨 6:00 自動執行，結果快取至當天 23:59。

---

#### 2. Strategy Agent（內容策略）

**職責**：整合趨勢信號 + 品牌記憶 + 發文歷史，推薦今日最佳的 3 個主題。

**輸入**：
- Trend Agent 的輸出（今日熱門趨勢）
- Brand Memory（使用者的品牌聲音、目標、過去主題）
- 發文歷史（最近 30 天發過什麼、哪類互動最好）
- 用戶目標（開發客戶 vs 增員 vs 建立信任）

**推薦邏輯**（優先順序）：
1. 趨勢相關性（熱門 + 符合品牌）
2. 內容多樣性（不重複最近 2 週的主題類型）
3. 轉換潛力（根據目標，評估哪個主題最可能帶來詢問或增員意願）
4. 格式建議（根據主題性質，建議最適合的輪播 / 單張 / 故事格式）

**輸出**：
```typescript
interface TopicRecommendation {
  id: string;
  title: string;            // "退休金缺口，你準備好了嗎？"
  category: string;         // "退休規劃"
  reason: string;           // "本週搜尋量上升 + 你已 3 週未發退休相關內容"
  suggestedFormat: "carousel" | "single" | "reels_script";
  potentialEngagement: "high" | "medium";
  estimatedTime: number;    // 預計產生時間（秒）
}
```

---

#### 3. Content Agent（內容產生）

**職責**：接收選定的主題，結合品牌記憶，產生完整的發布就緒內容。

**輸入**：
- 選定的 TopicRecommendation
- 使用者的 BrandProfile（聲音、風格、核心信念）
- 指定格式（carousel / single / reels）
- 可選：使用者的補充說明（"我想加入真實客戶案例"）

**處理流程**：
```
Brand Context Injection
  ↓
Topic Research（內部知識 + 趨勢資料）
  ↓
Content Structuring（決定頁數、故事線）
  ↓
Draft Generation（gpt-4o with structured output）
  ↓
Brand Voice Check（確認語氣符合品牌設定）
  ↓
Output Packaging（封面、頁面、CTA、Caption、Hashtag、Canva）
```

**輸出格式**：沿用現有 `CarouselOutput` type，未來擴展支援其他格式。

---

#### 4. Memory Agent（品牌記憶管理）

**職責**：讀取、更新、查詢品牌記憶庫。不是主動執行的 Agent，而是其他 Agent 的共用服務層。

**操作**：
- `getBrandProfile(userId)` → 返回完整品牌設定
- `getContentHistory(userId, days)` → 返回最近 N 天發文紀錄
- `updateContentRecord(userId, record)` → 記錄一次發布事件
- `getPerformanceInsights(userId)` → 返回哪類主題互動最好

---

### 技術實作對應

| Agent | 實作方式 | 位置 |
|-------|---------|------|
| Trend Agent | API Route + Cron Job | `/app/api/trends/route.ts` |
| Strategy Agent | API Route（依賴 Trend + Memory） | `/app/api/recommend/route.ts` |
| Content Agent | 現有 `/api/generate`（擴展） | `/app/api/generate/route.ts` |
| Memory Agent | 服務層 + DB | `/lib/memory.ts` + DB |

---

### LLM 使用策略

| 任務 | 模型 | 原因 |
|------|------|------|
| 內容產生（完整輪播） | gpt-4o | 需要高品質創意寫作 |
| 主題推薦理由撰寫 | gpt-4o-mini | 結構化輸出，成本優先 |
| 品牌聲音分析（Onboarding） | gpt-4o | 一次性，需要高理解力 |
| 趨勢相關性評分 | gpt-4o-mini | 高頻率，成本控制 |

---

### 未來擴展：Multi-Agent Orchestration

當系統成熟後，可引入 Agent 協作框架：

```
Orchestrator Agent
├── 決定今天需要哪些 Agent 運行
├── 協調 Agent 之間的資料傳遞
└── 處理 Agent 失敗的 fallback 策略
```

這個架構讓 Phoenix 可以從「每日推薦」進化到「完全自主的品牌經理」。
