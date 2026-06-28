import { runMockDecisionEngine } from "./mock-engine";
import type { DecisionEngineInput, DecisionEngineOutput } from "./types";

export async function runDecisionEngine(
  input: DecisionEngineInput
): Promise<DecisionEngineOutput> {
  const provider = process.env.DECISION_ENGINE_PROVIDER;

  if (provider === "openai") {
    try {
      // Dynamic import keeps server-only out of non-server contexts when using mock
      const { runOpenAIDecisionEngine } = await import("./openai-engine");
      return await runOpenAIDecisionEngine(input);
    } catch {
      return runMockDecisionEngine(input);
    }
  }

  return runMockDecisionEngine(input);
}
