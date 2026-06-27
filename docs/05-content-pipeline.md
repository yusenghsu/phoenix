# Content Pipeline
## Phoenix — 從主題到發布的完整流程

---

### 概覽

```
[趨勢掃描] → [主題推薦] → [使用者選擇] → [內容產生] → [預覽微調] → [輸出] → [發布追蹤]
```

每個步驟都有對應的 API Route、UI 頁面、資料結構。

---

### Step 1：趨勢掃描（Trend Scan）

**觸發時機**：每日凌晨 6:00（Cron Job）或使用者手動刷新

**流程**：
```
收集外部信號
  ├── Google Trends（台灣，金融保險相關關鍵字）
  ├── PTT 熱門討論（理財版、保險版）
  └── 金管會 / 壽險公會新聞（可選）

AI 評分
  └── 對每個信號評估：與品牌的相關性、時效性、內容轉化難度

儲存結果
  └── 快取至當日，供 Strategy Agent 使用
```

**對應 API**：`GET /api/trends` （返回今日熱門信號清單）

**Phase 1 替代方案**：
暫不接外部 API，改由 AI 模擬產生「今日可能熱門的話題」，根據品牌類型和日期推測。待 MVP 驗證後再接真實資料源。

---

### Step 2：主題推薦（Topic Recommendation）

**觸發時機**：使用者打開首頁，或手動點「重新推薦」

**流程**：
```
讀取 Brand Memory
  ├── 品牌身份（產業、目標）
  ├── 近期發文主題（避免重複）
  └── 歷史效果最佳的類型

讀取今日趨勢
  └── 從 Step 1 的快取取得

Strategy Agent（gpt-4o-mini）
  └── 輸入：品牌記憶 + 趨勢信號
  └── 輸出：3 個推薦主題（含理由、格式建議、互動潛力評估）

返回 UI
  └── 顯示 3 張推薦卡片
```

**對應 API**：`POST /api/recommend`

**輸出範例**：
```json
{
  "recommendations": [
    {
      "id": "rec_001",
      "title": "退休金缺口，你的計劃夠嗎？",
      "category": "退休規劃",
      "reason": "本週勞保改革新聞熱度高，且你已 21 天未發退休相關內容",
      "suggestedFormat": "carousel",
      "potentialEngagement": "high",
      "estimatedGenerationTime": 15
    }
  ]
}
```

---

### Step 3：使用者選擇（User Selection）

**UI 行為**：
- 3 張卡片展示，使用者點選其中一張
- 可點「告訴我更多」查看該主題的擴展說明
- 可點「調整主題」在原主題上修改
- 可點「自訂主題」完全手動輸入

**資料傳遞**：
選定後將 `TopicRecommendation.id`（或自訂文字）傳給 Step 4。

---

### Step 4：內容產生（Content Generation）

**觸發時機**：使用者確認選定主題後

**流程**：
```
組裝 Prompt
  ├── 注入品牌記憶（身份 + 聲音 + 近期主題）
  ├── 注入選定主題
  ├── 注入格式需求（輪播 / 單張 / Reels）
  └── 注入特殊指示（使用者補充說明）

呼叫 Content Agent（gpt-4o）
  └── response_format: json_object
  └── 結構化輸出完整內容

後處理
  ├── 驗證 JSON 結構完整性
  ├── Hashtag 格式標準化
  └── Canva 內容格式化
```

**對應 API**：`POST /api/generate`（現有，需擴展接受品牌記憶）

**輸出結構**（現有 CarouselOutput，未來擴展）：
```typescript
interface ContentOutput {
  format: "carousel" | "single" | "reels";
  // carousel 專用
  coverTitle?: string;
  coverSubtitle?: string;
  slides?: CarouselSlide[];
  // 所有格式共用
  caption: string;
  hashtags: string[];
  cta: string;
  canvaContent: string;
  // 新增
  bestPostTime?: string;         // "週二 20:00-21:00"
  contentRecordId: string;       // 供後續追蹤用
}
```

---

### Step 5：預覽與微調（Preview & Edit）

**UI 功能**：
- 輪播視覺預覽（現有 CarouselPreview 元件）
- 每頁文案可直接點擊編輯
- 重新產生單頁（不重新產生整份）
- 切換語氣（一鍵更改為更正式 / 更輕鬆）

**微調 API**（未來）：
- `POST /api/regenerate-slide`：只重新產生某一頁
- `POST /api/adjust-tone`：調整整份的語氣風格

---

### Step 6：輸出（Output Delivery）

**複製選項**：
- 複製單頁文案
- 複製全部 Canva 版型內容
- 複製 Caption + Hashtag
- 一鍵全部複製（整合版）

**匯出選項**（未來）：
- 匯出為 `.txt` 逐頁文字檔
- 匯出為 Notion 格式
- 直接推送到 Buffer / Later 排程工具

---

### Step 7：發布追蹤（Publish Tracking）

**UI 行為**：
使用者完成設計、發布後，回到 Phoenix 點「標記已發布」。

**記錄內容**：
```typescript
{
  contentRecordId: string;
  publishedAt: Date;
  platform: "instagram" | "line";
  // 可選：事後填入效果數據
  likes?: number;
  comments?: number;
  userRating?: 1 | 2 | 3 | 4 | 5;
}
```

**閉環意義**：
這筆記錄進入 Brand Memory 後，下次 Strategy Agent 推薦時就會知道：
- 這個類型上次效果如何
- 距離上次發同類內容已過幾天
- 使用者是否傾向某種格式

---

### 整體資料流圖

```
User
  │ 打開 Phoenix
  ▼
GET /api/recommend
  ├── 讀取 Brand Memory
  └── 讀取 GET /api/trends（快取）
  │
  │ 返回 3 個推薦主題
  ▼
User 選擇主題
  │
POST /api/generate
  ├── 品牌記憶 → prompt 注入
  ├── gpt-4o 產生內容
  └── 返回結構化 JSON
  │
UI 預覽
  │
User 複製 → Canva → 發布
  │
POST /api/publish-record
  └── 更新 Brand Memory
```

---

### 錯誤處理策略

| 失敗點 | 處理方式 |
|--------|---------|
| Trend Agent 失敗 | fallback：使用上次快取的趨勢資料 |
| Strategy Agent 失敗 | fallback：顯示 3 個預設主題（根據品牌類型） |
| Content Agent 失敗 | 顯示錯誤 + 提供重試按鈕，不清空使用者的選擇 |
| JSON 解析失敗 | 重試一次，失敗則顯示原始文字讓使用者手動複製 |
| OpenAI 超時 | 串流輸出（stream: true），讓使用者看到逐步產生的內容 |
