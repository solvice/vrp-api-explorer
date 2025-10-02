/**
 * Feature flags for VRP API Explorer
 *
 * Flags are evaluated using environment variables.
 * To disable a feature, set the corresponding environment variable to 'false'.
 */

export const featureFlags = {
  aiAssistant: process.env.NEXT_PUBLIC_ENABLE_AI_ASSISTANT !== 'false',
} as const;

export type FeatureFlag = keyof typeof featureFlags;
