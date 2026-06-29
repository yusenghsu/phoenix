// Motion provider capability model.
// No capability is assumed — every provider must be validated post-generation.
// 4:5 (1080×1350) is the hard requirement for Phoenix final motion output.
// Runway is an intermediate provider — it generates a near-portrait clip that still requires
// final 4:5 composition before the slide can be marked READY FOR REVIEW.

// Provider's intermediate output ratio acceptance
export type ProviderRatioStatus = "unknown" | "validating" | "accepted_intermediate" | "failed";

// Final composed output ratio (must be 4:5 = 1080×1350)
export type RatioStatus = "unknown" | "passed_4_5" | "failed";

export interface MotionProviderCapability {
  provider: string;
  supports_native_4_5: boolean | "unknown";
  supports_9_16: boolean | "unknown";
  supports_custom_resolution: boolean | "unknown";
  requires_final_composition_to_4_5: boolean;
  can_be_primary_provider: boolean;
  notes: string;
}

export const PROVIDER_CAPABILITIES: MotionProviderCapability[] = [
  {
    provider: "runway",
    supports_native_4_5: false,
    supports_9_16: true,
    supports_custom_resolution: false,
    requires_final_composition_to_4_5: true,
    can_be_primary_provider: true,
    notes:
      "Runway does not output native 4:5. Use 832:1104 as intermediate motion background, " +
      "then compose final 1080×1350 output in Phoenix/Canva. " +
      "Intermediate video ratio must be validated post-generation before composition step.",
  },
  {
    provider: "kling",
    supports_native_4_5: "unknown",
    supports_9_16: "unknown",
    supports_custom_resolution: "unknown",
    requires_final_composition_to_4_5: false,
    can_be_primary_provider: false,
    notes: "Not yet integrated — all capabilities unknown.",
  },
  {
    provider: "pika",
    supports_native_4_5: "unknown",
    supports_9_16: "unknown",
    supports_custom_resolution: "unknown",
    requires_final_composition_to_4_5: false,
    can_be_primary_provider: false,
    notes: "Not yet integrated — all capabilities unknown.",
  },
  {
    provider: "canva",
    supports_native_4_5: false,
    supports_9_16: false,
    supports_custom_resolution: false,
    requires_final_composition_to_4_5: true,
    can_be_primary_provider: false,
    notes:
      "Canva AI video confirmed 16:9 only in user test. Role corrected to composition / export only. " +
      "Canva can compose Runway intermediate video → 1080×1350 final MP4, but cannot generate motion backgrounds.",
  },
];

// Runway's accepted portrait ratios for intermediate motion generation.
// Neither is native 4:5 — final composition to 1080×1350 is always required.
const ACCEPTED_PORTRAIT_RATIOS = [
  832 / 1104, // 832:1104 ≈ 0.754 — preferred intermediate
  720 / 1280, // 720:1280 ≈ 0.563
] as const;
const PROVIDER_RATIO_TOLERANCE = 0.02;

// Validates whether a provider's intermediate output falls within an accepted portrait ratio.
// "accepted_intermediate" does NOT mean the video is final-output-ready.
export function validateProviderRatio(width: number, height: number): ProviderRatioStatus {
  if (!width || !height) return "unknown";
  const ratio = width / height;
  const accepted = ACCEPTED_PORTRAIT_RATIOS.some(
    (r) => Math.abs(ratio - r) <= PROVIDER_RATIO_TOLERANCE
  );
  return accepted ? "accepted_intermediate" : "failed";
}

// Validates whether a final composed video meets the 4:5 (1080×1350) requirement.
// This is the gate for READY FOR REVIEW.
export function validateVideoRatio(width: number, height: number): RatioStatus {
  if (!width || !height) return "unknown";
  const ratio = width / height;
  return ratio >= 0.79 && ratio <= 0.81 ? "passed_4_5" : "failed";
}
