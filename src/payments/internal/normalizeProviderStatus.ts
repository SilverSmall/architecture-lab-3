import type { PaymentStatus } from "../index.ts";

export function normalizeProviderStatus(providerStatus: string): PaymentStatus {
  switch (providerStatus) {
    case "succeeded":
      return "paid";
    case "requires_action":
      return "processing";
    case "declined":
    default:
      return "failed";
  }
}
