import type { StripeResponse } from "./internal/StripeClient.ts";

export type PaymentStatus = "paid" | "processing" | "failed";

/** Converts provider-specific states into the stable status used by the system. */
export function normalizePaymentStatus(response: StripeResponse): PaymentStatus {
  switch (response.state) {
    case "succeeded":
      return "paid";
    case "requires_action":
      return "processing";
    case "declined":
    default:
      return "failed";
  }
}
