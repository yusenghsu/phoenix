// Motion provider capability model.
// No capability is assumed — every provider must be validated post-generation.
// 4:5 (1080×1350) is the hard requirement for Phoenix final motion output.

export type RatioStatus = "unknown" | "passed_4_5" | "failed";

export interface MotionProviderCapability {
  provider: string;
  supports_native_4_5: boolean | "unknown";
  supports_9_16: boolean | "unknown";
  supports_custom_resolution: boolean | "unknown";
  requires_crop_to_4_5: boolean;
  can_be_primary_provider: boolean;
  notes: string;
}

export const PROVIDER_CAPABILITIES: MotionProviderCapability[] = [
  {
    provider: "runway",
    supports_native_4_5: "unknown",
    supports_9_16: "unknown",
    supports_custom_resolution: "unknown",
    requires_crop_to_4_5: false,
    can_be_primary_provider: false,
    notes:
      "Runway must be tested and output dimensions validated before approval. " +
      "First-frame keyframe controls composition, but output ratio must be measured post-generation. " +
      "Do not assume 4:5 input preserves 4:5 output.",
  },
  {
    provider: "kling",
    supports_native_4_5: "unknown",
    supports_9_16: "unknown",
    supports_custom_resolution: "unknown",
    requires_crop_to_4_5: false,
    can_be_primary_provider: false,
    notes: "Not yet integrated — all capabilities unknown.",
  },
  {
    provider: "pika",
    supports_native_4_5: "unknown",
    supports_9_16: "unknown",
    supports_custom_resolution: "unknown",
    requires_crop_to_4_5: false,
    can_be_primary_provider: false,
    notes: "Not yet integrated — all capabilities unknown.",
  },
  {
    provider: "canva",
    supports_native_4_5: false,
    supports_9_16: false,
    supports_custom_resolution: false,
    requires_crop_to_4_5: true,
    can_be_primary_provider: false,
    notes:
      "Canva AI video confirmed 16:9 only in user test. Not suitable as primary motion background generator. " +
      "Role corrected to composition / export only (requires external vertical video input).",
  },
];

// Pure aspect-ratio math — no DOM dependency.
// expected ratio = 0.8 (4:5 = width/height = 1080/1350)
// tolerance: ±0.01 to account for minor encoding differences
export function validateVideoRatio(width: number, height: number): RatioStatus {
  if (!width || !height) return "unknown";
  const ratio = width / height;
  return ratio >= 0.79 && ratio <= 0.81 ? "passed_4_5" : "failed";
}
