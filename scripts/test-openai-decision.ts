import { runDecisionEngine } from "../src/lib/decision/provider";

const provider = process.env.DECISION_ENGINE_PROVIDER || "mock";
const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Taipei" }).format(new Date());

const mockInput = {
  user: { id: "a0000000-0000-0000-0000-000000000001", name: "小佑" },
  creatorDNA: {
    brand_voice: "一針見血，直接解開疑問。",
    content_goal: "讓人想收藏，也想分享給某個人。",
    avoid_list: ["心靈雞湯", "標題黨", "農場文"],
    topic_preferences: ["退休", "AI", "品牌", "保險觀念"],
  },
  recentPosts: [],
  todayDate: today,
  existingRecentDecisions: [],
};

(async () => {
  console.log("Phoenix decision test starting...");
  console.log("provider:", provider);

  const result = await runDecisionEngine(mockInput);

  console.log("Phoenix OpenAI decision test completed.");
  console.log("provider:", provider);
  console.log("selected_topic:", result.selectedTopic);
  console.log("confidence_score:", result.confidenceScore);
  console.log("candidates:", result.candidates.length);
  console.log("carousel_slides:", result.carouselSlides.length);
})();
