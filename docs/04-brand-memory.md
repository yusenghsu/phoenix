# Brand Memory
## Phoenix — 品牌記憶系統設計

---

### 核心概念

Brand Memory 是 Phoenix 的「大腦」。
沒有它，Phoenix 只是另一個要使用者每次重新說明自己是誰的 AI 工具。
有了它，Phoenix 才能主動推薦、個人化生成、持續進化。

**設計原則**：
- 記憶是持久的，不隨對話結束而消失
- 記憶是可解釋的，使用者看得到、改得到
- 記憶是累積的，每次互動都讓 Phoenix 更懂你

---

### 記憶分層結構

```
Brand Memory
├── Layer 1: Identity（身份，幾乎不變）
├── Layer 2: Voice（聲音風格，偶爾微調）
├── Layer 3: Content History（內容歷史，每次發文更新）
└── Layer 4: Performance Signals（效果信號，持續累積）
```

---

### Layer 1：Identity（品牌身份）

使用者在 Onboarding 時建立，之後在 `/brand` 頁面可更新。

```typescript
interface BrandIdentity {
  userId: string;
  name: string;                    // 顯示名稱
  profession: string;              // "保險業務員"
  company?: string;                // 所屬公司（可選）
  specializations: string[];       // ["壽險", "投資型保單", "增員"]
  targetAudience: {
    ageRange: string;              // "30-45歲"
    gender?: string;               // "女性為主"
    lifestage?: string;            // "剛成家的雙薪夫妻"
    painPoints: string[];          // ["不知道如何規劃退休", "擔心保障不足"]
  };
  platforms: ("instagram" | "line" | "facebook")[];
  primaryGoal: "client_acquisition" | "recruitment" | "trust_building" | "all";
  postingFrequency: number;        // 每週幾篇
}
```

---

### Layer 2：Voice（品牌聲音）

定義 AI 產生內容時的語氣、框架、禁忌。

```typescript
interface BrandVoice {
  userId: string;
  toneStyle: "professional" | "warm" | "storytelling" | "educational";
  coreBeliefs: string[];           // ["保險是愛的表現", "財務自由從現在開始"]
  signatureFrameworks: string[];   // 常用的敘事框架，例如："問題→後果→解法"
  avoidTopics: string[];           // 不想碰的議題
  avoidWords: string[];            // 不符合風格的詞彙
  referencePostIds: string[];      // 使用者自己上傳的參考貼文 ID
  aiAnalysisSummary: string;       // AI 分析完參考貼文後的文字摘要
}
```

**AI 如何分析聲音**：
使用者上傳 3-5 篇過去的貼文 → AI 分析其中的：
- 句子長度與節奏
- 常用的開頭方式
- 結尾呼籲的類型
- 情緒基調（激勵 / 同理 / 教育）
- 是否使用問句引導

分析結果存為 `aiAnalysisSummary`，每次產生內容時注入 prompt。

---

### Layer 3：Content History（內容歷史）

每次使用者在 Phoenix 產生並標記「已發布」時記錄。

```typescript
interface ContentRecord {
  id: string;
  userId: string;
  publishedAt: Date;
  topic: string;                   // "退休規劃的三個迷思"
  category: string;                // "退休規劃"
  format: "carousel" | "single" | "reels";
  platform: "instagram" | "line";
  wasRecommended: boolean;         // 是否來自 Phoenix 推薦
  recommendationReason?: string;   // 如果是推薦，推薦理由是什麼
}
```

**用途**：
- 避免 Strategy Agent 推薦最近已發過的相同主題
- 分析哪個類型的主題使用者最常產生（= 偏好信號）
- 計算「距離上次發某類主題已過幾天」

---

### Layer 4：Performance Signals（效果信號）

記錄互動數據（可手動輸入，或未來串接 Instagram API）。

```typescript
interface PerformanceSignal {
  contentRecordId: string;
  likes?: number;
  comments?: number;
  saves?: number;
  shares?: number;
  reach?: number;
  leadsGenerated?: number;         // 這篇帶來幾個詢問
  userRating?: 1 | 2 | 3 | 4 | 5; // 使用者自評這篇的效果
  userNote?: string;               // "這篇有人私訊問我，很有效"
}
```

**用途**：
- 讓 Strategy Agent 知道哪類主題在這個帳號上效果最好
- 未來可以訓練個人化的內容效果預測模型

---

### 資料儲存策略

**Phase 1（MVP）**：JSON 檔案 + localStorage
- 不需要後端資料庫
- 適合單一使用者本地使用
- 品牌記憶存在瀏覽器 + 可匯出備份

**Phase 2（多用戶）**：PostgreSQL / Supabase
```
tables:
  - brand_identities
  - brand_voices
  - content_records
  - performance_signals
```

**Phase 3（規模化）**：向量資料庫（Pinecone / pgvector）
- 將品牌記憶嵌入向量，讓 AI 可以語意搜尋
- 「找出跟這次主題最相似的過去成功貼文」

---

### 品牌記憶 Prompt 注入格式

每次呼叫 Content Agent 時，品牌記憶以結構化文字注入 system prompt：

```
你正在幫助一位保險業務員產生 Instagram 貼文。

【品牌身份】
姓名：○○○
專業：壽險、退休規劃
目標受眾：30-45歲上班族，對退休感到焦慮但還沒行動
主要目標：建立信任感，吸引客戶主動詢問

【品牌聲音】
語氣：溫暖且有故事感，像在和朋友說話
常用框架：先說一個真實情境 → 點出問題 → 提供具體建議
避免：過度使用專業術語、強調銷售

【近期內容（避免重複）】
上週：保險觀念破解（知識型）
2週前：一個客戶的故事（故事型）
3週前：退休金計算方法（教育型）

【效果最好的類型】
故事型 > 知識型 > 教育型（根據過去 90 天互動數據）
```

---

### 使用者控制權

品牌記憶不是黑盒子。使用者在 `/brand` 頁面可以：
- 查看所有記憶的內容
- 手動編輯任何欄位
- 重新上傳參考貼文讓 AI 重新分析聲音
- 匯出所有記憶為 JSON
- 重置所有記憶重新開始
